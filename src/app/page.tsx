import AboutSection from '@/components/sections/about';
import EventsSummary from '@/components/sections/events-summary';
import FeaturedStreams from '@/components/sections/featured-streams';
import Hero from '@/components/sections/hero';
import LiveStreamers from '@/components/sections/live-streamers';
import MediaSummary from '@/components/sections/media-summary';
import { getEvents, getMedia, getStreamers } from '@/lib/data';

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
      <Hero />
      <LiveStreamers initialLiveStreamers={liveStreamers} />
      <AboutSection />
      <FeaturedStreams streamers={featuredStreamers} />
      <EventsSummary events={upcomingEvents} />
      <MediaSummary media={recentMedia} />
    </div>
  );
}
