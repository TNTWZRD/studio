import { getEvents, getStreamers } from '@/lib/data';
import { Event, Streamer } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Star } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function EventCard({ event }: { event: Event }) {
  const startDate = new Date(event.start);
  const formattedDate = isNaN(startDate.getTime()) ? 'TBD' : format(startDate, 'eeee, MMMM d');
  const formattedTime = isNaN(startDate.getTime()) ? '' : format(startDate, 'p');

  return (
    <Link href={`/events/${event.id}`} className="block group">
      <Card className="h-full overflow-hidden shadow-md transition-transform duration-300 hover:scale-105 hover:shadow-xl">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="group-hover:text-accent group-hover:underline">{event.title}</CardTitle>
            <Badge variant={event.status === 'live' ? 'destructive' : 'secondary'} className="capitalize shrink-0">{event.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-sm text-muted-foreground mb-2">
            <Calendar className="mr-2 h-4 w-4" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="mr-2 h-4 w-4" />
            <span>{formattedTime}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function StreamerScheduleCard({ streamer }: { streamer: Streamer }) {
  const today = new Date();
  const todayName = format(today, 'eeee');

  const sortedOneTimeEvents = (streamer.oneTimeEvents || [])
    .filter(event => new Date(event.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src={streamer.avatar} alt={streamer.name} />
            <AvatarFallback>{streamer.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{streamer.name}</CardTitle>
            <Link href={streamer.platformUrl} className="text-sm text-accent hover:underline" target='_blank' rel='noopener noreferrer'>
                View Channel
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        {sortedOneTimeEvents.length > 0 && (
            <div className="mb-4">
                 <h3 className="font-semibold mb-2 text-muted-foreground flex items-center"><Star className="mr-2 h-4 w-4 text-yellow-500 fill-yellow-500" /> One-Time Events</h3>
                 <ul className="space-y-2 text-sm">
                    {sortedOneTimeEvents.map(event => (
                        <li key={event.id} className="flex justify-between p-2 rounded-md bg-accent/10">
                            <div>
                                <p className="font-medium text-accent">{event.title}</p>
                                <p className="text-muted-foreground">{format(new Date(event.date), 'eeee, MMMM d')}</p>
                            </div>
                        </li>
                    ))}
                 </ul>
                 <Separator className="my-4"/>
            </div>
        )}

        <h3 className="font-semibold mb-2 text-muted-foreground">Weekly Schedule</h3>
        {(streamer.schedule && streamer.schedule.length > 0) ? (
          <ul className="space-y-1 text-sm">
            {daysOfWeek.map(day => {
                const scheduleForDay = streamer.schedule?.find(s => s.day === day);
                if (!scheduleForDay) return null;

                const isToday = day === todayName;

                return (
                    <li key={day} className={`flex justify-between p-1 rounded-md ${isToday ? 'bg-accent/20' : ''}`}>
                        <span className={`font-medium ${isToday ? 'text-accent' : ''}`}>{day}</span>
                        <span className="text-muted-foreground">{scheduleForDay.time}</span>
                    </li>
                );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No recurring schedule set yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function SchedulesPage() {
  const allEvents = await getEvents();
  const allStreamers = await getStreamers();

  const upcomingEvents = allEvents.filter(e => e.status === 'upcoming' || e.status === 'live');
  const streamersWithSchedules = allStreamers.filter(s => (s.schedule && s.schedule.length > 0) || (s.oneTimeEvents && s.oneTimeEvents.length > 0));

  return (
    <div className="container mx-auto py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-headline">Schedules</h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Stay up to date with all community events and streamer schedules.
        </p>
      </div>

      <div className="space-y-16">
        <div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline mb-8 text-center">Community Events</h2>
          {upcomingEvents.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center">No upcoming events scheduled. Check back soon!</p>
          )}
        </div>

        <div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline mb-8 text-center">Creator Schedules</h2>
          {streamersWithSchedules.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {streamersWithSchedules.map(streamer => (
                <StreamerScheduleCard key={streamer.id} streamer={streamer} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center">No creator schedules have been posted yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
