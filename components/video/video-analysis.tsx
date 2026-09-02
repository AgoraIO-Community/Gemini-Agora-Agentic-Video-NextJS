'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ANALYSIS_STATES = [
  'Uploading video...',
  'Preparing video...',
  'Gemini is exploring the video...',
  'Finding important moments...',
];

type VideoAnalysisPanelProps = {
  canAnalyze: boolean;
  isAnalyzing: boolean;
  statusIndex: number;
  error: string | null;
  onAnalyze: () => void;
};

export function VideoAnalysisPanel({
  canAnalyze,
  isAnalyzing,
  statusIndex,
  error,
  onAnalyze,
}: VideoAnalysisPanelProps) {
  const status = ANALYSIS_STATES[Math.min(statusIndex, ANALYSIS_STATES.length - 1)];

  return (
    <div className="rounded-lg border border-border bg-card/30 p-4">
      <Button
        type="button"
        onClick={onAnalyze}
        disabled={!canAnalyze || isAnalyzing}
        className="h-10 w-full rounded-lg border border-primary bg-primary text-sm font-medium text-black hover:border-white hover:bg-white disabled:hover:border-primary disabled:hover:bg-primary"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyze Video
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Analyze Video
          </>
        )}
      </Button>
      {isAnalyzing && <p className="mt-3 text-sm text-muted-foreground">{status}</p>}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
