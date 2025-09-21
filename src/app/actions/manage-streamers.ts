
'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { Streamer } from '@/lib/types';
import { adminAuth } from '@/lib/firebase-admin';

const streamersPath = path.join(process.cwd(), 'src', 'data', 'streams.json');

const AddStreamerSchema = z.object({
    name: z.string().min(1, { message: 'Name is required.' }),
    platform: z.enum(['twitch', 'youtube']),
    platformUrl: z.string().url({ message: 'A valid URL is required.' }),
    discordUserId: z.string().optional(), // Added for creator self-service
});

const UpdateStreamerSchema = AddStreamerSchema.extend({
    id: z.string().min(1),
});


type FormState = {
    success: boolean;
    message: string;
};

async function readStreamersFile(): Promise<Streamer[]> {
    try {
        const fileContent = await fs.readFile(streamersPath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('Error reading streamers.json:', error);
        return [];
    }
}

async function writeStreamersFile(data: Streamer[]) {
    try {
        await fs.writeFile(streamersPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error writing to streamers.json:', error);
        throw new Error('Could not update the streamers file.');
    }
}

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
        const streamers = await readStreamersFile();
        
        // Prevent duplicate channel URLs
        if (streamers.some(s => s.platformUrl.toLowerCase() === platformUrl.toLowerCase())) {
            return { success: false, message: 'This channel URL has already been added.' };
        }

        const nextId = 'streamer-' + (streamers.length > 0 ? Math.max(...streamers.map((s: any) => parseInt(s.id.split('-')[1] || '0'))) + 1 : 1);
        
        const newStreamer: Streamer = {
            id: nextId,
            name,
            platform,
            platformUrl,
            avatar: String(Math.floor(Math.random() * 5) + 1), // Assign a random placeholder avatar ID
            isLive: false,
            title: `Welcome to my stream!`,
            game: `Variety`,
            featured: false,
            discordUserId: discordUserId,
        };

        streamers.push(newStreamer);
        await writeStreamersFile(streamers);

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
        const streamers = await readStreamersFile();
        const streamerIndex = streamers.findIndex(s => s.id === id);

        if (streamerIndex === -1) {
            return { success: false, message: "Streamer not found." };
        }

        // Prevent duplicate channel URLs, excluding the current streamer
        if (streamers.some(s => s.id !== id && s.platformUrl.toLowerCase() === platformUrl.toLowerCase())) {
            return { success: false, message: 'This channel URL is already in use by another streamer.' };
        }

        streamers[streamerIndex] = {
            ...streamers[streamerIndex],
            name,
            platform,
            platformUrl,
        };

        await writeStreamersFile(streamers);

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
        const streamers = await readStreamersFile();
        const streamerToRemove = streamers.find((s: any) => s.id === id);

        if (!streamerToRemove) {
            return { success: false, message: "Streamer not found." };
        }

        const updatedStreamers = streamers.filter((s: any) => s.id !== id);
        await writeStreamersFile(updatedStreamers);
        
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
        let parsedSchedule = [];
        if (schedule) {
            try {
                parsedSchedule = JSON.parse(schedule);
            } catch (e) {
                return { success: false, message: 'Invalid recurring schedule format.' };
            }
        }

        const streamers = await readStreamersFile();
        const streamerIndex = streamers.findIndex(s => s.id === streamerId);
        
        if (streamerIndex === -1) {
            return { success: false, message: 'Streamer not found.' };
        }

        streamers[streamerIndex].schedule = parsedSchedule;

        await writeStreamersFile(streamers);

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

    try {
        const streamers = await readStreamersFile();
        let eventTitleForMessage = 'The event';
        
        for (const streamerId of data.streamerIds) {
            const streamerIndex = streamers.findIndex(s => s.id === streamerId);
            if (streamerIndex === -1) {
                console.warn(`Streamer with ID ${streamerId} not found. Skipping.`);
                continue;
            }

            if (!streamers[streamerIndex].oneTimeEvents) {
                streamers[streamerIndex].oneTimeEvents = [];
            }
            
            if (data.action === 'add') {
                const { title, date, time } = data;
                eventTitleForMessage = title;
                const newEvent = { id: `event-${Date.now()}-${Math.random()}`, title, date, time };
                streamers[streamerIndex].oneTimeEvents!.push(newEvent);
            } else if (data.action === 'remove') {
                const { eventId } = data;
                const eventToRemove = streamers[streamerIndex].oneTimeEvents!.find(e => e.id === eventId);
                if(eventToRemove) eventTitleForMessage = eventToRemove.title;

                streamers[streamerIndex].oneTimeEvents = streamers[streamerIndex].oneTimeEvents!.filter(e => e.id !== eventId);
            } else if (data.action === 'edit') {
                 const { eventId, title, date, time } = data;
                 eventTitleForMessage = title;
                const eventIndex = streamers[streamerIndex].oneTimeEvents!.findIndex(e => e.id === eventId);
                if (eventIndex !== -1) {
                     streamers[streamerIndex].oneTimeEvents![eventIndex] = {
                        ...streamers[streamerIndex].oneTimeEvents![eventIndex],
                        title,
                        date,
                        time
                     };
                }
            }
        }
        
        await writeStreamersFile(streamers);

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
  userId: z.string(), // Can be empty string to unassign
});

export async function assignStreamerToUser(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = AssignStreamerSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { success: false, message: 'Invalid data provided.' };
  }

  const { streamerId, userId } = validatedFields.data;

  try {
    const streamers = await readStreamersFile();
    const streamerIndex = streamers.findIndex((s) => s.id === streamerId);

    if (streamerIndex === -1) {
      return { success: false, message: 'Streamer not found.' };
    }

    streamers[streamerIndex].discordUserId = userId === 'unassign' ? undefined : userId;

    await writeStreamersFile(streamers);
    
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

    