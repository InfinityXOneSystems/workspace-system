/**
 * INFINITY X AI - GOOGLE CLOUD PLATFORM INTEGRATION
 * Complete GCP Service Integration Module
 */

import { GOOGLE_CLOUD_CONFIG } from '../shared/globalMetaSuite';

// ============================================================================
// FIRESTORE CLIENT
// ============================================================================

export class FirestoreClient {
  private projectId: string;
  private baseUrl: string;

  constructor() {
    this.projectId = GOOGLE_CLOUD_CONFIG.project.id;
    this.baseUrl = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents`;
  }

  async getDocument(collection: string, docId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/${collection}/${docId}`, {
      headers: this.getHeaders(),
    });
    return response.json();
  }

  async setDocument(collection: string, docId: string, data: Record<string, any>): Promise<any> {
    const response = await fetch(`${this.baseUrl}/${collection}/${docId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ fields: this.convertToFirestoreFormat(data) }),
    });
    return response.json();
  }

  async queryCollection(collection: string, filters?: QueryFilter[]): Promise<any[]> {
    const query = {
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: filters ? this.buildWhereClause(filters) : undefined,
      },
    };

    const response = await fetch(`${this.baseUrl}:runQuery`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(query),
    });

    const results = await response.json();
    return results.map((r: any) => this.convertFromFirestoreFormat(r.document?.fields || {}));
  }

  async deleteDocument(collection: string, docId: string): Promise<void> {
    await fetch(`${this.baseUrl}/${collection}/${docId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
  }

  async batchWrite(operations: BatchOperation[]): Promise<void> {
    const writes = operations.map(op => ({
      [op.type]: {
        name: `${this.baseUrl}/${op.collection}/${op.docId}`,
        fields: op.type === 'update' ? this.convertToFirestoreFormat(op.data!) : undefined,
      },
    }));

    await fetch(`${this.baseUrl}:batchWrite`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ writes }),
    });
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GCP_ACCESS_TOKEN || ''}`,
    };
  }

  private convertToFirestoreFormat(data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = this.valueToFirestore(value);
    }
    return result;
  }

  private valueToFirestore(value: any): any {
    if (value === null) return { nullValue: null };
    if (typeof value === 'boolean') return { booleanValue: value };
    if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: value } : { doubleValue: value };
    if (typeof value === 'string') return { stringValue: value };
    if (value instanceof Date) return { timestampValue: value.toISOString() };
    if (Array.isArray(value)) return { arrayValue: { values: value.map(v => this.valueToFirestore(v)) } };
    if (typeof value === 'object') return { mapValue: { fields: this.convertToFirestoreFormat(value) } };
    return { stringValue: String(value) };
  }

  private convertFromFirestoreFormat(fields: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(fields)) {
      result[key] = this.valueFromFirestore(value);
    }
    return result;
  }

  private valueFromFirestore(value: any): any {
    if ('nullValue' in value) return null;
    if ('booleanValue' in value) return value.booleanValue;
    if ('integerValue' in value) return parseInt(value.integerValue);
    if ('doubleValue' in value) return value.doubleValue;
    if ('stringValue' in value) return value.stringValue;
    if ('timestampValue' in value) return new Date(value.timestampValue);
    if ('arrayValue' in value) return (value.arrayValue.values || []).map((v: any) => this.valueFromFirestore(v));
    if ('mapValue' in value) return this.convertFromFirestoreFormat(value.mapValue.fields || {});
    return null;
  }

  private buildWhereClause(filters: QueryFilter[]): any {
    if (filters.length === 1) {
      return { fieldFilter: this.buildFieldFilter(filters[0]) };
    }
    return {
      compositeFilter: {
        op: 'AND',
        filters: filters.map(f => ({ fieldFilter: this.buildFieldFilter(f) })),
      },
    };
  }

  private buildFieldFilter(filter: QueryFilter): any {
    return {
      field: { fieldPath: filter.field },
      op: filter.op,
      value: this.valueToFirestore(filter.value),
    };
  }
}

interface QueryFilter {
  field: string;
  op: 'EQUAL' | 'NOT_EQUAL' | 'LESS_THAN' | 'LESS_THAN_OR_EQUAL' | 'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL' | 'ARRAY_CONTAINS' | 'IN';
  value: any;
}

interface BatchOperation {
  type: 'update' | 'delete';
  collection: string;
  docId: string;
  data?: Record<string, any>;
}

// ============================================================================
// VERTEX AI CLIENT
// ============================================================================

export class VertexAIClient {
  private projectId: string;
  private region: string;
  private baseUrl: string;

  constructor() {
    this.projectId = GOOGLE_CLOUD_CONFIG.project.id;
    this.region = GOOGLE_CLOUD_CONFIG.project.region;
    this.baseUrl = `https://${this.region}-aiplatform.googleapis.com/v1`;
  }

  async generateContent(prompt: string, options?: GenerateOptions): Promise<string> {
    const model = options?.model || GOOGLE_CLOUD_CONFIG.vertexAI.models.gemini;
    const endpoint = `${this.baseUrl}/projects/${this.projectId}/locations/${this.region}/publishers/google/models/${model}:generateContent`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature || 0.7,
          maxOutputTokens: options?.maxTokens || 8192,
          topP: options?.topP || 0.95,
        },
      }),
    });

    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const model = GOOGLE_CLOUD_CONFIG.vertexAI.models.embedding;
    const endpoint = `${this.baseUrl}/projects/${this.projectId}/locations/${this.region}/publishers/google/models/${model}:predict`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        instances: [{ content: text }],
      }),
    });

    const result = await response.json();
    return result.predictions?.[0]?.embeddings?.values || [];
  }

  async analyzeImage(imageUrl: string, prompt: string): Promise<string> {
    const model = GOOGLE_CLOUD_CONFIG.vertexAI.models.vision;
    const endpoint = `${this.baseUrl}/projects/${this.projectId}/locations/${this.region}/publishers/google/models/${model}:generateContent`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: await this.fetchImageAsBase64(imageUrl) } },
          ],
        }],
      }),
    });

    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async predict(endpointId: string, instances: any[]): Promise<any[]> {
    const endpoint = `${this.baseUrl}/projects/${this.projectId}/locations/${this.region}/endpoints/${endpointId}:predict`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ instances }),
    });

    const result = await response.json();
    return result.predictions || [];
  }

  private async fetchImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GCP_ACCESS_TOKEN || ''}`,
    };
  }
}

interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

// ============================================================================
// PUB/SUB CLIENT
// ============================================================================

export class PubSubClient {
  private projectId: string;
  private baseUrl: string;

  constructor() {
    this.projectId = GOOGLE_CLOUD_CONFIG.project.id;
    this.baseUrl = `https://pubsub.googleapis.com/v1/projects/${this.projectId}`;
  }

  async publish(topic: string, message: any, attributes?: Record<string, string>): Promise<string> {
    const topicPath = `${this.baseUrl}/topics/${topic}`;
    const data = Buffer.from(JSON.stringify(message)).toString('base64');

    const response = await fetch(`${topicPath}:publish`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        messages: [{ data, attributes }],
      }),
    });

    const result = await response.json();
    return result.messageIds?.[0] || '';
  }

  async publishBatch(topic: string, messages: Array<{ data: any; attributes?: Record<string, string> }>): Promise<string[]> {
    const topicPath = `${this.baseUrl}/topics/${topic}`;

    const response = await fetch(`${topicPath}:publish`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        messages: messages.map(m => ({
          data: Buffer.from(JSON.stringify(m.data)).toString('base64'),
          attributes: m.attributes,
        })),
      }),
    });

    const result = await response.json();
    return result.messageIds || [];
  }

  async pull(subscription: string, maxMessages: number = 10): Promise<PubSubMessage[]> {
    const subPath = `${this.baseUrl}/subscriptions/${subscription}`;

    const response = await fetch(`${subPath}:pull`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ maxMessages }),
    });

    const result = await response.json();
    return (result.receivedMessages || []).map((m: any) => ({
      id: m.message.messageId,
      data: JSON.parse(Buffer.from(m.message.data, 'base64').toString()),
      attributes: m.message.attributes || {},
      ackId: m.ackId,
      publishTime: new Date(m.message.publishTime),
    }));
  }

  async acknowledge(subscription: string, ackIds: string[]): Promise<void> {
    const subPath = `${this.baseUrl}/subscriptions/${subscription}`;

    await fetch(`${subPath}:acknowledge`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ackIds }),
    });
  }

  async createTopic(topic: string): Promise<void> {
    await fetch(`${this.baseUrl}/topics/${topic}`, {
      method: 'PUT',
      headers: this.getHeaders(),
    });
  }

  async createSubscription(subscription: string, topic: string, options?: SubscriptionOptions): Promise<void> {
    await fetch(`${this.baseUrl}/subscriptions/${subscription}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({
        topic: `projects/${this.projectId}/topics/${topic}`,
        ackDeadlineSeconds: options?.ackDeadlineSeconds || 60,
        messageRetentionDuration: options?.messageRetentionDuration || '604800s',
        retryPolicy: options?.retryPolicy,
      }),
    });
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GCP_ACCESS_TOKEN || ''}`,
    };
  }
}

