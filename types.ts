export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  credits: number;
}

export type ProjectStatus = 'draft' | 'processing' | 'completed';

export interface Scene {
  id: string;
  project_id: string;
  order_index: number;
  text_segment: string;
  visual_prompt: string;
  image_url?: string;
  video_url?: string;
  audio_url?: string; // Mixed audio (VO + SFX + BGM)
  duration?: number;
}

export interface AudioTrack {
  id: string;
  language_code: string;
  language_name: string;
  voice_id: string;
  file_url: string; // The blob URL
  created_at: number;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  status: ProjectStatus;
  original_video_url?: string;
  original_script?: string;
  generated_script?: string;
  selected_voice_id?: string;
  audio_tracks?: AudioTrack[]; // New field for multiple languages
  created_at: string;
  last_edited_at: string;
  current_step?: number; // Store the current step index
  scenes?: Scene[];
}

export interface Voice {
  id: string;
  name: string;
  avatar_url: string;
  gender: 'male' | 'female';
  preview_url?: string;
}

export const MOCK_USER: UserProfile = {
  id: 'u-123',
  full_name: 'Alex Johnson',
  avatar_url: 'https://picsum.photos/seed/alex/100/100',
  credits: 240
};