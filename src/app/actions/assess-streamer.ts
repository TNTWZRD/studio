'use server';

import { getTwitchStreamStatus } from '@/lib/twitch';
import type { Streamer } from '@/lib/types';

// This interface matches the output the component expects
export interface LiveStreamerInfo {
  name: string;
  platform: string;
  platformUrl: string;
  avatar: string;
  isLive: boolean;
  title: string;
  game: string;
}

export async function assessStreamers(streamers: Streamer[]): Promise<LiveStreamerInfo[]> {
  const twitchStreamers = streamers.filter(s => s.platform.toLowerCase() === 'twitch');
  const youtubeStreamers = streamers.filter(s => s.platform.toLowerCase() === 'youtube');
  
  // For now, we only have the Twitch API implemented.
  // YouTube checking can be added here later.
  // We'll also pass through any manually set `isLive: true` non-Twitch streamers.

  try {
    const twitchUsernames = twitchStreamers.map(s => {
        try {
            const url = new URL(s.platformUrl);
            const pathParts = url.pathname.split('/').filter(p => p);
            return pathParts[pathParts.length-1];
        } catch {
            return '';
        }
    }).filter(Boolean);

    const liveTwitchStreams = await getTwitchStreamStatus(twitchUsernames);

    const liveStreamers: LiveStreamerInfo[] = twitchStreamers
      .map(streamer => {
        const url = new URL(streamer.platformUrl);
        const login = url.pathname.split('/').filter(p => p)[0];
        const liveInfo = liveTwitchStreams.find(l => l.user_login.toLowerCase() === login.toLowerCase());

        if (liveInfo) {
          return {
            name: streamer.name,
            platform: streamer.platform,
            platformUrl: streamer.platformUrl,
            avatar: streamer.avatar,
            isLive: true,
            title: liveInfo.title,
            game: liveInfo.game_name,
          };
        }
        return null;
      })
      .filter((s): s is LiveStreamerInfo => s !== null);
      
    // Include manually set non-Twitch live streamers as a fallback
    const manualLive = streamers
      .filter(s => s.isLive && s.platform.toLowerCase() !== 'twitch')
      .map(s => ({ ...s, game: s.game || 'Unknown Game' }));

    return [...liveStreamers, ...manualLive];

  } catch (error) {
    console.error('Error assessing streamer info:', error);
    // On error, fallback to any manually set live streamers
     return streamers
        .filter(s => s.isLive)
        .map(s => ({ ...s, game: s.game || 'Unknown Game' }));
  }
}
