import { Controller, Get, Param, Query } from '@nestjs/common';
import { GitHubService } from './github.service';
import { promiseProps } from './utils/promise';

@Controller()
export class AppController {
  constructor(private readonly githubService: GitHubService) {}

  @Get('/repo/*')
  repo(@Param() params, @Query('path') path: string) {
    const slug = params[0];
    return this.githubService.repositoryContents(slug, path);
  }

  @Get('/ping')
  ping() {
    return { message: 'pong' };
  }

  @Get('/status')
  status() {
    return promiseProps({
      gitHubRate: this.githubService.rateLimit(),
      cacheUsage: Promise.resolve(this.githubService.cacheUsage()),
    });
  }
}
