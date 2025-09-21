'use server';

import { db } from '@/lib/db';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { Streamer } from '@/lib/types';
import { adminAuth } from '@/lib/firebase-admin';

const AddStreamerSchema = z.object({
    name: z.string().min(1, { message: 'Name is required.' }),
    platform: z.enum(['twitch', 'youtube']),
    platformUrl: z.string().url({ message: 'A valid URL is required.' }),
    discordUserId: z.string().optional(),
});

const UpdateStreamerSchema = AddStreamerSchema.extend({
    id: z.string().min(1),
});

type FormState = {
    success: boolean;
    message: string;
};

export async function addStreamer(prevState: FormState, formData: FormData): Promise<FormState> {
    const validatedFields = AddStreamerSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            success: false,
            message: validatedFields.error.flatten().fieldErrors[Object.keys(validatedFields.error.flatten().fieldErrors)[0]][0]
        };
    }
    
    const { name, platform, platformUrl, discordUserId } = validatedFields.data;

    try {
        const checkStmt = db.prepare('SELECT id FROM streamers WHERE lower(platformUrl) = lower(?)');
        const existing = checkStmt.get(platformUrl);

        if (existing) {
            return { success: false, message: 'This channel URL has already been added.' };
        }

        const newId = 'streamer-' + Date.now();
        
        const newStreamer = {
            id: newId,
            name,
            platform,
            platformUrl,
            isLive: 0,
            title: 'Welcome to my stream!',
            game: 'Variety',
            featured: 0,
            schedule: '[]',
            oneTimeEvents: '[]',
            discordUserId: discordUserId || null,
        };

        const insertStmt = db.prepare(`
            INSERT INTO streamers (id, name, platform, platformUrl, isLive, title, game, featured, schedule, oneTimeEvents, discordUserId)
            VALUES (@id, @name, @platform, @platformUrl, @isLive, @title, @game, @featured, @schedule, @oneTimeEvents, @discordUserId)
        `);
        insertStmt.run(newStreamer);

        revalidatePath('/');
        revalidatePath('/admin');
        revalidatePath('/creator');
        revalidatePath('/schedules');
        
        return { success: true, message: `${name} has been added successfully.` };

    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}

export async function updateStreamer(prevState: FormState, formData: FormData): Promise<FormState> {
    const validatedFields = UpdateStreamerSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) {
        const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
        return {
            success: false,
            message: firstError || 'Invalid data provided.',
        };
    }

    const { id, name, platform, platformUrl } = validatedFields.data;

    try {
        const checkStmt = db.prepare('SELECT id FROM streamers WHERE lower(platformUrl) = lower(?) AND id != ?');
        const existing = checkStmt.get(platformUrl, id);

        if (existing) {
            return { success: false, message: 'This channel URL is already in use by another streamer.' };
        }
        
        const updateStmt = db.prepare('UPDATE streamers SET name = ?, platform = ?, platformUrl = ? WHERE id = ?');
        const result = updateStmt.run(name, platform, platformUrl, id);

        if (result.changes === 0) {
             return { success: false, message: "Streamer not found." };
        }

        revalidatePath('/');
        revalidatePath('/admin');
        revalidatePath('/creator');
        revalidatePath('/schedules');

        return { success: true, message: `Streamer "${name}" updated successfully.` };
    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}

const RemoveStreamerSchema = z.object({
    id: z.string().min(1)
});

export async function removeStreamer(prevState: FormState, formData: FormData): Promise<FormState> {
     const validatedFields = RemoveStreamerSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Invalid streamer ID provided."
        };
    }

    const { id } = validatedFields.data;

    try {
        const getStmt = db.prepare('SELECT name FROM streamers WHERE id = ?');
        const streamerToRemove = getStmt.get(id) as Streamer;

        if (!streamerToRemove) {
            return { success: false, message: "Streamer not found." };
        }

        const deleteStmt = db.prepare('DELETE FROM streamers WHERE id = ?');
        deleteStmt.run(id);
        
        revalidatePath('/');
        revalidatePath('/admin');
        revalidatePath('/creator');
        revalidatePath('/schedules');
        
        return { success: true, message: `${streamerToRemove.name} has been removed.` };

    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}

const UpdateScheduleSchema = z.object({
    streamerId: z.string().min(1),
    schedule: z.string(),
});

export async function updateRecurringSchedule(prevState: FormState, formData: FormData): Promise<FormState> {
    const validatedFields = UpdateScheduleSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) {
        return { success: false, message: 'Invalid data.' };
    }

    const { streamerId, schedule } = validatedFields.data;

    try {
        // Validate JSON
        JSON.parse(schedule);

        const updateStmt = db.prepare('UPDATE streamers SET schedule = ? WHERE id = ?');
        const result = updateStmt.run(schedule, streamerId);
        
        if (result.changes === 0) {
            return { success: false, message: 'Streamer not found.' };
        }

        revalidatePath('/creator');
        revalidatePath('/schedules');

        return { success: true, message: 'Recurring schedule updated successfully.' };
    } catch (e: any) {
        return { success: false, message: e.message || 'An error occurred.' };
    }
}

