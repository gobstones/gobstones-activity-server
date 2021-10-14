import { HttpException, Injectable } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { EnvConfig } from './env-config.service';

@Injectable()
export class GitHubService {
  octokit: Octokit;

  constructor(private envConfig: EnvConfig) {
    this.octokit = new Octokit({
      auth: envConfig.gitHubToken,
    });
  }

  async getContent(slug: string, path = '.'): Promise<any> {
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
}
