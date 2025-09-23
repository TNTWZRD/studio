
import { db } from './db';
import metrics from './metrics';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_PUBSUB_HUB = process.env.YOUTUBE_PUBSUB_HUB || 'https://pubsubhubbub.appspot.com/';
const YOUTUBE_PUSH_CALLBACK = process.env.YOUTUBE_PUSH_CALLBACK || `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/youtube/push`;
// If YOUTUBE_PUSH_SECRET is not explicitly set, default to the Firebase API key (per repo convention)
const YOUTUBE_PUSH_SECRET = process.env.YOUTUBE_PUSH_SECRET || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || undefined;
// Optional OAuth envs (client id/secret + refresh token). If a refresh token is provided,
// we'll exchange it for an access token and use Bearer auth for YouTube Data API calls.
const YT_OAUTH_CLIENTID = process.env.YT_OAUTH_CLIENTID;
const YT_OAUTH_CLIENT_SECRET = process.env.YT_OAUTH_CLIENT_SECRET;
const YT_OAUTH_REFRESH_TOKEN = process.env.YT_OAUTH_REFRESH_TOKEN;
// Toggle to allow automatic YouTube Data API resolution when missing channel IDs.
// Default: false to avoid unexpected quota usage. Set to 'true' only if you understand quota implications.
const ALLOW_YT_RESOLVE = process.env.ALLOW_YT_RESOLVE === 'true';

let _oauthTokenCache: { accessToken: string; expiresAt: number } | null = null;

async function getOAuthAccessToken(): Promise<string | null> {
    if (!YT_OAUTH_REFRESH_TOKEN || !YT_OAUTH_CLIENTID || !YT_OAUTH_CLIENT_SECRET) return null;
    const now = Date.now();
    if (_oauthTokenCache && _oauthTokenCache.expiresAt - 10000 > now) {
        return _oauthTokenCache.accessToken;
    }

    try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: YT_OAUTH_CLIENTID,
                client_secret: YT_OAUTH_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: YT_OAUTH_REFRESH_TOKEN,
            }).toString(),
        });
        if (!res.ok) {
            console.warn('Failed to exchange refresh token for access token:', res.status, await res.text());
            return null;
        }
        const data = await res.json();
        if (!data.access_token) return null;
        const expiresIn = (data.expires_in && Number(data.expires_in)) || 3600;
        _oauthTokenCache = { accessToken: data.access_token, expiresAt: Date.now() + expiresIn * 1000 };
        return data.access_token;
    } catch (err) {
        console.error('Error fetching OAuth access token:', err);
        return null;
    }
}

async function getYouTubeAuthHeaders(): Promise<{ [k: string]: string } | null> {
    const token = await getOAuthAccessToken();
    if (token) return { Authorization: `Bearer ${token}` };
    return null;
}

interface YouTubeSearchItem {
    id: {
        kind: string;
        videoId?: string;
        channelId?: string;
    };
    snippet: {
        publishedAt: string;
        channelId: string;
        title: string;
        description: string;
        thumbnails: {
            default: { url: string };
            medium: { url: string };
            high: { url: string };
        };
        channelTitle: string;
        liveBroadcastContent: 'live' | 'upcoming' | 'none';
    };
}

interface YouTubeSearchResponse {
    items: YouTubeSearchItem[];
}

interface YouTubeChannel {
    id: string;
    snippet: {
        title: string;
        thumbnails: {
            default: { url: string };
            medium: { url: string };
            high: { url: string };
        };
    };
}

interface YouTubeChannelsResponse {
    items: YouTubeChannel[];
}


export interface LiveYouTubeStream {
    channelUrl: string;
    videoId: string;
    title: string;
    thumbnailUrl: string;
}

export interface YouTubeChannelDetails {
    channelId: string;
    profileImageUrl: string;
}

// A simple in-memory cache to store channel ID lookups to avoid redundant API calls.
const channelIdCache = new Map<string, string>();
const channelDetailsCache = new Map<string, YouTubeChannelDetails>();


/**
 * Extracts the custom channel name or handle from a YouTube channel URL.
 * e.g., "https://www.youtube.com/@handle" -> "handle"
 * e.g., "https://www.youtube.com/c/customurl" -> "customurl"
 * e.g., "https://www.youtube.com/user/username" -> "username"
 * e.g., "https://www.youtube.com/vanityname" -> "vanityname"
 */
