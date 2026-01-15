import { google } from 'googleapis';
import { WorkspaceAuth } from '../auth/WorkspaceAuth.js';

export interface SpreadsheetOptions {
  title: string;
  sheetTitles?: string[];
}

export interface AppendDataOptions {
  spreadsheetId: string;
  range: string;
  values: any[][];
}

export class SheetsTools {
  private sheets: any;
  private auth: WorkspaceAuth;

  constructor(auth: WorkspaceAuth) {
    this.auth = auth;
  }

  async initialize() {
    const authClient = await this.auth.getAuthClient();
    this.sheets = google.sheets({ version: 'v4', auth: authClient });
  }

  /**
   * Create new spreadsheet
   */
  async createSpreadsheet(options: SpreadsheetOptions): Promise<any> {
    await this.initialize();

    const { title, sheetTitles } = options;

    const resource: any = {
      properties: {
        title,
      },
    };

    if (sheetTitles && sheetTitles.length > 0) {
      resource.sheets = sheetTitles.map((sheetTitle) => ({
        properties: { title: sheetTitle },
      }));
    }

    const spreadsheet = await this.sheets.spreadsheets.create({
      requestBody: resource,
      fields: 'spreadsheetId, spreadsheetUrl, properties, sheets',
    });

    return spreadsheet.data;
  }

  /**
   * Append data to spreadsheet
   */
  async appendData(options: AppendDataOptions): Promise<any> {
    await this.initialize();

    const { spreadsheetId, range, values } = options;

    const result = await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    return result.data;
  }

  /**
   * Read data from spreadsheet
   */
  async readData(spreadsheetId: string, range: string): Promise<any[][]> {
    await this.initialize();

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return response.data.values || [];
  }

  /**
   * Update data in spreadsheet
   */
  async updateData(spreadsheetId: string, range: string, values: any[][]): Promise<any> {
    await this.initialize();

    const result = await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    return result.data;
  }

  /**
   * Format cells
   */
  async formatCells(spreadsheetId: string, requests: any[]): Promise<any> {
    await this.initialize();

    const result = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests,
      },
    });

    return result.data;
  }

  /**
   * Create new sheet in existing spreadsheet
   */
  async addSheet(spreadsheetId: string, title: string): Promise<any> {
    await this.initialize();

    const requests = [
      {
        addSheet: {
          properties: {
            title,
          },
        },
      },
    ];

    return await this.formatCells(spreadsheetId, requests);
  }
}
