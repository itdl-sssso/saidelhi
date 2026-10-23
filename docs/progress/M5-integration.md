# M5 integration
Done: removed dev-fixtures + m5() shims; skipTrailingSlashRedirect + proxy 308 strip; moved rewrite status 404; smoke on :4400 DATA_SOURCE=db (all M5 pages EN+HI 200, unknown slugs 404, legacy 301 once); CONTRACT v0.6.1.
Note: node_modules in worktree is a real `pnpm install --offline` (main's lacked leaflet/qrcode).