const streamerIdsPreprocess = z.preprocess((arg) => {
    if (typeof arg === 'string') return [arg];
    if (Array.isArray(arg)) return arg;
    return [];
}, z.array(z.string().min(1)).min(1, 'At least one platform must be selected.'));


const OneTimeEventSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('add'),
        streamerIds: streamerIdsPreprocess,
        title: z.string().min(1, 'Title is required.'),
        date: z.string().datetime('A valid date is required.'),
        time: z.string().min(1, 'Time is required.'),
    }),
    z.object({
        action: z.literal('edit'),
        streamerIds: streamerIdsPreprocess,
        eventId: z.string().min(1),
        title: z.string().min(1, 'Title is required.'),
        date: z.string().datetime('A valid date is required.'),
        time: z.string().min(1, 'Time is required.'),
    }),
    z.object({
        action: z.literal('remove'),
        streamerIds: streamerIdsPreprocess,
        eventId: z.string().min(1),
    })
]);

export async function updateOneTimeEvents(prevState: FormState, formData: FormData): Promise<FormState> {
    const validatedFields = OneTimeEventSchema.safeParse(Object.fromEntries(formData.entries()));
    
    if (!validatedFields.success) {
        const errors = validatedFields.error.flatten().fieldErrors;
        const message = Object.values(errors).flat()[0] || 'Invalid data provided.';
        return { success: false, message };
    }
    
    const data = validatedFields.data;
    let eventTitleForMessage = 'The event';

    try {
        const getStmt = db.prepare('SELECT oneTimeEvents FROM streamers WHERE id = ?');
        const updateStmt = db.prepare('UPDATE streamers SET oneTimeEvents = ? WHERE id = ?');

        for (const streamerId of data.streamerIds) {
            const streamer = getStmt.get(streamerId) as { oneTimeEvents: string | null };
            if (!streamer) {
                console.warn(`Streamer with ID ${streamerId} not found. Skipping.`);
                continue;
            }

            let oneTimeEvents = streamer.oneTimeEvents ? JSON.parse(streamer.oneTimeEvents) : [];
            
            if (data.action === 'add') {
                const { title, date, time } = data;
                eventTitleForMessage = title;
                const newEvent = { id: `event-${Date.now()}-${Math.random()}`, title, date, time };
                oneTimeEvents.push(newEvent);
            } else if (data.action === 'remove') {
                const { eventId } = data;
                const eventToRemove = oneTimeEvents.find((e: any) => e.id === eventId);
                if(eventToRemove) eventTitleForMessage = eventToRemove.title;
                oneTimeEvents = oneTimeEvents.filter((e: any) => e.id !== eventId);
            } else if (data.action === 'edit') {
                 const { eventId, title, date, time } = data;
                 eventTitleForMessage = title;
                const eventIndex = oneTimeEvents.findIndex((e: any) => e.id === eventId);
                if (eventIndex !== -1) {
                     oneTimeEvents[eventIndex] = { ...oneTimeEvents[eventIndex], title, date, time };
                }
            }
            updateStmt.run(JSON.stringify(oneTimeEvents), streamerId);
        }
        
        revalidatePath('/creator');
        revalidatePath('/schedules');

        if (data.action === 'add') {
            return { success: true, message: `One-time event "${eventTitleForMessage}" added successfully.` };
        } else if (data.action === 'remove') {
            return { success: true, message: `One-time event "${eventTitleForMessage}" removed successfully.` };
        } else {
             return { success: true, message: `One-time event "${eventTitleForMessage}" updated successfully.` };
        }

    } catch (e: any) {
        return { success: false, message: e.message || 'An error occurred.' };
    }
}

const AssignStreamerSchema = z.object({
  streamerId: z.string().min(1),
  userId: z.string(),
});

export async function assignStreamerToUser(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = AssignStreamerSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { success: false, message: 'Invalid data provided.' };
  }

  const { streamerId, userId } = validatedFields.data;

  try {
    const newUserId = userId === 'unassign' ? null : userId;
    const stmt = db.prepare('UPDATE streamers SET discordUserId = ? WHERE id = ?');
    const result = stmt.run(newUserId, streamerId);

    if (result.changes === 0) {
        return { success: false, message: 'Streamer not found.' };
    }
    
    revalidatePath('/admin');
    revalidatePath('/creator');

    return { success: true, message: 'Streamer assignment updated successfully.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}

export async function getFirebaseAuthUsers() {
    try {
        const userRecords = await adminAuth.listUsers();
        return userRecords.users.map(user => ({
            uid: user.uid,
            displayName: user.displayName || 'No display name',
            email: user.email,
        }));
    } catch (error) {
        console.error('Error fetching Firebase Auth users:', error);
        return [];
    }
}
