"use client";
import React from 'react';

export default function Lightbox({ src, alt, onClose }: { src: string; alt?: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="max-w-[95vw] max-h-[95vh]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="max-w-full max-h-full rounded shadow-lg" />
      </div>
    </div>
  );
}
