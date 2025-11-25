
export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface GroundingMetadata {
  groundingChunks: GroundingChunk[];
  groundingSupports?: any[];
  searchEntryPoint?: any;
  webSearchQueries?: string[];
}

export interface NewsItem {
  headline: string;
  summary: string;
  category: string;
  imageUrl?: string; // Added for persistence
}

export interface DailyBriefingData {
  news: NewsItem[];
  groundingMetadata: GroundingMetadata | null;
  date: string;
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type ViewMode = 'daily' | 'saved';

export type Theme = 'light' | 'dark' | 'auto';
