'use client';

import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Event, Streamer } from '@/lib/types';
import { useFormStatus } from 'react-dom';
import { useActionState, useEffect, useRef, useState } from 'react';
import { addStreamer, removeStreamer, assignStreamerToUser } from '../actions/manage-streamers';
import { addEvent, removeEvent } from '../actions/manage-events';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AuthUser = { uid: string; displayName: string | undefined; email: string | undefined };

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full md:w-auto">
      {pending ? 'Saving...' : children}
    </Button>
  );
}

function AddStreamerForm() {
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useActionState(addStreamer, {
      success: false,
      message: '',
    });

    useEffect(() => {
        if (state.message) {
            toast({
                title: state.success ? 'Success!' : 'Error',
                description: state.message,
                variant: state.success ? 'default' : 'destructive',
            });
            if (state.success) {
                formRef.current?.reset();
            }
        }
    }, [state, toast]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Add a New Streamer</CardTitle>
                <CardDescription>Enter the details for the new streamer to add them to the list.</CardDescription>
            </CardHeader>
            <CardContent>
                <form ref={formRef} action={formAction} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Streamer Name</Label>
                            <Input id="name" name="name" placeholder="e.g., PlayerOne" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="platform">Platform</Label>
                            <Select name="platform" defaultValue="twitch" required>
                                <SelectTrigger id="platform">
                                    <SelectValue placeholder="Select platform" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="twitch">Twitch</SelectItem>
                                    <SelectItem value="youtube">YouTube</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="platformUrl">Channel URL</Label>
                        <Input id="platformUrl" name="platformUrl" type="url" placeholder="https://twitch.tv/playerone" required />
                    </div>
                    <SubmitButton>Add Streamer</SubmitButton>
                </form>
            </CardContent>
        </Card>
    );
}

function RemoveStreamerForm({ streamerId }: { streamerId: string }) {
    const { toast } = useToast();
     const [state, formAction] = useActionState(removeStreamer, {
      success: false,
      message: '',
    });

    useEffect(() => {
        if (state.message) {
            toast({
                title: state.success ? 'Success!' : 'Error',
                description: state.message,
                variant: state.success ? 'default' : 'destructive',
            });
        }
    }, [state, toast]);

    return (
        <form action={formAction}>
            <input type="hidden" name="id" value={streamerId} />
            <Button variant="ghost" size="icon" type="submit">
                <Trash2 className="h-4 w-4 text-destructive" />
                <span className="sr-only">Remove Streamer</span>
            </Button>
        </form>
    );
}

