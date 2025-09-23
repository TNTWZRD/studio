import { getEventById } from '@/lib/data';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function EventImagePage({ params, searchParams }: { params: { id: string }, searchParams: { index?: string } }) {
  const id = params.id;
  const event = await getEventById(id);
  if (!event) return notFound();

  const imageUrls = event.imageUrls?.length ? event.imageUrls : (event.image ? [event.image] : []);
  const idx = parseInt(searchParams.index || '0', 10);
  const safeIdx = isNaN(idx) ? 0 : Math.max(0, Math.min(idx, imageUrls.length - 1));
  const src = imageUrls[safeIdx];
  if (!src) return notFound();

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <div className="p-4 z-20">
        <Link href={`/events/${id}`} className="inline-block rounded bg-white/10 px-3 py-1">
          Back
        </Link>
      </div>
      <div className="flex-1 relative">
        <Image src={src} alt={event.title} fill className="object-contain" />
      </div>
    </div>
  );
}
