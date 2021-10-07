import { Controller, Get, Param } from '@nestjs/common';
import { GitHubService } from './github.service';

@Controller()
export class AppController {
  constructor(private readonly appService: GitHubService) {}

  @Get('/repo/*')
  async repo(@Param() params): Promise<any> {
    const slug = params[0];
    return this.appService.getContent(slug);
  }
}
