import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'amwhub.db');
export const db = new Database(dbPath);

function initializeDb() {
    console.log('Initializing database...');

    // Check if tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map((t: any) => t.name);

    let migrated = false;

    if (!tableNames.includes('streamers')) {
        console.log('Creating streamers table...');
        // Use IF NOT EXISTS to make this safe if multiple processes hit initialization concurrently
        db.exec(`
            CREATE TABLE IF NOT EXISTS streamers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                platform TEXT NOT NULL,
                platformUrl TEXT NOT NULL,
                isLive INTEGER,
                title TEXT,
                game TEXT,
                featured INTEGER,
                schedule TEXT,
                oneTimeEvents TEXT,
                discordUserId TEXT,
                youtubeChannelId TEXT
            )
        `);
        // Only run migration if the table is empty to avoid duplicate inserts
        try {
            const countRes = db.prepare('SELECT COUNT(*) as c FROM streamers').get() as { c: number } | undefined;
            const count = (countRes && typeof countRes.c === 'number') ? countRes.c : 0;
            if (count === 0) {
                migrateStreamers();
                migrated = true;
            }
        } catch (err) {
            // If the table doesn't exist yet in a race, skip migration here; other process will migrate.
            console.warn('Could not determine streamers row count, skipping migrateStreamers():', err);
        }
    }

    // (avatarUpdatedAt column no longer used - filesystem mtime is used instead)

    if (!tableNames.includes('events')) {
        console.log('Creating events table...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                start TEXT NOT NULL,
                "end" TEXT NOT NULL,
                status TEXT NOT NULL,
                details TEXT,
                image TEXT,
                participants TEXT,
                scoreboard TEXT,
                url TEXT,
                media TEXT,
                imageUrls TEXT
            )
        `);
        migrateEvents();
        migrated = true;
    } else {
        // Migration for existing events table
        const columns = db.prepare("PRAGMA table_info(events)").all() as { name: string }[];
        const columnNames = columns.map(c => c.name);
        if (!columnNames.includes('url')) {
            console.log('Adding "url" column to events table...');
            db.exec('ALTER TABLE events ADD COLUMN url TEXT');
        }
        if (!columnNames.includes('media')) {
            console.log('Adding "media" column to events table...');
            db.exec('ALTER TABLE events ADD COLUMN media TEXT');
        }
        if (!columnNames.includes('imageUrls')) {
            console.log('Adding "imageUrls" column to events table...');
            db.exec('ALTER TABLE events ADD COLUMN imageUrls TEXT');
        }
    }

    // Migration: add youtubeChannelId to streamers if missing
    if (tableNames.includes('streamers')) {
        try {
            const cols = db.prepare("PRAGMA table_info(streamers)").all() as { name: string }[];
            const colNames = cols.map(c => c.name);
            if (!colNames.includes('youtubeChannelId')) {
                console.log('Adding "youtubeChannelId" column to streamers table...');
                db.exec('ALTER TABLE streamers ADD COLUMN youtubeChannelId TEXT');
            }
        } catch (e) {
            // ignore migration errors
        }
    }

    // Ensure events_images table exists to store uploaded images metadata
    if (!tableNames.includes('events_images')) {
        console.log('Creating events_images table...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS events_images (
                id TEXT PRIMARY KEY,
                eventId TEXT NOT NULL,
                filename TEXT NOT NULL,
                originalName TEXT,
                createdAt INTEGER NOT NULL
            )
        `);
    }
    else {
        // Migration: add deletedAt column for soft-deletes
        try {
            const cols = db.prepare("PRAGMA table_info(events_images)").all() as { name: string }[];
            const colNames = cols.map(c => c.name);
            if (!colNames.includes('deletedAt')) {
                console.log('Adding "deletedAt" column to events_images table...');
                db.exec('ALTER TABLE events_images ADD COLUMN deletedAt INTEGER');
            }
        } catch (e) {
            // ignore
        }
    }
    
    if (!tableNames.includes('media')) {
        console.log('Creating media table...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS media (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                thumbnail TEXT NOT NULL,
                url TEXT NOT NULL,
                creator TEXT NOT NULL,
                date TEXT NOT NULL
            )
        `);
        try {
            const countRes = db.prepare('SELECT COUNT(*) as c FROM media').get() as { c: number } | undefined;
            const count = (countRes && typeof countRes.c === 'number') ? countRes.c : 0;
            if (count === 0) {
                migrateMedia();
                migrated = true;
            }
        } catch (err) {
            console.warn('Could not determine media row count, skipping migrateMedia():', err);
        }
    }
    
    if (!tableNames.includes('config')) {
        console.log('Creating config table...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS config (
                id INTEGER PRIMARY KEY,
                discordInviteUrl TEXT
            )
        `);
        try {
            const countRes = db.prepare('SELECT COUNT(*) as c FROM config').get() as { c: number } | undefined;
            const count = (countRes && typeof countRes.c === 'number') ? countRes.c : 0;
            if (count === 0) {
                migrateConfig();
                migrated = true;
            }
        } catch (err) {
            console.warn('Could not determine config row count, skipping migrateConfig():', err);
        }
    }

    if (migrated) {
        console.log('Database migration completed.');
    } else {
        console.log('Database already initialized.');
    }
}

