import { HttpException, Injectable } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { throttling } from '@octokit/plugin-throttling';
import { EnvConfig, GitHubAuthCredentials } from './env-config.service';
import { createOAuthAppAuth } from '@octokit/auth-oauth-app';
import { OctokitResponse } from '@octokit/types';

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
          // only retries once
          octokit.log.info(`Retrying after ${retryAfter} seconds!`);
          return true;
        }
      },
      onAbuseLimit: (retryAfter, options, octokit) => {
        // does not retry, only logs a warning
        octokit.log.warn(
          `Abuse detected for request ${options.method} ${options.url}`,
        );
      },
    },
  });
}

@Injectable()
export class GitHubService {
  octokit: Octokit;

  constructor(envConfig: EnvConfig) {
    this.octokit = createOctokit(envConfig.gitHubAuth);
  }

  async getContent(slug: string, path = '.') {
    const [owner, repo] = slug.split('/');
    return this.fetchDataFrom(
      this.octokit.repos.getContent({
        owner,
        repo,
        path,
      }),
    );
  }

  async rateLimit() {
    const {
      resources: { core },
    } = await this.fetchDataFrom(this.octokit.rateLimit.get());

    return core;
  }

  private async fetchDataFrom<T extends OctokitResponse<R, any>, R>(
    request: Promise<T>,
  ): Promise<R> {
    try {
      const { data } = await request;
      return data;
    } catch (error) {
      if (error.name !== 'HttpError') {
        throw error;
      }
      throw new HttpException(error.message, error.status);
    }
  }
}
