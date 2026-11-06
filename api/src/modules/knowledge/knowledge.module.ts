import { Global, Module } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { SearchController } from './search.controller';

@Global()
@Module({
    controllers: [SearchController],
    providers: [KnowledgeService],
    exports: [KnowledgeService],
})
export class KnowledgeModule { }
