import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { BugReport } from './models/bug_report.model';
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

  @Post('/issues')
  async createIssue(@Body() report: BugReport) {
    return { url: await this.githubService.createIssue(new BugReport(report)) };
  }

  @Get('/ping')
  ping() {
    return { message: 'pong' };
  }

  @Get('/status')
  status() {
    return promiseProps({
      githubRate: this.githubService.rateLimit(),
      cacheUsage: Promise.resolve(this.githubService.cacheUsage()),
    });
  }
}
