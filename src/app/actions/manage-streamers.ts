'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

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

async function readStreamersFile() {
    try {
        const fileContent = await fs.readFile(streamersPath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('Error reading streamers.json:', error);
        return [];
    }
}

async function writeStreamersFile(data: any) {
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
        
        const newStreamer = {
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
        
        return { success: true, message: `${streamerToRemove.name} has been removed.` };

    } catch (error: any) {
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
}
