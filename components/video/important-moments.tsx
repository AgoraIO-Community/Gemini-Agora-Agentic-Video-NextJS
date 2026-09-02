'use client';

import { Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VideoAnalysis } from '@/types/video-analysis';

type ImportantMomentsProps = {
  analysis: VideoAnalysis | null;
  onSeek: (seconds: number) => void;
};

export function ImportantMoments({ analysis, onSeek }: ImportantMomentsProps) {
  if (!analysis) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-card/20 p-4">
        <h2 className="text-sm font-semibold text-foreground">Important Moments</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Gemini will summarize the clip and surface timestamped moments here.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card/30 p-4">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-primary" />
        <h2 className="text-sm font-semibold text-foreground">Video understood</h2>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">Summary</p>
        <p className="mt-2 text-sm leading-6 text-foreground">{analysis.summary}</p>
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Important Moments
        </p>
        {analysis.moments.map((moment) => (
          <Button
            key={`${moment.timestampLabel}-${moment.title}`}
            type="button"
            variant="ghost"
            className="h-auto w-full justify-start rounded-lg border border-border bg-background/50 p-3 text-left hover:bg-secondary"
            onClick={() => onSeek(moment.timestampSeconds)}
          >
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-primary">
                {moment.timestampLabel}
              </span>
              <span className="block text-sm font-semibold text-foreground">
                {moment.title}
              </span>
              <span className="mt-1 block whitespace-normal text-sm font-normal leading-5 text-muted-foreground">
                {moment.description}
              </span>
            </span>
          </Button>
        ))}
      </div>
    </section>
  );
}
