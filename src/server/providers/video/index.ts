import "server-only";
import { env } from "../../env";
import { CloudflareStream } from "./cloudflare";
import { MockVideo } from "./mock";
import type { VideoProvider } from "./types";

export type { CreateUploadInput, CreateUploadResult, RemoteState, RemoteVideo, VideoProvider, VideoWebhookEvent } from "./types";
export { CloudflareStream, verifyStreamSignature } from "./cloudflare";
export { MockVideo, mockUploads } from "./mock";
export { toVtt } from "./vtt";

let cached: VideoProvider | undefined;

/** Provider selected by VIDEO_PROVIDER (env() already checked the CLOUDFLARE_* vars for `cloudflare`). */
export function video(): VideoProvider {
  if (cached) return cached;
  const e = env();
  cached =
    e.VIDEO_PROVIDER === "cloudflare"
      ? new CloudflareStream({
          accountId: e.CLOUDFLARE_ACCOUNT_ID ?? "",
          apiToken: e.CLOUDFLARE_STREAM_API_TOKEN ?? "",
          customerCode: e.CLOUDFLARE_STREAM_CUSTOMER_CODE ?? "",
          webhookSecret: e.CLOUDFLARE_STREAM_WEBHOOK_SECRET ?? "",
        })
      : new MockVideo();
  return cached;
}