interface PubSubMessage {
  id: string;
  data: any;
  attributes: Record<string, string>;
  ackId: string;
  publishTime: Date;
}

interface SubscriptionOptions {
  ackDeadlineSeconds?: number;
  messageRetentionDuration?: string;
  retryPolicy?: {
    minimumBackoff: string;
    maximumBackoff: string;
  };
}

// ============================================================================
// CLOUD TASKS CLIENT
// ============================================================================

export class CloudTasksClient {
  private projectId: string;
  private region: string;
  private baseUrl: string;

  constructor() {
    this.projectId = GOOGLE_CLOUD_CONFIG.project.id;
    this.region = GOOGLE_CLOUD_CONFIG.project.region;
    this.baseUrl = `https://cloudtasks.googleapis.com/v2/projects/${this.projectId}/locations/${this.region}`;
  }

  async createTask(queue: string, task: TaskConfig): Promise<string> {
    const queuePath = `${this.baseUrl}/queues/${queue}`;

    const taskBody: any = {
      httpRequest: {
        httpMethod: task.method || 'POST',
        url: task.url,
        headers: task.headers || { 'Content-Type': 'application/json' },
        body: task.body ? Buffer.from(JSON.stringify(task.body)).toString('base64') : undefined,
      },
    };

    if (task.scheduleTime) {
      taskBody.scheduleTime = task.scheduleTime.toISOString();
    }

    const response = await fetch(`${queuePath}/tasks`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ task: taskBody }),
    });

    const result = await response.json();
    return result.name || '';
  }

  async createQueue(queue: string, config?: QueueConfig): Promise<void> {
    await fetch(`${this.baseUrl}/queues`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        name: `${this.baseUrl}/queues/${queue}`,
        rateLimits: {
          maxDispatchesPerSecond: config?.maxDispatchesPerSecond || 100,
          maxConcurrentDispatches: config?.maxConcurrentDispatches || 1000,
        },
        retryConfig: {
          maxAttempts: config?.maxAttempts || 5,
          maxRetryDuration: config?.maxRetryDuration || '3600s',
          minBackoff: config?.minBackoff || '1s',
          maxBackoff: config?.maxBackoff || '3600s',
        },
      }),
    });
  }

  async deleteTask(taskName: string): Promise<void> {
    await fetch(`https://cloudtasks.googleapis.com/v2/${taskName}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
  }

  async listTasks(queue: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/queues/${queue}/tasks`, {
      headers: this.getHeaders(),
    });

    const result = await response.json();
    return result.tasks || [];
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GCP_ACCESS_TOKEN || ''}`,
    };
  }
}

interface TaskConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  scheduleTime?: Date;
}

interface QueueConfig {
  maxDispatchesPerSecond?: number;
  maxConcurrentDispatches?: number;
  maxAttempts?: number;
  maxRetryDuration?: string;
  minBackoff?: string;
  maxBackoff?: string;
}

// ============================================================================
// BIGQUERY CLIENT
// ============================================================================

export class BigQueryClient {
  private projectId: string;
  private baseUrl: string;

  constructor() {
    this.projectId = GOOGLE_CLOUD_CONFIG.project.id;
    this.baseUrl = `https://bigquery.googleapis.com/bigquery/v2/projects/${this.projectId}`;
  }

  async query(sql: string, params?: Record<string, any>): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/queries`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query: sql,
        useLegacySql: false,
        parameterMode: params ? 'NAMED' : undefined,
        queryParameters: params ? this.buildQueryParams(params) : undefined,
      }),
    });

    const result = await response.json();
    return this.parseQueryResults(result);
  }

  async insertRows(dataset: string, table: string, rows: any[]): Promise<void> {
    await fetch(`${this.baseUrl}/datasets/${dataset}/tables/${table}/insertAll`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        rows: rows.map(row => ({ json: row })),
      }),
    });
  }

  async createTable(dataset: string, table: string, schema: TableSchema): Promise<void> {
    await fetch(`${this.baseUrl}/datasets/${dataset}/tables`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        tableReference: {
          projectId: this.projectId,
          datasetId: dataset,
          tableId: table,
        },
        schema: { fields: schema.fields },
      }),
    });
  }

  async createDataset(dataset: string, location: string = 'US'): Promise<void> {
    await fetch(`${this.baseUrl}/datasets`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        datasetReference: {
          projectId: this.projectId,
          datasetId: dataset,
        },
        location,
      }),
    });
  }

  private buildQueryParams(params: Record<string, any>): any[] {
    return Object.entries(params).map(([name, value]) => ({
      name,
      parameterType: { type: this.inferType(value) },
      parameterValue: { value: String(value) },
    }));
  }

  private inferType(value: any): string {
    if (typeof value === 'number') return Number.isInteger(value) ? 'INT64' : 'FLOAT64';
    if (typeof value === 'boolean') return 'BOOL';
    if (value instanceof Date) return 'TIMESTAMP';
    return 'STRING';
  }

  private parseQueryResults(result: any): any[] {
    if (!result.rows) return [];
    const fields = result.schema?.fields || [];
    return result.rows.map((row: any) => {
      const obj: Record<string, any> = {};
      row.f.forEach((cell: any, i: number) => {
        obj[fields[i]?.name || `col${i}`] = cell.v;
      });
      return obj;
    });
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GCP_ACCESS_TOKEN || ''}`,
    };
  }
}

