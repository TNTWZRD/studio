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
  schedule?: { day: string; time: string }[];
  oneTimeEvents?: { id: string; date: string; time: string; title: string }[];
  discordUserId?: string;
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
  end: string;
  status: 'upcoming' | 'live' | 'past';
  details: string;
  image: string;
  participants: { id: string, name: string }[];
  scoreboard?: ScoreboardEntry[];
  url?: string;
  media?: MediaItem[];
  mediaIds?: string[];
}


export interface MediaItem {
  id: string;
  type: 'video' | 'clip' | 'stream' | 'guide' | 'short';
  title: string;
  thumbnail: string;
  url: string;
  creator: string;
  date: string;
}

export interface Config {
  discordInviteUrl: string;
}
