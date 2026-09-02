'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { RTMClient } from 'agora-rtm';
import { MessageCircle, Play } from 'lucide-react';
import type {
  AgoraRenewalTokens,
  AgoraTokenData,
  AgentResponse,
  ClientStartRequest,
} from '../types/conversation';
import type { AnalyzeVideoResponse, VideoAnalysis } from '@/types/video-analysis';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingSkeleton } from './LoadingSkeleton';
import { Button } from './ui/button';
import { ImportantMoments } from './video/important-moments';
import { VideoAnalysisPanel } from './video/video-analysis';
import { VideoInput } from './video/video-input';
import { VideoPlayer } from './video/video-player';

const ConversationComponent = dynamic(() => import('./ConversationComponent'), {
  ssr: false,
});

const AgoraProvider = dynamic(
  async () => {
    const { AgoraRTCProvider, default: AgoraRTC } =
      await import('agora-rtc-react');
    return {
      default: function AgoraProviders({
        children,
      }: {
        children: React.ReactNode;
      }) {
        const clientRef = useRef<ReturnType<
          typeof AgoraRTC.createClient
        > | null>(null);
        if (!clientRef.current) {
          clientRef.current = AgoraRTC.createClient({
            mode: 'rtc',
            codec: 'vp8',
          });
        }
        return (
          <AgoraRTCProvider client={clientRef.current}>
            {children}
          </AgoraRTCProvider>
        );
      },
    };
  },
  { ssr: false },
);

const QUESTION_SUGGESTIONS = [
  'What happened here?',
  'What are the most important moments?',
  'Where did something go wrong?',
  'Show me when that happened.',
  'What should I pay attention to?',
  'What changed during the video?',
];

