'use client';

import { getMedia } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { MediaItem } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function getYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
      if (urlObj.pathname === '/watch') {
        return urlObj.searchParams.get('v');
      }
      if (urlObj.pathname.startsWith('/embed/')) {
        return urlObj.pathname.split('/')[2];
      }
      if (urlObj.pathname.startsWith('/shorts/')) {
        return urlObj.pathname.split('/')[2];
      }
    } else if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.substring(1);
    }
  } catch (error) {
    console.error('Invalid URL:', url, error);
    return null;
  }
  return null;
}


function MediaCard({ item }: { item: MediaItem }) {
  const [open, setOpen] = useState(false);
  const youTubeId = item.type === 'video' || item.type === 'clip' || item.type === 'short' ? getYouTubeVideoId(item.url) : null;
  const thumbnailUrl = youTubeId
    ? `https://i.ytimg.com/vi/${youTubeId}/hqdefault.jpg`
    : item.thumbnail;


  if (youTubeId) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <Card className="overflow-hidden shadow-lg transition-transform duration-300 hover:scale-105 hover:shadow-xl h-full flex flex-col group">
          <DialogTrigger asChild>
             <div className="relative aspect-video cursor-pointer">
              <Image
                src={thumbnailUrl}
                alt={item.title}
                fill
                className="object-cover"
                data-ai-hint="gaming video"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <PlayCircle className="w-16 h-16 text-white" />
              </div>
              <Badge variant="secondary" className="absolute top-2 left-2 capitalize">{item.type}</Badge>
            </div>
          </DialogTrigger>
          <CardContent className="p-4 flex-grow flex flex-col justify-between">
            <div>
              <DialogTrigger asChild>
                  <h3 className="font-semibold truncate cursor-pointer hover:text-accent hover:underline" title={item.title}>{item.title}</h3>
              </DialogTrigger>
              <p className="text-sm text-muted-foreground">by {item.creator}</p>
            </div>
             <Button onClick={() => setOpen(true)} className="mt-4 w-full">
                <PlayCircle className="mr-2"/>
                Watch
             </Button>
          </CardContent>
        </Card>

        <DialogContent className="max-w-4xl p-0">
           <DialogHeader className="p-4 pb-0">
             <DialogTitle>{item.title}</DialogTitle>
           </DialogHeader>
           <div className="aspect-video">
             <iframe
                src={`https://www.youtube.com/embed/${youTubeId}`}
                title={item.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
            ></iframe>
           </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Fallback for non-youtube videos or other media types
  return (
     <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="block group">
        <Card className="overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:shadow-xl h-full flex flex-col">
            <div className="relative aspect-video">
                <Image
                    src={thumbnailUrl}
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
  );
}

function MediaGallerySkeleton() {
    return (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                    <Skeleton className="aspect-video w-full" />
                    <CardContent className="p-4 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default function MediaPage() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMedia() {
      setLoading(true);
      const items = await getMedia();
      setMediaItems(items);
      setLoading(false);
    }
    loadMedia();
  }, []);


  return (
    <div className="container mx-auto py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-headline">Media Gallery</h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          A collection of highlights, full-length videos, guides, and more from the AMW community.
        </p>
      </div>

      {loading ? (
          <MediaGallerySkeleton />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {mediaItems.map(item => (
                <MediaCard key={item.id} item={item} />
            ))}
        </div>
      )}
    </div>
  );
}
