'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Circle, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

type VideoRecorderProps = {
  onRecorded: (file: File) => void;
};

const RECORDING_MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
];

function getSupportedRecordingMimeType() {
  return (
    RECORDING_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ??
    ''
  );
}

function getExtension(mimeType: string) {
  return mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
}

export function VideoRecorder({ onRecorded }: VideoRecorderProps) {
  const previewRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview || !isCameraOpen || !streamRef.current) return;

    preview.srcObject = streamRef.current;
    return () => {
      preview.srcObject = null;
    };
  }, [isCameraOpen]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsCameraOpen(false);
  };

  const openCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
    } catch {
      setError('Camera permission was denied or no camera is available.');
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = getSupportedRecordingMimeType();
    const recorder = new MediaRecorder(
      streamRef.current,
      mimeType ? { mimeType } : undefined,
    );
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const recordedType = recorder.mimeType || mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, {
        type: recordedType,
      });
      const file = new File(
        [blob],
        `recording-${Date.now()}.${getExtension(recordedType)}`,
        { type: recordedType },
      );
      onRecorded(file);
      stopCamera();
    };
    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="rounded-lg border border-border bg-card/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Record a short clip</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            For the fastest demo, record 10-60 seconds.
          </p>
        </div>
        <div className="flex gap-2">
          {!isCameraOpen ? (
            <Button type="button" variant="outline" size="sm" onClick={openCamera}>
              <Camera className="h-4 w-4" />
              Open Camera
            </Button>
          ) : isRecording ? (
            <Button type="button" variant="destructive" size="sm" onClick={stopRecording}>
              <Square className="h-4 w-4" />
              Stop
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={startRecording}>
              <Circle className="h-4 w-4" />
              Record
            </Button>
          )}
        </div>
      </div>
      {isCameraOpen && (
        <video
          ref={previewRef}
          autoPlay
          muted
          playsInline
          className="mt-4 aspect-video w-full rounded-lg border border-border bg-black object-cover"
        />
      )}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
