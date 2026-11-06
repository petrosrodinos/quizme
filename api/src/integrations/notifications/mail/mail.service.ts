import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface MailMessage {
    to: string;
    subject: string;
    heading: string;
    body: string;
    cta?: { label: string; url: string };
}

/**
 * Transactional email. Sends through Resend when RESEND_API_KEY is configured; otherwise logs the
 * message (including action links) so local development flows remain usable.
 */
@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly client: Resend | null;
    private readonly from: string;

    constructor(config: ConfigService) {
        const key = config.get<string>('RESEND_API_KEY');
        this.client = key ? new Resend(key) : null;
        this.from = config.get<string>('SMTP_FROM') || 'QuizMe <info@logiqdev.com>';
        if (!this.client) this.logger.warn('RESEND_API_KEY not set — emails will be logged instead of sent');
    }

    async send(message: MailMessage): Promise<void> {
        const html = this.render(message);
        if (!this.client) {
            this.logger.log(`[email] to=${message.to} subject="${message.subject}"${message.cta ? ` link=${message.cta.url}` : ''}`);
            return;
        }
        const { error } = await this.client.emails.send({ from: this.from, to: message.to, subject: message.subject, html });
        if (error) {
            this.logger.error(`Failed to send email to ${message.to}: ${error.message}`);
            throw new Error(error.message);
        }
    }

    private render({ heading, body, cta }: MailMessage): string {
        const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
        return `<!doctype html><html><body style="margin:0;background:#faf9f5;font-family:Inter,Arial,sans-serif;color:#141413">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
<div style="font-family:Georgia,serif;font-size:22px;margin-bottom:24px">QuizMe</div>
<div style="background:#ffffff;border:1px solid #e6dfd8;border-radius:12px;padding:32px">
<h1 style="font-family:Georgia,serif;font-weight:400;font-size:26px;margin:0 0 16px">${esc(heading)}</h1>
<p style="font-size:15px;line-height:1.6;color:#3d3d3a;margin:0 0 24px">${esc(body)}</p>
${cta ? `<a href="${esc(cta.url)}" style="display:inline-block;background:#cc785c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:500">${esc(cta.label)}</a>` : ''}
</div>
<p style="font-size:12px;color:#8e8b82;margin-top:24px">You received this email because of activity on your QuizMe account.</p>
</div></body></html>`;
    }
}

@Global()
@Module({ providers: [MailService], exports: [MailService] })
export class MailModule { }
