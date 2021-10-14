import { Controller, Get, Param, Query } from '@nestjs/common';
import { GitHubService } from './github.service';

@Controller()
export class AppController {
  constructor(private readonly appService: GitHubService) {}

  @Get('/repo/*')
  repo(@Param() params, @Query('path') path: string) {
    const slug = params[0];
    return this.appService.getContent(slug, path);
  }

  @Get('/ping')
  ping() {
    return { message: 'pong' };
  }
}
