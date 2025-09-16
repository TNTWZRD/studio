'use server';

import type { Event } from './types';
import { unstable_cache as cache } from 'next/cache';

const GUILD_ID = process.env.DISCORD_GUILD_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_API_URL = 'https://discord.com/api/v10';

async function discordApiFetch(endpoint: string) {
    if (!BOT_TOKEN) {
        console.error('DISCORD_BOT_TOKEN is not configured.');
        return [];
    }

    const url = `${DISCORD_API_URL}${endpoint}`;
    try {
        // Use Next.js's built-in fetch caching and revalidation
        const response = await fetch(url, {
            headers: {
                Authorization: `Bot ${BOT_TOKEN}`,
            },
            next: {
                // Revalidate every 5 minutes
                revalidate: 300,
            },
        });

        if (!response.ok) {
            console.error(`Discord API Error for endpoint ${endpoint}: ${response.status} ${response.statusText}`);
            const errorBody = await response.text();
            console.error('Error Body:', errorBody);
            return [];
        }

        return response.json();
    } catch (error) {
        console.error(`Failed to fetch from Discord API endpoint: ${endpoint}`, error);
        return [];
    }
}

function mapDiscordEventToEvent(discordEvent: any): Event {
    // Discord event statuses: 1: SCHEDULED, 2: ACTIVE, 3: COMPLETED, 4: CANCELED
    const statusMapping: { [key: number]: Event['status'] } = {
        1: 'scheduled',
        2: 'active',
        3: 'completed',
        4: 'canceled',
    };

    let imageUrl = null;
    if (discordEvent.image) {
        imageUrl = `https://cdn.discordapp.com/guild-events/${discordEvent.id}/${discordEvent.image}.png?size=1024`;
    }

    return {
        id: discordEvent.id,
        title: discordEvent.name,
        description: discordEvent.description || 'No details provided.',
        start: discordEvent.scheduled_start_time,
        end: discordEvent.scheduled_end_time,
        status: statusMapping[discordEvent.status] || 'scheduled',
        image: imageUrl,
        location: discordEvent.entity_metadata?.location || 'Discord',
    };
}

// Re-implement getDiscordEvents using a stable cache key and improved sorting
export const getDiscordEvents = cache(
    async (): Promise<Event[]> => {
        if (!GUILD_ID) {
            console.error('DISCORD_GUILD_ID is not configured.');
            return [];
        }
        const discordEvents = await discordApiFetch(`/guilds/${GUILD_ID}/scheduled-events`);
        if (!Array.isArray(discordEvents)) {
            return [];
        }

        const allEvents = discordEvents.map(mapDiscordEventToEvent);

        // Separate events into active, upcoming, and past
        const activeEvents = allEvents.filter(e => e.status === 'active');
        const upcomingEvents = allEvents.filter(e => e.status === 'scheduled');
        const otherEvents = allEvents.filter(e => e.status !== 'active' && e.status !== 'scheduled');
        
        // Sort active events by start time (most recent first)
        activeEvents.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
        // Sort upcoming events by start time (soonest first)
        upcomingEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        // Return active events first, then upcoming events
        return [...activeEvents, ...upcomingEvents, ...otherEvents];
    },
    ['v2_discord-events'], // Use a new cache key to avoid conflicts
    { revalidate: 300 } // Cache for 5 minutes
);


export const getDiscordEventById = cache(
    async (id: string): Promise<Event | null> => {
        if (!GUILD_ID) {
            console.error('DISCORD_GUILD_ID is not configured.');
            return null;
        }
        // Note: Discord API requires the `with_user_count` parameter
        const discordEvent = await discordApiFetch(`/guilds/${GUILD_ID}/scheduled-events/${id}?with_user_count=true`);
        if (!discordEvent || !discordEvent.id) {
            return null;
        }
        return mapDiscordEventToEvent(discordEvent);
    },
    ['v2_discord-event-by-id'],
    { revalidate: 300 }
);