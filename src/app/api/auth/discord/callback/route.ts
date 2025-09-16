import { adminAuth } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

async function getGuildMember(accessToken: string, guildId: string) {
    if (!guildId) return null;

    const response = await fetch(`https://discord.com/api/users/@me/guilds/${guildId}/member`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        // This can happen if the user is not in the guild.
        if (response.status === 404) {
            return null;
        }
        console.error('Failed to get guild member info:', await response.text());
        return null;
    }

    return response.json();
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.json({ error: 'Code not found in query parameters.' }, { status: 400 });
    }
    
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;
    const guildId = process.env.DISCORD_GUILD_ID;

    // Diagnostic logging
    console.log("--- Discord Auth Callback ---");
    console.log("Client ID:", clientId ? "Loaded" : "MISSING");
    console.log("Client Secret:", clientSecret ? "Loaded" : "MISSING");
    console.log("Redirect URI:", redirectUri ? "Loaded" : "MISSING");
    console.log("Guild ID:", guildId ? "Loaded" : "MISSING");
    console.log("--- End Diagnostic ---");

    if (!clientId || !clientSecret || !redirectUri) {
        console.error('Missing Discord environment variables');
        return NextResponse.json({ error: 'Server configuration error: Missing Discord credentials.' }, { status: 500 });
    }

    try {
        // Exchange code for access token
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

        if (tokenData.error) {
            console.error('Discord token exchange error:', tokenData);
            return NextResponse.json({ error: tokenData.error_description || 'Failed to exchange code for token.' }, { status: 400 });
        }

        // Fetch user data from Discord
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        const userData = await userResponse.json();
        
        const { id, username, avatar, email } = userData;
        const uid = `discord:${id}`;

        // Fetch guild member info to get roles
        const memberData = await getGuildMember(tokenData.access_token, guildId!);
        const customClaims = {
            isGuildMember: !!memberData,
            roles: memberData?.roles || [],
        };

        // Create or update user in Firebase Auth
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
        
        // Set the custom claims
        await adminAuth.setCustomUserClaims(uid, customClaims);

        // Create custom token
        const customToken = await adminAuth.createCustomToken(uid);

        const url = req.nextUrl.clone();
        // Redirect to a dedicated auth handler page or back to the home page.
        // The client will handle the token.
        url.pathname = '/';
        url.search = `?token=${customToken}`;
        
        return NextResponse.redirect(url);

    } catch (error: any) {
        console.error('Discord auth callback error:', error);
        return NextResponse.json({ error: 'Internal Server Error during authentication.', details: error.message }, { status: 500 });
    }
}
