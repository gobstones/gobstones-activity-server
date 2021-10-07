import { Injectable } from '@nestjs/common';
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
    const { data } = await this.octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });
    return data;
  }
}
