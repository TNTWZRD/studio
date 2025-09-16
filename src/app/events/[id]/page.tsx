import { getEventById } from '@/lib/data';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const event = getEventById(params.id);

  if (!event) {
    notFound();
  }

  return (
    <div className="container mx-auto py-12">
      <div className="max-w-4xl mx-auto">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg mb-8 shadow-lg">
            <Image 
                src={event.image}
                alt={event.title}
                fill
                className="object-cover"
                data-ai-hint="gaming event"
            />
        </div>

        <Badge variant={event.status === 'live' ? 'destructive' : 'secondary'} className="capitalize mb-2">{event.status}</Badge>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-headline mb-4">{event.title}</h1>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground mb-8">
            <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                <span>{format(new Date(event.start), 'MMMM d, yyyy, p')}</span>
            </div>
            <div className="flex items-center">
                <Users className="mr-2 h-4 w-4" />
                <span>{event.participants.map(p => p.name).join(', ')}</span>
            </div>
        </div>

        <div className="prose dark:prose-invert max-w-none text-lg text-foreground/80 mb-12">
            <p>{event.details}</p>
        </div>

        {event.scoreboard && event.scoreboard.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Scoreboard</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
