
let accessToken: string | null = null;
let tokenExpiresAt: number | null = null;

interface TwitchTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: 'live' | '';
  title: string;
  tags: string[];
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  tag_ids: string[];
  is_mature: boolean;
}

interface TwitchStreamsResponse {
    data: TwitchStream[];
    pagination: {
        cursor?: string;
    }
}

async function getAccessToken(): Promise<string> {
    const now = Date.now();
    if (accessToken && tokenExpiresAt && now < tokenExpiresAt) {
        return accessToken;
    }

    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Twitch client ID or secret is not configured in environment variables.');
    }

    const response = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials',
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to get Twitch access token: ${response.status} ${errorBody}`);
    }

    const data: TwitchTokenResponse = await response.json();
    accessToken = data.access_token;
    // Set expiry to be 1 minute before it actually expires to be safe
    tokenExpiresAt = now + (data.expires_in - 60) * 1000;
    
    return accessToken;
}

export async function getTwitchStreamStatus(userLogins: string[]): Promise<TwitchStream[]> {
    if (userLogins.length === 0) {
        return [];
    }
    
    const token = await getAccessToken();
    const clientId = process.env.TWITCH_CLIENT_ID;

    if (!clientId) {
        throw new Error('Twitch client ID is not configured.');
    }

    const params = new URLSearchParams();
    userLogins.forEach(login => params.append('user_login', login));

    const url = `https://api.twitch.tv/helix/streams?${params.toString()}`;

    const response = await fetch(url, {
        headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${token}`,
        },
        cache: 'no-store' // Do not cache results
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to fetch Twitch stream status: ${response.status} ${errorBody}`);
    }

    const result: TwitchStreamsResponse = await response.json();
    return result.data;
}
