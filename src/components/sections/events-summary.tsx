import { Event } from '@/lib/types';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { ArrowRight, Calendar } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import Image from 'next/image';
import { Badge } from '../ui/badge';

export default function EventsSummary({ events }: { events: Event[] }) {
    if (!events || events.length === 0) {
        return null;
    }

    return (
        <section className="py-16 sm:py-24 bg-secondary">
            <div className="container mx-auto">
                <div className="flex flex-col items-center text-center mb-12 md:flex-row md:justify-between md:text-left">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">Upcoming Events</h2>
                        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                            Join us for community nights, tournaments, and more.
                        </p>
                    </div>
                    <Button asChild variant="outline" className="mt-4 md:mt-0">
                        <Link href="/events">
                            View All Events <ArrowRight className="ml-2"/>
                        </Link>
                    </Button>
                </div>
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {events.map(event => (
                        <Link key={event.id} href={`/events/${event.id}`} className="block group">
                            <Card className="h-full overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:shadow-xl flex flex-col">
                                <div className="relative aspect-video">
                                    <Image 
                                        src={event.image}
                                        alt={event.title}
                                        fill
                                        className="object-cover"
                                        data-ai-hint="gaming event"
                                    />
                                </div>
                                <CardHeader>
                                    <Badge variant="secondary" className="w-fit mb-2">{event.status}</Badge>
                                    <CardTitle>{event.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        <span>{format(new Date(event.start), 'MMMM d, yyyy')}</span>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <p className="text-accent-foreground group-hover:underline font-semibold">View Details</p>
                                </CardFooter>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
