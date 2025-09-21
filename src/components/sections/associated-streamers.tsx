import { Streamer } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Twitch, Youtube } from 'lucide-react';
import Link from 'next/link';

const PlatformIcon = ({ platform }: { platform: string }) => {
    if (platform.toLowerCase() === 'twitch') {
      return <Twitch className="h-5 w-5 text-purple-500" />;
    }
    if (platform.toLowerCase() === 'youtube') {
      return <Youtube className="h-5 w-5 text-red-500" />;
    }
    return null;
};

export default function AssociatedStreamers({ allStreamers }: { allStreamers: Streamer[] }) {
    if (!allStreamers || allStreamers.length === 0) {
        return null;
    }
    
    const sortedStreamers = [...allStreamers].sort((a,b) => a.name.localeCompare(b.name));

  return (
    <section className="py-16 sm:py-24 bg-secondary">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">Associated Streamers</h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            A directory of all streamers in the AMW community.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedStreamers.map(streamer => (
                <Link key={`${streamer.name}-${streamer.platformUrl}`} href={streamer.platformUrl} target="_blank" rel="noopener noreferrer" className="block group">
                    <Card className="overflow-hidden shadow-md transition-transform duration-300 hover:scale-105 hover:shadow-lg h-full">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={streamer.avatar} alt={streamer.name} />
                                    <AvatarFallback>{streamer.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-bold truncate group-hover:underline">{streamer.name}</p>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <PlatformIcon platform={streamer.platform} />
                                        <span className="capitalize">{streamer.platform}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
      </div>
    </section>
  );
}
