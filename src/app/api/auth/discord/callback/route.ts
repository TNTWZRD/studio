import { adminAuth } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_ROLE_IDS, GUILD_MEMBER_ROLE_ID } from '@/lib/auth';

async function getGuildMember(accessToken: string, guildId: string) {
    if (!guildId) return null;

    const response = await fetch(`https://discord.com/api/users/@me/guilds/${guildId}/member`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        if (response.status === 404) {
            return null; // User is not in the guild
        }
        console.error('Failed to get guild member info:', await response.text());
        return null;
    }

    return response.json();
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    // Diagnostic logging: print incoming request details
    try {
        console.log('Discord callback invoked. request.url=', req.url);
        // Headers available on NextRequest
        console.log('Request headers:', {
            host: req.headers.get('host'),
            forwardedProto: req.headers.get('x-forwarded-proto'),
            forwardedHost: req.headers.get('x-forwarded-host'),
            forwardedFor: req.headers.get('x-forwarded-for'),
        });
    } catch (e) {
        console.error('Failed to log request headers', e);
    }

    if (!code) {
        return NextResponse.json({ error: 'Code not found in query parameters.' }, { status: 400 });
    }
    
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!clientId || !clientSecret || !redirectUri) {
        console.error('Missing Discord environment variables');
        return NextResponse.json({ error: 'Server configuration error: Missing Discord credentials.' }, { status: 500 });
    }

    try {
        console.log('Using redirectUri:', redirectUri);
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
            }),
        });

        const tokenData = await tokenResponse.json();
        console.log('Discord token exchange response:', tokenData);
        if (tokenData.error) {
            console.error('Discord token exchange error:', tokenData);
            return NextResponse.json({ error: tokenData.error_description || 'Failed to exchange code for token.' }, { status: 400 });
        }

        // Check guild membership before proceeding
    const memberData = await getGuildMember(tokenData.access_token, guildId!);
    console.log('Guild member data:', memberData);
        const userRoles = memberData?.roles || [];

        const isMember = userRoles.includes(GUILD_MEMBER_ROLE_ID);
        const isAdmin = userRoles.some((roleId: string) => ADMIN_ROLE_IDS.includes(roleId));

        // If the user is not an admin and not a guild member, deny access.
        if (!isAdmin && !isMember) {
            const forbiddenUrl = req.nextUrl.clone();
            forbiddenUrl.pathname = '/forbidden'; // A page to show access denied message
            forbiddenUrl.search = '';
            return NextResponse.redirect(forbiddenUrl);
        }

        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        const userData = await userResponse.json();
        
        const { id, username, avatar, email } = userData;
        const uid = `discord:${id}`;

        const customClaims = {
            isGuildMember: !!memberData,
            roles: userRoles,
        };

        try {
            await adminAuth.updateUser(uid, {
                email: email,
                displayName: username,
                photoURL: avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png` : undefined,
            });
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                await adminAuth.createUser({
                    uid: uid,
                    email: email,
                    displayName: username,
                    photoURL: avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png` : undefined,
                });
            } else {
                throw error;
            }
        }
        
        await adminAuth.setCustomUserClaims(uid, customClaims);
        const customToken = await adminAuth.createCustomToken(uid);

        // Build a redirect URL that respects the public host/proto forwarded by the proxy
        const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
        const forwardedProto = req.headers.get('x-forwarded-proto') || 'http';

        // Prefer explicit NEXT_PUBLIC_APP_URL if set (ensures exact public URL)
        let baseOrigin: string;
        if (process.env.NEXT_PUBLIC_APP_URL) {
            baseOrigin = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
        } else if (forwardedHost) {
            baseOrigin = `${forwardedProto}://${forwardedHost}`;
        } else {
            // Fallback to container-local host/port
            baseOrigin = `${forwardedProto}://0.0.0.0:5235`;
        }

        const redirectUrl = new URL('/', baseOrigin);
        redirectUrl.search = `?token=${customToken}&roleCheck=true`;
        console.log('Redirecting to (computed):', redirectUrl.toString());

        return NextResponse.redirect(redirectUrl);

    } catch (error: any) {
        console.error('Discord auth callback error:', error);
        return NextResponse.json({ error: 'Internal Server Error during authentication.', details: error.message }, { status: 500 });
    }
}
