import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnvConfig {
  constructor(private configService: ConfigService) {}

  get gitHubToken(): string {
    return this.configService.get('GITHUB_TOKEN');
  }
}
