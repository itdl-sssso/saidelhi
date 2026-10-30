# Review round-1 portal tickets

Branch agent-abeeb0d0cfa1217e6. All 10 tickets done; typecheck + lint + vitest (m6-uploads, forms, whatsapp-bot) green.

1. Event 404: `guarded()` notFound() under /admin had no portal boundary -> default Next 404. Added `admin/(portal)/not-found.tsx` + `PortalNotFound`. Event 18 itself renders (200) for state admin; unknown ids still hit proxy probe -> app 404.
2+7. `ScrollTabs` (edge fades, wheel/drag, active tab in view) on events, whatsapp, inbox, approvals, LinkTabs.
3. Inbox item: `Why` Tip tooltip on blocked Approve/Save + visible touch hint; msgs `admin.inbox.blocked.*`.
4. DELETE /admin/forms/:id = archive (active=false), 422 + details {reason: links|pinned|last, count}; audit form.delete; list hides archived.
5. DELETE /admin/uploads/:id (uploads.manage), not for loaded batches (422); removes rows + file; audit upload.delete. Menu item + confirm.
5/6. Clipped dialog was the row "..." Popover: now portal + fixed + flip.
8. Redirects toolbar aligned (`.tblBar`), action cell right-aligned.
9. Impact: floating save island (Revert + Save) when dirty.
10. Pincode 122003: resolveDistrict only did text search over centres; now falls back to nearest centre by pincode centroid. Test added.

API (CONTRACT §10): DELETE /admin/forms/:id -> 204; DELETE /admin/uploads/:id -> 204; 422 details {reason,count} on form delete.
