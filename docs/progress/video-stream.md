# video-stream (Cloudflare Stream) progress

Branch feat/cloudflare-stream (stacked on PR #19).

## Done
- Docs read (tus direct_user upload, webhook sig = HMAC-SHA256 `time.body`, captions PUT vtt, thumbnails, iframe).
- contract: `video.ts` (AdminVideo, VideoCreate/Patch, limits), `ArticleVideo` union youtube|cloudflare, `cf:<id>` ref helpers, endpoints.
- env + .env.example (VIDEO_PROVIDER, CLOUDFLARE_*).
- providers/video: types, cloudflare, mock, vtt, index.
- migration 0013: `video` doc table + widen `article_i18n.video_id` to varchar(40).

## Decisions
- Ref stored as `cf:<videoId>` in existing video slot (native article JSON `video`, side table `video_id`). Side column widened 16 -> 40 (article_i18n is our own table, not legacy).
- Permission reuse: `content.edit`.
- No CSP restricting frames/img/connect exists (only frame-ancestors etc.), so nothing to allow.
- Signed URLs not used: videos public (requireSignedURLs false).

## Next
services (portal/videos, hydrate public), routes, UI, i18n, tests, browser check.

## Done (cont.)
- services (portal/videos, video-store public resolver), routes (admin, webhook, dev tus), UI (/admin/videos, editor picker, public player), messages EN+HI (HI agent-written), CONTRACT v0.11, tests/video-stream.test.ts.
- typecheck, lint (0 errors), vitest 534 pass; migration 0013 applied; browser check on :4300 (mock): upload 3 MB via tus, attach to article, public page 1280 + 375 OK.

## Gaps
- Not run against real Cloudflare (no creds). Header `stream-media-id` assumed from API behaviour, falls back to Location path.
- Resume after reload only in same browser (tus URL kept in localStorage).
- Videos are public (no signed URLs). Cards use posterUrl unoptimised.
- Captions: only after ready; no delete-caption UI.
