# Gallery backend progress
## Done (all tasks 1-10)
- Tables gallery_album/gallery_photo, migration 0010 (applied to :3307). ISODate import fix in contract/gallery.ts; added GalleryFileQuery.
- src/server/media/image.ts; services/gallery-store.ts; portal/gallery.ts (portal.gallery); public gallery.ts native albums; CACHE_TAGS.gallery.
- API routes admin/gallery/{photos,photos/bulk,photos/[id],edit,approve,reject,file,albums,albums/[id]}.
- Bot flow bot/gallery.ts + engine wiring + copy; sim inbound decodes media.data.
- Proxy probe /gallery/<slug>, sitemap.
- CONTRACT v0.9.5. Tests: gallery-{image,review,editor,public,intake}, gallery.db.integration, proxy.
## DoD
typecheck (non-frontend) clean, lint 0 errors, pnpm test 48 files / 453+ pass.
## Decisions
- Port addition: AdminGalleryService.withdraw (for "Not for the gallery").
- revert bumps revision; public name gallery/<id>-r<rev>.jpg; first approved photo auto-cover.
- bot acks each extra photo in batch ("Added. N so far").
## Open
- No retention purge of rejected/orphaned originals; cancel/timeout leaves pending photos without album.
- Hindi bot copy agent-written.