interface TableSchema {
  fields: Array<{
    name: string;
    type: 'STRING' | 'INTEGER' | 'FLOAT' | 'BOOLEAN' | 'TIMESTAMP' | 'RECORD';
    mode?: 'NULLABLE' | 'REQUIRED' | 'REPEATED';
    fields?: TableSchema['fields'];
  }>;
}

// ============================================================================
// CLOUD STORAGE CLIENT
// ============================================================================

export class CloudStorageClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'https://storage.googleapis.com';
  }

  async uploadFile(bucket: string, path: string, data: Uint8Array | string, contentType: string): Promise<string> {
    const uploadUrl = `${this.baseUrl}/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(path)}`;

    const body = typeof data === 'string' ? data : new Blob([new Uint8Array(data)], { type: contentType });

    await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': contentType,
      },
      body,
    });

    return `https://storage.googleapis.com/${bucket}/${path}`;
  }

  async downloadFile(bucket: string, path: string): Promise<Buffer> {
    const response = await fetch(`${this.baseUrl}/${bucket}/${path}`, {
      headers: this.getHeaders(),
    });

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    await fetch(`${this.baseUrl}/storage/v1/b/${bucket}/o/${encodeURIComponent(path)}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
  }

  async listFiles(bucket: string, prefix?: string): Promise<StorageFile[]> {
    const url = new URL(`${this.baseUrl}/storage/v1/b/${bucket}/o`);
    if (prefix) url.searchParams.set('prefix', prefix);

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });

    const result = await response.json();
    return (result.items || []).map((item: any) => ({
      name: item.name,
      size: parseInt(item.size),
      contentType: item.contentType,
      updated: new Date(item.updated),
      url: `https://storage.googleapis.com/${bucket}/${item.name}`,
    }));
  }

  async getSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string> {
    // In production, this would use service account credentials to sign
    // For now, return the public URL
    return `https://storage.googleapis.com/${bucket}/${path}`;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${process.env.GCP_ACCESS_TOKEN || ''}`,
    };
  }
}

interface StorageFile {
  name: string;
  size: number;
  contentType: string;
  updated: Date;
  url: string;
}

// ============================================================================
// SECRET MANAGER CLIENT
// ============================================================================

export class SecretManagerClient {
  private projectId: string;
  private baseUrl: string;

  constructor() {
    this.projectId = GOOGLE_CLOUD_CONFIG.project.id;
    this.baseUrl = `https://secretmanager.googleapis.com/v1/projects/${this.projectId}`;
  }

  async getSecret(secretId: string, version: string = 'latest'): Promise<string> {
    const response = await fetch(`${this.baseUrl}/secrets/${secretId}/versions/${version}:access`, {
      headers: this.getHeaders(),
    });

    const result = await response.json();
    return Buffer.from(result.payload?.data || '', 'base64').toString();
  }

  async createSecret(secretId: string, value: string): Promise<void> {
    // Create the secret
    await fetch(`${this.baseUrl}/secrets`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        replication: { automatic: {} },
      }),
    });

    // Add the secret version
    await fetch(`${this.baseUrl}/secrets/${secretId}:addVersion`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        payload: { data: Buffer.from(value).toString('base64') },
      }),
    });
  }

  async updateSecret(secretId: string, value: string): Promise<void> {
    await fetch(`${this.baseUrl}/secrets/${secretId}:addVersion`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        payload: { data: Buffer.from(value).toString('base64') },
      }),
    });
  }

  async deleteSecret(secretId: string): Promise<void> {
    await fetch(`${this.baseUrl}/secrets/${secretId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
  }

  async listSecrets(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/secrets`, {
      headers: this.getHeaders(),
    });

    const result = await response.json();
    return (result.secrets || []).map((s: any) => s.name.split('/').pop());
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GCP_ACCESS_TOKEN || ''}`,
    };
  }
}

// ============================================================================
// CLOUD SCHEDULER CLIENT
// ============================================================================

export class CloudSchedulerClient {
  private projectId: string;
  private region: string;
  private baseUrl: string;

  constructor() {
    this.projectId = GOOGLE_CLOUD_CONFIG.project.id;
    this.region = GOOGLE_CLOUD_CONFIG.project.region;
    this.baseUrl = `https://cloudscheduler.googleapis.com/v1/projects/${this.projectId}/locations/${this.region}`;
  }

  async createJob(job: SchedulerJob): Promise<void> {
    await fetch(`${this.baseUrl}/jobs`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        name: `${this.baseUrl}/jobs/${job.name}`,
        schedule: job.schedule,
        timeZone: job.timeZone || 'America/New_York',
        httpTarget: {
          uri: job.targetUrl,
          httpMethod: job.method || 'POST',
          headers: job.headers || { 'Content-Type': 'application/json' },
          body: job.body ? Buffer.from(JSON.stringify(job.body)).toString('base64') : undefined,
        },
        retryConfig: {
          retryCount: job.retryCount || 3,
          maxRetryDuration: job.maxRetryDuration || '3600s',
        },
      }),
    });
  }

  async deleteJob(jobName: string): Promise<void> {
    await fetch(`${this.baseUrl}/jobs/${jobName}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
  }

  async pauseJob(jobName: string): Promise<void> {
    await fetch(`${this.baseUrl}/jobs/${jobName}:pause`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
  }

  async resumeJob(jobName: string): Promise<void> {
    await fetch(`${this.baseUrl}/jobs/${jobName}:resume`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
  }

  async runJob(jobName: string): Promise<void> {
    await fetch(`${this.baseUrl}/jobs/${jobName}:run`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
  }

  async listJobs(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/jobs`, {
      headers: this.getHeaders(),
    });

    const result = await response.json();
    return result.jobs || [];
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GCP_ACCESS_TOKEN || ''}`,
    };
  }
}

interface SchedulerJob {
  name: string;
  schedule: string;
  targetUrl: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeZone?: string;
  retryCount?: number;
  maxRetryDuration?: string;
}

// ============================================================================
// UNIFIED GCP CLIENT
// ============================================================================

export class GoogleCloudClient {
  public firestore: FirestoreClient;
  public vertexAI: VertexAIClient;
  public pubsub: PubSubClient;
  public cloudTasks: CloudTasksClient;
  public bigQuery: BigQueryClient;
  public storage: CloudStorageClient;
  public secretManager: SecretManagerClient;
  public scheduler: CloudSchedulerClient;

  constructor() {
    this.firestore = new FirestoreClient();
    this.vertexAI = new VertexAIClient();
    this.pubsub = new PubSubClient();
    this.cloudTasks = new CloudTasksClient();
    this.bigQuery = new BigQueryClient();
    this.storage = new CloudStorageClient();
    this.secretManager = new SecretManagerClient();
    this.scheduler = new CloudSchedulerClient();
  }

  async initialize(): Promise<void> {
    console.log('[GoogleCloud] Initializing all services...');
    
    // Initialize Pub/Sub topics
    for (const topic of Object.values(GOOGLE_CLOUD_CONFIG.pubsub.topics)) {
      try {
        await this.pubsub.createTopic(topic);
        console.log(`[GoogleCloud] Created topic: ${topic}`);
      } catch (e) {
        // Topic may already exist
      }
    }

    // Initialize Cloud Tasks queues
    for (const queue of Object.values(GOOGLE_CLOUD_CONFIG.cloudTasks.queues)) {
      try {
        await this.cloudTasks.createQueue(queue.name, { maxDispatchesPerSecond: queue.rateLimitPerSecond });
        console.log(`[GoogleCloud] Created queue: ${queue.name}`);
      } catch (e) {
        // Queue may already exist
      }
    }

    // Initialize BigQuery datasets
    for (const dataset of Object.values(GOOGLE_CLOUD_CONFIG.bigQuery.datasets)) {
      try {
        await this.bigQuery.createDataset(dataset);
        console.log(`[GoogleCloud] Created dataset: ${dataset}`);
      } catch (e) {
        // Dataset may already exist
      }
    }

    console.log('[GoogleCloud] All services initialized');
  }
}

// Export singleton instance
export const gcp = new GoogleCloudClient();
export default gcp;
