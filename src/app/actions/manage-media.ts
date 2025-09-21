'use server';

import { db } from '@/lib/db';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { MediaItem } from '@/lib/types';

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
        const newId = 'media-' + Date.now();
        const newMediaItem = {
            id: newId,
            title,
            url,
            type,
            creator,
            date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            thumbnail: String(Math.floor(Math.random() * 20) + 1), // Assign a random placeholder image ID
        };

        const stmt = db.prepare(`
            INSERT INTO media (id, title, url, type, creator, date, thumbnail)
            VALUES (@id, @title, @url, @type, @creator, @date, @thumbnail)
        `);
        stmt.run(newMediaItem);

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
        const stmt = db.prepare(`
            UPDATE media SET title = @title, url = @url, type = @type
            WHERE id = @id
        `);

        const result = stmt.run({ id, title, url, type });
        if (result.changes === 0) {
            return { success: false, message: "Media not found." };
        }
        
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
        const getStmt = db.prepare('SELECT title FROM media WHERE id = ?');
        const mediaToRemove = getStmt.get(id) as MediaItem;

        if (!mediaToRemove) {
            return { success: false, message: "Media not found." };
        }

        const deleteStmt = db.prepare('DELETE FROM media WHERE id = ?');
        deleteStmt.run(id);
        
        revalidatePath('/');
        revalidatePath('/creator');
        revalidatePath('/media');
        
        return { success: true, message: `Media "${mediaToRemove.title}" has been removed.` };

    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}
