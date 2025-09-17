'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { withCreatorAuth } from '@/components/auth/with-creator-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { MediaItem, Streamer } from '@/lib/types';
import { Trash2, PlusCircle, MinusCircle, Edit, Calendar as CalendarIcon, User, ChevronRight, Check, ChevronsUpDown } from 'lucide-react';
import { addMedia, removeMedia, updateMedia } from '../actions/manage-media';
import { useAuth } from '@/hooks/use-auth';
import { updateRecurringSchedule, addStreamer, assignStreamerToUser, updateOneTimeEvents } from '../actions/manage-streamers';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


function SubmitButton({ children, variant }: { children: React.ReactNode, variant?: any }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant} className="w-full md:w-auto">
      {pending ? 'Saving...' : children}
    </Button>
  );
}

// Media Management
function AddMediaForm() {
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const { user } = useAuth();
    const [state, formAction] = useActionState(addMedia, {
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
                <CardTitle>Post New Media</CardTitle>
                <CardDescription>Add a new video, clip, or guide to the media gallery.</CardDescription>
            </CardHeader>
            <CardContent>
                <form ref={formRef} action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" name="title" placeholder="e.g., Epic Gameplay Moments" required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="url">URL</Label>
                        <Input id="url" name="url" type="url" placeholder="https://youtube.com/watch?v=..." required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-2">
                            <Label htmlFor="type">Media Type</Label>
                            <Select name="type" defaultValue="video" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="video">Video</SelectItem>
                                    <SelectItem value="clip">Clip</SelectItem>
                                    <SelectItem value="stream">Stream VOD</SelectItem>
                                    <SelectItem value="guide">Guide</SelectItem>
                                    <SelectItem value="short">Short</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="creator">Creator</Label>
                            <Input id="creator" name="creator" defaultValue={user?.displayName ?? ''} required />
                        </div>
                    </div>
                    <SubmitButton>Post Media</SubmitButton>
                </form>
            </CardContent>
        </Card>
    );
}

function EditMediaDialog({ item }: { item: MediaItem }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [state, formAction] = useActionState(updateMedia, {
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
                    <span className="sr-only">Edit Media</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Media</DialogTitle>
                    <DialogDescription>
                        Make changes to your media post here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <form action={formAction} className="space-y-4">
                    <input type="hidden" name="id" value={item.id} />
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" name="title" defaultValue={item.title} required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="url">URL</Label>
                        <Input id="url" name="url" type="url" defaultValue={item.url} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="type">Media Type</Label>
                        <Select name="type" defaultValue={item.type} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="video">Video</SelectItem>
                                <SelectItem value="clip">Clip</SelectItem>
                                <SelectItem value="stream">Stream VOD</SelectItem>
                                <SelectItem value="guide">Guide</SelectItem>
                                <SelectItem value="short">Short</SelectItem>
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

function RemoveMediaForm({ mediaId }: { mediaId: string }) {
    const { toast } = useToast();
     const [state, formAction] = useActionState(removeMedia, {
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
            <input type="hidden" name="id" value={mediaId} />
            <Button variant="ghost" size="icon" type="submit">
                <Trash2 className="h-4 w-4 text-destructive" />
                <span className="sr-only">Remove Media</span>
            </Button>
        </form>
    );
}


function MediaList({ media }: { media: MediaItem[] }) {
    return (
         <Card>
            <CardHeader>
                <CardTitle>Manage Your Media</CardTitle>
                <CardDescription>Review, edit, or remove your media posts.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {media.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.title}</TableCell>
                                <TableCell className="capitalize">{item.type}</TableCell>
                                <TableCell>{item.date}</TableCell>
                                <TableCell className="text-right flex items-center justify-end">
                                    <EditMediaDialog item={item} />
                                    <RemoveMediaForm mediaId={item.id} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

// Schedule Management
const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function RecurringScheduleManager({ streamer }: { streamer: Streamer }) {
    const { toast } = useToast();
    const [recurringSchedule, setRecurringSchedule] = useState(streamer.schedule || []);
    const [state, formAction] = useActionState(updateRecurringSchedule, {
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

    const handleAddRecurringSlot = () => {
        setRecurringSchedule([...recurringSchedule, { day: 'Sunday', time: '8:00 PM EST' }]);
    };
    
    const handleRemoveRecurringSlot = (index: number) => {
        setRecurringSchedule(recurringSchedule.filter((_, i) => i !== index));
    };

    const handleRecurringScheduleChange = (index: number, field: 'day' | 'time', value: string) => {
        const newSchedule = [...recurringSchedule];
        newSchedule[index] = { ...newSchedule[index], [field]: value };
        setRecurringSchedule(newSchedule);
    };

     return (
        <Card>
            <CardHeader>
                <CardTitle>Recurring Schedule: {streamer.name} ({streamer.platform})</CardTitle>
                <CardDescription>Set your standard weekly stream times.</CardDescription>
            </CardHeader>
            <CardContent>
                 <form action={formAction} className="space-y-6">
                    <input type="hidden" name="streamerId" value={streamer.id} />
                    <input type="hidden" name="schedule" value={JSON.stringify(recurringSchedule)} />
                    
                    <div className="space-y-4">
                    {recurringSchedule.map((slot, index) => (
                        <div key={index} className="flex flex-col md:flex-row items-center gap-2">
                            <Select
                                value={slot.day}
                                onValueChange={(value) => handleRecurringScheduleChange(index, 'day', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select day" />
                                </SelectTrigger>
                                <SelectContent>
                                    {daysOfWeek.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Input
                                type="text"
                                value={slot.time}
                                placeholder="e.g., 8:00 PM EST"
                                onChange={(e) => handleRecurringScheduleChange(index, 'time', e.target.value)}
                            />
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveRecurringSlot(index)} type="button">
                                <MinusCircle className="text-destructive"/>
                            </Button>
                        </div>
                    ))}
                    </div>
                     <Button variant="outline" type="button" onClick={handleAddRecurringSlot} className="mt-4">
                        <PlusCircle className="mr-2"/>
                        Add Recurring Slot
                    </Button>
                    <Separator />
                    <div className="flex justify-end">
                        <SubmitButton variant="default">Save Recurring Schedule</SubmitButton>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

function OneTimeEventManager({ userStreamerProfiles }: { userStreamerProfiles: Streamer[] }) {
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);

    const [newEventDate, setNewEventDate] = useState<Date>();
    const [selectedProfiles, setSelectedProfiles] = useState<Record<string, boolean>>({});

    const [state, formAction] = useActionState(updateOneTimeEvents, { success: false, message: '' });

    useEffect(() => {
        if (state.message) {
            toast({
                title: state.success ? 'Success!' : 'Error',
                description: state.message,
                variant: state.success ? 'default' : 'destructive',
            });
            if (state.success) {
                formRef.current?.reset();
                setNewEventDate(undefined);
                setSelectedProfiles({});
            }
        }
    }, [state, toast]);

    const allOneTimeEvents = userStreamerProfiles.flatMap(p => 
        (p.oneTimeEvents || []).map(e => ({ ...e, streamerProfile: p }))
    ).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const selectedProfileCount = Object.values(selectedProfiles).filter(Boolean).length;

    return (
        <Card>
            <CardHeader>
                <CardTitle>One-Time Events</CardTitle>
                <CardDescription>Announce special streams or events. These will appear on the main schedule page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <form ref={formRef} action={formAction} className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-semibold text-lg">Add a New One-Time Event</h3>
                    <input type="hidden" name="action" value="add" />
                    {Object.entries(selectedProfiles).map(([profileId, isSelected]) => 
                        isSelected ? <input key={profileId} type="hidden" name="streamerIds" value={profileId} /> : null
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="title">Event Info / Title</Label>
                        <Input id="title" name="title" placeholder="e.g., Charity Stream" required />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn("w-full justify-start text-left font-normal", !newEventDate && "text-muted-foreground")}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {newEventDate ? format(newEventDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={newEventDate} onSelect={setNewEventDate} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <input type="hidden" name="date" value={newEventDate?.toISOString()} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="time">Time</Label>
                            <Input id="time" name="time" placeholder="e.g., 8:00 PM EST" required />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Platforms</Label>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full md:w-auto justify-between">
                                    {selectedProfileCount === 0 && 'Select Platforms'}
                                    {selectedProfileCount === 1 && '1 Platform Selected'}
                                    {selectedProfileCount > 1 && `${selectedProfileCount} Platforms Selected`}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                                {userStreamerProfiles.map(p => (
                                    <DropdownMenuCheckboxItem
                                        key={p.id}
                                        checked={selectedProfiles[p.id] || false}
                                        onCheckedChange={(checked) => setSelectedProfiles(prev => ({ ...prev, [p.id]: !!checked }))}
                                    >
                                        {p.name} ({p.platform})
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <SubmitButton>
                        <PlusCircle className="mr-2"/> Add Event
                    </SubmitButton>
                </form>

                <div>
                    <h3 className="font-semibold text-lg mb-2">Upcoming One-Time Events</h3>
                     <div className="space-y-2">
                        {allOneTimeEvents.length > 0 ? allOneTimeEvents.map((event) => (
                            <div key={`${event.streamerProfile.id}-${event.id}`} className="flex items-center justify-between gap-2 p-2 rounded-md bg-secondary">
                                <div>
                                    <p className="font-medium">{event.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {format(new Date(event.date), 'eeee, MMMM d')} at {event.time} 
                                        <span className="text-xs capitalize ml-2 p-1 bg-background rounded-sm">({event.streamerProfile.platform})</span>
                                    </p>
                                </div>
                                <form action={formAction}>
                                    <input type="hidden" name="action" value="remove"/>
                                    <input type="hidden" name="streamerIds" value={event.streamerProfile.id}/>
                                    <input type="hidden" name="eventId" value={event.id}/>
                                    <Button variant="ghost" size="icon" type="submit">
                                        <Trash2 className="text-destructive h-4 w-4"/>
                                    </Button>
                                </form>
                            </div>
                        )) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No one-time events scheduled.</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function ClaimProfileForm({ unassignedStreamers, userId }: { unassignedStreamers: Streamer[], userId: string }) {
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
        <Card>
            <CardHeader>
                <CardTitle>Claim a Streamer Profile</CardTitle>
                <CardDescription>If you see your streamer name in the list below, you can claim it to manage its schedule.</CardDescription>
            </CardHeader>
            <CardContent>
                <form action={formAction} className="space-y-4">
                    <input type="hidden" name="userId" value={userId} />
                     <div className="space-y-2">
                        <Label htmlFor="streamerId">Unassigned Profiles</Label>
                        <Select name="streamerId" required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a profile to claim..." />
                            </SelectTrigger>
                            <SelectContent>
                                {unassignedStreamers.map(streamer => (
                                     <SelectItem key={streamer.id} value={streamer.id}>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-5 h-5">
                                                <AvatarImage src={streamer.avatar} alt={streamer.name} />
                                                <AvatarFallback>{streamer.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span>{streamer.name} ({streamer.platform})</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <SubmitButton>Claim Profile</SubmitButton>
                </form>
            </CardContent>
        </Card>
    );
}

function AddStreamerCreatorForm({ userId }: { userId: string }) {
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
                <CardTitle>Add Your Streamer Profile</CardTitle>
                <CardDescription>Don't see your profile in the list? Add it here to get started.</CardDescription>
            </CardHeader>
            <CardContent>
                <form ref={formRef} action={formAction} className="space-y-4">
                     <input type="hidden" name="discordUserId" value={userId} />
                    <div className="space-y-2">
                        <Label htmlFor="name">Streamer Name</Label>
                        <Input id="name" name="name" placeholder="Your display name on stream" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                         <div className="space-y-2">
                            <Label htmlFor="platformUrl">Channel URL</Label>
                            <Input id="platformUrl" name="platformUrl" type="url" placeholder="https://twitch.tv/yourchannel" required />
                        </div>
                    </div>
                    <SubmitButton>Add My Profile</SubmitButton>
                </form>
            </CardContent>
        </Card>
    );
}

function CreatorOnboarding({ unassignedStreamers, userId }: { unassignedStreamers: Streamer[], userId: string }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Welcome, Creator!</CardTitle>
                <CardDescription>
                    It looks like you don't have any streamer profiles assigned to your account yet.
                    You can either claim an existing unassigned profile or add a new one to get started.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {unassignedStreamers.length > 0 && (
                        <AccordionItem value="claim">
                            <AccordionTrigger className="text-lg font-semibold">
                                <div className="flex items-center gap-2">
                                   <ChevronRight className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                                   Option 1: Claim an Existing Profile
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4">
                                <ClaimProfileForm unassignedStreamers={unassignedStreamers} userId={userId} />
                            </AccordionContent>
                        </AccordionItem>
                    )}
                    <AccordionItem value="add">
                        <AccordionTrigger className="text-lg font-semibold">
                             <div className="flex items-center gap-2">
                                <ChevronRight className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                                Option {unassignedStreamers.length > 0 ? '2' : '1'}: Add a New Profile
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                            <AddStreamerCreatorForm userId={userId} />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
}


function CreatorPageComponent({ allStreamers, allMedia }: { allStreamers: Streamer[], allMedia: MediaItem[] }) {
    const { user } = useAuth();
    
    if (!user) {
        return null; // Should be handled by withCreatorAuth, but as a fallback.
    }

    const userStreamerProfiles = allStreamers.filter(s => s.discordUserId === user.uid);
    const unassignedStreamers = allStreamers.filter(s => !s.discordUserId);
    const userMedia = allMedia.filter(m => m.creator.toLowerCase() === user.displayName?.toLowerCase());

  return (
    <div className="container mx-auto py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-headline">Creator Dashboard</h1>
            <p className="flex items-center gap-2 mt-2 text-muted-foreground">
                <User /> Managing content as <span className="font-semibold text-foreground">{user?.displayName}</span>
            </p>
        </div>


        <Tabs defaultValue={userStreamerProfiles.length > 0 ? "media" : "onboarding"} className="w-full">
            <TabsList className={cn("grid w-full", userStreamerProfiles.length > 0 ? "grid-cols-2" : "hidden")}>
                <TabsTrigger value="media">Manage Media</TabsTrigger>
                <TabsTrigger value="schedule">Manage Schedules</TabsTrigger>
            </TabsList>
            
            <TabsContent value="onboarding" className={cn(userStreamerProfiles.length > 0 ? 'hidden' : 'block', 'mt-6 space-y-6')}>
                 <CreatorOnboarding unassignedStreamers={unassignedStreamers} userId={user.uid} />
            </TabsContent>

            <TabsContent value="media" className="space-y-6 mt-6">
                <AddMediaForm />
                <MediaList media={userMedia} />
            </TabsContent>
            <TabsContent value="schedule" className="space-y-6 mt-6">
                <OneTimeEventManager userStreamerProfiles={userStreamerProfiles} />
                {userStreamerProfiles.map(profile => <RecurringScheduleManager key={profile.id} streamer={profile} />)}
            </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}

export default withCreatorAuth(CreatorPageComponent);
