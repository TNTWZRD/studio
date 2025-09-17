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
    
    const { name, platform, platformUrl } = validatedFields.data;

    try {
        const streamers = await readStreamersFile();
        const nextId = 'streamer-' + (streamers.length > 0 ? Math.max(...streamers.map((s: any) => parseInt(s.id.split('-')[1] || '0'))) + 1 : 1);
        
        const newStreamer: Streamer = {
            id: nextId,
            name,
            platform,
            platformUrl,
            avatar: String(streamers.length + 1), // Placeholder avatar ID
            isLive: false,
            title: `Welcome to my stream!`,
            game: `Variety`,
            featured: false,
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
    oneTimeEvents: z.string(),
});

export async function updateSchedule(prevState: FormState, formData: FormData): Promise<FormState> {
    const validatedFields = UpdateScheduleSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) {
        return { success: false, message: 'Invalid data.' };
    }

    const { streamerId, schedule, oneTimeEvents } = validatedFields.data;

    try {
        let parsedSchedule = [];
        if (schedule) {
            try {
                parsedSchedule = JSON.parse(schedule);
            } catch (e) {
                return { success: false, message: 'Invalid recurring schedule format.' };
            }
        }
        
        let parsedOneTimeEvents = [];
        if (oneTimeEvents) {
             try {
                parsedOneTimeEvents = JSON.parse(oneTimeEvents);
            } catch (e) {
                return { success: false, message: 'Invalid one-time schedule format.' };
            }
        }

        const streamers = await readStreamersFile();
        const streamerIndex = streamers.findIndex(s => s.id === streamerId);
        
        if (streamerIndex === -1) {
            return { success: false, message: 'Streamer not found.' };
        }

        streamers[streamerIndex].schedule = parsedSchedule;
        streamers[streamerIndex].oneTimeEvents = parsedOneTimeEvents;

        await writeStreamersFile(streamers);

        revalidatePath('/creator');
        revalidatePath('/schedules');

        return { success: true, message: 'Schedule updated successfully.' };
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
