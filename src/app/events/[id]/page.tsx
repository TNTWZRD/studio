import { getDiscordEventById } from '@/lib/discord';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const event = await getDiscordEventById(params.id);

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

        <Badge variant={event.status === 'active' ? 'destructive' : 'secondary'} className="capitalize mb-2">{event.status}</Badge>

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
                <MapPin className="mr-3 h-5 w-5" />
                <span>{event.location}</span>
            </div>
        </div>
        
        {event.description && (
            <div className="prose dark:prose-invert max-w-none text-lg text-foreground/80 mb-12">
                <p>{event.description.replace(/\n/g, '<br />')}</p>
            </div>
        )}
      </div>
    </div>
  );
}
