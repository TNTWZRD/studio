'use client';

import { useEffect } from 'react';
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
import { getEvents, getMedia, getStreamers } from '@/lib/data';

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
                    router.replace('/', undefined);
                })
                .catch((error) => {
                    console.error("Firebase custom token sign-in error", error);
                    router.replace('/', undefined);
                });
        }
    }, [token, roleCheck, router]);

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
