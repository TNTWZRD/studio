'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { MediaItem } from '@/lib/types';
import { auth } from '@/lib/firebase';
import { canPost } from '@/lib/auth';

const mediaPath = path.join(process.cwd(), 'src', 'data', 'media.json');

const AddMediaSchema = z.object({
    title: z.string().min(1, 'Title is required.'),
    url: z.string().url('A valid URL is required.'),
    type: z.enum(['video', 'clip', 'stream', 'guide', 'short']),
    creator: z.string().min(1, 'Creator name is required.'),
});

const UpdateMediaSchema = z.object({
    id: z.string().min(1),
    title: z.string().min(1, 'Title is required.'),
    url: z.string().url('A valid URL is required.'),
    type: z.enum(['video', 'clip', 'stream', 'guide', 'short']),
});


type FormState = {
    success: boolean;
    message: string;
};

async function readMediaFile(): Promise<MediaItem[]> {
    try {
        const fileContent = await fs.readFile(mediaPath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('Error reading media.json:', error);
        return [];
    }
}

async function writeMediaFile(data: MediaItem[]) {
    try {
        await fs.writeFile(mediaPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error writing to media.json:', error);
        throw new Error('Could not update the media file.');
    }
}

export async function addMedia(prevState: FormState, formData: FormData): Promise<FormState> {
    const validatedFields = AddMediaSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
        return {
            success: false,
            message: firstError || 'Invalid data provided.',
        };
    }
    
    const { title, url, type, creator } = validatedFields.data;

    try {
        const media = await readMediaFile();
        const newId = 'media-' + Date.now();
        
        const newMediaItem: MediaItem = {
            id: newId,
            title,
            url,
            type,
            creator,
            date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            thumbnail: String(Math.floor(Math.random() * 20) + 1), // Assign a random placeholder image ID
        };

        media.unshift(newMediaItem); // Add to the beginning of the list
        await writeMediaFile(media);

        revalidatePath('/');
        revalidatePath('/creator');
        revalidatePath('/media');
        
        return { success: true, message: `Media "${title}" has been added successfully.` };

    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}


export async function updateMedia(prevState: FormState, formData: FormData): Promise<FormState> {
    const validatedFields = UpdateMediaSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
        return {
            success: false,
            message: firstError || 'Invalid data provided.',
        };
    }

    const { id, title, url, type } = validatedFields.data;

    try {
        const media = await readMediaFile();
        const mediaIndex = media.findIndex((m) => m.id === id);

        if (mediaIndex === -1) {
            return { success: false, message: "Media not found." };
        }

        // You might want to add an ownership check here in a real app
        // For now, we assume if you can call this action, you have permission.
        
        media[mediaIndex].title = title;
        media[mediaIndex].url = url;
        media[mediaIndex].type = type;

        await writeMediaFile(media);

        revalidatePath('/');
        revalidatePath('/creator');
        revalidatePath('/media');
        
        return { success: true, message: `Media "${title}" has been updated successfully.` };

    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}


const RemoveMediaSchema = z.object({
    id: z.string().min(1)
});

export async function removeMedia(prevState: FormState, formData: FormData): Promise<FormState> {
     const validatedFields = RemoveMediaSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Invalid media ID provided."
        };
    }

    const { id } = validatedFields.data;

    try {
        const media = await readMediaFile();
        const mediaToRemove = media.find((m) => m.id === id);

        if (!mediaToRemove) {
            return { success: false, message: "Media not found." };
        }

        const updatedMedia = media.filter((m) => m.id !== id);
        await writeMediaFile(updatedMedia);
        
        revalidatePath('/');
        revalidatePath('/creator');
        revalidatePath('/media');
        
        return { success: true, message: `Media "${mediaToRemove.title}" has been removed.` };

    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}
