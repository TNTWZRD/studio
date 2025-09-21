
'use server';

import { getTwitchStreamStatus } from '@/lib/twitch';
import { getYouTubeStreamStatus } from '@/lib/youtube';
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
  thumbnailUrl: string;
}

function getLoginFromUrl(platform: 'twitch' | 'youtube', url: string): string {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        let login = pathParts[pathParts.length - 1];

        if (platform === 'youtube' && login.startsWith('@')) {
            login = login.substring(1);
        }
        
        return login;
    } catch {
        return '';
    }
}


export async function assessStreamers(streamers: Streamer[]): Promise<LiveStreamerInfo[]> {
  const twitchStreamers = streamers.filter(s => s.platform.toLowerCase() === 'twitch');
  const youtubeStreamers = streamers.filter(s => s.platform.toLowerCase() === 'youtube');
  
  try {
    const twitchLogins = twitchStreamers.map(s => getLoginFromUrl('twitch', s.platformUrl)).filter(Boolean);
    const youtubeChannelUrls = youtubeStreamers.map(s => s.platformUrl);

    const [liveTwitchStreams, liveYouTubeStreams] = await Promise.all([
        twitchLogins.length > 0 ? getTwitchStreamStatus(twitchLogins) : Promise.resolve([]),
        youtubeChannelUrls.length > 0 ? getYouTubeStreamStatus(youtubeChannelUrls) : Promise.resolve([])
    ]);

    const liveTwitchStreamers: LiveStreamerInfo[] = twitchStreamers
      .map(streamer => {
        const login = getLoginFromUrl('twitch', streamer.platformUrl);
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
            thumbnailUrl: liveInfo.thumbnail_url.replace('{width}', '400').replace('{height}', '225'),
          };
        }
        return null;
      })
      .filter((s): s is LiveStreamerInfo => s !== null);
    
    const liveYouTubeStreamers: LiveStreamerInfo[] = youtubeStreamers
        .map(streamer => {
            const liveInfo = liveYouTubeStreams.find(l => l.channelUrl.toLowerCase() === streamer.platformUrl.toLowerCase());
            if (liveInfo) {
                return {
                    name: streamer.name,
                    platform: streamer.platform,
                    platformUrl: streamer.platformUrl,
                    avatar: streamer.avatar,
                    isLive: true,
                    title: liveInfo.title,
                    game: 'Unknown Game', // YouTube API for live streams doesn't provide game easily
                    thumbnailUrl: liveInfo.thumbnailUrl,
                };
            }
            return null;
        })
        .filter((s): s is LiveStreamerInfo => s !== null);

    // Include manually set non-Twitch/non-YouTube live streamers as a fallback
    const manualLive = streamers
      .filter(s => s.isLive && !['twitch', 'youtube'].includes(s.platform.toLowerCase()))
      .map(s => ({ ...s, game: s.game || 'Unknown Game', thumbnailUrl: s.avatar }));

    return [...liveTwitchStreamers, ...liveYouTubeStreamers, ...manualLive];

  } catch (error) {
    console.error('Error assessing streamer info:', error);
    // On error, fallback to any manually set live streamers from any platform
     return streamers
        .filter(s => s.isLive)
        .map(s => ({ ...s, game: s.game || 'Unknown Game', thumbnailUrl: s.avatar }));
  }
}
