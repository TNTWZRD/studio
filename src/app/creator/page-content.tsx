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
import { Trash2, PlusCircle, MinusCircle, Edit } from 'lucide-react';
import { addMedia, removeMedia, updateMedia } from '../actions/manage-media';
import { useAuth } from '@/hooks/use-auth';
import { updateSchedule } from '../actions/manage-streamers';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';


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

function ScheduleManager({ streamer }: { streamer: Streamer }) {
    const { toast } = useToast();
    const [schedule, setSchedule] = useState(streamer.schedule || []);

    const [state, formAction] = useActionState(updateSchedule, {
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

    const handleAddSlot = () => {
        setSchedule([...schedule, { day: 'Sunday', time: '8:00 PM EST' }]);
    };
    
    const handleRemoveSlot = (index: number) => {
        setSchedule(schedule.filter((_, i) => i !== index));
    };

    const handleScheduleChange = (index: number, field: 'day' | 'time', value: string) => {
        const newSchedule = [...schedule];
        newSchedule[index] = { ...newSchedule[index], [field]: value };
        setSchedule(newSchedule);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Your Stream Schedule</CardTitle>
                <CardDescription>Let the community know when you'll be live. All times are for display only.</CardDescription>
            </CardHeader>
            <CardContent>
                 <form action={formAction} className="space-y-4">
                    <input type="hidden" name="streamerId" value={streamer.id} />
                    <input type="hidden" name="schedule" value={JSON.stringify(schedule)} />

                    <div className="space-y-4">
                    {schedule.map((slot, index) => (
                        <div key={index} className="flex flex-col md:flex-row items-center gap-2">
                             <Select
                                value={slot.day}
                                onValueChange={(value) => handleScheduleChange(index, 'day', value)}
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
                                onChange={(e) => handleScheduleChange(index, 'time', e.target.value)}
                            />
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveSlot(index)} type="button">
                                <MinusCircle className="text-destructive"/>
                            </Button>
                        </div>
                    ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" type="button" onClick={handleAddSlot}>
                            <PlusCircle className="mr-2"/>
                            Add Time Slot
                        </Button>
                        <SubmitButton variant="default">Save Schedule</SubmitButton>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}

function CreatorPageComponent({ allStreamers, allMedia }: { allStreamers: Streamer[], allMedia: MediaItem[] }) {
    const { user } = useAuth();

    // Find the streamer profile that matches the logged-in user. This is a simple name match.
    const userStreamerProfile = allStreamers.find(s => s.name.toLowerCase() === user?.displayName?.toLowerCase());
    const userMedia = allMedia.filter(m => m.creator.toLowerCase() === user?.displayName?.toLowerCase());

  return (
    <div className="container mx-auto py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-headline">Creator Dashboard</h1>

        <Tabs defaultValue="media" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="media">Manage Media</TabsTrigger>
            <TabsTrigger value="schedule">Manage Schedule</TabsTrigger>
          </TabsList>
          <TabsContent value="media" className="space-y-6 mt-6">
            <AddMediaForm />
            <MediaList media={userMedia} />
          </TabsContent>
          <TabsContent value="schedule" className="space-y-6 mt-6">
            {userStreamerProfile ? (
                 <ScheduleManager streamer={userStreamerProfile} />
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Schedule Not Available</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">We couldn't find a streamer profile matching your Discord name ({user?.displayName}). Please ensure your name matches exactly with the streamer list, or contact an admin.</p>
                    </CardContent>
                </Card>
            )}
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}

export default withCreatorAuth(CreatorPageComponent);
