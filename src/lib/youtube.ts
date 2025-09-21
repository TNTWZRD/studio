
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

export interface LiveYouTubeStream {
    channelUrl: string;
    videoId: string;
    title: string;
    thumbnailUrl: string;
}

// A simple in-memory cache to store channel ID lookups to avoid redundant API calls.
const channelIdCache = new Map<string, string>();

/**
 * Extracts the custom channel name or handle from a YouTube channel URL.
 * e.g., "https://www.youtube.com/@handle" -> "handle"
 * e.g., "https://www.youtube.com/c/customurl" -> "customurl"
 * e.g., "https://www.youtube.com/user/username" -> "username"
 */
function getIdentifierFromUrl(url: string): string | null {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        if (pathParts.length > 0) {
            const lastPart = pathParts[pathParts.length - 1];
            if (pathParts[0] === 'c' || pathParts[0] === 'user' || lastPart.startsWith('@')) {
                 return lastPart.startsWith('@') ? lastPart.substring(1) : lastPart;
            }
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
        const channelItem = data.items?.find(item => 
            item.snippet.channelTitle.toLowerCase() === channelIdentifier.toLowerCase() || 
            item.id.channelId // Fallback if title doesn't match
        );
        
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
            const identifier = getIdentifierFromUrl(url);
            let channelId = null;

            if (identifier) {
                channelId = await getChannelId(identifier);
            }

            if (!channelId) {
                console.warn(`Could not determine Channel ID for URL: ${url}`);
                continue;
            }

            const searchUrl = `${YOUTUBE_API_URL}/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${YOUTUBE_API_KEY}`;
            const res = await fetch(searchUrl, { next: { revalidate: 120 } }); // Revalidate every 2 minutes

            if (!res.ok) {
                 console.error(`YouTube API error (getYouTubeStreamStatus for ${channelId}): ${res.status} ${await res.text()}`);
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
