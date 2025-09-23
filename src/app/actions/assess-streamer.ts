
'use server';

import { getTwitchStreamStatus, getTwitchUsers } from '@/lib/twitch';
import { getYouTubeStreamStatus, getYouTubeChannelDetails } from '@/lib/youtube';
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
    
    // Fetch user profile info (including avatars) first
    const [twitchUsers, youtubeUserDetailsList] = await Promise.all([
      twitchLogins.length > 0 ? getTwitchUsers(twitchLogins) : Promise.resolve([]),
      Promise.all(youtubeChannelUrls.map(url => getYouTubeChannelDetails(url)))
    ]);

    const twitchAvatars = new Map(twitchUsers.map(u => [u.login.toLowerCase(), u.profile_image_url]));
    // Build a properly-typed list of [channelUrl, profileImageUrl] entries, filtering out nulls
    const youtubeEntries: [string, string][] = youtubeUserDetailsList
      .map((details, i) => details ? [youtubeChannelUrls[i].toLowerCase(), details.profileImageUrl] as [string, string] : null)
      .filter(Boolean) as [string, string][];

    const youtubeAvatars = new Map<string, string>(youtubeEntries);


    // Now check for live status
    const [liveTwitchStreams, liveYouTubeStreams] = await Promise.all([
        twitchLogins.length > 0 ? getTwitchStreamStatus(twitchLogins) : Promise.resolve([]),
        youtubeChannelUrls.length > 0 ? getYouTubeStreamStatus(youtubeChannelUrls) : Promise.resolve([])
    ]);

    const getAvatar = (streamer: Streamer): string => {
        if (streamer.platform.toLowerCase() === 'twitch') {
            const login = getLoginFromUrl('twitch', streamer.platformUrl);
            return twitchAvatars.get(login.toLowerCase()) || streamer.avatar;
        }
        if (streamer.platform.toLowerCase() === 'youtube') {
            return youtubeAvatars.get(streamer.platformUrl.toLowerCase()) || streamer.avatar;
        }
        // Fallback for manually set avatars for other platforms
        return streamer.avatar;
    };
    
    // If a streamer has multiple profiles, prefer the Twitch avatar
    const combinedAvatars = new Map<string, string>();
    streamers.forEach(s => {
        const avatar = getAvatar(s);
        if (!combinedAvatars.has(s.name.toLowerCase()) || s.platform.toLowerCase() === 'twitch') {
            combinedAvatars.set(s.name.toLowerCase(), avatar);
        }
    });

    const liveTwitchStreamers: LiveStreamerInfo[] = twitchStreamers
      .map(streamer => {
        const login = getLoginFromUrl('twitch', streamer.platformUrl);
        const liveInfo = liveTwitchStreams.find(l => l.user_login.toLowerCase() === login.toLowerCase());

        if (liveInfo) {
          return {
            name: streamer.name,
            platform: streamer.platform,
            platformUrl: streamer.platformUrl,
            avatar: combinedAvatars.get(streamer.name.toLowerCase()) || streamer.avatar,
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
                    avatar: combinedAvatars.get(streamer.name.toLowerCase()) || streamer.avatar,
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
      .map(s => ({ ...s, avatar: getAvatar(s), game: s.game || 'Unknown Game', thumbnailUrl: s.avatar }));

    return [...liveTwitchStreamers, ...liveYouTubeStreamers, ...manualLive];

  } catch (error) {
    console.error('Error assessing streamer info:', error);
    // On error, fallback to any manually set live streamers from any platform
     return streamers
        .filter(s => s.isLive)
        .map(s => ({ ...s, game: s.game || 'Unknown Game', thumbnailUrl: s.avatar }));
  }
}
