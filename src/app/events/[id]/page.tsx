import { getEventById } from '@/lib/data';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const event = await getEventById(params.id);

  if (!event) {
    notFound();
  }

  const startDate = new Date(event.start);
  const formattedStartDate = isNaN(startDate.getTime()) ? 'TBD' : format(startDate, 'MMMM d, yyyy');
  const formattedStartTime = isNaN(startDate.getTime()) ? '' : format(startDate, 'p');
  
  const endDate = event.end ? new Date(event.end) : null;
  const formattedEndTime = endDate && !isNaN(endDate.getTime()) ? format(endDate, 'p') : null;


  return (
    <div className="container mx-auto py-12">
      <div className="max-w-4xl mx-auto">
        {event.image && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg mb-8 shadow-lg bg-secondary">
                <Image 
                    src={event.image}
                    alt={event.title}
                    fill
                    className="object-cover"
                    data-ai-hint="gaming event"
                />
            </div>
        )}

        <Badge variant={event.status === 'live' ? 'destructive' : 'secondary'} className="capitalize mb-2">{event.status}</Badge>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-headline mb-4">{event.title}</h1>

        <div className="flex flex-wrap gap-x-6 gap-y-4 text-muted-foreground mb-8 text-lg">
            <div className="flex items-center">
                <Calendar className="mr-3 h-5 w-5" />
                <span>{formattedStartDate}</span>
            </div>
             {formattedStartTime && (
                <div className="flex items-center">
                    <Clock className="mr-3 h-5 w-5" />
                    <span>{formattedStartTime} {formattedEndTime && ` - ${formattedEndTime}`}</span>
                </div>
             )}
            <div className="flex items-center">
                <Users className="mr-3 h-5 w-5" />
                <span>{event.participants.length} participants</span>
            </div>
        </div>
        
        {event.details && (
            <div className="prose dark:prose-invert max-w-none text-lg text-foreground/80 mb-12">
                <p>{event.details.replace(/\n/g, '<br />')}</p>
            </div>
        )}

        {event.status === 'past' && event.scoreboard && event.scoreboard.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold mb-4 font-headline">Scoreboard</h2>
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
          </div>
        )}
      </div>
    </div>
  );
}
