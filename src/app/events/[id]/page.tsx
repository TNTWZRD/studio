import { getEventById, getMedia } from '@/lib/data';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Link as LinkIcon, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { MediaItem } from '@/lib/types';

function ImageCarousel({ imageUrls, title }: { imageUrls: string[], title: string }) {
    if (!imageUrls || imageUrls.length === 0) return null;

    if (imageUrls.length === 1) {
        return (
             <div className="relative aspect-video w-full overflow-hidden rounded-lg mb-8 shadow-lg bg-secondary">
                <Image 
                    src={imageUrls[0]}
                    alt={title}
                    fill
                    className="object-cover"
                    data-ai-hint="gaming event"
                />
            </div>
        );
    }
    return (
        <Carousel className="w-full mb-8">
            <CarouselContent>
                {imageUrls.map((url, index) => (
                    <CarouselItem key={index}>
                         <div className="relative aspect-video w-full overflow-hidden rounded-lg shadow-lg bg-secondary">
                            <Image 
                                src={url}
                                alt={`${title} - Image ${index + 1}`}
                                fill
                                className="object-cover"
                                data-ai-hint="gaming event"
                            />
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
        </Carousel>
    )
}

function MediaCarousel({ mediaItems }: { mediaItems: MediaItem[] }) {
    return (
        <div className="mb-12">
            <h2 className="text-3xl font-bold mb-4 font-headline">Related Media</h2>
            <Carousel
                opts={{
                align: "start",
                loop: true,
                }}
                className="w-full"
            >
                <CarouselContent>
                {mediaItems.map((item) => (
                    <CarouselItem key={item.id} className="md:basis-1/2 lg:basis-1/3">
                    <div className="p-1 h-full">
                         <a href={item.url} target="_blank" rel="noopener noreferrer" className="block group h-full">
                            <Card className="overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:shadow-xl h-full flex flex-col">
                                <div className="relative aspect-video">
                                    <Image
                                        src={item.thumbnail}
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
                                <CardContent className="p-4 flex-grow flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-semibold truncate group-hover:text-accent group-hover:underline" title={item.title}>{item.title}</h3>
                                        <p className="text-sm text-muted-foreground">by {item.creator}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </a>
                    </div>
                    </CarouselItem>
                ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
            </Carousel>
        </div>
    );
}

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const event = await getEventById(params.id);

  if (!event) {
    notFound();
  }

  const startDate = new Date(event.start);
  const formattedStartDate = isNaN(startDate.getTime()) ? 'TBD' : format(startDate, 'MMMM d, yyyy');
  const formattedStartTime = isNaN(startDate.getTime()) ? '' : format(startDate, 'p');
  
  const endDate = event.end ? new Date(event.end) : null;
  const formattedEndTime = endDate && !isNaN(endDate.getTime()) ? format(endDate, 'p') : null;

  const imageUrls = event.imageUrls?.length ? event.imageUrls : (event.image ? [event.image] : []);

  return (
    <div className="container mx-auto py-12">
      <div className="max-w-4xl mx-auto">
        
        <ImageCarousel imageUrls={imageUrls} title={event.title} />

        <Badge variant={event.status === 'live' ? 'destructive' : 'secondary'} className="capitalize mb-2">{event.status}</Badge>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-headline mb-4">{event.title}</h1>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 text-muted-foreground mb-6 text-lg">
            <div className="flex items-center">
                <Calendar className="mr-3 h-5 w-5" />
                <span>{formattedStartDate}</span>
            </div>
             {formattedStartTime && (
                <div className="flex items-center">
                    <Clock className="mr-3 h-5 w-5" />
                    <span>{formattedStartTime} {formattedEndTime && ` - ${formattedEndTime}`}</span>
                </div>
             )}
            <div className="flex items-center">
                <Users className="mr-3 h-5 w-5" />
                <span>{event.participants.length} participants</span>
            </div>
        </div>

        {event.url && (
            <div className="mb-8">
                <Button asChild>
                    <a href={event.url} target="_blank" rel="noopener noreferrer">
                        <LinkIcon className="mr-2 h-4 w-4" />
                        View Event Link
                    </a>
                </Button>
            </div>
        )}
        
        {event.details && (
            <div className="prose dark:prose-invert max-w-none text-lg text-foreground/80 mb-12"
                 dangerouslySetInnerHTML={{ __html: event.details.replace(/\n/g, '<br />') }}
            />
        )}

        {event.media && event.media.length > 0 && <MediaCarousel mediaItems={event.media} />}


        {event.status === 'past' && event.scoreboard && event.scoreboard.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold mb-4 font-headline">Scoreboard</h2>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">Rank</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Notes</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {event.scoreboard.map((entry) => (
                        <TableRow key={entry.rank}>
                            <TableCell className="font-medium">{entry.rank}</TableCell>
                            <TableCell>{entry.name}</TableCell>
                            <TableCell>{entry.score}</TableCell>
                            <TableCell>{entry.notes || '-'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
