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
        db.exec(`
            CREATE TABLE streamers (
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
                discordUserId TEXT
            )
        `);
        migrateStreamers();
        migrated = true;
    }

    if (!tableNames.includes('events')) {
        console.log('Creating events table...');
        db.exec(`
            CREATE TABLE events (
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
    
    if (!tableNames.includes('media')) {
        console.log('Creating media table...');
        db.exec(`
            CREATE TABLE media (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                thumbnail TEXT NOT NULL,
                url TEXT NOT NULL,
                creator TEXT NOT NULL,
                date TEXT NOT NULL
            )
        `);
        migrateMedia();
        migrated = true;
    }
    
    if (!tableNames.includes('config')) {
        console.log('Creating config table...');
        db.exec(`
            CREATE TABLE config (
                id INTEGER PRIMARY KEY,
                discordInviteUrl TEXT
            )
        `);
        migrateConfig();
        migrated = true;
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
        INSERT INTO streamers (id, name, platform, platformUrl, isLive, title, game, featured, schedule, oneTimeEvents, discordUserId)
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
        INSERT INTO events (id, title, start, "end", status, details, image, participants, scoreboard, url, media, imageUrls)
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
        INSERT INTO media (id, type, title, thumbnail, url, creator, date)
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
    const stmt = db.prepare(`
        INSERT INTO config (id, discordInviteUrl)
        VALUES (1, @discordInviteUrl)
    `);
    stmt.run(data);
    console.log('Migrated config.');
}


initializeDb();
