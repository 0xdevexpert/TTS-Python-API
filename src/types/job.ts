
export interface Job {
  jobId: string;
  status: string;
  text: string;
  fetchingAudio: boolean;
  audioUrl: string | null;
  error: string | null;
}
