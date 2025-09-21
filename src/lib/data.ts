
'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { Streamer, Event, MediaItem, Config } from '@/lib/types';
import { PlaceHolderImages, ImagePlaceholder } from './placeholder-images';

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
        return {
            id: 'error',
            imageUrl: `https://picsum.photos/seed/${id || 'error'}/400/300`,
            description: 'Placeholder image not found',
            imageHint: 'error',
        };
    }
    return img;
};


export async function getStreamers(): Promise<Streamer[]> {
    return await readJsonFile<Streamer[]>('src/data/streams.json');
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
