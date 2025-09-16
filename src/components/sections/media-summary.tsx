import { MediaItem } from '@/lib/types';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '../ui/badge';

export default function MediaSummary({ media }: { media: MediaItem[] }) {
    if (!media || media.length === 0) {
        return null;
    }

    return (
        <section className="py-16 sm:py-24">
            <div className="container mx-auto">
                <div className="flex flex-col items-center text-center mb-12 md:flex-row md:justify-between md:text-left">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">Latest Media</h2>
                        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                           Highlights, guides, and more from the AMW community.
                        </p>
                    </div>
                    <Button asChild variant="outline" className="mt-4 md:mt-0">
                        <Link href="/media">
                            View All Media <ArrowRight className="ml-2"/>
                        </Link>
                    </Button>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {media.map(item => (
                        <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="block group">
                            <Card className="overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:shadow-xl">
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
                                <CardContent className="p-4">
                                    <h3 className="font-semibold truncate group-hover:text-accent group-hover:underline" title={item.title}>{item.title}</h3>
                                    <p className="text-sm text-muted-foreground">by {item.creator}</p>
                                </CardContent>
                            </Card>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}
