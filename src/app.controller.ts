import { Controller, Get, Param, Query } from '@nestjs/common';
import { GitHubService } from './github.service';

@Controller()
export class AppController {
  constructor(private readonly appService: GitHubService) {}

  @Get('/repo/*')
  async repo(@Param() params, @Query('path') path: string): Promise<any> {
    const slug = params[0];
    return this.appService.getContent(slug, path);
  }
}
