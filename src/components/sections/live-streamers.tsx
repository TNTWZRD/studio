'use client';

import { useEffect, useState } from 'react';
import {
  EnhanceLiveStreamerStripWithAIAssessmentInput,
  EnhanceLiveStreamerStripWithAIAssessmentOutput,
} from '@/ai/flows/assess-live-stream-info';
import { assessStreamer } from '@/app/actions/assess-streamer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Streamer } from '@/lib/types';
import { Circle, Twitch, Youtube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


const PlatformIcon = ({ platform }: { platform: string }) => {
  if (platform.toLowerCase() === 'twitch') {
    return <Twitch className="h-4 w-4 text-purple-500" />;
  }
  if (platform.toLowerCase() === 'youtube') {
    return <Youtube className="h-4 w-4 text-red-500" />;
  }
  return null;
};

export default function LiveStreamers({ initialLiveStreamers }: { initialLiveStreamers: Streamer[] }) {
  const [assessedStreamers, setAssessedStreamers] = useState<(Streamer | EnhanceLiveStreamerStripWithAIAssessmentOutput)[]>(initialLiveStreamers);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const assessAllStreamers = async () => {
      setLoading(true);
      try {
        const assessments = await Promise.all(
          initialLiveStreamers.map((streamer) => {
            const input: EnhanceLiveStreamerStripWithAIAssessmentInput = {
              name: streamer.name,
              platform: streamer.platform,
              platformUrl: streamer.platformUrl,
              avatar: streamer.avatar,
              isLive: streamer.isLive,
              title: streamer.title,
              game: streamer.game,
            };
            return assessStreamer(input);
          })
        );
        setAssessedStreamers(assessments);
      } catch (error) {
        console.error('Failed to assess streamers:', error);
        toast({
            title: "Could not update streamer data",
            description: "Displaying cached information.",
            variant: "destructive"
        })
        setAssessedStreamers(initialLiveStreamers);
      } finally {
        setLoading(false);
      }
    };

    if (initialLiveStreamers.length > 0) {
      assessAllStreamers();
    } else {
      setLoading(false);
    }
  }, [initialLiveStreamers, toast]);

  if (initialLiveStreamers.length === 0) {
    return null;
  }

  const streamersToDisplay = assessedStreamers.length > 0 ? assessedStreamers : initialLiveStreamers;

  return (
    <section className="py-16 sm:py-24 bg-primary text-primary-foreground">
      <div className="container mx-auto">
        <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">Now Live</h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-primary-foreground/80">
                Check out who from the community is streaming right now.
            </p>
        </div>
        {loading && streamersToDisplay.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(initialLiveStreamers.length || 3)].map((_, i) => (
                    <Card key={i} className="bg-card/10 text-primary-foreground border-border/20">
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-4">
                                <Skeleton className="h-16 w-16 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-4 w-1/3" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {streamersToDisplay.map((streamer) => (
                <a key={streamer.name} href={streamer.platformUrl} target="_blank" rel="noopener noreferrer" className="block group">
                <Card className="bg-card/10 text-primary-foreground border-border/20 hover:bg-card/20 transition-colors h-full">
                    <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                        <div className="relative">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={streamer.avatar} alt={streamer.name} />
                                <AvatarFallback>{streamer.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 flex items-center justify-center h-6 w-6 rounded-full bg-green-500 border-2 border-primary">
                               <Circle className="h-2.5 w-2.5 fill-white stroke-white" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-lg truncate group-hover:underline">{streamer.name}</p>
                        <p className="text-sm truncate text-primary-foreground/80 font-medium" title={streamer.title}>{streamer.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <PlatformIcon platform={streamer.platform} />
                            <p className="text-sm truncate text-primary-foreground/60">{streamer.game}</p>
                        </div>
                        </div>
                    </div>
                    </CardContent>
                </Card>
                </a>
            ))}
            </div>
        )}
      </div>
    </section>
  );
}
