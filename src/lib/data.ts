
'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { Streamer, Event, MediaItem, Config } from '@/lib/types';
import { PlaceHolderImages, ImagePlaceholder } from './placeholder-images';
import { getTwitchUsers } from './twitch';
import { getYouTubeChannelDetails } from './youtube';

// Helper function to read and parse a JSON file
async function readJsonFile<T>(filePath: string): Promise<T> {
    const fullPath = path.join(process.cwd(), filePath);
    try {
        const fileContent = await fs.readFile(fullPath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        // If the file doesn't exist or is empty, return a default value
        if (filePath.endsWith('streams.json') || filePath.endsWith('events.json') || filePath.endsWith('media.json')) {
            return [] as T;
        }
        if (filePath.endsWith('config.json')) {
            return { discordInviteUrl: '#' } as T;
        }
        throw error;
    }
}


const getImage = (id: string): ImagePlaceholder => {
    const img = PlaceHolderImages.find(p => p.id === id);
    if (!img) {
        // Fallback to a random image if ID not found, to avoid broken images
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

// Helper to extract login/identifier from platform URL
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
                return twitchAvatars.get(login.toLowerCase()) || getImage(streamer.id).imageUrl;
            }
            if (streamer.platform.toLowerCase() === 'youtube') {
                return youtubeAvatars.get(streamer.platformUrl.toLowerCase()) || getImage(streamer.id).imageUrl;
            }
            return getImage(streamer.id).imageUrl;
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
        return streamers.map(s => ({...s, avatar: getImage(s.id).imageUrl }));
    }
}


export async function getStreamers(): Promise<Streamer[]> {
    const streamers = await readJsonFile<Streamer[]>('src/data/streams.json');
    return fetchStreamerAvatars(streamers);
}

export async function getEvents(): Promise<Event[]> {
    const eventsData = await readJsonFile<any[]>('src/data/events.json');
    return eventsData.map(event => ({
        ...event,
        image: getImage(event.image).imageUrl
    })).sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
}

export async function getEventById(id: string): Promise<Event | undefined> {
    const events = await getEvents();
    const event = events.find(e => e.id === id);
    if (!event) return undefined;
    return event;
}

export async function getMedia(): Promise<MediaItem[]> {
    const mediaData = await readJsonFile<any[]>('src/data/media.json');
    return mediaData.map(item => ({
        ...item,
        thumbnail: getImage(item.thumbnail).imageUrl
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getConfig(): Promise<Config> {
    return readJsonFile<Config>('src/data/config.json');
}
