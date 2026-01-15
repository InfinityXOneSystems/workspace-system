import express from 'express';
import { GmailTools } from './gmail/GmailTools.js';
import { DriveTools } from './drive/DriveTools.js';
import { SheetsTools } from './sheets/SheetsTools.js';
import { DocsTools } from './docs/DocsTools.js';
import { CalendarTools } from './calendar/CalendarTools.js';
import { WorkspaceAuth } from './auth/WorkspaceAuth.js';
import { config } from './config.js';

const app = express();
app.use(express.json());

// Initialize authentication
const auth = new WorkspaceAuth(config.serviceAccountPath);

// Initialize all Google Workspace tools
const gmail = new GmailTools(auth);
const drive = new DriveTools(auth);
const sheets = new SheetsTools(auth);
const docs = new DocsTools(auth);
const calendar = new CalendarTools(auth);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'google-workspace-system',
    version: '1.0.0',
    tools: ['gmail', 'drive', 'sheets', 'docs', 'calendar'],
  });
});

// Gmail endpoints
app.post('/gmail/send', async (req, res) => {
  try {
    const result = await gmail.sendEmail(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/gmail/search', async (req, res) => {
  try {
    const { query } = req.query;
    const messages = await gmail.searchEmails(query as string);
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Drive endpoints
app.post('/drive/upload', async (req, res) => {
  try {
    const file = await drive.uploadFile(req.body);
    res.json({ success: true, data: file });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/drive/search', async (req, res) => {
  try {
    const { query } = req.query;
    const files = await drive.searchFiles(query as string);
    res.json({ success: true, data: files });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Sheets endpoints
app.post('/sheets/create', async (req, res) => {
  try {
    const sheet = await sheets.createSpreadsheet(req.body);
    res.json({ success: true, data: sheet });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/sheets/append', async (req, res) => {
  try {
    const result = await sheets.appendData(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Docs endpoints
app.post('/docs/create', async (req, res) => {
  try {
    const doc = await docs.createDocument(req.body);
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Calendar endpoints
app.post('/calendar/create-event', async (req, res) => {
  try {
    const event = await calendar.createEvent(req.body);
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`✅ Google Workspace System running on port ${PORT}`);
  console.log(`📧 Gmail Tools: Active`);
  console.log(`📁 Drive Tools: Active`);
  console.log(`📊 Sheets Tools: Active`);
  console.log(`📝 Docs Tools: Active`);
  console.log(`📅 Calendar Tools: Active`);
});

export { app, gmail, drive, sheets, docs, calendar };
