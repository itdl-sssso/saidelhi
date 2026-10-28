# Gallery frontend progress
## Done
- public /gallery + /gallery/[slug] + lightbox, footer/header links, review catalog
- portal nav, /admin/gallery (tabs, review grid, bulk, approve/reject dialogs, albums, new album), album page, editor
- strings en+hi (typecheck+eslint clean)
## In progress
browser verification; simulator attach; unit test for geometry
## Next
portal /admin/gallery, editor, simulator attach, strings, browser check
## Decisions
- Portal pages client-fetch via useApi/useAction (same as centres) -> no dependency on service impl timing.
- Cache tag "gallery" used for public reads (backend should revalidateTag("gallery") on approve/reject/publish/edit).
- OG: sectionOg typed section union lacks "gallery"; cast with og.gallery message. Propose widening type in src/lib/og.
## Blockers / notes
- Hindi strings agent-written: need native review (messages/hi.json: gallery.*, admin.gallery.*, nav.gallery, footer.gallery, og.gallery).
- sitemap (src/app/sitemap.ts) not mine: add /gallery + /gallery/<slug>.

## Verified (browser, dev :4300, real backend)
- public /gallery EN+/hi 1280+375 no overflow; album lightbox: arrows, Esc, focus return, counter, caption
- portal: pending grid, approve dialog, album create/publish (appears publicly), editor save (crop+rotate+caption -> derived 1000x1500), 375 no overflow (list, album, editor)
- Not verified: swipe (no touch), Hindi portal pages (/hi/admin/* rendered blank body in this session incl. existing /hi/admin/centres: session/dev issue), reject dialog + bulk UI, upload UI multi-file, simulator attach, keyboard Alt+arrows only via synthetic events.
## Notes
- Hindi strings agent-written: native review needed (gallery.*, admin.gallery.*, nav/footer/og.gallery).
- Live preview brightness/contrast uses CSS filter (approx of server's).
- Contract proposals: sectionOg section union add "gallery"; sitemap add /gallery + albums (src/app/sitemap.ts not mine).
