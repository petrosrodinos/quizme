import { Global, Module } from '@nestjs/common';
import { QuizzesController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';
import { LearnerProfileService } from './learner-profile.service';

@Global()
@Module({
    controllers: [QuizzesController],
    providers: [QuizzesService, LearnerProfileService],
    exports: [QuizzesService, LearnerProfileService],
})
export class QuizzesModule { }
