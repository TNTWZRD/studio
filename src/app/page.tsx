
import React, { Suspense } from 'react';
import AboutSection from '@/components/sections/about';
import EventsSummary from '@/components/sections/events-summary';
import LiveStreamers from '@/components/sections/live-streamers';
import MediaSummary from '@/components/sections/media-summary';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Event, MediaItem, Streamer } from '@/lib/types';
import { getEvents, getMedia, getStreamers } from '@/lib/data';
import Hero from '@/components/sections/hero';

function EventSummarySkeleton() {
    return (
         <div className="container mx-auto">
            <div className="flex flex-col items-center text-center mb-12 md:flex-row md:justify-between md:text-left">
                <div>
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-4 w-80 mt-4" />
                </div>
                <Skeleton className="h-10 w-36 mt-4 md:mt-0" />
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="h-full overflow-hidden shadow-lg flex flex-col">
                        <div className="relative aspect-video bg-muted" />
                        <CardHeader>
                            <Skeleton className="h-4 w-20 mb-2" />
                            <Skeleton className="h-6 w-full" />
                        </CardHeader>
                        <CardContent className="flex-grow">
                             <Skeleton className="h-4 w-48" />
                        </CardContent>
                         <CardFooter>
                            <Skeleton className="h-4 w-24" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    )
}

function PageContent({ 
    allStreamers,
    recentMedia,
    upcomingEvents,
} : {
    allStreamers: Streamer[],
    recentMedia: MediaItem[],
    upcomingEvents: Event[],
}) {
    const liveStreamers = allStreamers.filter((s) => s.isLive);

    return (
        <div className="flex flex-col">
            <Hero />
            <LiveStreamers initialLiveStreamers={liveStreamers} />
            <MediaSummary media={recentMedia} />
            <Suspense fallback={<EventSummarySkeleton />}>
                <EventsSummary events={upcomingEvents} />
            </Suspense>
            <AboutSection />
        </div>
    );
}

export default async function Home() {
    const [allStreamers, recentMedia, allEvents] = await Promise.all([
        getStreamers(),
        getMedia(),
        getEvents()
    ]);
    
    const liveEvents = allEvents.filter(e => e.status === 'live');
    const upcomingEvents = allEvents.filter(e => e.status === 'upcoming');

    let displayEvents;
    if (liveEvents.length > 0) {
        displayEvents = liveEvents.slice(0, 3);
    } else {
        displayEvents = upcomingEvents.slice(0, 3);
    }
        
    const displayMedia = recentMedia.slice(0, 4);

    return (
        <PageContent 
            allStreamers={allStreamers} 
            recentMedia={displayMedia}
            upcomingEvents={displayEvents}
        />
    );
}
