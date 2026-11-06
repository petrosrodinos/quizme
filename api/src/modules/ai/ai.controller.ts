import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AiService } from './ai.service';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('ai')
export class AiController {
    constructor(
        private readonly ai: AiService,
        private readonly prisma: PrismaService,
    ) { }

    @Get('status')
    @ApiOperation({ summary: 'AI provider/model configuration' })
    status() {
        return this.ai.providerInfo;
    }

    @Get('usage')
    @ApiOperation({ summary: 'Token usage and estimated cost for the current user (last 30 days)' })
    async usage(@CurrentUser('id') userId: string) {
        const since = new Date(Date.now() - 30 * 86_400_000);
        const dayAgo = new Date(Date.now() - 86_400_000);
        const [byTask, last24h] = await Promise.all([
            this.prisma.aiUsage.groupBy({
                by: ['task'],
                where: { user_id: userId, created_at: { gte: since } },
                _sum: { input_tokens: true, output_tokens: true, cost_usd: true },
                _count: { _all: true },
            }),
            this.prisma.aiUsage.aggregate({
                where: { user_id: userId, created_at: { gte: dayAgo } },
                _sum: { input_tokens: true, output_tokens: true },
            }),
        ]);
        return {
            last_24h_tokens: (last24h._sum.input_tokens ?? 0) + (last24h._sum.output_tokens ?? 0),
            by_task: byTask.map((t) => ({
                task: t.task,
                calls: t._count._all,
                tokens: (t._sum.input_tokens ?? 0) + (t._sum.output_tokens ?? 0),
                cost_usd: Number((t._sum.cost_usd ?? 0).toFixed(4)),
            })),
        };
    }
}
