import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { ConfigModule } from './shared/config/env/env.module';
import { PrismaModule } from './core/databases/prisma/prisma.module';
import { RedisModule } from './core/databases/redis/redis.module';
import { JobsModule } from './core/jobs/jobs.module';
import { RealtimeModule } from './core/realtime/realtime.module';
import { StorageModule } from './core/storage/storage.service';
import { FileTokenModule } from './core/storage/file-token.service';
import { AccessModule } from './shared/access/project-access.service';
import { AuditModule } from './shared/audit/audit.service';
import { DomainEventsModule } from './shared/events/domain-events.service';
import { AiIntegrationModule } from './integrations/ai/ai.module';
import { MailModule } from './integrations/notifications/mail/mail.service';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { TopicsModule } from './modules/topics/topics.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { FlashcardsModule } from './modules/flashcards/flashcards.module';
import { NotesModule } from './modules/notes/notes.controller';
import { SummariesModule } from './modules/summaries/summaries.module';
import { LearningModule } from './modules/learning/learning.module';
import { TutorModule } from './modules/tutor/tutor.module';
import { StudyModule } from './modules/study/study.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { ExportsModule } from './modules/exports/exports.module';

@Module({
    imports: [
        ConfigModule,
        ScheduleModule.forRoot(),
        ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
        // core infrastructure
        PrismaModule,
        RedisModule,
        JobsModule,
        RealtimeModule,
        StorageModule,
        FileTokenModule,
        AccessModule,
        AuditModule,
        DomainEventsModule,
        AiIntegrationModule,
        MailModule,
        // domains
        AiModule,
        AuthModule,
        UsersModule,
        HealthModule,
        ProjectsModule,
        KnowledgeModule,
        DocumentsModule,
        TopicsModule,
        QuestionsModule,
        QuizzesModule,
        NotificationsModule,
        GamificationModule,
        FlashcardsModule,
        NotesModule,
        SummariesModule,
        LearningModule,
        TutorModule,
        StudyModule,
        CollaborationModule,
        RoomsModule,
        ExportsModule,
    ],
    controllers: [AppController],
    providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule { }
