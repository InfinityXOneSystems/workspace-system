import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const config = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'infinity-x-one-systems',
  serviceAccountPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'trinity-workspace-agent@infinity-x-one-systems.iam.gserviceaccount.com',
  delegatedUser: process.env.GOOGLE_DELEGATED_USER || 'info@infinityxonesystems.com',
  scopes: [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ],
};
