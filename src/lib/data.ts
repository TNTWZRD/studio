
'use server';

import { db } from './db';
import { Streamer, Event, MediaItem, Config } from '@/lib/types';
import { PlaceHolderImages, ImagePlaceholder } from './placeholder-images';
import { getTwitchUsers } from './twitch';
import { getYouTubeChannelDetails } from './youtube';

const getPlaceholderImage = (id: string): ImagePlaceholder => {
    const img = PlaceHolderImages.find(p => p.id === id);
    if (!img) {
        const randomId = Math.floor(Math.random() * 5) + 1;
        const randomImg = PlaceHolderImages.find(p => p.id === String(randomId));
        return randomImg || {
            id: 'error',
            imageUrl: `https://picsum.photos/seed/${id || 'error'}/400/300`,
            description: 'Placeholder image not found',
            imageHint: 'error',
        };
    }
    return img;
};

function getIdentifierFromUrl(platform: 'twitch' | 'youtube' | string, url: string): string {
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

async function fetchStreamerAvatars(streamers: Streamer[]): Promise<Streamer[]> {
    try {
        const twitchStreamers = streamers.filter(s => s.platform.toLowerCase() === 'twitch');
        const youtubeStreamers = streamers.filter(s => s.platform.toLowerCase() === 'youtube');

        const twitchLogins = twitchStreamers.map(s => getIdentifierFromUrl('twitch', s.platformUrl)).filter(Boolean);
        const youtubeChannelUrls = youtubeStreamers.map(s => s.platformUrl);

        const [twitchUsers, youtubeUserDetailsList] = await Promise.all([
            twitchLogins.length > 0 ? getTwitchUsers(twitchLogins) : Promise.resolve([]),
            Promise.all(youtubeChannelUrls.map(url => getYouTubeChannelDetails(url)))
        ]);

        const twitchAvatars = new Map(twitchUsers.map(u => [u.login.toLowerCase(), u.profile_image_url]));
        const youtubeAvatars = new Map(youtubeUserDetailsList.map((details, i) =>
            details ? [youtubeChannelUrls[i].toLowerCase(), details.profileImageUrl] : [null, null]
        ).filter(([url]) => url));

        const getAvatar = (streamer: Streamer): string => {
            if (streamer.platform.toLowerCase() === 'twitch') {
                const login = getIdentifierFromUrl('twitch', streamer.platformUrl);
                return twitchAvatars.get(login.toLowerCase()) || getPlaceholderImage(streamer.id).imageUrl;
            }
            if (streamer.platform.toLowerCase() === 'youtube') {
                return youtubeAvatars.get(streamer.platformUrl.toLowerCase()) || getPlaceholderImage(streamer.id).imageUrl;
            }
            return getPlaceholderImage(streamer.id).imageUrl;
        };

        const combinedAvatars = new Map<string, string>();
        streamers.forEach(s => {
            const avatar = getAvatar(s);
            if (!combinedAvatars.has(s.name.toLowerCase()) || s.platform.toLowerCase() === 'twitch') {
                combinedAvatars.set(s.name.toLowerCase(), avatar);
            }
        });

        return streamers.map(streamer => ({
            ...streamer,
            avatar: combinedAvatars.get(streamer.name.toLowerCase()) || streamer.avatar,
        }));

    } catch (error) {
        console.error("Error fetching streamer avatars, using placeholders.", error);
        return streamers.map(s => ({...s, avatar: getPlaceholderImage(s.id).imageUrl }));
    }
}


export async function getStreamers(): Promise<Streamer[]> {
    const stmt = db.prepare('SELECT * FROM streamers');
    const dbStreamers = stmt.all() as any[];

    const streamers: Streamer[] = dbStreamers.map(s => ({
        ...s,
        isLive: Boolean(s.isLive),
        featured: Boolean(s.featured),
        schedule: s.schedule ? JSON.parse(s.schedule) : [],
        oneTimeEvents: s.oneTimeEvents ? JSON.parse(s.oneTimeEvents) : [],
    }));
    
    return fetchStreamerAvatars(streamers);
}

function getYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
      if (urlObj.pathname === '/watch') {
        return urlObj.searchParams.get('v');
      }
      if (urlObj.pathname.startsWith('/embed/')) {
        return urlObj.pathname.split('/')[2];
      }
       if (urlObj.pathname.startsWith('/shorts/')) {
        return urlObj.pathname.split('/')[2];
      }
    } else if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.substring(1);
    }
  } catch (error) {
    console.error('Invalid URL:', url, error);
    return null;
  }
  return null;
}

