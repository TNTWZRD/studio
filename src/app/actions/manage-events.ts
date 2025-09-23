'use server';

import { db } from '@/lib/db';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { Event } from '@/lib/types';
import path from 'path';
import fs from 'fs';

const mediaIdsPreprocess = z.preprocess((arg) => {
    if (typeof arg === 'string' && arg.length > 0) return [arg];
    if (Array.isArray(arg)) return arg.filter(id => id.length > 0);
    return [];
}, z.array(z.string()));

const imageUrlsPreprocess = z.preprocess((arg) => {
    if (typeof arg === 'string' && arg.length > 0) return [arg];
    if (Array.isArray(arg)) return arg.filter(url => typeof url === 'string' && url.length > 0);
    return [];
}, z.array(z.union([
    // Accept local paths like '/images/...' or absolute http(s) URLs
    z.string().regex(/^(\/|https?:\/\/).*/),
    z.literal('')
])).max(20, 'You can attach up to 20 images per event.').optional());


const EventSchema = z.object({
    // Only title is required by user request; other fields are optional and defaulted server-side
    title: z.string().min(1, 'Title is required.'),
    start: z.string().optional(),
    end: z.string().optional(),
    details: z.string().optional(),
    status: z.enum(['upcoming', 'live', 'past']).optional(),
    url: z.string().url().optional().or(z.literal('')).optional(),
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
    // Handle uploaded files: FormData may contain file inputs named `images` (can be multiple)
    const uploadedFiles: File[] = [];
    for (const entry of formData.entries()) {
        const [k, v] = entry as [string, any];
        if (k === 'images' && v instanceof File) {
            uploadedFiles.push(v);
        }
    }

    // Helper: convert FormData to plain object but preserve repeated keys as arrays
    const formDataToObject = (fd: FormData, skip: string[] = []) => {
        const out: Record<string, any> = {};
        for (const [k, v] of fd.entries()) {
            if (skip.includes(k)) continue;
            const val = typeof v === 'string' ? v : v;
            if (out[k] === undefined) out[k] = val;
            else if (Array.isArray(out[k])) out[k].push(val);
            else out[k] = [out[k], val];
        }
        return out;
    };

    const validatedFields = AddEventSchema.safeParse(formDataToObject(formData, ['images']));

    if (!validatedFields.success) {
        const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
        return {
            success: false,
            message: firstError || 'Invalid data provided.',
        };
    }
    
    const { title, start, end, details, status, url, imageUrls, media } = validatedFields.data;

    // Defaults: only title is required by UI. Provide safe defaults for DB NOT NULL columns.
    const safeStart = start || new Date().toISOString();
    const safeEnd = end || safeStart;
    const safeStatus = status || 'upcoming';
    const safeDetails = details || '';
    const safeMedia = media || [];
    const safeImageUrls = imageUrls || [];

    try {
        const newId = 'event-' + Date.now();

        // Ensure we won't exceed the 20-image limit before writing files
        if ((safeImageUrls ? safeImageUrls.length : 0) + uploadedFiles.length > 20) {
            return { success: false, message: 'Cannot attach more than 20 images to an event.' };
        }

        // Save uploaded files to public/images and construct paths
        const publicImagesDir = path.join(process.cwd(), 'public', 'images');
        if (!fs.existsSync(publicImagesDir)) fs.mkdirSync(publicImagesDir, { recursive: true });

        const savedPaths: string[] = [];
        for (const file of uploadedFiles) {
            // Guard: Some browsers/clients may send an empty File or missing name when UI removes files.
            // Skip any file without a valid name to avoid creating filenames like 'undefined'.
            if (!file || typeof file.name !== 'string' || file.name.length === 0 || file.name === 'undefined') {
                try { console.warn('addEvent - skipping uploaded file with invalid name', file); } catch {}
                continue;
            }
            const baseName = file.name || String(Math.floor(Math.random()*1000000));
            const safeName = `${Date.now()}-${baseName.replace(/[^a-zA-Z0-9.\-\_]/g, '_')}`;
            const outPath = path.join(publicImagesDir, safeName);
            const buffer = Buffer.from(await file.arrayBuffer());
            fs.writeFileSync(outPath, buffer);
            try { console.debug('addEvent - saved file to', outPath, 'url=/images/' + safeName); } catch {}
            savedPaths.push(`/images/${safeName}`);
            try {
                const insertImg = db.prepare('INSERT OR REPLACE INTO events_images (id, eventId, filename, originalName, createdAt) VALUES (?, ?, ?, ?, ?)');
                // Ensure filename and originalName are valid strings
                const filenameToStore = String(safeName);
                const originalNameToStore = String(file.name || '');
                insertImg.run(`img-${Date.now()}-${Math.random()}`, newId, filenameToStore, originalNameToStore, Date.now());
                try { console.debug('addEvent - inserted events_images row for', safeName, 'event', newId); } catch {}
            } catch (e) {
                console.warn('Failed to record events_images row', e);
            }
        }

        // After writing events_images rows, recompute canonical imageUrls from the events_images table
        let finalImageUrls: string[] = [];
        try {
            const rows = db.prepare('SELECT filename FROM events_images WHERE eventId = ? AND (deletedAt IS NULL OR deletedAt = 0) ORDER BY createdAt DESC').all(newId) as any[];
            finalImageUrls = rows
                .map(r => r && r.filename ? String(r.filename).trim() : '')
                .filter(f => f && !f.includes('undefined'))
                .map(f => `/images/${f}`);
            try { console.debug('addEvent - canonical imageUrls from events_images for', newId, ':', finalImageUrls); } catch {}
        } catch (e) {
            // fallback to merged list if DB read fails
            finalImageUrls = [...(safeImageUrls || []), ...savedPaths].filter(url => typeof url === 'string' && url && !url.includes('undefined'));
            try { console.debug('addEvent - fallback imageUrls for', newId, ':', finalImageUrls); } catch {}
        }

        if (finalImageUrls.length > 20) {
            return { success: false, message: 'Cannot attach more than 20 images to an event.' };
        }
        const primaryImage = finalImageUrls?.[0] || String(Math.floor(Math.random() * 20) + 1);

        const newEvent = {
            id: newId,
            title,
            start: safeStart,
            end: safeEnd,
            status: safeStatus,
            details: safeDetails,
            participants: JSON.stringify([{ id: 'p-new', name: 'Community' }]),
            image: primaryImage,
            scoreboard: '[]',
            url: url || null,
            media: JSON.stringify(safeMedia || []),
            imageUrls: JSON.stringify(finalImageUrls || [])
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
    const uploadedFiles: File[] = [];
    for (const entry of formData.entries()) {
        const [k, v] = entry as [string, any];
        if (k === 'images' && v instanceof File) {
            uploadedFiles.push(v);
        }
    }

    // Reuse helper to preserve repeated keys like imageUrls
    const formDataToObject = (fd: FormData, skip: string[] = []) => {
        const out: Record<string, any> = {};
        for (const [k, v] of fd.entries()) {
            if (skip.includes(k)) continue;
            const val = typeof v === 'string' ? v : v;
            if (out[k] === undefined) out[k] = val;
            else if (Array.isArray(out[k])) out[k].push(val);
            else out[k] = [out[k], val];
        }
        return out;
    };

    const validatedFields = UpdateEventSchema.safeParse(formDataToObject(formData, ['images']));

    if (!validatedFields.success) {
        const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
        return {
            success: false,
            message: firstError || 'Invalid data provided.',
        };
    }

    const { id, title, start, end, details, status, url, imageUrls, media } = validatedFields.data;
    // Preserve existing values when fields are omitted in the update form
    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as any;
    if (!existing) {
        return { success: false, message: 'Event not found.' };
    }
    const existingMedia = existing.media ? JSON.parse(existing.media) : [];
    const existingImageUrls = existing.imageUrls ? JSON.parse(existing.imageUrls) : [];

    const safeStart = start ?? existing.start ?? new Date().toISOString();
    const safeEnd = end ?? existing.end ?? safeStart;
    const safeStatus = status ?? existing.status ?? 'upcoming';
    const safeDetails = details ?? existing.details ?? '';
    const safeMedia = media ?? existingMedia;
    const safeImageUrls = imageUrls ?? existingImageUrls;
    const publicImagesDir = path.join(process.cwd(), 'public', 'images');
    if (!fs.existsSync(publicImagesDir)) fs.mkdirSync(publicImagesDir, { recursive: true });

    const savedPaths: string[] = [];
    // Ensure updating doesn't push us over the 20-image limit before writing files
    if ((safeImageUrls ? safeImageUrls.length : 0) + uploadedFiles.length > 20) {
        return { success: false, message: 'Cannot attach more than 20 images to an event.' };
    }

    for (const file of uploadedFiles) {
        if (!file || typeof file.name !== 'string' || file.name.length === 0 || file.name === 'undefined') {
            try { console.warn('updateEvent - skipping uploaded file with invalid name', file); } catch {}
            continue;
        }
        const baseName = file.name || String(Math.floor(Math.random()*1000000));
        const safeName = `${Date.now()}-${baseName.replace(/[^a-zA-Z0-9.\-\_]/g, '_')}`;
        const outPath = path.join(publicImagesDir, safeName);
        const buffer = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(outPath, buffer);
        try { console.debug('updateEvent - saved file to', outPath, 'url=/images/' + safeName, 'for event', id); } catch {}
        savedPaths.push(`/images/${safeName}`);
        try {
            const insertImg = db.prepare('INSERT OR REPLACE INTO events_images (id, eventId, filename, originalName, createdAt) VALUES (?, ?, ?, ?, ?)');
            const filenameToStore = String(safeName);
            const originalNameToStore = String(file.name || '');
            insertImg.run(`img-${Date.now()}-${Math.random()}`, id, filenameToStore, originalNameToStore, Date.now());
            try { console.debug('updateEvent - inserted events_images row for', safeName, 'event', id); } catch {}
        } catch (e) {
            console.warn('Failed to record events_images row', e);
        }
    }

    // Reconcile deletions: the admin may have removed images client-side, so safeImageUrls
    // represents the desired list. Remove any events_images rows (and optionally files)
    // that are no longer present in safeImageUrls or newly savedPaths.
    try {
        // Build a set of filenames to keep from safeImageUrls and savedPaths
        const keepFilenames = new Set<string>();
        (safeImageUrls || []).forEach((u: string) => {
            try {
                if (typeof u === 'string' && u.startsWith('/images/')) {
                    const fn = u.replace('/images/', '').trim();
                    if (fn) keepFilenames.add(fn);
                }
            } catch {}
        });
        savedPaths.forEach(p => {
            if (typeof p === 'string' && p.startsWith('/images/')) keepFilenames.add(p.replace('/images/', ''));
        });

        // Fetch current files for the event and delete any that are not in keepFilenames
        const currentRows = db.prepare('SELECT id, filename FROM events_images WHERE eventId = ?').all(id) as any[];
        const deletedDir = path.join(process.cwd(), 'public', 'images', 'deleted');
        if (!fs.existsSync(deletedDir)) fs.mkdirSync(deletedDir, { recursive: true });
        for (const r of currentRows) {
            const fn = r && r.filename ? String(r.filename) : '';
            if (!fn) continue;
            if (!keepFilenames.has(fn)) {
                try {
                    // Soft delete: set deletedAt timestamp so we preserve a record
                    db.prepare('UPDATE events_images SET deletedAt = ? WHERE id = ?').run(Date.now(), r.id);
                    // move the physical file to deleted/ for auditability
                    try {
                        const src = path.join(process.cwd(), 'public', 'images', fn);
                        const dest = path.join(deletedDir, `${Date.now()}-${fn}`);
                        if (fs.existsSync(src)) {
                            try { fs.renameSync(src, dest); } catch (e) { /* ignore rename errors */ }
                        }
                    } catch (e) {}
                    try { console.debug('updateEvent - soft-deleted events_images row and moved file for', fn, 'event', id); } catch {}
                } catch (e) {
                    console.warn('updateEvent - failed to soft-delete events_images row for', fn, e);
                }
            }
        }
    } catch (e) {
        console.warn('updateEvent - reconciliation error', e);
    }

    // After writing events_images rows, recompute canonical imageUrls from the events_images table
    let finalImageUrls: string[] = [];
    try {
    const rows = db.prepare('SELECT filename FROM events_images WHERE eventId = ? AND (deletedAt IS NULL OR deletedAt = 0) ORDER BY createdAt DESC').all(id) as any[];
        finalImageUrls = rows
            .map(r => r && r.filename ? String(r.filename).trim() : '')
            .filter(f => f && !f.includes('undefined'))
            .map(f => `/images/${f}`);
        try { console.debug('updateEvent - canonical imageUrls from events_images for', id, ':', finalImageUrls); } catch {}
    } catch (e) {
        finalImageUrls = [...(safeImageUrls || []), ...savedPaths].filter(url => typeof url === 'string' && url && !url.includes('undefined'));
        try { console.debug('updateEvent - fallback imageUrls for', id, ':', finalImageUrls); } catch {}
    }

    if (finalImageUrls.length > 20) {
        return { success: false, message: 'Cannot attach more than 20 images to an event.' };
    }
    const primaryImage = finalImageUrls?.[0] || String(Math.floor(Math.random() * 20) + 1);

    try {
        const stmt = db.prepare(`
            UPDATE events 
            SET title = @title, start = @start, "end" = @end, details = @details, status = @status, url = @url, image = @image, media = @media, imageUrls = @imageUrls
            WHERE id = @id
        `);
        
        const result = stmt.run({ 
            id, 
            title, 
            start: safeStart, 
            end: safeEnd, 
            details: safeDetails, 
            status: safeStatus, 
            url: url || null, 
            image: primaryImage,
            media: JSON.stringify(safeMedia || []),
            imageUrls: JSON.stringify(finalImageUrls || [])
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
