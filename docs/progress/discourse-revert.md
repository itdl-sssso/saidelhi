# discourse-revert
Done: contract (DiscourseRevertBody, detail fields), service revert, route, domain diffFromSnapshot, editor Restore dialog + Discard all, i18n en/hi, tests (unit, db, e2e), CONTRACT v0.9.2.
Undo (Ctrl+Z): textarea is controlled and onChange stores the typed value, so React re-renders the same value; native undo history is preserved while typing. Autosave PATCH response only updates `det`; the textarea shows `drafts[id] ?? det.hi`, drafts cleared only when equal to what was sent, so the value never changes under the caret. Not browser-verified beyond reasoning; a restore replaces the value (undo stack lost, expected).
Next: DoD run, dev spot check.
