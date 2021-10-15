import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { throttling } from '@octokit/plugin-throttling';
import { EnvConfig, GitHubAuthCredentials } from './env-config.service';
import { createOAuthAppAuth } from '@octokit/auth-oauth-app';
import { OctokitResponse, ResponseHeaders } from '@octokit/types';
import * as LRUCache from 'lru-cache';
import sizeof = require('sizeof');
import * as xbytes from 'xbytes';
import { map } from 'ramda';

function createOctokit(auth: GitHubAuthCredentials): Octokit {
  const Kit = Octokit.plugin(throttling);
  return new Kit({
    authStrategy: createOAuthAppAuth,
    auth,
    throttle: {
      onRateLimit: (retryAfter, options, octokit) => {
        octokit.log.warn(
          `Request quota exhausted for request ${options.method} ${options.url}`,
        );

        if (options.request.retryCount === 0) {
          // TODO: agregar logs por Discord
          // only retries once
          octokit.log.info(`Retrying after ${retryAfter} seconds!`);
          return true;
        }
      },
      onAbuseLimit: (retryAfter, options, octokit) => {
        // TODO: agregar logs por Discord
        // does not retry, only logs a warning
        octokit.log.warn(
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
    limit: number;
    used: number;
    remaining: number;
  };
}

@Injectable()
export class GitHubService {
  octokit: Octokit;
  cache: LRUCache<string, CacheItem>;

  constructor(envConfig: EnvConfig) {
    this.octokit = createOctokit(envConfig.gitHubAuth);
    this.cache = new LRUCache({
      max: envConfig.maxCacheSizeBytes,
      length: (value) => sizeof.sizeof(value),
    });
  }

  async getContent(slug: string, path = '.') {
    const [owner, repo] = slug.split('/');
    const cacheKey = `getContent-${slug}-${path}`;

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

  cacheUsage(): CacheUsage {
    const raw = {
      limit: this.cache.max,
      remaining: this.cache.max - this.cache.length,
      used: this.cache.length,
    };

    return { raw, human: map(xbytes, raw) };
  }

  private makeCacheHeaders(key: string) {
    const item = this.cache.get(key);
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
        this.cache.set(key, { etag: headers.etag.replace('W/', ''), data });
      }
      return data;
    };
  }

  private fetchFromCache(key: string) {
    return (error) => {
      if (error.status === HttpStatus.NOT_MODIFIED) {
        return this.cache.get(key).data;
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
