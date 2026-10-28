# 52 — Gallery (public + portal + WhatsApp intake)

Priority P1. Contract: `src/contract/gallery.ts`, CONTRACT §10 v0.9.5. No Claude Design board exists: follow the article page photo grid (`docs/design/wireframes/article-page.jsx`), public card/grid tokens and portal list/detail patterns (Centres 35, Content 38, Review inbox 28).

## Public
- **`/gallery`** (+ `/hi/gallery`): album grid (cover, title, date, photo count, kind chip). Filters year + kind (`album`, `event`, `news`, `centre`, `highlights`) as links (work without JS), pagination 12. Empty state. OG image, sitemap, footer link, `routes.ts`, review catalog.
- **`/gallery/[slug]`**: title, date, link to source page (event / article / centre), photo grid; click opens an accessible lightbox (dialog, focus trap, Esc closes, ←/→ moves, counter "3 of 12", caption, swipe at 375px). Unknown slug → 404 (proxy existence probe). Footer note: "To have a photo removed, see Privacy" → `/privacy`.
- Sources: published portal albums (approved photos only, cover first), published articles with ≥2 photos, legacy home slider ("Highlights"), approved event results photos, centre photos. Never: `team_photos_contact`, unreferenced `postsmedia`, private uploads, pending/rejected photos.
- Hindi: title/caption HI when present, else EN with the usual "Available in English" handling.

## Portal (`/admin/gallery`)
Permissions: `gallery.upload` (all coordinators, content editor) sends/uploads; `gallery.review` (district coord, content editor, state admin) approves/edits/rejects and publishes albums. Scoped by org unit like events.
- **Review tab** (default): pending photos as a card grid (preview, sender, received, event/album guess). Per card: Approve (needs album; pick one or create from the event), Edit, Reject (reason). Bulk select → approve to album / reject. Tabs Pending / Approved / Rejected with counts.
- **Albums tab**: list (cover, title, date, status, counts) + "New album" (title EN/HI, date, optional event → defaults title/date).
- **Album page** `/admin/gallery/albums/[id]`: edit title/description EN/HI, date, publish/unpublish (≥1 approved photo), photo grid with status, set cover, move up/down (order), edit, upload photos (multi-file, JPG/PNG/WebP ≤10 MB).
- **Editor** `/admin/gallery/photos/[id]`: crop (free, 1:1, 4:3, 3:2, 16:9, 4:5), rotate ⟲/⟳ 90°, flip H/V, brightness, contrast, reset; captions + alt EN/HI; "Use as album cover". Save → server renders a new derived file from the original (original kept privately; revision counter); "Revert to original". Works at 375px (controls stack under the image, touch drag on crop handles). Keyboard: crop box focusable, arrows move 1% (Shift 10%), Alt+arrows resize; all controls are buttons/inputs with labels; live region announces changes.
- Published files: JPEG, ≤2400 px, EXIF/GPS/all metadata stripped, auto-oriented. Previews in the portal also stripped.

## WhatsApp intake (bot, spec 50 addendum)
- Only known coordinators (`gallery.upload`) — others get "Only coordinators can send photos here". Bytes sniffed (JPEG/PNG/WebP), ≤10 MB; else a clear reply, nothing stored.
- A photo outside any flow starts the **gallery** flow: photo stored pending; bot asks "Which event or album are these photos for?" with a list: one recent event matched (same scope, held today/yesterday) is offered first as "Yes, <event>"; else up to 8 recent events (14 days) + open albums, plus "Not for the gallery (send to review)" which falls back to the review inbox as before. More photos sent while the question is open join the same batch. A photo caption becomes the EN caption.
- After the choice: "Thank you — N photos are waiting for review." Photos appear in the portal Review tab with the event/album set.

## Acceptance
- Pending photos never public; reject removes the public file; edit never overwrites the original.
- EN + `/hi`, 1280 and 375 px, keyboard-only lightbox and editor, axe clean.
- Tests: WhatsApp intake (coordinator ok, non-coordinator refused, bad MIME, too large, batching, event match), approve/reject, editor save (derived file, EXIF stripped, original kept).
