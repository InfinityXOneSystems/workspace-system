/**
 * INFINITY X AI - ORCHESTRATOR
 * Central orchestration layer for Google Workspace operations
 */

import { GmailTools } from '../gmail/GmailTools.js';
import { CalendarTools } from '../calendar/CalendarTools.js';
import { DriveTools } from '../drive/DriveTools.js';
import { SheetsTools } from '../sheets/SheetsTools.js';
import { DocsTools } from '../docs/DocsTools.js';
import { WorkspaceAuth } from '../auth/WorkspaceAuth.js';
import { config } from '../config.js';

export interface OrchestratorResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class Orchestrator {
  private auth: WorkspaceAuth;
  private gmail: GmailTools;
  private calendar: CalendarTools;
  private drive: DriveTools;
  private sheets: SheetsTools;
  private docs: DocsTools;
  private initialized: boolean = false;

  constructor() {
    // Initialize auth with service account
    if (!config.serviceAccountPath) {
      console.warn('Warning: GOOGLE_APPLICATION_CREDENTIALS not set. Some features may not work.');
    }
    
    if (config.serviceAccountPath) {
      this.auth = new WorkspaceAuth(config.serviceAccountPath);
      this.gmail = new GmailTools(this.auth);
      this.calendar = new CalendarTools(this.auth);
      this.drive = new DriveTools(this.auth);
      this.sheets = new SheetsTools(this.auth);
      this.docs = new DocsTools(this.auth);
    }
  }

  private async ensureInitialized() {
    if (!this.initialized && config.serviceAccountPath) {
      try {
        await this.gmail.initialize();
        await this.calendar.initialize();
        await this.drive.initialize();
        await this.sheets.initialize();
        await this.docs.initialize();
        this.initialized = true;
      } catch (error) {
        console.error('Failed to initialize orchestrator:', error);
        throw error;
      }
    }
  }

  /**
   * Gmail operations orchestration
   */
  async gworkspaceGmail(action: string, params: any): Promise<OrchestratorResult> {
    try {
      await this.ensureInitialized();

      switch (action) {
        case 'list':
        case 'search':
          const messages = await this.gmail.searchEmails(params.query || '', params.maxResults || 50);
          return { success: true, data: messages };

        case 'send':
          const result = await this.gmail.sendEmail({
            to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
            subject: params.subject,
            body: params.body,
            cc: params.cc,
            bcc: params.bcc,
            html: params.html
          });
          return { success: true, data: result };

        case 'read':
        case 'get':
          const message = await this.gmail.readEmail(params.messageId);
          return { success: true, data: message };

        case 'draft':
          const draft = await this.gmail.createDraft({
            to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
            subject: params.subject,
            body: params.body,
            html: params.html
          });
          return { success: true, data: draft };

        default:
          return { success: false, error: `Unknown Gmail action: ${action}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Calendar operations orchestration
   */
  async gworkspaceCalendar(action: string, params: any): Promise<OrchestratorResult> {
    try {
      await this.ensureInitialized();

      switch (action) {
        case 'list':
          const events = await this.calendar.listEvents(
            params.calendarId || 'primary',
            params.timeMin,
            params.timeMax
          );
          return { success: true, data: events };

        case 'create':
          const newEvent = await this.calendar.createEvent(
            params.calendarId || 'primary',
            params.event
          );
          return { success: true, data: newEvent };

        case 'update':
          const updatedEvent = await this.calendar.updateEvent(
            params.calendarId || 'primary',
            params.eventId,
            params.updates
          );
          return { success: true, data: updatedEvent };

        case 'delete':
          await this.calendar.deleteEvent(params.calendarId || 'primary', params.eventId);
          return { success: true };

        default:
          return { success: false, error: `Unknown Calendar action: ${action}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Drive operations orchestration
   */
  async gworkspaceDrive(action: string, params: any): Promise<OrchestratorResult> {
    try {
      await this.ensureInitialized();

      switch (action) {
        case 'list':
        case 'search':
          const files = await this.drive.searchFiles(params.query || '', params.pageSize || 100);
          return { success: true, data: files };

        case 'get':
          const file = await this.drive.getFile(params.fileId);
          return { success: true, data: file };

        case 'create':
        case 'upload':
          const uploadedFile = await this.drive.uploadFile({
            name: params.name,
            mimeType: params.mimeType,
            content: params.content,
            folderId: params.folderId
          });
          return { success: true, data: uploadedFile };

        case 'createFolder':
          const folder = await this.drive.createFolder(params.name, params.parentId);
          return { success: true, data: folder };

        case 'share':
          await this.drive.shareFile(params.fileId, params.email, params.role || 'reader');
          return { success: true };

        case 'delete':
          await this.drive.deleteFile(params.fileId);
          return { success: true };

        case 'download':
          const content = await this.drive.downloadFile(params.fileId);
          return { success: true, data: content };

        default:
          return { success: false, error: `Unknown Drive action: ${action}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Sheets operations orchestration
   */
  async gworkspaceSheets(action: string, params: any): Promise<OrchestratorResult> {
    try {
      await this.ensureInitialized();

      switch (action) {
        case 'create':
          const spreadsheet = await this.sheets.createSpreadsheet(params.title);
          return { success: true, data: spreadsheet };

        case 'read':
        case 'get':
          const data = await this.sheets.getValues(params.spreadsheetId, params.range);
          return { success: true, data };

        case 'append':
          await this.sheets.appendValues(params.spreadsheetId, params.range, params.values);
          return { success: true };

        case 'update':
          await this.sheets.updateValues(params.spreadsheetId, params.range, params.values);
          return { success: true };

        case 'format':
          await this.sheets.formatCells(
            params.spreadsheetId,
            params.sheetId,
            params.startRow,
            params.endRow,
            params.startCol,
            params.endCol,
            params.format
          );
          return { success: true };

        default:
          return { success: false, error: `Unknown Sheets action: ${action}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Docs operations orchestration
   */
  async gworkspaceDocs(action: string, params: any): Promise<OrchestratorResult> {
    try {
      await this.ensureInitialized();

      switch (action) {
        case 'create':
          const doc = await this.docs.createDocument(params.title);
          return { success: true, data: doc };

        case 'insertText':
          await this.docs.insertText(params.documentId, params.text, params.index);
          return { success: true };

        case 'replaceText':
          await this.docs.replaceText(params.documentId, params.search, params.replace);
          return { success: true };

        default:
          return { success: false, error: `Unknown Docs action: ${action}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const orchestrator = new Orchestrator();
