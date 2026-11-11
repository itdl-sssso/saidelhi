"use client";

// Resumable (tus) uploads straight to the video provider. The server hands out a one-time
// upload URL (POST /admin/videos); we keep it in localStorage so a reloaded page can resume
// after the same file is picked again. Chunks are 50 MB; failed chunks retry with back-off.
import { useCallback, useEffect, useRef, useState } from "react";
import { Upload } from "tus-js-client";
import { VIDEO_LIMITS } from "@/contract";

export type UploadPhase = "uploading" | "paused" | "failed" | "done";
export interface UploadProgress {
  phase: UploadPhase;
  sent: number;
  total: number;
}

const KEY = (id: string) => `video-upload:${id}`;
const read = (id: string): string | null => {
  try {
    return localStorage.getItem(KEY(id));
  } catch {
    return null;
  }
};
const write = (id: string, url: string | null) => {
  try {
    if (url) localStorage.setItem(KEY(id), url);
    else localStorage.removeItem(KEY(id));
  } catch {
    /* private mode: resume after reload is simply unavailable */
  }
};

/** True when this browser still holds the upload URL of a half-sent video. */
export const canResume = (id: string) => read(id) !== null;

export function useVideoUploads(onDone: (videoId: string) => void) {
  const [progress, setProgress] = useState<Record<string, UploadProgress>>({});
  const uploads = useRef(new Map<string, Upload>());
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  const set = useCallback((id: string, p: UploadProgress) => setProgress((s) => ({ ...s, [id]: p })), []);

  const start = useCallback(
    (videoId: string, file: File, uploadUrl: string) => {
      write(videoId, uploadUrl);
      const total = file.size;
      const up = new Upload(file, {
        uploadUrl,
        chunkSize: VIDEO_LIMITS.chunkBytes,
        retryDelays: [0, 3000, 5000, 10000, 20000, 30000],
        metadata: { filename: file.name, filetype: file.type },
        removeFingerprintOnSuccess: true,
        onProgress: (sent) => set(videoId, { phase: "uploading", sent, total }),
        onSuccess: () => {
          write(videoId, null);
          uploads.current.delete(videoId);
          set(videoId, { phase: "done", sent: total, total });
          doneRef.current(videoId);
        },
        onError: () => setProgress((s) => ({ ...s, [videoId]: { phase: "failed", sent: s[videoId]?.sent ?? 0, total } })),
      });
      uploads.current.set(videoId, up);
      set(videoId, { phase: "uploading", sent: 0, total });
      // Continue from where the server stopped (HEAD), if anything was already sent.
      up.start();
    },
    [set],
  );

  /** Re-pick the same file after a reload or failure. */
  const resume = useCallback(
    (videoId: string, file: File): boolean => {
      const url = read(videoId);
      if (!url) return false;
      uploads.current.get(videoId)?.abort();
      start(videoId, file, url);
      return true;
    },
    [start],
  );

  const pause = useCallback(
    (id: string) => {
      const up = uploads.current.get(id);
      if (!up) return;
      void up.abort();
      setProgress((s) => (s[id] ? { ...s, [id]: { ...s[id], phase: "paused" } } : s));
    },
    [],
  );

  const unpause = useCallback((id: string) => {
    const up = uploads.current.get(id);
    if (!up) return;
    setProgress((s) => (s[id] ? { ...s, [id]: { ...s[id], phase: "uploading" } } : s));
    up.start();
  }, []);

  const cancel = useCallback((id: string) => {
    void uploads.current.get(id)?.abort();
    uploads.current.delete(id);
    write(id, null);
    setProgress((s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== id)));
  }, []);

  const active = Object.values(progress).some((p) => p.phase === "uploading");
  // Closing the tab mid-upload loses nothing already sent, but the browser should ask first.
  useEffect(() => {
    if (!active) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [active]);

  return { progress, start, resume, pause, unpause, cancel, active };
}
