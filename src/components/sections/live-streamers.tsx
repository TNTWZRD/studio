'use client';

import { useEffect, useState } from 'react';
import { assessStreamers, type LiveStreamerInfo } from '@/app/actions/assess-streamer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Streamer } from '@/lib/types';
import { Twitch, Youtube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Badge } from '../ui/badge';


const PlatformIcon = ({ platform }: { platform: string }) => {
  if (platform.toLowerCase() === 'twitch') {
    return <Twitch className="h-4 w-4 text-purple-400" />;
  }
  if (platform.toLowerCase() === 'youtube') {
    return <Youtube className="h-4 w-4 text-red-500" />;
  }
  return null;
};

function LiveStreamerCard({ streamer }: { streamer: LiveStreamerInfo }) {
  return (
    <a href={streamer.platformUrl} target="_blank" rel="noopener noreferrer" className="block group">
      <Card className="relative overflow-hidden shadow-lg transition-transform duration-300 hover:scale-105 hover:shadow-xl bg-card">
        <div className="relative aspect-video">
          <Image
            src={streamer.thumbnailUrl}
            alt={`Stream preview for ${streamer.name}`}
            fill
            className="object-cover"
          />
           <Badge variant="destructive" className="absolute top-2 left-2 flex items-center gap-1.5">
             <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            LIVE
          </Badge>
        </div>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
             <Avatar className="h-12 w-12 border-2 border-primary">
                <AvatarImage src={streamer.avatar} alt={streamer.name} />
                <AvatarFallback>{streamer.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
                <h3 className="font-bold text-lg truncate group-hover:underline">{streamer.name}</h3>
                <p className="text-sm truncate text-muted-foreground font-medium" title={streamer.title}>{streamer.title}</p>
                 <div className="flex items-center gap-2 mt-1">
                    <PlatformIcon platform={streamer.platform} />
                    <p className="text-sm truncate text-muted-foreground">{streamer.game}</p>
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}


export default function LiveStreamers({ allStreamers }: { allStreamers: Streamer[] }) {
  const [liveStreamers, setLiveStreamers] = useState<LiveStreamerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const assessAllStreamers = async () => {
      if (!allStreamers || allStreamers.length === 0) {
          setLoading(false);
          return;
      }
      setLoading(true);
      try {
        const assessments = await assessStreamers(allStreamers);
        setLiveStreamers(assessments);
      } catch (error) {
        console.error('Failed to assess streamers:', error);
        toast({
            title: "Could not update streamer data",
            description: "There was an issue checking live statuses.",
            variant: "destructive"
        })
        // Fallback to manually set live streamers on error
        setLiveStreamers(allStreamers.filter(s => s.isLive).map(s => ({...s, game: s.game || 'Unknown', thumbnailUrl: s.avatar})));
      } finally {
        setLoading(false);
      }
    };

    assessAllStreamers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allStreamers]);

  if (loading) {
     return (
        <section className="py-16 sm:py-24 bg-background">
            <div className="container mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">Now Live</h2>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                        Checking for live streamers...
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                           <Skeleton className="aspect-video w-full" />
                           <CardContent className="p-4">
                                <div className="flex items-center space-x-4">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-5 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
  }

  if (liveStreamers.length === 0) {
    // Return null if no one is live, so the section doesn't take up space.
    return null;
  }

  return (
    <section className="py-16 sm:py-24 bg-background">
      <div className="container mx-auto">
        <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">Now Live</h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                Check out who from the community is streaming right now.
            </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {liveStreamers.map((streamer) => (
              <LiveStreamerCard key={`${streamer.name}-${streamer.platformUrl}`} streamer={streamer} />
          ))}
        </div>
      </div>
    </section>
  );
}
