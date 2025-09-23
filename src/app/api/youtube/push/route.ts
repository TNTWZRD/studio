import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { parseYouTubePushXml, getYouTubeVideoDetails, getChannelId } from '@/lib/youtube';

// Note: This is an API route to receive YouTube PubSubHubbub callbacks.
// It supports the verification handshake (GET) and notification (POST with XML body).

export async function GET(req: NextRequest) {
    // Subscription verification: hub.mode, hub.topic, hub.challenge
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const challenge = url.searchParams.get('hub.challenge');
    const topic = url.searchParams.get('hub.topic');

    if (mode && challenge) {
        console.log('PuSH verification', mode, topic);
        return new Response(challenge, { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
}

export async function POST(req: NextRequest) {
    const text = await req.text();

    // Verify HMAC signature if provided
    try {
        const secret = process.env.YOUTUBE_PUSH_SECRET;
        const sig256 = req.headers.get('x-hub-signature-256') || req.headers.get('X-Hub-Signature-256');
        const sig = req.headers.get('x-hub-signature') || req.headers.get('X-Hub-Signature');
        if (secret && (sig256 || sig)) {
            const crypto = await import('crypto');
            const h = crypto.createHmac('sha256', secret);
            h.update(text);
            const digest = 'sha256=' + h.digest('hex');
            if (sig256 && digest !== sig256) {
                console.warn('PuSH signature mismatch');
                return new Response('Forbidden', { status: 403 });
            }
            // Note: older hub may use sha1
            if (sig && digest !== sig && !sig.startsWith('sha1=')) {
                console.warn('PuSH signature mismatch (sha1 unsupported)');
                return new Response('Forbidden', { status: 403 });
            }
        }
    } catch (e) {
        console.warn('Error verifying PuSH signature', e);
    }

    // Parse XML and extract ids
    const parsed = parseYouTubePushXml(text);
    const { videoId, channelId } = parsed;

    if (!videoId || !channelId) {
        console.warn('PuSH notification missing ids');
        return new Response('Ignored', { status: 204 });
    }

    // Lookup streamer by channelId (stored via channelUrl -> resolved id in streamers table)
    try {
        const stmt = db.prepare("SELECT id, platformUrl FROM streamers WHERE platform = 'youtube'");
        const rows = stmt.all() as Array<{ id: string; platformUrl: string }>;
        // Find matching streamer by resolving their stored platformUrl to channel id heuristically
        let matchedStreamerId: string | null = null;
        for (const r of rows) {
            // platformUrl is a URL; try to extract last path segment or handle
            try {
                const u = new URL(r.platformUrl);
                const pathParts = u.pathname.split('/').filter(p => p);
                let identifier = pathParts[0] || '';
                if (identifier === 'channel' && pathParts[1]) identifier = pathParts[1];
                // normalize: channelId starts with UC
                if (identifier === channelId || identifier === `@${channelId}`) {
                    matchedStreamerId = r.id;
                    break;
                }
            } catch {}
        }

        // If we didn't match by url heuristics, try to match by fetching channel details via API
        if (!matchedStreamerId) {
            for (const r of rows) {
                try {
                    const ident = (() => {
                        try {
                            const u = new URL(r.platformUrl);
                            const parts = u.pathname.split('/').filter(p => p);
                            if (parts[0] === 'channel' && parts[1]) return parts[1];
                            if (parts[0] && parts[0].startsWith('@')) return parts[0].substring(1);
                            return parts[0];
                        } catch { return r.platformUrl; }
                    })();
                    const resolved = await getChannelId(ident);
                    if (resolved === channelId) {
                        matchedStreamerId = r.id;
                        break;
                    }
                } catch (e) {}
            }
        }

        // If we found a streamer, update their isLive and recent video info
        if (matchedStreamerId) {
            const videoDetails = await getYouTubeVideoDetails(videoId);
            const update = db.prepare('UPDATE streamers SET isLive = 1, title = ? WHERE id = ?');
            update.run(videoDetails?.title || 'Live on YouTube', matchedStreamerId);

            // Insert into media table as a live video if desired
            try {
                const insert = db.prepare(`INSERT OR IGNORE INTO media (id, title, platform, platformUrl, videoId, imageUrls, createdAt)
                    VALUES (?, ?, 'youtube', ?, ?, ?, ?)`);
                const id = `yt-${videoId}`;
                insert.run(id, videoDetails?.title || 'YouTube Live', `https://www.youtube.com/watch?v=${videoId}`, videoId, JSON.stringify([videoDetails?.thumbnailUrl || '']), Date.now());
            } catch (e) {
                console.warn('Failed to insert media row for YouTube push', e);
            }
        }

        return new Response('OK', { status: 200 });
    } catch (err) {
        console.error('Error handling PuSH POST:', err);
        return new Response('Error', { status: 500 });
    }
}

// default runtime
