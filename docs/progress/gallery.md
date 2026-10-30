# Gallery (spec 52, CONTRACT v0.9.5) — progress log
Branch `worktree-agent-a1640c5d1fadcd400`. Lead resumed 28 Oct 2026, merged main (7e62ba8).

## Done (lead)
- Contract `src/contract/gallery.ts` (public + admin + PhotoEdits + GALLERY_LIMITS), permissions `gallery.upload`/`gallery.review` (rbac), admin endpoints, spec `docs/specs/52-gallery.md`, service ports `services/types.ts` GalleryService + `services/portal/gallery-types.ts`.

## Tracks
- backend: docs/progress/gallery-backend.md
- frontend: docs/progress/gallery-frontend.md

## Integration (lead, 28 Oct 2026)
- Both tracks merged in-branch. Lead fixes: `sectionOg` accepts "gallery"; `/gallery` filters overflowed at 375 (grid min-content) → `minmax(0,1fr)`.
- DoD: typecheck ✅, lint ✅ (2 pre-existing warnings in scripts/gen-brand-assets.ts), test ✅ 49 files / 454 tests (gallery: 7 files / 27 tests).
- Browser (dev :4300): simulator → coordinator 2-photo batch → event pick → pending; non-coordinator refused; bad MIME refused; reject dialog; approve → album; editor (1:1 keyboard crop at 375, rotate+3:2+caption+cover save → r1 1000×667, public file has no EXIF/ICC/XMP, r0 removed); publish → public `/gallery` + `/hi/gallery/<slug>`; lightbox keyboard + Esc focus return; 375 no overflow on public + portal EN/HI; unknown slug 404; portal upload 201 pending, fake JPEG 422, 11 MB 422.
- Not verified: touch swipe on device, simulator attach button UI click (API path tested), bulk UI click (service tested).
