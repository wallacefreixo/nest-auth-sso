import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import session from 'express-session';
import csurf from 'csurf';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import { AppModule } from './app.module';

const SEVEN_DAYS_TO_MS = 7 * 24 * 1000 * 60 * 60;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const redisClient = createClient({
    url: process.env.REDIS_URL,
  });

  await redisClient.connect();

  app.use(cookieParser());

  app.use(helmet());

  app.use(
    session({
      name: process.env.SESSION_COOKIE_NAME,
      store: new RedisStore({ client: redisClient }),
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: SEVEN_DAYS_TO_MS,
      },
    }),
  );

  app.enableCors({
    origin: ['http://localhost:9000'],
    credentials: true,
  });

  app.use(
    csurf({
      cookie: {
        httpOnly: false,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    }),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  await app.listen(process.env.PORT);
}

bootstrap();
