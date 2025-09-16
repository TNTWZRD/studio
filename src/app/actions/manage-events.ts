'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { Event } from '@/lib/types';

const eventsPath = path.join(process.cwd(), 'src', 'data', 'events.json');

const AddEventSchema = z.object({
    title: z.string().min(1, 'Title is required.'),
    start: z.string().datetime('Start date is required.'),
    end: z.string().datetime('End date is required.'),
    details: z.string().min(1, 'Details are required.'),
    status: z.enum(['upcoming', 'live', 'past']),
});

type FormState = {
    success: boolean;
    message: string;
};

async function readEventsFile(): Promise<Event[]> {
    try {
        const fileContent = await fs.readFile(eventsPath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('Error reading events.json:', error);
        return [];
    }
}

async function writeEventsFile(data: Event[]) {
    try {
        await fs.writeFile(eventsPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error writing to events.json:', error);
        throw new Error('Could not update the events file.');
    }
}

export async function addEvent(prevState: FormState, formData: FormData): Promise<FormState> {
    const validatedFields = AddEventSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
        return {
            success: false,
            message: firstError || 'Invalid data provided.',
        };
    }
    
    const { title, start, end, details, status } = validatedFields.data;

    try {
        const events = await readEventsFile();
        const newId = 'event-' + Date.now();
        
        const newEvent: Event = {
            id: newId,
            title,
            start,
            end,
            status,
            details,
            participants: [{ id: 'p-new', name: 'Community' }],
            image: String(Math.floor(Math.random() * 20) + 1), // Assign a random placeholder image ID
        };

        events.push(newEvent);
        await writeEventsFile(events);

        revalidatePath('/');
        revalidatePath('/admin');
        revalidatePath('/events');
        
        return { success: true, message: `Event "${title}" has been added successfully.` };

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
        const events = await readEventsFile();
        const eventToRemove = events.find((e) => e.id === id);

        if (!eventToRemove) {
            return { success: false, message: "Event not found." };
        }

        const updatedEvents = events.filter((e) => e.id !== id);
        await writeEventsFile(updatedEvents);
        
        revalidatePath('/');
        revalidatePath('/admin');
        revalidatePath('/events');
        
        return { success: true, message: `Event "${eventToRemove.title}" has been removed.` };

    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}
    