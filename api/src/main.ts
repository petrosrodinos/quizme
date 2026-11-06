import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { parseCorsUrls, resolveCorsOrigins } from './shared/config/cors';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false });
    const logger = new Logger('Bootstrap');

    app.set('trust proxy', 1);
    app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
    app.use(json({ limit: '2mb' }));
    app.use(urlencoded({ extended: true, limit: '2mb' }));
    app.setGlobalPrefix('api', { exclude: ['/'] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: false } }));
    app.enableShutdownHooks();

    const corsOrigins = resolveCorsOrigins({
        nodeEnv: process.env.NODE_ENV,
        corsUrls: parseCorsUrls(process.env.CORS_URLS),
        appUrl: process.env.APP_URL,
        landingUrl: process.env.LANDING_URL,
    });
    app.enableCors({
        origin: corsOrigins.length ? corsOrigins : true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });

    if (process.env.NODE_ENV !== 'production') {
        const swaggerConfig = new DocumentBuilder()
            .setTitle('QuizMe API')
            .setDescription('AI study & exam preparation platform')
            .setVersion('1.0')
            .addBearerAuth()
            .build();
        SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));
    }

    const port = process.env.PORT ? Number(process.env.PORT) : 3000;
    await app.listen(port);
    logger.log(`API listening on http://localhost:${port}/api (docs: /api/docs)`);
}
bootstrap();
