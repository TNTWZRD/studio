'use client';

import { Button } from '@/components/ui/button';
import { getConfig } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Config } from '@/lib/types';
import { ArrowDown, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Hero() {
  const [config, setConfig] = useState<Config | null>(null);
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero');

  useEffect(() => {
    async function fetchConfig() {
      const appConfig = await getConfig();
      setConfig(appConfig);
    }
    fetchConfig();
  }, []);

  return (
    <section className="relative h-[50vh] min-h-[400px] w-full text-primary-foreground sm:h-[50vh] md:h-[50vh]">
      {heroImage && (
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          data-ai-hint={heroImage.imageHint}
          fill
          className="object-cover"
          priority
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
        <div className="container max-w-4xl space-y-6">
          <h1 className="font-headline text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            The Center of Your Gaming Community
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-primary-foreground/80 md:text-xl">
            Welcome to Team AMW (Americas Most Wanted). Discover live streams, join events, and connect with a passionate community of gamers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {config && (
              <Button asChild size="lg" variant="default" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <a href={config.discordInviteUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2" /> Join Our Discord
                </a>
              </Button>
            )}
            <Button asChild size="lg" variant="secondary">
              <Link href="#about">
                Learn More <ArrowDown className="ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