function getIdentifierFromUrl(url: string): string | null {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        if (pathParts.length > 0) {
            // Handles /@handle, /c/name, /user/name
            if (pathParts[0] === 'c' || pathParts[0] === 'user' || pathParts[0].startsWith('@')) {
                 // For /@handle, use pathParts[0] (e.g. '@handle') -> 'handle'
                 // For /c/name or /user/name, use pathParts[1]
                const identifier = pathParts[0].startsWith('@') ? pathParts[0].substring(1) : pathParts[1];
                if(identifier) return identifier;
            }
            // Handles vanity URLs like /channelname or channel IDs like /channel/UC...
            if(pathParts[0] === 'channel' && pathParts.length > 1) {
                return pathParts[1];
            }
            return pathParts[0];
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Fetches the Channel ID for a given YouTube channel custom URL or handle.
 * Uses the Search:list endpoint to find the channel by its name.
 */
export async function getChannelId(channelIdentifier: string): Promise<string | null> {
    if (channelIdCache.has(channelIdentifier)) {
        return channelIdCache.get(channelIdentifier)!;
    }

    if (!YOUTUBE_API_KEY) {
        console.warn('YOUTUBE_API_KEY is not set. Skipping YouTube channel ID fetch.');
        return null;
    }
    
    // If identifier is a valid channel ID, just return it
    if(channelIdentifier.startsWith('UC')) {
        return channelIdentifier;
    }

    // This is a workaround since there's no direct endpoint to resolve a vanity URL.
    // We search for a channel with the exact name/handle.
    const authHeaders = await getYouTubeAuthHeaders();
    const searchUrl = `${YOUTUBE_API_URL}/search?part=snippet&q=${encodeURIComponent(channelIdentifier)}&type=channel${authHeaders ? '' : `&key=${YOUTUBE_API_KEY}`}`;
    try {
        const res = await fetch(searchUrl, { next: { revalidate: 3600 }, headers: authHeaders || undefined }); // Cache for 1 hour
        if (!res.ok) {
            const body = await res.text();
            if (res.status === 403 && body.includes('API_KEY_HTTP_REFERRER_BLOCKED')) {
                console.error('YouTube API key is restricted for HTTP referrers (server requests have empty referer). Use an IP-restricted key or provide OAuth credentials.');
            }
            console.error(`YouTube API error (getChannelId for ${channelIdentifier}): ${res.status} ${body}`);
            return null;
        }
        const data: YouTubeSearchResponse = await res.json();
        
        // Find a channel that matches the identifier, prioritizing handles (@name) and then titles.
        const channelItem = data.items?.find(item => {
            const title = item.snippet.channelTitle.toLowerCase();
            const identifierLower = channelIdentifier.toLowerCase();
            // This is imperfect, but YouTube API has no better way to resolve vanity URLs.
            // We hope the top search result for the vanity name is the correct channel.
            return title === identifierLower || item.id.channelId;
        });
        
        if (channelItem?.id.channelId) {
            channelIdCache.set(channelIdentifier, channelItem.id.channelId);
            return channelItem.id.channelId;
        }

        return null;
    } catch (error: any) {
        console.error(`Error fetching YouTube channel ID for ${channelIdentifier}:`, error);
        metrics.increment('youtube.resolve.exception');
        if (error?.status === 429) metrics.increment('youtube.resolve.429');
        if (error?.status === 403) metrics.increment('youtube.resolve.403');
        return null;
    }
}

export async function getYouTubeChannelDetails(channelUrl: string): Promise<YouTubeChannelDetails | null> {
    const identifier = getIdentifierFromUrl(channelUrl);
    if (!identifier) return null;

    if (channelDetailsCache.has(identifier)) {
        return channelDetailsCache.get(identifier)!;
    }

    const channelId = await getChannelId(identifier);
    if (!channelId) return null;
    
    if (!YOUTUBE_API_KEY) return null;

    const authHeaders2 = await getYouTubeAuthHeaders();
    const detailsUrl = `${YOUTUBE_API_URL}/channels?part=snippet&id=${channelId}${authHeaders2 ? '' : `&key=${YOUTUBE_API_KEY}`}`;
    try {
        const res = await fetch(detailsUrl, { next: { revalidate: 3600 }, headers: authHeaders2 || undefined }); // Cache for 1 hour
        if (!res.ok) {
            const body = await res.text();
            if (res.status === 403 && body.includes('API_KEY_HTTP_REFERRER_BLOCKED')) {
                console.error('YouTube API key is restricted for HTTP referrers (server requests have empty referer). Use an IP-restricted key or provide OAuth credentials.');
            }
            console.error(`YouTube API error (getYouTubeChannelDetails for ${channelId}): ${res.status} ${body}`);
            return null;
        }
        const data: YouTubeChannelsResponse = await res.json();
        const channel = data.items?.[0];
        
        if (channel) {
            const details: YouTubeChannelDetails = {
                channelId: channel.id,
                profileImageUrl: channel.snippet.thumbnails.high.url
            };
            channelDetailsCache.set(identifier, details);
            return details;
        }
        return null;

    } catch (error) {
        console.error(`Error fetching YouTube channel details for ${channelId}:`, error);
        return null;
    }
}

/**
 * Subscribe or unsubscribe to YouTube PubSubHubbub notifications for a channel.
 * Accepts either a channel URL/handle or a raw channel ID (UC...).
 */
async function sendPubSubHubRequest(mode: 'subscribe' | 'unsubscribe', channelIdentifierOrStreamerId: string, isStreamerId = false): Promise<boolean> {
    // Resolve channelId first. If a streamerId is passed (isStreamerId=true), try to read from DB and persist if resolved.
    let maybeId: string | null = null;
    if (isStreamerId) {
        try {
            const row = db.prepare('SELECT youtubeChannelId, platformUrl FROM streamers WHERE id = ?').get(channelIdentifierOrStreamerId) as any;
            if (row && row.youtubeChannelId) {
                maybeId = row.youtubeChannelId;
            } else if (row && row.platformUrl) {
                // Only attempt automatic resolution if explicitly allowed via env toggle.
                if (!ALLOW_YT_RESOLVE) {
                    console.warn(`Skipping YouTube Data API resolution for streamer ${channelIdentifierOrStreamerId} because ALLOW_YT_RESOLVE is not enabled.`);
                    metrics.increment('youtube.resolve.skipped');
                } else {
                    const ident = getIdentifierFromUrl(row.platformUrl);
                    if (ident) {
                        const resolved = await getChannelId(ident);
                        if (resolved) {
                            maybeId = resolved;
                            try { db.prepare('UPDATE streamers SET youtubeChannelId = ? WHERE id = ?').run(resolved, channelIdentifierOrStreamerId); } catch (e) {}
                        }
                    }
                }
            }
        } catch (e) {
            // fall through
        }
    }
    if (!maybeId) {
        const candidate = channelIdentifierOrStreamerId;
        maybeId = candidate.startsWith('UC') ? candidate : await getChannelId(candidate);
    }
    if (!maybeId) {
        console.warn('Could not resolve channel id for PuSH request:', channelIdentifierOrStreamerId, '— not subscribing to avoid YouTube Data API calls.');
        metrics.increment('youtube.push.resolve.missing');
        return false;
    }

    const topic = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${maybeId}`;

    const body = new URLSearchParams();
    body.append('hub.mode', mode);
    body.append('hub.topic', topic);
    body.append('hub.callback', YOUTUBE_PUSH_CALLBACK);
    // use async verification
    body.append('hub.verify', 'async');
    // If a secret is configured, request the hub to sign notifications
    if (YOUTUBE_PUSH_SECRET) {
        body.append('hub.secret', YOUTUBE_PUSH_SECRET);
    }

    try {
        const res = await fetch(YOUTUBE_PUBSUB_HUB, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });
        if (!res.ok) {
            const txt = await res.text();
            console.error(`PuSH ${mode} request failed for ${topic}:`, res.status, txt);
            metrics.increment('youtube.push.error');
            if (res.status === 429) metrics.increment('youtube.push.error.429');
            if (res.status === 403) metrics.increment('youtube.push.error.403');
            return false;
        }
        return true;
    } catch (err) {
        console.error('Error sending PuSH request:', err);
        metrics.increment('youtube.push.exception');
        return false;
    }
}

export async function subscribeToYouTubeChannel(channelUrlOrId: string): Promise<boolean> {
    if (channelUrlOrId.startsWith('streamer:')) {
        const streamerId = channelUrlOrId.replace(/^streamer:/, '');
        return sendPubSubHubRequest('subscribe', streamerId, true);
    }
    return sendPubSubHubRequest('subscribe', channelUrlOrId);
}

export async function unsubscribeFromYouTubeChannel(channelUrlOrId: string): Promise<boolean> {
    if (channelUrlOrId.startsWith('streamer:')) {
        const streamerId = channelUrlOrId.replace(/^streamer:/, '');
        return sendPubSubHubRequest('unsubscribe', streamerId, true);
    }
    return sendPubSubHubRequest('unsubscribe', channelUrlOrId);
}

/**
 * Given an XML push notification body, extract the videoId and channelId.
 * This is intentionally simple and permissive so we avoid adding an XML parser dependency.
 */
export function parseYouTubePushXml(xml: string): { videoId?: string; channelId?: string } {
    // Try common tags: <yt:videoId>, <yt:channelId>, <id> (yt:video:VIDEOID)
    const videoMatch = xml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || xml.match(/<id>yt:video:([^<]+)<\/id>/);
    const channelMatch = xml.match(/<yt:channelId>([^<]+)<\/yt:channelId>/);
    return {
        videoId: videoMatch ? videoMatch[1] : undefined,
        channelId: channelMatch ? channelMatch[1] : undefined,
    };
}

/**
 * Fetch basic video details (title, thumbnail) using the YouTube Data API.
 */
export async function getYouTubeVideoDetails(videoId: string): Promise<{ title?: string; thumbnailUrl?: string } | null> {
    if (!YOUTUBE_API_KEY) return null;
    try {
        const authHeaders3 = await getYouTubeAuthHeaders();
        const url = `${YOUTUBE_API_URL}/videos?part=snippet&id=${encodeURIComponent(videoId)}${authHeaders3 ? '' : `&key=${YOUTUBE_API_KEY}`}`;
        const res = await fetch(url, { cache: 'no-store', headers: authHeaders3 || undefined });
        if (!res.ok) {
            const body = await res.text();
            if (res.status === 403 && body.includes('API_KEY_HTTP_REFERRER_BLOCKED')) {
                console.error('YouTube API key is restricted for HTTP referrers (server requests have empty referer). Use an IP-restricted key or provide OAuth credentials.');
            }
            console.error('YouTube videos API error:', res.status, body);
            metrics.increment('youtube.videos.error');
            if (res.status === 429) metrics.increment('youtube.videos.429');
            if (res.status === 403) metrics.increment('youtube.videos.403');
            return null;
        }
        const data = await res.json();
        const item = data.items?.[0];
        if (!item) return null;
        return {
            title: item.snippet?.title,
            thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
        };
    } catch (err) {
        console.error('Error fetching video details:', err);
        return null;
    }
}


/**
 * Checks a list of YouTube channel URLs and returns info for those currently live.
 */
export async function getYouTubeStreamStatus(channelUrls: string[]): Promise<LiveYouTubeStream[]> {
    if (!YOUTUBE_API_KEY) {
        console.warn('YOUTUBE_API_KEY is not set. Skipping YouTube status check.');
        return [];
    }

    const liveStreams: LiveYouTubeStream[] = [];

    for (const url of channelUrls) {
        try {
            const channelDetails = await getYouTubeChannelDetails(url);

            if (!channelDetails || !channelDetails.channelId) {
                console.error(`Error: Could not determine Channel ID for URL: ${url}`);
                continue;
            }

            const authHeaders4 = await getYouTubeAuthHeaders();
            const searchUrl = `${YOUTUBE_API_URL}/search?part=snippet&channelId=${channelDetails.channelId}&eventType=live&type=video${authHeaders4 ? '' : `&key=${YOUTUBE_API_KEY}`}`;
            const res = await fetch(searchUrl, { cache: 'no-store', headers: authHeaders4 || undefined }); 

            if (!res.ok) {
                 const body = await res.text();
                 if (res.status === 403 && body.includes('API_KEY_HTTP_REFERRER_BLOCKED')) {
                     console.error('YouTube API key is restricted for HTTP referrers (server requests have empty referer). Use an IP-restricted key or provide OAuth credentials.');
                 }
                 console.error(`YouTube API error (getYouTubeStreamStatus for ${channelDetails.channelId}): ${res.status} ${body}`);
                continue;
            }

            const data: YouTubeSearchResponse = await res.json();

            if (data.items && data.items.length > 0) {
                const liveVideo = data.items[0];
                liveStreams.push({
                    channelUrl: url,
                    videoId: liveVideo.id.videoId!,
                    title: liveVideo.snippet.title,
                    thumbnailUrl: liveVideo.snippet.thumbnails.high.url,
                });
            }
        } catch (error) {
            console.error(`Error processing YouTube channel ${url}:`, error);
        }
    }

    return liveStreams;
}
