import { google } from 'googleapis';
import { WorkspaceAuth } from '../auth/WorkspaceAuth.js';

export interface EventOptions {
  summary: string;
  description?: string;
  start: string; // ISO 8601 format
  end: string;   // ISO 8601 format
  attendees?: string[];
  location?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

export class CalendarTools {
  private calendar: any;
  private auth: WorkspaceAuth;

  constructor(auth: WorkspaceAuth) {
    this.auth = auth;
  }

  async initialize() {
    const authClient = await this.auth.getAuthClient();
    this.calendar = google.calendar({ version: 'v3', auth: authClient });
  }

  /**
   * Create calendar event
   */
  async createEvent(options: EventOptions): Promise<any> {
    await this.initialize();

    const { summary, description, start, end, attendees, location, reminders } = options;

    const event: any = {
      summary,
      start: {
        dateTime: start,
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: end,
        timeZone: 'America/New_York',
      },
    };

    if (description) event.description = description;
    if (location) event.location = location;
    
    if (attendees && attendees.length > 0) {
      event.attendees = attendees.map(email => ({ email }));
    }

    if (reminders) {
      event.reminders = reminders;
    }

    const result = await this.calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all',
    });

    return result.data;
  }

  /**
   * List upcoming events
   */
  async listEvents(maxResults: number = 10): Promise<any[]> {
    await this.initialize();

    const response = await this.calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  }

  /**
   * Delete event
   */
  async deleteEvent(eventId: string): Promise<void> {
    await this.initialize();

    await this.calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });
  }

  /**
   * Update event
   */
  async updateEvent(eventId: string, updates: Partial<EventOptions>): Promise<any> {
    await this.initialize();

    // Get existing event first
    const existing = await this.calendar.events.get({
      calendarId: 'primary',
      eventId,
    });

    // Merge updates
    const event = { ...existing.data, ...updates };

    const result = await this.calendar.events.update({
      calendarId: 'primary',
      eventId,
      requestBody: event,
      sendUpdates: 'all',
    });

    return result.data;
  }
}
