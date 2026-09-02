'use client';

import { forwardRef } from 'react';

type VideoPlayerProps = {
  src: string | null;
};

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ src }, ref) => {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
        {src ? (
          <video
            ref={ref}
            src={src}
            controls
            playsInline
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Upload or record a short clip to preview it here.
          </div>
        )}
      </div>
    );
  },
);

VideoPlayer.displayName = 'VideoPlayer';
