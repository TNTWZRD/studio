'use client';

import { withAdminAuth } from '@/components/auth/with-admin-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getStreamers } from '@/lib/data';
import type { Streamer } from '@/lib/types';
import { useFormState, useFormStatus } from 'react-dom';
import { addStreamer, removeStreamer } from '../actions/manage-streamers';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trash2 } from 'lucide-react';

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving...' : children}
    </Button>
  );
}

function AddStreamerForm() {
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction] = useFormState(addStreamer, {
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
     const [state, formAction] = useFormState(removeStreamer, {
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

function StreamerList() {
    const allStreamers = getStreamers();
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
                        {allStreamers.map((streamer: Streamer) => (
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


function AdminPage() {
  return (
    <div className="container mx-auto py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-headline">Admin Dashboard</h1>

        <AddStreamerForm />
        <StreamerList />

      </div>
    </div>
  );
}

export default withAdminAuth(AdminPage);
