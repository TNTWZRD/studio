import { Streamer } from '@/lib/types';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Twitch, Youtube, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

const PlatformIcon = ({ platform }: { platform: string }) => {
    if (platform.toLowerCase() === 'twitch') {
      return <Twitch className="h-5 w-5 text-purple-500" />;
    }
    if (platform.toLowerCase() === 'youtube') {
      return <Youtube className="h-5 w-5 text-red-500" />;
    }
    return <LinkIcon className="h-5 w-5 text-muted-foreground" />;
};

export default function AssociatedStreamers({ allStreamers }: { allStreamers: Streamer[] }) {
    if (!allStreamers || allStreamers.length === 0) {
        return null;
    }

  const groupedStreamers = allStreamers.reduce((acc, streamer) => {
    const key = streamer.name.trim().toLowerCase();
    if (!acc[key]) {
      acc[key] = {
        name: streamer.name,
        avatar: streamer.avatar || '',
        platforms: [],
      };
    }
        acc[key].platforms.push({
            platform: streamer.platform,
            platformUrl: streamer.platformUrl,
        });
        return acc;
    }, {} as Record<string, { name: string; avatar: string; platforms: { platform: string; platformUrl: string }[] }>);

    const sortedStreamers = Object.values(groupedStreamers).sort((a, b) => a.name.localeCompare(b.name));

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
                <Card key={streamer.name} className="overflow-hidden shadow-md transition-shadow duration-300 hover:shadow-lg h-full flex flex-col">
                    <CardContent className="p-4 flex flex-col flex-grow">
                        <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-12 w-12">
                {streamer.avatar && (streamer.avatar.startsWith('/') || streamer.avatar.startsWith('http')) ? (
                  <AvatarImage src={streamer.avatar} alt={streamer.name} />
                ) : (
                  <AvatarFallback>{streamer.name.charAt(0)}</AvatarFallback>
                )}
                {!streamer.avatar && <AvatarFallback>{streamer.name.charAt(0)}</AvatarFallback>}
              </Avatar>
                            <p className="font-bold truncate">{streamer.name}</p>
                        </div>
                        <div className="mt-auto space-y-2">
                           {streamer.platforms.map(({ platform, platformUrl }) => (
                                <Link key={platformUrl} href={platformUrl} target="_blank" rel="noopener noreferrer" className="block group">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/50 p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                                        <PlatformIcon platform={platform} />
                                        <span className="capitalize font-medium group-hover:underline">View on {platform}</span>
                                    </div>
                                </Link>
                           ))}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>
    </section>
  );
}
