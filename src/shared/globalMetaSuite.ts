/**
 * INFINITY X AI - GLOBAL META SUITE
 * Centralized configuration for Google Cloud Platform services
 */

import { config } from '../config.js';

export interface GoogleCloudProjectConfig {
  id: string;
  name: string;
  region: string;
  zone: string;
}

export interface VertexAIConfig {
  location: string;
  models: {
    gemini: string;
    palm: string;
    embedding: string;
  };
  endpoint: string;
}

export interface PubSubConfig {
  topics: {
    events: string;
    notifications: string;
    analytics: string;
  };
  subscriptions: {
    eventProcessor: string;
    notificationHandler: string;
    analyticsCollector: string;
  };
}

export interface CloudTasksConfig {
  location: string;
  queues: {
    default: string;
    priority: string;
    scheduled: string;
  };
}

export interface BigQueryConfig {
  dataset: string;
  tables: {
    events: string;
    analytics: string;
    logs: string;
  };
}

export interface FirestoreConfig {
  database: string;
  collections: {
    agents: string;
    workspaces: string;
    tasks: string;
    logs: string;
  };
}

export interface CloudStorageConfig {
  buckets: {
    uploads: string;
    exports: string;
    backups: string;
  };
}

export interface GoogleCloudConfig {
  project: GoogleCloudProjectConfig;
  vertexAI: VertexAIConfig;
  pubsub: PubSubConfig;
  cloudTasks: CloudTasksConfig;
  bigQuery: BigQueryConfig;
  firestore: FirestoreConfig;
  storage: CloudStorageConfig;
  serviceAccount: {
    email: string;
    keyPath: string;
  };
}

// Main Google Cloud configuration
export const GOOGLE_CLOUD_CONFIG: GoogleCloudConfig = {
  project: {
    id: config.projectId || process.env.GOOGLE_CLOUD_PROJECT || 'infinity-x-one-systems',
    name: 'Infinity X One Systems',
    region: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
    zone: process.env.GOOGLE_CLOUD_ZONE || 'us-central1-a'
  },
  
  vertexAI: {
    location: process.env.VERTEX_AI_LOCATION || 'us-central1',
    models: {
      gemini: 'gemini-pro',
      palm: 'text-bison@001',
      embedding: 'textembedding-gecko@001'
    },
    endpoint: `https://${process.env.VERTEX_AI_LOCATION || 'us-central1'}-aiplatform.googleapis.com`
  },
  
  pubsub: {
    topics: {
      events: 'infinity-x-events',
      notifications: 'infinity-x-notifications',
      analytics: 'infinity-x-analytics'
    },
    subscriptions: {
      eventProcessor: 'infinity-x-events-sub',
      notificationHandler: 'infinity-x-notifications-sub',
      analyticsCollector: 'infinity-x-analytics-sub'
    }
  },
  
  cloudTasks: {
    location: process.env.CLOUD_TASKS_LOCATION || 'us-central1',
    queues: {
      default: 'infinity-x-default-queue',
      priority: 'infinity-x-priority-queue',
      scheduled: 'infinity-x-scheduled-queue'
    }
  },
  
  bigQuery: {
    dataset: 'infinity_x_data',
    tables: {
      events: 'events',
      analytics: 'analytics',
      logs: 'logs'
    }
  },
  
  firestore: {
    database: '(default)',
    collections: {
      agents: 'agents',
      workspaces: 'workspaces',
      tasks: 'tasks',
      logs: 'logs'
    }
  },
  
  storage: {
    buckets: {
      uploads: `${config.projectId}-uploads`,
      exports: `${config.projectId}-exports`,
      backups: `${config.projectId}-backups`
    }
  },
  
  serviceAccount: {
    email: config.serviceAccountEmail,
    keyPath: config.serviceAccountPath
  }
};

// Helper functions for configuration access
export function getProjectId(): string {
  return GOOGLE_CLOUD_CONFIG.project.id;
}

export function getServiceAccountEmail(): string {
  return GOOGLE_CLOUD_CONFIG.serviceAccount.email;
}

export function getVertexAIEndpoint(): string {
  return GOOGLE_CLOUD_CONFIG.vertexAI.endpoint;
}

export function getPubSubTopic(topic: keyof typeof GOOGLE_CLOUD_CONFIG.pubsub.topics): string {
  return GOOGLE_CLOUD_CONFIG.pubsub.topics[topic];
}

export function getBigQueryTable(table: keyof typeof GOOGLE_CLOUD_CONFIG.bigQuery.tables): string {
  return `${GOOGLE_CLOUD_CONFIG.project.id}.${GOOGLE_CLOUD_CONFIG.bigQuery.dataset}.${GOOGLE_CLOUD_CONFIG.bigQuery.tables[table]}`;
}

export function getStorageBucket(bucket: keyof typeof GOOGLE_CLOUD_CONFIG.storage.buckets): string {
  return GOOGLE_CLOUD_CONFIG.storage.buckets[bucket];
}
