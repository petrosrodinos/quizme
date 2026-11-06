import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
    @Get()
    root() {
        return { name: 'QuizMe API', status: 'ok', docs: '/api/docs' };
    }
}
