import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { GitHubService } from './github.service';
import { EnvConfig } from './env-config.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [GitHubService, EnvConfig],
})
export class AppModule {}