function getMediaThumbnail(item: MediaItem): string {
    const youTubeId = getYouTubeVideoId(item.url);
    if(youTubeId) return `https://i.ytimg.com/vi/${youTubeId}/hqdefault.jpg`;
    return item.thumbnail && item.thumbnail.startsWith('http') ? item.thumbnail : getPlaceholderImage(item.thumbnail).imageUrl;
}

function getEventImageUrl(event: Event): string {
    // Prioritize the first entry in the imageUrls array if it exists and is valid
    if (event.imageUrls && event.imageUrls.length > 0) {
        const firstUrl = event.imageUrls[0];
        if (firstUrl && (firstUrl.startsWith('http') || firstUrl.startsWith('/'))) {
            return firstUrl;
        }
    }

    // Fallback to the legacy `image` field
    if (event.image && (event.image.startsWith('http') || event.image.startsWith('/'))) {
        return event.image;
    }

    // If no valid URL is found, use a placeholder
    return getPlaceholderImage(event.image || String(Math.floor(Math.random() * 20) + 1)).imageUrl;
}


export async function getEvents(): Promise<Event[]> {
    const allMedia = await getMedia();
    const mediaMap = new Map(allMedia.map(m => [m.id, m]));

    const stmt = db.prepare('SELECT * FROM events ORDER BY start DESC');
    const dbEvents = stmt.all() as any[];
    
    return dbEvents.map(event => {
        const mediaIds = event.media ? JSON.parse(event.media) : [];
        const associatedMedia = mediaIds.map((id: string) => mediaMap.get(id)).filter(Boolean) as MediaItem[];
        const rawImageUrls = event.imageUrls ? JSON.parse(event.imageUrls) : [];
        const finalImageUrls = rawImageUrls.filter((url:string) => url && (url.startsWith('http') || url.startsWith('/')))
        
        const eventWithTypes = {
            ...event,
            participants: event.participants ? JSON.parse(event.participants) : [],
            scoreboard: event.scoreboard ? JSON.parse(event.scoreboard) : [],
            media: associatedMedia.map(m => ({ ...m, thumbnail: getMediaThumbnail(m) })),
            mediaIds: mediaIds,
            url: event.url,
            imageUrls: finalImageUrls
        };
        
        return {
            ...eventWithTypes,
            image: getEventImageUrl(eventWithTypes),
        };
    });
}

export async function getEventById(id: string): Promise<Event | undefined> {
    const allMedia = await getMedia();
    const mediaMap = new Map(allMedia.map(m => [m.id, m]));

    const stmt = db.prepare('SELECT * FROM events WHERE id = ?');
    const event = stmt.get(id) as any;

    if (!event) return undefined;
    
    const mediaIds = event.media ? JSON.parse(event.media) : [];
    const associatedMedia = mediaIds.map((id: string) => mediaMap.get(id)).filter(Boolean) as MediaItem[];
    const rawImageUrls = event.imageUrls ? JSON.parse(event.imageUrls) : [];
    const finalImageUrls = rawImageUrls.filter((url: string) => url && (url.startsWith('http') || url.startsWith('/')));

    const eventWithTypes = {
        ...event,
        participants: event.participants ? JSON.parse(event.participants) : [],
        scoreboard: event.scoreboard ? JSON.parse(event.scoreboard) : [],
        media: associatedMedia.map(m => ({ ...m, thumbnail: getMediaThumbnail(m) })),
        mediaIds: mediaIds,
        url: event.url,
        imageUrls: finalImageUrls,
    };
        
    return {
        ...eventWithTypes,
        image: getEventImageUrl(eventWithTypes),
    };
}

export async function getMedia(): Promise<MediaItem[]> {
    const stmt = db.prepare('SELECT * FROM media ORDER BY date DESC');
    const dbMedia = stmt.all() as any[];

    return dbMedia.map(item => ({
        ...item,
        thumbnail: getMediaThumbnail(item),
    }));
}

export async function getConfig(): Promise<Config> {
    const stmt = db.prepare('SELECT * FROM config WHERE id = 1');
    const config = stmt.get() as any;
    return config || { discordInviteUrl: '#' };
}
