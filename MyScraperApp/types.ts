export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

export interface AIAnalysisResult {
  summary: string;
  tags: string[];
  category: string;
  suggestedFilename: string;
}

export interface MediaItem {
  id: string;
  url: string;
  originalName: string;
  type: MediaType;
  fileSize?: number;
  timestamp: number;
  analysis?: AIAnalysisResult;
  isAnalyzing: boolean;
  mimeType?: string;
  source: 'local' | 'web';
}

export type FilterType = 'ALL' | 'IMAGE' | 'VIDEO';

export interface ScrapeResult {
  images: string[];
  videos: string[];
  title: string;
}
