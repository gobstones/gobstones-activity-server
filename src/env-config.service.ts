import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GitHubAuthCredentials {
  clientId: string;
  clientSecret: string;
}

export interface DiscordWebhookCredentials {
  id: string;
  token: string;
}

export interface GitHubRepo {
  owner: string;
  repo: string;
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

  get githubBotToken(): string {
    return this.configService.get('GITHUB_BOT_TOKEN');
  }

  get githubIssueTracker(): GitHubRepo {
    return {
      owner: this.configService.get('GITHUB_ISSUES_OWNER') || 'gobstones',
      repo: this.configService.get('GITHUB_ISSUES_REPO') || 'gobstones-issues',
    };
  }

  get maxCacheSizeBytes(): number {
    const maxMegabytes = this.configService.get('MAX_CACHE_SIZE_MB') || 200;
    return maxMegabytes * 1024 * 1024;
  }

  get port(): number {
    return this.configService.get('PORT') || 3000;
  }

  get discordWebhook(): DiscordWebhookCredentials {
    return {
      id: this.configService.get('DISCORD_WEBHOOK_ID'),
      token: this.configService.get('DISCORD_WEBHOOK_TOKEN'),
    };
  }
}
