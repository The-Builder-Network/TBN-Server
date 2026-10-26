import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface MailMessage {
  to: string;
  subject: string;
  /** Plain paragraphs; rendered into the branded HTML layout. */
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Transactional email via Resend. Sending never throws: failures are logged so
 * an email outage can't break the API request that triggered it.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  readonly frontendUrl: string;

  constructor(config: ConfigService) {
    const key = config.get<string>('RESEND_API_KEY');
    this.resend = key ? new Resend(key) : null;
    this.from =
      config.get<string>('EMAIL_FROM') ??
      'The Builder Network <noreply@thebuildernetwork.com>';
    this.frontendUrl = (config.get<string>('FRONTEND_URL') ?? '').replace(
      /\/$/,
      '',
    );
    if (!this.resend)
      this.logger.warn('RESEND_API_KEY not set — emails are logged, not sent');
  }

  /** Absolute link into the web app. */
  link(path: string): string {
    return `${this.frontendUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  async send(msg: MailMessage): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[mail disabled] to=${msg.to} subject="${msg.subject}"`);
      return;
    }
    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to: msg.to,
        subject: msg.subject,
        html: this.render(msg),
        text: [
          msg.heading,
          ...msg.paragraphs,
          msg.cta ? `${msg.cta.label}: ${msg.cta.url}` : '',
        ]
          .filter(Boolean)
          .join('\n\n'),
      });
      if (error)
        this.logger.error(`Email to ${msg.to} failed: ${error.message}`);
    } catch (err) {
      this.logger.error(`Email to ${msg.to} failed: ${(err as Error).message}`);
    }
  }

  private render(msg: MailMessage): string {
    const paras = msg.paragraphs
      .map(
        (p) =>
          `<p style="margin:0 0 14px;line-height:1.55">${escapeHtml(p)}</p>`,
      )
      .join('');
    const cta = msg.cta
      ? `<p style="margin:24px 0"><a href="${escapeHtml(msg.cta.url)}" style="background:#0a68ff;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${escapeHtml(msg.cta.label)}</a></p>`
      : '';
    return `<!doctype html><html><body style="margin:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#111827">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<p style="font-weight:700;font-size:18px;margin:0 0 20px">The Builder Network</p>
<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px">
<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(msg.heading)}</h1>${paras}${cta}
</div>
<p style="font-size:12px;color:#6b7280;margin:20px 0 0">Questions? Email support@thebuildernetwork.com</p>
</div></body></html>`;
  }
}
