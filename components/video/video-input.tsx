'use client';

import { ChangeEvent, useRef } from 'react';
import { FileVideo, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoRecorder } from './video-recorder';

type VideoInputProps = {
  file: File | null;
  duration: number | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function formatDuration(seconds: number | null) {
  if (!seconds || Number.isNaN(seconds)) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VideoInput({ file, duration, onSelect, onRemove }: VideoInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) onSelect(selected);
    event.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed border-border bg-card/20 p-4">
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/webm"
          className="hidden"
          onChange={handleChange}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <FileVideo className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">Video</h2>
              {file ? (
                <p className="truncate text-sm text-muted-foreground">{file.name}</p>
              ) : (
                <p className="text-sm text-muted-foreground">MP4 or WebM, up to 100MB.</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {file ? 'Replace' : 'Upload'}
            </Button>
            {file && (
              <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remove video</span>
              </Button>
            )}
          </div>
        </div>

        {file && (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Type</dt>
              <dd className="mt-1 text-foreground">{file.type || 'video'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Size</dt>
              <dd className="mt-1 text-foreground">{formatBytes(file.size)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Duration</dt>
              <dd className="mt-1 text-foreground">{formatDuration(duration) ?? 'Loading'}</dd>
            </div>
          </dl>
        )}
      </div>
      <VideoRecorder onRecorded={onSelect} />
    </div>
  );
}
