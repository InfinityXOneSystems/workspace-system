import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { config } from '../config.js';
import fs from 'fs';

export class WorkspaceAuth {
  private jwtClient: JWT;
  private serviceAccountKey: any;

  constructor(serviceAccountPath: string) {
    // Load service account key
    this.serviceAccountKey = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    // Create JWT client
    this.jwtClient = new google.auth.JWT({
      email: this.serviceAccountKey.client_email,
      key: this.serviceAccountKey.private_key,
      scopes: config.scopes,
      subject: config.delegatedUser, // Domain-wide delegation
    });
  }

  async getAuthClient(): Promise<JWT> {
    await this.jwtClient.authorize();
    return this.jwtClient;
  }

  getServiceAccountEmail(): string {
    return this.serviceAccountKey.client_email;
  }
}
