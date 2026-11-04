# security track B

Done: headers in next.config.ts (+poweredByHeader off), CodeQL #1-4,#6 fixed, decode test added.
Decisions: CSP only frame-ancestors/base-uri/object-src/form-action; /media + admin file routes excluded from CSP rule (route CSP wins). camera=(self) because FileUpload uses capture=environment.
Verified: dev :4300 curl / /admin/login /api/v1/health; svg /media keeps route CSP.
Tests: typecheck, lint, 469 tests pass.
