"use client";

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Lightbox from '@/components/ui/lightbox';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

export default function ImageCarousel({ imageUrls, title, eventId }: { imageUrls: string[]; title: string; eventId?: string }) {
  if (!imageUrls || imageUrls.length === 0) return null;
  const [openSrc, setOpenSrc] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      setIsMobile(window.matchMedia('(max-width: 640px)').matches);
      const m = window.matchMedia('(max-width: 640px)');
      const fn = (ev: MediaQueryListEvent) => setIsMobile(ev.matches);
      m.addEventListener('change', fn);
      return () => m.removeEventListener('change', fn);
    } catch {
      // noop in SSR environments
    }
  }, []);

  const openImage = (url: string, idx: number) => {
    if (isMobile && eventId) {
      router.push(`/events/${eventId}/image?index=${idx}`);
      return;
    }
    setOpenSrc(url);
  };

  if (imageUrls.length === 1) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-lg mb-8 shadow-lg bg-secondary">
        <button type="button" onClick={() => openImage(imageUrls[0], 0)} className="w-full h-full">
          <Image src={imageUrls[0]} alt={title} fill className="object-cover" data-ai-hint="gaming event" />
        </button>
        {openSrc && <Lightbox src={openSrc} alt={title} onClose={() => setOpenSrc(null)} />}
      </div>
    );
  }

  return (
    <Carousel className="w-full mb-8">
      <CarouselContent>
        {imageUrls.map((url, index) => (
          <CarouselItem key={index}>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg shadow-lg bg-secondary">
              <button type="button" onClick={() => openImage(url, index)} className="w-full h-full">
                <Image src={url} alt={`${title} - Image ${index + 1}`} fill className="object-cover" data-ai-hint="gaming event" />
              </button>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-4" />
      <CarouselNext className="right-4" />
      {openSrc && <Lightbox src={openSrc} alt={title} onClose={() => setOpenSrc(null)} />}
    </Carousel>
  );
}
