'use client';

import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Event, MediaItem, Streamer } from '@/lib/types';
import { useFormStatus } from 'react-dom';
import { useActionState, useEffect, useRef, useState } from 'react';
import { addStreamer, removeStreamer, assignStreamerToUser, updateStreamer, getFirebaseAuthUsers } from '../actions/manage-streamers';
import { addEvent, removeEvent, updateEvent } from '../actions/manage-events';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trash2, Edit, Check, ChevronsUpDown, X, PlusCircle, MinusCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getMedia, getStreamers, getEvents } from '@/lib/data';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';

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

function EditStreamerDialog({ streamer }: { streamer: Streamer }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [state, formAction] = useActionState(updateStreamer, {
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
                setOpen(false);
            }
        }
    }, [state, toast]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit Streamer</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Streamer</DialogTitle>
                    <DialogDescription>
                        Make changes to the streamer's profile here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <form action={formAction} className="space-y-4">
                    <input type="hidden" name="id" value={streamer.id} />
                    <div className="space-y-2">
                        <Label htmlFor="name">Streamer Name</Label>
                        <Input id="name" name="name" defaultValue={streamer.name} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="platform">Platform</Label>
                        <Select name="platform" defaultValue={streamer.platform} required>
                            <SelectTrigger id="platform">
                                <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="twitch">Twitch</SelectItem>
                                <SelectItem value="youtube">YouTube</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="platformUrl">Channel URL</Label>
                        <Input id="platformUrl" name="platformUrl" type="url" defaultValue={streamer.platformUrl} required />
                    </div>

                     <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">
                                Cancel
                            </Button>
                        </DialogClose>
                        <SubmitButton>Save Changes</SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
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
                <CardDescription>Add, edit, or remove streamers from the homepage.</CardDescription>
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
                                <TableCell className="text-right flex items-center justify-end">
                                    <EditStreamerDialog streamer={streamer} />
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

