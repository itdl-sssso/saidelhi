# M4 integration progress
- Done: dev-fixture shim removed (devFixture.ts, __fixtures__, register-scan.svg, useApi `fixture`, useAction `devFixture`, Simulator canned replies, admin.login.codeLabel).
- Done: live shape validation vs zod (inbox rows/detail x4, templates, reminders, log, conversation, status, sim messages, optin challenge) all OK; mutations (reminder PATCH, broadcast dry-run, inbox PATCH/ask, sim inbound) OK.
- Fixed: Simulator reset body needed `{ phone }`.
- Note: inbox media route 404 for seeded attachments because seed has no file on disk under MEDIA_PRIVATE_ROOT (URL shape correct: `/api/v1/admin/inbox/:id/media?m=<msgId>`).
- 404: proxy existence probe + rewrite (see CONTRACT §10 item 10). Page-level notFound before Suspense fails build (blocking-prerender) without generateStaticParams.
