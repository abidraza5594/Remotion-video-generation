export type VideoFormat = 'shorts' | 'long';

export type SceneType =
  | 'hook'
  | 'intro'
  | 'problem'
  | 'explanation'
  | 'code'
  | 'demo'
  | 'summary'
  | 'outro';

export type CursorAction = 'move' | 'click' | 'highlight' | 'zoom';

export type AnimationType =
  | 'typeCode'
  | 'highlightLine'
  | 'zoomIn'
  | 'zoomOut'
  | 'fadeIn'
  | 'slideIn';

export type TextOverlayStyle = 'headline' | 'caption' | 'code' | 'highlight';
export type TextOverlayPosition = 'top' | 'center' | 'bottom';

export interface CursorActionEvent {
  time: number;
  action: CursorAction;
  target: string;
  x: number;
  y: number;
  duration: number;
}

export interface AnimationEvent {
  time: number;
  type: AnimationType;
  target: string;
  value: string | null;
  duration: number;
}

export interface TextOverlay {
  time: number;
  text: string;
  style: TextOverlayStyle;
  position: TextOverlayPosition;
}

export interface Scene {
  id: string;
  type: SceneType;
  startTime: number;
  duration: number;
  narration: string;
  visualDescription: string;
  codeSnippet: string | null;
  language: string | null;
  cursorActions: CursorActionEvent[];
  animations: AnimationEvent[];
  textOverlays: TextOverlay[];
  audioFile?: string;
  subtitleFile?: string;
}

export interface Storyboard {
  title: string;
  topic: string;
  format: VideoFormat;
  totalDuration: number;
  fps: number;
  scenes: Scene[];
}

export interface CursorKeyframe {
  frame: number;
  x: number;
  y: number;
  action: CursorAction;
  target: string;
}

export interface TimingSceneEntry {
  id: string;
  type: SceneType;
  startFrame: number;
  endFrame: number;
  durationFrames: number;
  cursorKeyframes: CursorKeyframe[];
}

export interface TimingFile {
  fps: number;
  totalFrames: number;
  width: number;
  height: number;
  format: VideoFormat;
  scenes: TimingSceneEntry[];
}

export interface TopicSuggestion {
  title: string;
  hook: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  whyTrending: string;
}

export interface YouTubeAccount {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  channel_name: string;
  channel_id: string;
  is_active?: boolean;
}

export interface InstagramAccount {
  access_token: string;
  token_expiry: number;
  ig_user_id: string;
  username: string;
  page_id: string;
  is_active?: boolean;
}

export interface LinkedInAccount {
  access_token: string;
  expires_in: number;
  token_created_at: number;
  person_id: string;
  display_name: string;
  email: string;
  is_active?: boolean;
}

export interface AuthStore {
  youtube?: YouTubeAccount[];
  instagram?: InstagramAccount[];
  linkedin?: LinkedInAccount[];
}

export type Platform = 'youtube' | 'instagram' | 'linkedin';

export interface YouTubeCopy {
  title: string;
  description: string;
  chapters: { time: string; title: string }[];
  tags: string[];
  thumbnailText: string;
}

export interface InstagramCopy {
  hook: string;
  body: string;
  hashtags: string[];
  cta: string;
}

export interface LinkedInCopy {
  headline: string;
  body: string;
  bulletPoints: string[];
  hashtags: string[];
  cta: string;
}

export interface SocialCopy {
  youtube?: YouTubeCopy;
  instagram?: InstagramCopy;
  linkedin?: LinkedInCopy;
}

export interface GenerationContext {
  topic: string;
  format: VideoFormat;
  storyboard?: Storyboard;
  timing?: TimingFile;
  videoPath?: string;
  thumbnailPath?: string;
  durationSeconds?: number;
}
