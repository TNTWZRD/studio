'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { Streamer, Event, MediaItem, Config } from '@/lib/types';
import { PlaceHolderImages, ImagePlaceholder } from './placeholder-images';

// Helper function to read and parse a JSON file
async function readJsonFile<T>(filePath: string): Promise<T> {
    const fullPath = path.join(process.cwd(), filePath);
    const fileContent = await fs.readFile(fullPath, 'utf-8');
    return JSON.parse(fileContent);
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
    const streamsData = await readJsonFile<any[]>('src/data/streams.json');
    return streamsData.map(streamer => ({
        ...streamer,
        avatar: getImage(streamer.avatar).imageUrl
    }));
}

export async function getEvents(): Promise<Event[]> {
    const eventsData = await readJsonFile<any[]>('src/data/events.json');
    return eventsData.map(event => ({
        ...event,
        image: getImage(event.image).imageUrl
    })).sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
}

export async function getEventById(id: string): Promise<Event | undefined> {
    const eventsData = await readJsonFile<any[]>('src/data/events.json');
    const event = eventsData.find(e => e.id === id);
    if (!event) return undefined;
    return {
        ...event,
        image: getImage(event.image).imageUrl
    };
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
