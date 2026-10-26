import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { allowedOrigins } from './common/cors.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true, // Stripe webhook signature verification needs the raw body
    bufferLogs: true,
  });

  // Behind a load balancer / proxy: use the client IP for rate limiting and logs.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false, // JSON API only; Socket.IO + Stripe redirects
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.useLogger(app.get(Logger));

  app.enableCors({ origin: allowedOrigins(), credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  app
    .get(Logger)
    .log(
      `Server running on http://localhost:${port} (CORS: ${allowedOrigins().join(', ')})`,
    );
}
void bootstrap();
