import { Global, Module } from '@nestjs/common';
import { FlashcardsController } from './flashcards.controller';
import { FlashcardsService } from './flashcards.service';

@Global()
@Module({
    controllers: [FlashcardsController],
    providers: [FlashcardsService],
    exports: [FlashcardsService],
})
export class FlashcardsModule { }
