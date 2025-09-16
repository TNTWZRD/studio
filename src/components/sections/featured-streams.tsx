import { Streamer } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import Image from 'next/image';
import { Badge } from '../ui/badge';
import { Twitch, Youtube, Circle } from 'lucide-react';
import { Button } from '../ui/button';

const PlatformIcon = ({ platform }: { platform: string }) => {
    if (platform.toLowerCase() === 'twitch') {
      return <Twitch className="h-5 w-5 text-purple-500" />;
    }
    if (platform.toLowerCase() === 'youtube') {
      return <Youtube className="h-5 w-5 text-red-500" />;
    }
    return null;
};

export default function FeaturedStreams({ streamers }: { streamers: Streamer[] }) {
    if (!streamers || streamers.length === 0) {
        return null;
    }

  return (
    <section className="py-16 sm:py-24">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">Featured Streams</h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Check out some of our community's top streamers.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
            {streamers.map(streamer => (
                <Card key={streamer.id} className="overflow-hidden shadow-lg transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                    <div className="relative aspect-video">
                        <Image 
                            src={`https://picsum.photos/seed/${streamer.id}/600/338`} 
                            alt={`Thumbnail for ${streamer.name}'s stream`}
                            data-ai-hint="gaming stream"
                            fill
                            className="object-cover"
                        />
                         {streamer.isLive && (
                            <Badge variant="destructive" className="absolute top-3 right-3 flex items-center gap-2">
                                <Circle className="h-3 w-3 fill-current" />
                                LIVE
                            </Badge>
                         )}
                    </div>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-2xl font-bold">{streamer.name}</CardTitle>
                            <PlatformIcon platform={streamer.platform} />
                        </div>
                        <CardDescription>{streamer.game}</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <p className="text-muted-foreground mb-4 min-h-[40px]">{streamer.title}</p>
                       <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                            <a href={streamer.platformUrl} target="_blank" rel="noopener noreferrer">
                                Watch Now
                            </a>
                       </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>
    </section>
  );
}
