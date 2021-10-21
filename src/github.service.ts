import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { throttling } from '@octokit/plugin-throttling';
import { EnvConfig } from './env-config.service';
import { OctokitResponse, ResponseHeaders } from '@octokit/types';
import * as LRUCache from 'lru-cache';
import sizeof = require('sizeof');
import * as xbytes from 'xbytes';
import { fromPairs, map, replace } from 'ramda';
import { DiscordLogger } from './discord-logger.service';
import { BugReport } from './models/bug_report.model';

// The options object has the params at the root,
// so we find out their name from the URL and then extract them from the object.
const extractParameters = (options) => {
  const names = map(replace(/{|}/g, ''), options.url.match(/({\w+})/g));
  return fromPairs(map((key) => [key, options[key]], names));
};

function createOctokit(token: string, logger: DiscordLogger): Octokit {
  const Kit = Octokit.plugin(throttling);
  return new Kit({
    auth: token,
    throttle: {
      onRateLimit: (retryAfter, options, octokit) => {
        const { method, url } = options;

        logger.error('GitHub Service', 'Request quota exhausted!', {
          method,
          url,
          ...extractParameters(options),
        });

        if (options.request.retryCount === 0) {
          // only retries once
          logger.warn(
            'GitHub Service',
            `Will retry after ${retryAfter} seconds!`,
            {
              method,
              url,
            },
          );
          return true;
        }
      },
      onAbuseLimit: (retryAfter, options, octokit) => {
        // does not retry, only logs a warning
        logger.error(
          'GitHub Service',
          `Abuse detected for request ${options.method} ${options.url}`,
        );
      },
    },
  });
}

interface CacheItem {
  etag: string;
  data: any;
}

interface CacheUsage {
  raw: {
    limit: number;
    used: number;
    remaining: number;
  };
  human: {
    limit: string;
    used: string;
    remaining: string;
  };
}

@Injectable()
export class GitHubService {
  octokit: Octokit;

  private readonly cache: LRUCache<string, CacheItem>;
  private readonly envConfig: EnvConfig;
  private readonly logger = new Logger(GitHubService.name);

  constructor(envConfig: EnvConfig, discordLogger: DiscordLogger) {
    this.envConfig = envConfig;
    this.octokit = createOctokit(envConfig.githubBotToken, discordLogger);
    this.cache = new LRUCache({
      max: envConfig.maxCacheSizeBytes,
      length: (value) => sizeof.sizeof(value),
    });
  }

  async repositoryContents(slug: string, path = '.') {
    const [owner, repo] = slug.split('/');
    const cacheKey = `getContent$${slug}$${path}`;

    return this.octokit.repos
      .getContent({
        owner,
        repo,
        path,
        headers: this.makeCacheHeaders(cacheKey),
      })
      .then(this.addToCache(cacheKey))
      .catch(this.fetchFromCache(cacheKey))
      .catch(this.forwardHttpError);
  }

  async rateLimit() {
    const {
      resources: { core },
    } = await this.fetchDataFrom(this.octokit.rateLimit.get());

    return core;
  }

  async createIssue(report: BugReport) {
    const { repo, owner } = this.envConfig.githubIssueTracker;

    try {
      const {
        data: { html_url },
      } = await this.octokit.issues.create({
        owner,
        repo,
        title: report.title,
        body: report.toMarkdownBody(),
        labels: [this.modeToLabel(report.mode)],
      });

      return html_url;
    } catch (error) {
      this.forwardHttpError(error);
    }
  }

  cacheUsage(): CacheUsage {
    const raw = {
      limit: this.cache.max,
      remaining: this.cache.max - this.cache.length,
      used: this.cache.length,
    };

    return { raw, human: map(xbytes, raw) };
  }

  private modeToLabel(mode: string) {
    switch (mode) {
      case 'blocks':
        return 'junior';
      case 'code':
        return 'senior';
      default:
        return mode;
    }
  }

  private makeCacheHeaders(key: string) {
    const item = this.cache.get(key);
    this.logger.debug({ stage: 'make headers', key, etag: item?.etag });
    return item ? { 'If-None-Match': item.etag } : {};
  }

  private forwardHttpError(error) {
    if (error.name !== 'HttpError') {
      throw error;
    }

    throw new HttpException(error.message, error.status);
  }

  private addToCache(key: string) {
    return ({ headers, data }: { headers: ResponseHeaders; data: any }) => {
      if (headers.etag) {
        this.logger.debug({ stage: 'add to cache', key, etag: headers.etag });
        this.cache.set(key, { etag: headers.etag.replace('W/', ''), data });
      }
      return data;
    };
  }

  private fetchFromCache(key: string) {
    return (error) => {
      if (error.status === HttpStatus.NOT_MODIFIED) {
        const { etag, data } = this.cache.get(key);
        this.logger.debug({ stage: 'return from cache', key, etag });
        return data;
      }

      throw error;
    };
  }

  private async fetchDataFrom<T extends OctokitResponse<R, any>, R>(
    request: Promise<T>,
  ): Promise<R> {
    try {
      const { data } = await request;
      return data;
    } catch (error) {
      this.forwardHttpError(error);
    }
  }
}
