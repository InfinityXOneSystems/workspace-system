import { google } from 'googleapis';
import { WorkspaceAuth } from '../auth/WorkspaceAuth.js';

export interface DocumentOptions {
  title: string;
  content?: string;
}

export class DocsTools {
  private docs: any;
  private drive: any;
  private auth: WorkspaceAuth;

  constructor(auth: WorkspaceAuth) {
    this.auth = auth;
  }

  async initialize() {
    const authClient = await this.auth.getAuthClient();
    this.docs = google.docs({ version: 'v1', auth: authClient });
    this.drive = google.drive({ version: 'v3', auth: authClient });
  }

  /**
   * Create new document
   */
  async createDocument(options: DocumentOptions): Promise<any> {
    await this.initialize();

    const { title, content } = options;

    const doc = await this.docs.documents.create({
      requestBody: {
        title,
      },
    });

    if (content) {
      await this.insertText(doc.data.documentId, content);
    }

    return doc.data;
  }

  /**
   * Insert text into document
   */
  async insertText(documentId: string, text: string, index: number = 1): Promise<any> {
    await this.initialize();

    const requests = [
      {
        insertText: {
          location: {
            index,
          },
          text,
        },
      },
    ];

    const result = await this.docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests,
      },
    });

    return result.data;
  }

  /**
   * Read document content
   */
  async readDocument(documentId: string): Promise<any> {
    await this.initialize();

    const doc = await this.docs.documents.get({
      documentId,
    });

    return doc.data;
  }

  /**
   * Replace text in document
   */
  async replaceText(documentId: string, findText: string, replaceWith: string): Promise<any> {
    await this.initialize();

    const requests = [
      {
        replaceAllText: {
          containsText: {
            text: findText,
            matchCase: true,
          },
          replaceText: replaceWith,
        },
      },
    ];

    const result = await this.docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests,
      },
    });

    return result.data;
  }
}
