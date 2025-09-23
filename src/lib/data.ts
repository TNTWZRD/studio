
'use server';

import { db } from './db';
import { Streamer, Event, MediaItem, Config } from '@/lib/types';
import { PlaceHolderImages, ImagePlaceholder } from './placeholder-images';
import { getTwitchUsers } from './twitch';
import { getYouTubeChannelDetails } from './youtube';
import metrics from './metrics';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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
        // In development, avoid downloading and writing avatar files which will touch
        // the filesystem and can trigger Next's file watcher -> rebuild loop. By
        // default we short-circuit and return streamers with existing avatar or a
        // placeholder. To enable avatar caching in development for testing, set
        // ALLOW_AVATAR_CACHE_IN_DEV=true in your environment.
        const allowDevCache = process.env.ALLOW_AVATAR_CACHE_IN_DEV === 'true';
        if (process.env.NODE_ENV !== 'production' && !allowDevCache) {
            try { console.debug('Avatar caching disabled in development (set ALLOW_AVATAR_CACHE_IN_DEV=true to enable).'); } catch {}
            return streamers.map(s => ({
                ...s,
                avatar: s.avatar && (s.avatar.startsWith('/avatars/') || s.avatar.startsWith('http')) ? s.avatar : getPlaceholderImage(s.id).imageUrl,
            }));
        }
        const twitchStreamers = streamers.filter(s => s.platform.toLowerCase() === 'twitch');
        const youtubeStreamers = streamers.filter(s => s.platform.toLowerCase() === 'youtube');

        const twitchLogins = twitchStreamers.map(s => getIdentifierFromUrl('twitch', s.platformUrl)).filter(Boolean);
        // Prefer using resolved youtubeChannelId when available to avoid extra lookups
        const youtubeChannelUrls = youtubeStreamers.map(s => {
            // some streamer rows may have youtubeChannelId column
            if ((s as any).youtubeChannelId) return `https://www.youtube.com/channel/${(s as any).youtubeChannelId}`;
            return s.platformUrl;
        });

        const [twitchUsers, youtubeUserDetailsList] = await Promise.all([
            twitchLogins.length > 0 ? getTwitchUsers(twitchLogins) : Promise.resolve([]),
            Promise.all(youtubeChannelUrls.map(url => getYouTubeChannelDetails(url)))
        ]);

        const twitchAvatars = new Map(twitchUsers.map(u => [u.login.toLowerCase(), u.profile_image_url]));
        const youtubeEntries: [string, string][] = [];
        youtubeUserDetailsList.forEach((details, i) => {
            if (details && youtubeChannelUrls[i]) {
                youtubeEntries.push([youtubeChannelUrls[i].toLowerCase(), details.profileImageUrl]);
            }
        });
        const youtubeAvatars = new Map<string, string>(youtubeEntries);

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

        const publicAvatarsDir = path.join(process.cwd(), 'public', 'avatars');
        if (!fs.existsSync(publicAvatarsDir)) fs.mkdirSync(publicAvatarsDir, { recursive: true });

        const combinedAvatars = new Map<string, string>();
        for (const s of streamers) {
            let remoteUrl = getAvatar(s);
            // If avatar is already a local /avatars path, keep it
            if (remoteUrl && remoteUrl.startsWith('/avatars/')) {
                combinedAvatars.set(s.name.toLowerCase(), remoteUrl);
                continue;
            }

            const oneDay = 24 * 60 * 60 * 1000;
            const now = Date.now();

            if (remoteUrl && remoteUrl.startsWith('http')) {
                try {
                    // Use a single deterministic avatar filename base per user (sanitized id).
                    const sanitizedId = s.id.replace(/[^a-zA-Z0-9]/g, '');

                    // Find any existing avatar file for this user (legacy hashed names or different extensions).
                    let existingFile: string | undefined;
                    try {
                        const files = fs.readdirSync(publicAvatarsDir);
                        for (const f of files) {
                            if (f.startsWith(sanitizedId)) {
                                existingFile = f;
                                break;
                            }
                        }
                    } catch (e) {
                        // ignore
                    }

                    // If an existing file is found and it's fresh, use it and skip network fetch.
                    if (existingFile) {
                        const existingPath = path.join(publicAvatarsDir, existingFile);
                        try {
                            const stat = fs.statSync(existingPath);
                            if (now - stat.mtimeMs < oneDay) {
                                combinedAvatars.set(s.name.toLowerCase(), `/avatars/${existingFile}`);
                                continue;
                            }
                        } catch (e) {
                            // proceed to fetch
                        }
                    }

                    // Fetch remote only when we need to refresh or the file doesn't exist / is stale
                    const res = await fetch(remoteUrl);
                    if (!res.ok) throw new Error(`Failed to fetch avatar: ${res.status}`);

                    // Determine extension from Content-Type header when possible
                    const contentType = (res.headers.get('content-type') || '').toLowerCase();
                    let ext = 'jpg';
                    if (contentType.includes('png')) ext = 'png';
                    else if (contentType.includes('gif')) ext = 'gif';
                    else if (contentType.includes('webp')) ext = 'webp';
                    else if (contentType.includes('jpeg')) ext = 'jpg';
                    else {
                        // fallback to parsing from URL path
                        try {
                            const urlPath = new URL(remoteUrl).pathname;
                            const parsed = path.extname(urlPath).replace('.', '');
                            if (parsed) ext = parsed.split('?')[0];
                        } catch (e) {
                            // leave default 'jpg'
                        }
                    }

                    const safeName = `${sanitizedId}.${ext}`;
                    const outPath = path.join(publicAvatarsDir, safeName);
                    const localPath = `/avatars/${safeName}`;

                    const buffer = Buffer.from(await res.arrayBuffer());

                    if (fs.existsSync(outPath)) {
                        try {
                            const existing = fs.readFileSync(outPath);
                            if (existing && Buffer.compare(existing, buffer) === 0) {
                                // identical content, update mtime
                                try { fs.utimesSync(outPath, new Date(), new Date()); } catch {}
                            } else {
                                fs.writeFileSync(outPath, buffer);
                                try { console.debug(`Wrote avatar file: ${outPath}`); } catch {}
                            }
                        } catch (e) {
                            // if read fails, overwrite
                            fs.writeFileSync(outPath, buffer);
                            try { console.debug(`Wrote avatar file (overwrite on read-fail): ${outPath}`); } catch {}
                        }
                    } else {
                        fs.writeFileSync(outPath, buffer);
                        try { console.debug(`Wrote avatar file: ${outPath}`); } catch {}
                    }

                    // Cleanup any older avatar files for this user (e.g., legacy hashed names)
                    try {
                        const files = fs.readdirSync(publicAvatarsDir);
                        for (const f of files) {
                            if (f === safeName) continue;
                            if (f.startsWith(`${sanitizedId}-`) || f.split('.')[0] === sanitizedId) {
                                try { fs.unlinkSync(path.join(publicAvatarsDir, f)); } catch (e) {}
                            }
                        }
                    } catch (e) {
                        // ignore cleanup errors
                    }

                    combinedAvatars.set(s.name.toLowerCase(), localPath);
                    // Update DB avatar path (do not store any timestamp here)
                    try {
                        db.prepare('UPDATE streamers SET avatar = ? WHERE id = ?').run(localPath, s.id);
                    } catch (e) {
                        // ignore DB update errors
                    }
                    continue;
                } catch (e) {
                    // fallthrough to placeholder
                }
            }

            // fallback
            combinedAvatars.set(s.name.toLowerCase(), getPlaceholderImage(s.id).imageUrl);
        }

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
        const rawImageUrls = (() => {
            try { const parsed = event.imageUrls ? JSON.parse(event.imageUrls) : []; try { console.debug('getEvents - parsed imageUrls for', event.id, parsed); } catch {} return parsed; } catch (err) { console.error('getEvents - failed to parse imageUrls for', event.id, err); return []; }
        })();
        const finalImageUrls = (() => {
            try { const filtered = rawImageUrls.filter((url:string) => url && (url.startsWith('http') || url.startsWith('/'))); try { console.debug('getEvents - finalImageUrls for', event.id, filtered); } catch {} return filtered; } catch (err) { console.error('getEvents - failed filtering imageUrls for', event.id, err); return []; }
        })();
        
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
        const rawImageUrls = (() => {
            try { const parsed = event.imageUrls ? JSON.parse(event.imageUrls) : []; try { console.debug('getEventById - parsed imageUrls for', id, parsed); } catch {} return parsed; } catch (err) { console.error('getEventById - failed to parse imageUrls for', id, err); return []; }
        })();
        const finalImageUrls = (() => {
            try { const filtered = rawImageUrls.filter((url: string) => url && (url.startsWith('http') || url.startsWith('/'))); try { console.debug('getEventById - finalImageUrls for', id, filtered); } catch {} return filtered; } catch (err) { console.error('getEventById - failed filtering imageUrls for', id, err); return []; }
        })();

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
