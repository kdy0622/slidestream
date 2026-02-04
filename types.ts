
export interface SlideData {
  id: string;
  image: string; // Base64
  script: string;
  audioBuffer?: AudioBuffer;
  duration?: number;
}

export interface SubtitleStyle {
  fontSize: number;
  textColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  position: 'bottom' | 'middle' | 'top';
  fontFamily: string;
}

export enum AppStep {
  UPLOAD = 'upload',
  REVIEW = 'review',
  SETTINGS = 'settings',
  SCRIPT = 'script',
  EXPORT = 'export'
}

export type AudienceLevel = 
  | '30세이하여성' 
  | '30세이하남성' 
  | '4050여성' 
  | '4050남성' 
  | '5060여성' 
  | '5060남성' 
  | '70이상' 
  | '전문가' 
  | '직접 입력';

export type ScriptLength = 'short' | 'medium' | 'long';
export type SpeakingRate = 'slow' | 'normal' | 'fast';

export interface GenerationOptions {
  audience: AudienceLevel;
  length: ScriptLength;
  voiceName: string;
  speakingRate: SpeakingRate;
}
