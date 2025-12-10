export interface ParsedIssue {
  id: string;
  title: string;
  body: string;
  labels: string[];
  originalContext?: string;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface EmailContent {
  subject: string;
  body: string;
}