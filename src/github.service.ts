import { HttpException, Injectable } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { throttling } from '@octokit/plugin-throttling';
import { EnvConfig } from './env-config.service';

function createOctokit(auth) {
  const Kit = Octokit.plugin(throttling);
  return new Kit({
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

  constructor(private envConfig: EnvConfig) {
    this.octokit = createOctokit(envConfig.gitHubToken);
  }

  async getContent(slug: string, path = '.') {
    const [owner, repo] = slug.split('/');
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });
      return data;
    } catch (error) {
      if (error.name !== 'HttpError') {
        throw error;
      }
      throw new HttpException(error.message, error.status);
    }
  }

  async rateLimit() {
    const { data } = await this.octokit.rateLimit.get();
    return data.rate;
  }
}
