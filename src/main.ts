import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { EnvConfig } from './env-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(EnvConfig);
  await app.listen(config.port);
}
bootstrap();
