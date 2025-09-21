'use server';

import { db } from '@/lib/db';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { Event } from '@/lib/types';

const mediaIdsPreprocess = z.preprocess((arg) => {
    if (typeof arg === 'string' && arg.length > 0) return [arg];
    if (Array.isArray(arg)) return arg.filter(id => id.length > 0);
    return [];
}, z.array(z.string()));

const imageUrlsPreprocess = z.preprocess((arg) => {
    if (typeof arg === 'string' && arg.length > 0) return [arg];
    if (Array.isArray(arg)) return arg.filter(url => typeof url === 'string' && url.length > 0);
    return [];
}, z.array(z.string().url().or(z.literal(''))).optional());


const EventSchema = z.object({
    title: z.string().min(1, 'Title is required.'),
    start: z.string().min(1, 'Start date is required.'),
    end: z.string().min(1, 'End date is required.'),
    details: z.string().min(1, 'Details are required.'),
    status: z.enum(['upcoming', 'live', 'past']),
    url: z.string().url().optional().or(z.literal('')),
    imageUrls: imageUrlsPreprocess,
    media: mediaIdsPreprocess.optional(),
});

const AddEventSchema = EventSchema;
const UpdateEventSchema = EventSchema.extend({
    id: z.string().min(1),
});

type FormState = {
    success: boolean;
    message: string;
};

export async function addEvent(prevState: FormState, formData: FormData): Promise<FormState> {
    const validatedFields = AddEventSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
        return {
            success: false,
            message: firstError || 'Invalid data provided.',
        };
    }
    
    const { title, start, end, details, status, url, imageUrls, media } = validatedFields.data;

    try {
        const newId = 'event-' + Date.now();
        const primaryImage = imageUrls?.[0] || String(Math.floor(Math.random() * 20) + 1);

        const newEvent = {
            id: newId,
            title,
            start,
            end,
            status,
            details,
            participants: JSON.stringify([{ id: 'p-new', name: 'Community' }]),
            image: primaryImage,
            scoreboard: '[]',
            url: url || null,
            media: JSON.stringify(media || []),
            imageUrls: JSON.stringify(imageUrls || [])
        };

        const stmt = db.prepare(`
            INSERT INTO events (id, title, start, "end", status, details, participants, image, scoreboard, url, media, imageUrls)
            VALUES (@id, @title, @start, @end, @status, @details, @participants, @image, @scoreboard, @url, @media, @imageUrls)
        `);
        stmt.run(newEvent);

        revalidatePath('/');
        revalidatePath('/admin');
        revalidatePath('/events');
        
        return { success: true, message: `Event "${title}" has been added successfully.` };

    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}

export async function updateEvent(prevState: FormState, formData: FormData): Promise<FormState> {
    const validatedFields = UpdateEventSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
        return {
            success: false,
            message: firstError || 'Invalid data provided.',
        };
    }

    const { id, title, start, end, details, status, url, imageUrls, media } = validatedFields.data;
    const primaryImage = imageUrls?.[0] || String(Math.floor(Math.random() * 20) + 1);

    try {
        const stmt = db.prepare(`
            UPDATE events 
            SET title = @title, start = @start, "end" = @end, details = @details, status = @status, url = @url, image = @image, media = @media, imageUrls = @imageUrls
            WHERE id = @id
        `);
        
        const result = stmt.run({ 
            id, 
            title, 
            start, 
            end, 
            details, 
            status, 
            url: url || null, 
            image: primaryImage,
            media: JSON.stringify(media || []),
            imageUrls: JSON.stringify(imageUrls || []),
        });

        if (result.changes === 0) {
            return { success: false, message: "Event not found." };
        }

        revalidatePath('/');
        revalidatePath('/admin');
        revalidatePath('/events');
        revalidatePath(`/events/${id}`);
        
        return { success: true, message: `Event "${title}" has been updated successfully.` };

    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}

const RemoveEventSchema = z.object({
    id: z.string().min(1)
});

export async function removeEvent(prevState: FormState, formData: FormData): Promise<FormState> {
     const validatedFields = RemoveEventSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Invalid event ID provided."
        };
    }

    const { id } = validatedFields.data;

    try {
        const getStmt = db.prepare('SELECT title FROM events WHERE id = ?');
        const eventToRemove = getStmt.get(id) as Event;

        if (!eventToRemove) {
            return { success: false, message: "Event not found." };
        }

        const deleteStmt = db.prepare('DELETE FROM events WHERE id = ?');
        deleteStmt.run(id);
        
        revalidatePath('/');
        revalidatePath('/admin');
        revalidatePath('/events');
        
        return { success: true, message: `Event "${eventToRemove.title}" has been removed.` };

    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}
