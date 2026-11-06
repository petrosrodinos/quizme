import { Controller, Get, Global, Injectable, Module, NotFoundException, Param, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { StorageService } from './storage.service';

interface FileClaims {
    k: string; // storage key
    t: string; // content type
    n: string; // download filename
    d: 'inline' | 'attachment';
    purpose: 'file';
}

/** Issues short-lived signed URLs for private objects so files are never exposed through predictable public URLs. */
@Injectable()
export class FileTokenService {
    private readonly secret: string;
    private readonly apiUrl: string;

    constructor(
        private readonly jwt: JwtService,
        config: ConfigService,
    ) {
        this.secret = `${config.get('JWT_SECRET')}:files`;
        this.apiUrl = (config.get<string>('API_URL') || 'http://localhost:3000/api').replace(/\/$/, '');
    }

    signedUrl(key: string, contentType: string, filename: string, disposition: 'inline' | 'attachment' = 'inline', ttlSeconds = 3600): string {
        const token = this.jwt.sign({ k: key, t: contentType, n: filename, d: disposition, purpose: 'file' } satisfies FileClaims, {
            secret: this.secret,
            expiresIn: ttlSeconds,
        });
        return `${this.apiUrl}/files/${token}`;
    }

    verify(token: string): FileClaims {
        try {
            const claims = this.jwt.verify<FileClaims>(token, { secret: this.secret });
            if (claims.purpose !== 'file') throw new Error('bad purpose');
            return claims;
        } catch {
            throw new NotFoundException('Link expired or invalid');
        }
    }
}

@ApiTags('Files')
@Controller('files')
export class FilesController {
    constructor(
        private readonly tokens: FileTokenService,
        private readonly storage: StorageService,
    ) { }

    @Get(':token')
    async get(@Param('token') token: string, @Res() res: Response) {
        const claims = this.tokens.verify(token);
        const stream = await this.storage.stream(claims.k);
        res.setHeader('Content-Type', claims.t);
        res.setHeader('Content-Disposition', `${claims.d}; filename="${encodeURIComponent(claims.n)}"`);
        res.setHeader('Cache-Control', 'private, max-age=600');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        stream.on('error', () => res.status(404).end());
        stream.pipe(res);
    }
}

@Global()
@Module({
    imports: [JwtModule.register({})],
    controllers: [FilesController],
    providers: [FileTokenService],
    exports: [FileTokenService],
})
export class FileTokenModule { }