function StreamerList({ streamers }: { streamers: Streamer[] }) {
    return (
         <Card>
            <CardHeader>
                <CardTitle>Manage Streamers</CardTitle>
                <CardDescription>Add or remove streamers from the homepage.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Avatar</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Platform</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {streamers.map((streamer) => (
                            <TableRow key={streamer.id}>
                                <TableCell>
                                    <Avatar>
                                        <AvatarImage src={streamer.avatar} alt={streamer.name} />
                                        <AvatarFallback>{streamer.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </TableCell>
                                <TableCell className="font-medium">{streamer.name}</TableCell>
                                <TableCell className="capitalize">{streamer.platform}</TableCell>
                                <TableCell className="text-right">
                                    <RemoveStreamerForm streamerId={streamer.id} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function AddEventForm() {
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();
    
    const [state, formAction] = useActionState(addEvent, {
      success: false,
      message: '',
    });

    useEffect(() => {
        if (state.message) {
            toast({
                title: state.success ? 'Success!' : 'Error',
                description: state.message,
                variant: state.success ? 'default' : 'destructive',
            });
            if (state.success) {
                formRef.current?.reset();
                setStartDate(undefined);
                setEndDate(undefined);
            }
        }
    }, [state, toast]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Add a New Event</CardTitle>
                <CardDescription>Enter the details for the new event.</CardDescription>
            </CardHeader>
            <CardContent>
                <form ref={formRef} action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Event Title</Label>
                        <Input id="title" name="title" placeholder="e.g., Community Game Night" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="start">Start Date & Time</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !startDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {startDate ? format(startDate, "PPP p") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={startDate}
                                        onSelect={setStartDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                             <input type="hidden" name="start" value={startDate?.toISOString()} />
                        </div>
                        <div className="space-y-2">
                           <Label htmlFor="end">End Date & Time</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !endDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {endDate ? format(endDate, "PPP p") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={endDate}
                                    onSelect={setEndDate}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                           <input type="hidden" name="end" value={endDate?.toISOString()} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="details">Details</Label>
                        <Textarea id="details" name="details" placeholder="Describe the event..." required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select name="status" defaultValue="upcoming" required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="upcoming">Upcoming</SelectItem>
                                <SelectItem value="live">Live</SelectItem>
                                <SelectItem value="past">Past</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <SubmitButton>Add Event</SubmitButton>
                </form>
            </CardContent>
        </Card>
    );
}

function RemoveEventForm({ eventId }: { eventId: string }) {
    const { toast } = useToast();
     const [state, formAction] = useActionState(removeEvent, {
      success: false,
      message: '',
    });

    useEffect(() => {
        if (state.message) {
            toast({
                title: state.success ? 'Success!' : 'Error',
                description: state.message,
                variant: state.success ? 'default' : 'destructive',
            });
        }
    }, [state, toast]);

    return (
        <form action={formAction}>
            <input type="hidden" name="id" value={eventId} />
            <Button variant="ghost" size="icon" type="submit">
                <Trash2 className="h-4 w-4 text-destructive" />
                <span className="sr-only">Remove Event</span>
            </Button>
        </form>
    );
}

function EventList({ events }: { events: Event[] }) {
    return (
         <Card>
            <CardHeader>
                <CardTitle>Manage Events</CardTitle>
                <CardDescription>Add or remove events from the site.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {events.map((event) => (
                            <TableRow key={event.id}>
                                <TableCell className="font-medium">{event.title}</TableCell>
                                <TableCell className="capitalize">{event.status}</TableCell>
                                <TableCell>{format(new Date(event.start), 'PP')}</TableCell>
                                <TableCell className="text-right">
                                    <RemoveEventForm eventId={event.id} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function AssignStreamerForm({ streamer, authUsers }: { streamer: Streamer; authUsers: AuthUser[] }) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(assignStreamerToUser, { success: false, message: '' });

  useEffect(() => {
    if (state.message) {
      toast({
        title: state.success ? 'Success' : 'Error',
        description: state.message,
        variant: state.success ? 'default' : 'destructive',
      });
    }
  }, [state, toast]);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="streamerId" value={streamer.id} />
      <Select name="userId" defaultValue={streamer.discordUserId}>
        <SelectTrigger>
          <SelectValue placeholder="Assign to user..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassign">-- Unassign --</SelectItem>
          {authUsers.map(user => (
            <SelectItem key={user.uid} value={user.uid}>
              {user.displayName} ({user.email})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <SubmitButton>Save</SubmitButton>
    </form>
  );
}

function StreamerAssignmentList({ streamers, authUsers }: { streamers: Streamer[]; authUsers: AuthUser[] }) {
    const sortedStreamers = [...streamers].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign Streamer Profiles</CardTitle>
        <CardDescription>
          Link a streamer profile to a logged-in Discord user to grant them access to the Creator Dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Streamer</TableHead>
              <TableHead>Assign to User</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStreamers.map((streamer) => (
              <TableRow key={streamer.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={streamer.avatar} alt={streamer.name}/>
                        <AvatarFallback>{streamer.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{streamer.name} ({streamer.platform})</span>
                  </div>
                </TableCell>
                <TableCell>
                  <AssignStreamerForm streamer={streamer} authUsers={authUsers} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


function AdminPage({ allStreamers, allEvents, authUsers }: { allStreamers: Streamer[], allEvents: Event[], authUsers: AuthUser[] }) {
  return (
    <div className="container mx-auto py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-headline">Admin Dashboard</h1>

        <Tabs defaultValue="streamers" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="streamers">Manage Streamers</TabsTrigger>
            <TabsTrigger value="events">Manage Events</TabsTrigger>
            <TabsTrigger value="assignments">Assign Streamers</TabsTrigger>
          </TabsList>
          <TabsContent value="streamers" className="space-y-6 mt-6">
            <AddStreamerForm />
            <StreamerList streamers={allStreamers} />
          </TabsContent>
          <TabsContent value="events" className="space-y-6 mt-6">
             <AddEventForm />
             <EventList events={allEvents} />
          </TabsContent>
          <TabsContent value="assignments" className="space-y-6 mt-6">
              <StreamerAssignmentList streamers={allStreamers} authUsers={authUsers} />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}

export default withAdminAuth(AdminPage);