export default function LandingPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisStatusIndex, setAnalysisStatusIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [agoraData, setAgoraData] = useState<AgoraTokenData | null>(null);
  const [rtmClient, setRtmClient] = useState<RTMClient | null>(null);
  const [agentJoinError, setAgentJoinError] = useState(false);

  useEffect(() => {
    import('agora-rtc-react').catch(() => {});
    import('agora-rtm').catch(() => {});
  }, []);

  useEffect(() => {
    if (!videoFile) {
      setVideoUrl(null);
      setVideoDuration(null);
      return;
    }

    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  useEffect(() => {
    if (!isAnalyzing) return;
    const id = window.setInterval(() => {
      setAnalysisStatusIndex((index) => Math.min(index + 1, 3));
    }, 2400);
    return () => window.clearInterval(id);
  }, [isAnalyzing]);

  const handleSelectVideo = (file: File) => {
    setVideoFile(file);
    setAnalysis(null);
    setAnalysisError(null);
    setShowConversation(false);
    setAgoraData(null);
    setRtmClient(null);
    setVideoDuration(null);
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setAnalysis(null);
    setAnalysisError(null);
    setShowConversation(false);
  };

  const handleAnalyzeVideo = async () => {
    if (!videoFile) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisStatusIndex(0);
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      const response = await fetch('/api/video/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = (await response.json()) as
        | AnalyzeVideoResponse
        | { error?: string };
      if (!response.ok) {
        throw new Error(
          'error' in data && data.error ? data.error : 'Video analysis failed.',
        );
      }
      setAnalysis(data as AnalyzeVideoResponse);
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : 'Video analysis failed.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const seekVideo = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, seconds);
    video.play().catch(() => {});
  }, []);

  const handleStartConversation = async () => {
    if (!analysis) return;
    setIsLoadingConversation(true);
    setConversationError(null);
    setAgentJoinError(false);

    try {
      const agoraResponse = await fetch('/api/generate-agora-token');
      const responseData = await agoraResponse.json();

      if (!agoraResponse.ok) {
        throw new Error('Failed to generate Agora token.');
      }

      const [agentData, rtm] = await Promise.all([
        fetch('/api/invite-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requester_id: responseData.uid,
            channel_name: responseData.channel,
            video_analysis: analysis,
          } satisfies ClientStartRequest),
        })
          .then(async (res) => {
            if (!res.ok) {
              setAgentJoinError(true);
              return null;
            }
            return res.json() as Promise<AgentResponse>;
          })
          .catch((err) => {
            console.error('Failed to start conversation with agent:', err);
            setAgentJoinError(true);
            return null;
          }),
        (async () => {
          const { default: AgoraRTM } = await import('agora-rtm');
          const rtm: RTMClient = new AgoraRTM.RTM(
            process.env.NEXT_PUBLIC_AGORA_APP_ID!,
            responseData.uid,
          );
          await rtm.login({ token: responseData.token });
          await rtm.subscribe(responseData.channel);
          return rtm;
        })(),
      ]);

      setRtmClient(rtm);
      setAgoraData({ ...responseData, agentId: agentData?.agent_id });
      setShowConversation(true);
    } catch (error) {
      setConversationError('Failed to start conversation. Please check Agora configuration.');
      console.error('Error starting conversation:', error);
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const handleTokenWillExpire = useCallback(
    async (uid: string): Promise<AgoraRenewalTokens> => {
      const channel = agoraData?.channel;
      if (!channel) throw new Error('Missing channel for token renewal');

      const [rtcResponse, rtmResponse] = await Promise.all([
        fetch(`/api/generate-agora-token?channel=${channel}&uid=${uid}`),
        fetch(`/api/generate-agora-token?channel=${channel}&uid=${agoraData.uid}`),
      ]);
      const [rtcData, rtmData] = await Promise.all([
        rtcResponse.json(),
        rtmResponse.json(),
      ]);

      if (!rtcResponse.ok || !rtmResponse.ok) {
        throw new Error('Failed to generate renewal tokens');
      }

      return {
        rtcToken: rtcData.token,
        rtmToken: rtmData.token,
      };
    },
    [agoraData],
  );

  const handleEndConversation = async () => {
    if (agoraData?.agentId) {
      try {
        const response = await fetch('/api/stop-conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agoraData.agentId }),
        });
        if (!response.ok) {
          console.error('Failed to stop agent:', await response.text());
        }
      } catch (error) {
        console.error('Error stopping agent:', error);
      }
    }

    rtmClient?.logout().catch((err) => console.error('RTM logout error:', err));
    setRtmClient(null);
    setShowConversation(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
        <header className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/agora-logo-mark.svg"
                alt="Agora"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
              <p className="text-sm font-semibold text-primary">Agora x Gemini</p>
            </div>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-foreground md:text-4xl">
              Agentic Video + Voice AI
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              Watch -&gt; Understand -&gt; Talk
            </p>
          </div>
          <div className="max-w-xl text-sm leading-6 text-muted-foreground">
            Agora handles the real-time conversation. Gemini understands the
            recorded clip and gives the voice agent grounded moments to discuss.
          </div>
        </header>

        <div className="grid min-h-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,0.9fr)]">
          <section className="space-y-4">
            <VideoPlayer ref={videoRef} src={videoUrl} />
            <video
              src={videoUrl ?? undefined}
              className="hidden"
              onLoadedMetadata={(event) =>
                setVideoDuration(event.currentTarget.duration)
              }
            />
            <VideoInput
              file={videoFile}
              duration={videoDuration}
              onSelect={handleSelectVideo}
              onRemove={handleRemoveVideo}
            />
            <VideoAnalysisPanel
              canAnalyze={!!videoFile}
              isAnalyzing={isAnalyzing}
              statusIndex={analysisStatusIndex}
              error={analysisError}
              onAnalyze={handleAnalyzeVideo}
            />
            <ImportantMoments analysis={analysis} onSeek={seekVideo} />
          </section>

          <section className="flex min-h-[42rem] flex-col rounded-lg border border-border bg-card/20">
            {!showConversation ? (
              <div className="flex min-h-full flex-1 flex-col justify-between p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">
                      Talk to this video
                    </h2>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Analyze a clip first, then start the Agora voice agent and ask
                    about what Gemini found.
                  </p>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {QUESTION_SUGGESTIONS.map((suggestion) => (
                      <div
                        key={suggestion}
                        className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-muted-foreground"
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <Button
                    type="button"
                    onClick={handleStartConversation}
                    disabled={!analysis || isLoadingConversation}
                    className="h-10 w-full rounded-lg border border-primary bg-primary text-sm font-medium text-black hover:border-white hover:bg-white disabled:hover:border-primary disabled:hover:bg-primary"
                  >
                    <Play className="h-4 w-4" />
                    {isLoadingConversation ? 'Starting...' : 'Talk to this video'}
                  </Button>
                  {conversationError && (
                    <p className="mt-3 text-sm text-destructive">{conversationError}</p>
                  )}
                </div>
              </div>
            ) : agoraData && rtmClient ? (
              <>
                {agentJoinError && (
                  <div className="m-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    Agora agent invitation failed. Check server logs and
                    environment configuration.
                  </div>
                )}
                <Suspense fallback={<LoadingSkeleton />}>
                  <ErrorBoundary>
                    <AgoraProvider>
                      <ConversationComponent
                        agoraData={agoraData}
                        rtmClient={rtmClient}
                        onTokenWillExpire={handleTokenWillExpire}
                        onEndConversation={handleEndConversation}
                        onTimestampClick={seekVideo}
                      />
                    </AgoraProvider>
                  </ErrorBoundary>
                </Suspense>
              </>
            ) : (
              <p className="p-5 text-sm text-muted-foreground">
                Failed to load conversation data.
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
