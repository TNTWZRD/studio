'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';

import AboutSection from '@/components/sections/about';
import EventsSummary from '@/components/sections/events-summary';
import FeaturedStreams from '@/components/sections/featured-streams';
import Hero from '@/components/sections/hero';
import LiveStreamers from '@/components/sections/live-streamers';
import MediaSummary from '@/components/sections/media-summary';
import { getEvents, getMedia, getStreamers } from '@/lib/data';

function AuthHandler() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    useEffect(() => {
        if (token) {
            signInWithCustomToken(auth, token).catch((error) => {
                console.error("Firebase custom token sign-in error", error);
            });
        }
    }, [token]);

    return null;
}


export default function Home() {
  const allStreamers = getStreamers();
  const liveStreamers = allStreamers.filter((s) => s.isLive);
  const featuredStreamers = allStreamers.filter((s) => s.featured);
  const upcomingEvents = getEvents()
    .filter((e) => e.status === 'upcoming')
    .slice(0, 3);
  const recentMedia = getMedia().slice(0, 4);

  return (
    <div className="flex flex-col">
      <AuthHandler />
      <Hero />
      <LiveStreamers initialLiveStreamers={liveStreamers} />
      <AboutSection />
      <FeaturedStreams streamers={featuredStreamers} />
      <EventsSummary events={upcomingEvents} />
      <MediaSummary media={recentMedia} />
    </div>
  );
}
