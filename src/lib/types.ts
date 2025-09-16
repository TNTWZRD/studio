export interface Streamer {
  id: string;
  name: string;
  platform: 'twitch' | 'youtube' | string;
  platformUrl: string;
  avatar: string;
  isLive: boolean;
  title: string;
  game?: string;
  featured?: boolean;
}

export interface ScoreboardEntry {
  rank: number;
  name: string;
  score: number;
  notes?: string;
}

export interface Event {
  id: string;
  title: string;
  start: string;
  end: string | null;
  status: 'scheduled' | 'active' | 'completed' | 'canceled';
  description: string | null;
  image: string | null;
  location: string | null;
}

export interface MediaItem {
  id: string;
  type: 'video' | 'clip' | 'stream' | 'guide';
  title: string;
  thumbnail: string;
  url: string;
  creator: string;
  date: string;
}

export interface Config {
  discordInviteUrl: string;
}
