import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GitHubAuthCredentials {
  clientId: string;
  clientSecret: string;
}

@Injectable()
export class EnvConfig {
  constructor(private configService: ConfigService) {}

  get gitHubAuth(): GitHubAuthCredentials {
    return {
      clientId: this.configService.get('GITHUB_CLIENT_ID'),
      clientSecret: this.configService.get('GITHUB_CLIENT_SECRET'),
    };
  }

  get maxCacheSizeBytes(): number {
    const maxMegabytes = this.configService.get('MAX_CACHE_SIZE_MB') || 200;
    return maxMegabytes * 1024 * 1024;
  }

  get port(): number {
    return this.configService.get('PORT') || 3000;
  }
}
