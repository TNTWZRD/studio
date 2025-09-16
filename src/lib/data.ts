import { Streamer, Event, MediaItem, Config } from '@/lib/types';
import streamsData from '@/data/streams.json';
import eventsData from '@/data/events.json';
import mediaData from '@/data/media.json';
import configData from '@/data/config.json';
import { PlaceHolderImages, ImagePlaceholder } from './placeholder-images';

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


export function getStreamers(): Streamer[] {
    return streamsData.map(streamer => ({
        ...streamer,
        avatar: getImage(streamer.avatar).imageUrl
    }));
}

export function getEvents(): Event[] {
    return eventsData.map(event => ({
        ...event,
        image: getImage(event.image).imageUrl
    })).sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
}

export function getEventById(id: string): Event | undefined {
    const event = eventsData.find(e => e.id === id);
    if (!event) return undefined;
    return {
        ...event,
        image: getImage(event.image).imageUrl
    };
}

export function getMedia(): MediaItem[] {
    return mediaData.map(item => ({
        ...item,
        thumbnail: getImage(item.thumbnail).imageUrl
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getConfig(): Config {
    return configData;
}
