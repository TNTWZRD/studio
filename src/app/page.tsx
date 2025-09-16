'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';

import AboutSection from '@/components/sections/about';
import EventsSummary from '@/components/sections/events-summary';
import FeaturedStreams from '@/components/sections/featured-streams';
import Hero from '@/components/sections/hero';
import LiveStreamers from '@/components/sections/live-streamers';
import MediaSummary from '@/components/sections/media-summary';
import { getMedia, getStreamers } from '@/lib/data';
import { getDiscordEvents } from '@/lib/discord';
import { Streamer, MediaItem, Event } from '@/lib/types';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

function AuthHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const token = searchParams.get('token');
    const roleCheck = searchParams.get('roleCheck');

    useEffect(() => {
        if (token) {
            signInWithCustomToken(auth, token)
                .then(async (userCredential) => {
                    // If roleCheck is present, force a refresh of the token to get new claims.
                    if (roleCheck === 'true' && userCredential.user) {
                        await userCredential.user.getIdToken(true);
                    }
                    // Clean the URL by removing the token and roleCheck params.
                    const newUrl = window.location.pathname;
                    router.replace(newUrl, undefined);
                })
                .catch((error) => {
                    console.error("Firebase custom token sign-in error", error);
                    const newUrl = window.location.pathname;
                    router.replace(newUrl, undefined);
                });
        }
    }, [token, roleCheck, router]);

    return null;
}


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
    allStreamers: initialStreamers,
    recentMedia: initialMedia,
    upcomingEvents
} : {
    allStreamers: Streamer[],
    recentMedia: MediaItem[],
    upcomingEvents: Event[]
}) {
  const [allStreamers, setAllStreamers] = useState<Streamer[]>(initialStreamers);
  const [liveStreamers, setLiveStreamers] = useState<Streamer[]>([]);
  const [featuredStreamers, setFeaturedStreamers] = useState<Streamer[]>([]);
  const [recentMedia, setRecentMedia] = useState<MediaItem[]>(initialMedia);

  useEffect(() => {
    setLiveStreamers(allStreamers.filter((s) => s.isLive));
    setFeaturedStreamers(allStreamers.filter((s) => s.featured));
  }, [allStreamers]);

  return (
    <div className="flex flex-col">
      <AuthHandler />
      <Hero />
      <LiveStreamers initialLiveStreamers={liveStreamers} />
      <AboutSection />
      <FeaturedStreams streamers={featuredStreamers} />
       <Suspense fallback={<EventSummarySkeleton />}>
        <EventsSummary events={upcomingEvents} />
      </Suspense>
      <MediaSummary media={recentMedia} />
    </div>
  );
}


export default function Home() {
  const [allStreamers, setAllStreamers] = useState<Streamer[]>([]);
  const [recentMedia, setRecentMedia] = useState<MediaItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const streamers = await getStreamers();
      setAllStreamers(streamers);

      const media = await getMedia();
      setRecentMedia(media.slice(0, 4));

      const allEvents = await getDiscordEvents();
      setUpcomingEvents(allEvents.filter(e => e.status === 'scheduled' || e.status === 'active').slice(0, 3));
    };

    fetchData();
  }, []);

  return (
      <PageContent 
        allStreamers={allStreamers} 
        recentMedia={recentMedia}
        upcomingEvents={upcomingEvents}
      />
  );
}