function migrateStreamers() {
    const filePath = path.join(process.cwd(), 'src/data/streams.json');
    if (!fs.existsSync(filePath)) return;

    console.log('Migrating streamers from streams.json...');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO streamers (id, name, platform, platformUrl, isLive, title, game, featured, schedule, oneTimeEvents, discordUserId)
        VALUES (@id, @name, @platform, @platformUrl, @isLive, @title, @game, @featured, @schedule, @oneTimeEvents, @discordUserId)
    `);

    db.transaction((items) => {
        for (const item of items) {
            stmt.run({
                id: item.id,
                name: item.name,
                platform: item.platform,
                platformUrl: item.platformUrl,
                isLive: item.isLive ? 1 : 0,
                title: item.title,
                game: item.game,
                featured: item.featured ? 1 : 0,
                schedule: JSON.stringify(item.schedule || []),
                oneTimeEvents: JSON.stringify(item.oneTimeEvents || []),
                discordUserId: item.discordUserId || null
            });
        }
    })(data);
    console.log(`Migrated ${data.length} streamers.`);
}


function migrateEvents() {
    const filePath = path.join(process.cwd(), 'src/data/events.json');
    if (!fs.existsSync(filePath)) return;

    console.log('Migrating events from events.json...');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO events (id, title, start, "end", status, details, image, participants, scoreboard, url, media, imageUrls)
        VALUES (@id, @title, @start, @end, @status, @details, @image, @participants, @scoreboard, @url, @media, @imageUrls)
    `);

    db.transaction((items) => {
        for (const item of items) {
            stmt.run({
                ...item,
                participants: JSON.stringify(item.participants || []),
                scoreboard: JSON.stringify(item.scoreboard || []),
                url: item.url || null,
                media: JSON.stringify(item.media || []),
                imageUrls: JSON.stringify(item.imageUrls || (item.image ? [item.image] : []))
            });
        }
    })(data);
    console.log(`Migrated ${data.length} events.`);
}


function migrateMedia() {
    const filePath = path.join(process.cwd(), 'src/data/media.json');
    if (!fs.existsSync(filePath)) return;

    console.log('Migrating media from media.json...');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO media (id, type, title, thumbnail, url, creator, date)
        VALUES (@id, @type, @title, @thumbnail, @url, @creator, @date)
    `);

    db.transaction((items) => {
        for (const item of items) {
            stmt.run(item);
        }
    })(data);
    console.log(`Migrated ${data.length} media items.`);
}

function migrateConfig() {
    const filePath = path.join(process.cwd(), 'src/data/config.json');
    if (!fs.existsSync(filePath)) return;

    console.log('Migrating config from config.json...');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    // Use INSERT OR REPLACE so config can be updated if the seed changes
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO config (id, discordInviteUrl)
        VALUES (1, @discordInviteUrl)
    `);
    stmt.run({ discordInviteUrl: data.discordInviteUrl });
    console.log('Migrated config.');
}


initializeDb();
