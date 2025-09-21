
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

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
async function getChannelId(channelIdentifier: string): Promise<string | null> {
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
    const searchUrl = `${YOUTUBE_API_URL}/search?part=snippet&q=${encodeURIComponent(channelIdentifier)}&type=channel&key=${YOUTUBE_API_KEY}`;
    
    try {
        const res = await fetch(searchUrl, { next: { revalidate: 3600 } }); // Cache for 1 hour
        if (!res.ok) {
            console.error(`YouTube API error (getChannelId for ${channelIdentifier}): ${res.status} ${await res.text()}`);
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
    } catch (error) {
        console.error(`Error fetching YouTube channel ID for ${channelIdentifier}:`, error);
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

    const detailsUrl = `${YOUTUBE_API_URL}/channels?part=snippet&id=${channelId}&key=${YOUTUBE_API_KEY}`;
    try {
        const res = await fetch(detailsUrl, { next: { revalidate: 3600 } }); // Cache for 1 hour
        if (!res.ok) {
            console.error(`YouTube API error (getYouTubeChannelDetails for ${channelId}): ${res.status} ${await res.text()}`);
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

            const searchUrl = `${YOUTUBE_API_URL}/search?part=snippet&channelId=${channelDetails.channelId}&eventType=live&type=video&key=${YOUTUBE_API_KEY}`;
            const res = await fetch(searchUrl, { cache: 'no-store' }); 

            if (!res.ok) {
                 console.error(`YouTube API error (getYouTubeStreamStatus for ${channelDetails.channelId}): ${res.status} ${await res.text()}`);
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
