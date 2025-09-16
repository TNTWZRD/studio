import { getMedia } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

export default async function MediaPage() {
  const mediaItems = await getMedia();

  return (
    <div className="container mx-auto py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-headline">Media Gallery</h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          A collection of highlights, full-length videos, guides, and more from the AMW community.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {mediaItems.map(item => (
            <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="block group">
                <Card className="overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:shadow-xl h-full flex flex-col">
                    <div className="relative aspect-video">
                        <Image 
                            src={item.thumbnail}
                            alt={item.title}
                            fill
                            className="object-cover"
                            data-ai-hint="gaming video"
                        />
                        <Badge variant="secondary" className="absolute top-2 left-2 capitalize">{item.type}</Badge>
                    </div>
                    <CardContent className="p-4 flex-grow flex flex-col justify-between">
                        <div>
                            <h3 className="font-semibold truncate group-hover:text-accent group-hover:underline" title={item.title}>{item.title}</h3>
                            <p className="text-sm text-muted-foreground">by {item.creator}</p>
                        </div>
                    </CardContent>
                </Card>
            </a>
        ))}
      </div>
    </div>
  );
}
