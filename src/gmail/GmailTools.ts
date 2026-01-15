import { google } from 'googleapis';
import { WorkspaceAuth } from '../auth/WorkspaceAuth.js';

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: boolean;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    mimeType: string;
  }>;
}

export class GmailTools {
  private gmail: any;
  private auth: WorkspaceAuth;

  constructor(auth: WorkspaceAuth) {
    this.auth = auth;
  }

  async initialize() {
    const authClient = await this.auth.getAuthClient();
    this.gmail = google.gmail({ version: 'v1', auth: authClient });
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<any> {
    await this.initialize();

    const { to, subject, body, html, cc, bcc, attachments } = options;

    // Build email message
    const headers = [
      `To: ${to}`,
      `Subject: ${subject}`,
    ];

    if (cc && cc.length > 0) {
      headers.push(`Cc: ${cc.join(', ')}`);
    }

    if (bcc && bcc.length > 0) {
      headers.push(`Bcc: ${bcc.join(', ')}`);
    }

    headers.push(`Content-Type: ${html ? 'text/html' : 'text/plain'}; charset=utf-8`);
    headers.push('');
    headers.push(body);

    const message = headers.join('\r\n');
    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const result = await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return result.data;
  }

  /**
   * Search emails
   */
  async searchEmails(query: string, maxResults: number = 10): Promise<any[]> {
    await this.initialize();

    const response = await this.gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });

    if (!response.data.messages) {
      return [];
    }

    // Fetch full message details
    const messages = await Promise.all(
      response.data.messages.map(async (msg: any) => {
        const details = await this.gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
        });
        return details.data;
      })
    );

    return messages;
  }

  /**
   * Get message by ID
   */
  async getMessage(messageId: string): Promise<any> {
    await this.initialize();

    const response = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
    });

    return response.data;
  }

  /**
   * Create draft
   */
  async createDraft(options: EmailOptions): Promise<any> {
    await this.initialize();

    const { to, subject, body, html } = options;

    const headers = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: ${html ? 'text/html' : 'text/plain'}; charset=utf-8`,
      '',
      body,
    ];

    const message = headers.join('\r\n');
    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const result = await this.gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw: encodedMessage,
        },
      },
    });

    return result.data;
  }
}