function AddEventForm({ allMedia }: { allMedia: MediaItem[] }) {
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();
    const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
    const [imageUrls, setImageUrls] = useState(['']);

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
                setSelectedMedia([]);
                setImageUrls(['']);
            }
        }
    }, [state, toast]);

    const handleImageUrlChange = (index: number, value: string) => {
        const newUrls = [...imageUrls];
        newUrls[index] = value;
        setImageUrls(newUrls);
    };

    const addImageUrlInput = () => {
        setImageUrls([...imageUrls, '']);
    };

    const removeImageUrlInput = (index: number) => {
        setImageUrls(imageUrls.filter((_, i) => i !== index));
    };


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
                        <Label>Image Paths</Label>
                        <CardDescription>Enter paths to images in the `public` directory (e.g., /images/event.png). The first image will be the main banner.</CardDescription>
                        <div className="space-y-2">
                            {imageUrls.map((url, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Input 
                                        name="imageUrls"
                                        type="text"
                                        placeholder="/images/your-image.png"
                                        value={url}
                                        onChange={(e) => handleImageUrlChange(index, e.target.value)}
                                    />
                                    <Button variant="ghost" size="icon" type="button" onClick={() => removeImageUrlInput(index)} disabled={imageUrls.length === 1}>
                                        <MinusCircle className="text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                         <Button variant="outline" size="sm" type="button" onClick={addImageUrlInput}>
                            <PlusCircle className="mr-2"/> Add Another Image
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="url">External Event URL (Optional)</Label>
                        <Input id="url" name="url" type="url" placeholder="https://example.com/event-page"/>
                    </div>

                    <div className="space-y-2">
                        <Label>Associated Video Media (Optional)</Label>
                        <MultiSelectMedia value={selectedMedia} onChange={setSelectedMedia} allMedia={allMedia} />
                        {selectedMedia.map(id => <input key={id} type="hidden" name="media" value={id} />)}
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

function EditEventDialog({ event, allMedia }: { event: Event, allMedia: MediaItem[] }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [startDate, setStartDate] = useState<Date | undefined>(new Date(event.start));
    const [endDate, setEndDate] = useState<Date | undefined>(event.end ? new Date(event.end) : undefined);
    const [selectedMedia, setSelectedMedia] = useState<string[]>(event.mediaIds || []);
    const [imageUrls, setImageUrls] = useState(event.imageUrls?.length ? event.imageUrls : ['']);

    const [state, formAction] = useActionState(updateEvent, {
        success: false,
        message: '',
    });

    const handleImageUrlChange = (index: number, value: string) => {
        const newUrls = [...imageUrls];
        newUrls[index] = value;
        setImageUrls(newUrls);
    };

    const addImageUrlInput = () => {
        setImageUrls([...imageUrls, '']);
    };

    const removeImageUrlInput = (index: number) => {
        setImageUrls(imageUrls.filter((_, i) => i !== index));
    };

     useEffect(() => {
        if (state.message) {
            toast({
                title: state.success ? 'Success!' : 'Error',
                description: state.message,
                variant: state.success ? 'default' : 'destructive',
            });
            if (state.success) {
                setOpen(false);
            }
        }
    }, [state, toast]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit Event</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit Event</DialogTitle>
                    <DialogDescription>
                        Make changes to the event here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <form action={formAction} className="space-y-4">
                    <input type="hidden" name="id" value={event.id} />
                    <div className="space-y-2">
                        <Label htmlFor="title">Event Title</Label>
                        <Input id="title" name="title" defaultValue={event.title} required />
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
                        <Textarea id="details" name="details" defaultValue={event.details} required />
                    </div>
                   
                    <div className="space-y-2">
                        <Label>Image Paths</Label>
                        <CardDescription>Enter paths to images in the `public` directory (e.g., /images/event.png). The first image will be the main banner.</CardDescription>
                        <div className="space-y-2">
                            {imageUrls.map((url, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Input
                                        name="imageUrls"
                                        type="text"
                                        placeholder="/images/your-image.png"
                                        value={url}
                                        onChange={(e) => handleImageUrlChange(index, e.target.value)}
                                    />
                                    <Button variant="ghost" size="icon" type="button" onClick={() => removeImageUrlInput(index)} disabled={imageUrls.length === 1 && index === 0 && !imageUrls[0]}>
                                        <MinusCircle className="text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" size="sm" type="button" onClick={addImageUrlInput}>
                            <PlusCircle className="mr-2"/> Add Another Image
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="url">External Event URL (Optional)</Label>
                        <Input id="url" name="url" type="url" placeholder="https://example.com/event-page" defaultValue={event.url}/>
                    </div>

                    <div className="space-y-2">
                        <Label>Associated Video Media (Optional)</Label>
                        <MultiSelectMedia value={selectedMedia} onChange={setSelectedMedia} allMedia={allMedia} />
                        {selectedMedia.map(id => <input key={id} type="hidden" name="media" value={id} />)}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select name="status" defaultValue={event.status} required>
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

                     <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">
                                Cancel
                            </Button>
                        </DialogClose>
                        <SubmitButton>Save Changes</SubmitButton>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
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

function EventList({ events, allMedia }: { events: Event[], allMedia: MediaItem[] }) {
    return (
         <Card>
            <CardHeader>
                <CardTitle>Manage Events</CardTitle>
                <CardDescription>Add, edit, or remove events from the site.</CardDescription>
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
                                <TableCell className="text-right flex items-center justify-end">
                                    <EditEventDialog event={event} allMedia={allMedia} />
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
      <Select name="userId" defaultValue={streamer.discordUserId || ''}>
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

function MultiSelectMedia({ value, onChange, allMedia }: { value: string[], onChange: (value: string[]) => void, allMedia: MediaItem[] }) {
    const [open, setOpen] = useState(false);
    
    const handleSelect = (mediaId: string) => {
        onChange(
            value.includes(mediaId) 
                ? value.filter(id => id !== mediaId)
                : [...value, mediaId]
        );
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                     <span className="truncate">
                        {value.length === 0 && 'Select media...'}
                        {value.length === 1 && allMedia.find(m => m.id === value[0])?.title}
                        {value.length > 1 && `${value.length} media items selected`}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="Search media..." />
                    <CommandEmpty>No media found.</CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-auto">
                        {allMedia.map((media) => (
                            <CommandItem
                                key={media.id}
                                value={media.title}
                                onSelect={() => handleSelect(media.id)}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        value.includes(media.id) ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                {media.title}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
                {value.length > 0 && (
                    <div className="p-2 border-t">
                        <p className="text-sm font-medium mb-2">Selected:</p>
                        <div className="flex flex-wrap gap-1">
                        {value.map(id => {
                            const media = allMedia.find(m => m.id === id);
                            return (
                                <Badge key={id} variant="secondary" className="flex items-center gap-1">
                                    <span className="truncate">{media?.title}</span>
                                     <button
                                        onClick={(e) => { e.stopPropagation(); handleSelect(id); }}
                                        className="rounded-full hover:bg-muted-foreground/20"
                                    >
                                        <X className="h-3 w-3"/>
                                    </button>
                                </Badge>
                            )
                        })}
                        </div>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

function AdminPage({ allStreamers, allEvents, authUsers, allMedia }: { allStreamers: Streamer[], allEvents: Event[], authUsers: AuthUser[], allMedia: MediaItem[] }) {
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
             <AddEventForm allMedia={allMedia} />
             <EventList events={allEvents} allMedia={allMedia} />
          </TabsContent>
          <TabsContent value="assignments" className="space-y-6 mt-6">
              <StreamerAssignmentList streamers={allStreamers} authUsers={authUsers} />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}

function AdminPageWrapper() {
    const [allStreamers, setAllStreamers] = useState<Streamer[]>([]);
    const [allEvents, setAllEvents] = useState<Event[]>([]);
    const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
    const [allMedia, setAllMedia] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        async function loadData() {
            const [streamers, events, users, media] = await Promise.all([
                getStreamers(),
                getEvents(),
                getFirebaseAuthUsers(),
                getMedia(),
            ]);
            setAllStreamers(streamers);
            setAllEvents(events);
            setAuthUsers(users);
            setAllMedia(media);
            setLoading(false);
        }
        loadData();
    }, []);

    if (loading) {
        return <div className="container mx-auto py-12">Loading...</div>;
    }
    
    return <AdminPage allStreamers={allStreamers} allEvents={allEvents} authUsers={authUsers} allMedia={allMedia} />;
}


export default withAdminAuth(AdminPageWrapper);

    