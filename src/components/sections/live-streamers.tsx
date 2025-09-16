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
  const [assessedStreamers, setAssessedStreamers] = useState<(Streamer | EnhanceLiveStreamerStripWithAIAssessmentOutput)[]>([]);
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

  if (loading) {
    return (
      <div className="bg-primary text-primary-foreground py-4">
        <div className="container mx-auto">
            <h2 className="mb-4 text-center text-2xl font-bold tracking-tight">Now Live</h2>
            <div className="flex space-x-4 overflow-x-auto pb-4">
            {[...Array(3)].map((_, i) => (
                <Card key={i} className="w-64 flex-shrink-0">
                <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                    </div>
                </CardContent>
                </Card>
            ))}
            </div>
        </div>
      </div>
    );
  }

  if (assessedStreamers.length === 0) {
    return null;
  }
  
  return (
    <div className="bg-primary text-primary-foreground py-4 -mt-16 relative z-20 shadow-lg">
      <div className="container mx-auto">
        <h2 className="mb-4 text-center text-2xl font-bold tracking-tight">Now Live</h2>
        <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-accent scrollbar-track-primary-foreground/10">
          {assessedStreamers.map((streamer) => (
            <a key={streamer.name} href={streamer.platformUrl} target="_blank" rel="noopener noreferrer" className="block w-72 flex-shrink-0">
              <Card className="bg-card/10 text-primary-foreground border-border/20 hover:bg-card/20 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start space-x-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={streamer.avatar} alt={streamer.name} />
                        <AvatarFallback>{streamer.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <Circle className="absolute bottom-0 right-0 h-4 w-4 fill-green-500 stroke-primary" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-semibold truncate">{streamer.name}</p>
                      <p className="text-sm truncate text-primary-foreground/80" title={streamer.title}>{streamer.title}</p>
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
      </div>
    </div>
  );
}
