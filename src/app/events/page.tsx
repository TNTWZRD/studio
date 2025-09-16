import { getEvents } from '@/lib/data';
import { Event } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function EventCard({ event }: { event: Event }) {
  return (
    <Link href={`/events/${event.id}`} className="block group">
      <Card className="h-full overflow-hidden shadow-lg transition-transform duration-300 hover:scale-105 hover:shadow-xl flex flex-col">
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
          <CardTitle>{event.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="mr-2 h-4 w-4" />
            <span>{format(new Date(event.start), 'MMMM d, yyyy')}</span>
          </div>
          <p className="mt-2 text-muted-foreground line-clamp-2">{event.details}</p>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
            <p className="text-accent-foreground group-hover:underline font-semibold">View Details</p>
            <Badge variant={event.status === 'live' ? 'destructive' : 'secondary'} className="capitalize">{event.status}</Badge>
        </CardFooter>
      </Card>
    </Link>
  );
}

function EventGrid({ events }: { events: Event[] }) {
    if (events.length === 0) {
        return <p className="text-muted-foreground text-center py-8">No events in this category.</p>
    }
    return (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {events.map(event => <EventCard key={event.id} event={event} />)}
        </div>
    );
}

export default function EventsPage() {
  const allEvents = getEvents();
  const upcomingEvents = allEvents.filter(e => e.status === 'upcoming');
  const liveEvents = allEvents.filter(e => e.status === 'live');
  const pastEvents = allEvents.filter(e => e.status === 'past');

  return (
    <div className="container mx-auto py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-headline">Community Events</h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Find out about our upcoming tournaments, community nights, and past glories.
        </p>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-8">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="live">Live</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
            <EventGrid events={upcomingEvents} />
        </TabsContent>
        <TabsContent value="live">
            <EventGrid events={liveEvents} />
        </TabsContent>
        <TabsContent value="past">
            <EventGrid events={pastEvents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
