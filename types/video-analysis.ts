export type VideoMoment = {
  timestampSeconds: number;
  timestampLabel: string;
  title: string;
  description: string;
};

export type VideoAnalysis = {
  summary: string;
  moments: VideoMoment[];
  context: string;
};

export type AnalyzeVideoResponse = VideoAnalysis & {
  file: {
    name: string;
    type: string;
    size: number;
  };
};
