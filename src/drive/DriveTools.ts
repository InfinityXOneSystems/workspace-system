import { google } from 'googleapis';
import { WorkspaceAuth } from '../auth/WorkspaceAuth.js';
import fs from 'fs';
import { Readable } from 'stream';

export interface FileUploadOptions {
  name: string;
  content: Buffer | string;
  mimeType: string;
  folderId?: string;
  description?: string;
}

export class DriveTools {
  private drive: any;
  private auth: WorkspaceAuth;

  constructor(auth: WorkspaceAuth) {
    this.auth = auth;
  }

  async initialize() {
    const authClient = await this.auth.getAuthClient();
    this.drive = google.drive({ version: 'v3', auth: authClient });
  }

  /**
   * Upload file to Drive
   */
  async uploadFile(options: FileUploadOptions): Promise<any> {
    await this.initialize();

    const { name, content, mimeType, folderId, description } = options;

    const fileMetadata: any = {
      name,
      mimeType,
    };

    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    if (description) {
      fileMetadata.description = description;
    }

    const media = {
      mimeType,
      body: Readable.from([content]),
    };

    const file = await this.drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink',
    });

    return file.data;
  }

  /**
   * Create folder
   */
  async createFolder(name: string, parentId?: string): Promise<any> {
    await this.initialize();

    const fileMetadata: any = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentId) {
      fileMetadata.parents = [parentId];
    }

    const folder = await this.drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name, webViewLink',
    });

    return folder.data;
  }

  /**
   * Search files
   */
  async searchFiles(query: string, maxResults: number = 10): Promise<any[]> {
    await this.initialize();

    const response = await this.drive.files.list({
      q: query,
      pageSize: maxResults,
      fields: 'files(id, name, mimeType, createdTime, modifiedTime, webViewLink)',
    });

    return response.data.files || [];
  }

  /**
   * Download file
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    await this.initialize();

    const response = await this.drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    return Buffer.from(response.data);
  }

  /**
   * Share file with user
   */
  async shareFile(fileId: string, email: string, role: 'reader' | 'writer' | 'commenter' = 'reader'): Promise<any> {
    await this.initialize();

    const permission = await this.drive.permissions.create({
      fileId,
      requestBody: {
        type: 'user',
        role,
        emailAddress: email,
      },
      sendNotificationEmail: true,
    });

    return permission.data;
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.initialize();
    await this.drive.files.delete({ fileId });
  }
}
