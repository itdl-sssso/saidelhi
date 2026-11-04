# security-deploy

done:
- overrides archiver-utils>glob ^14, rimraf>glob ^14 (pnpm-workspace.yaml). audit --prod 0 vulns.
- verified glob14 .sync + hasMagic work (cjs); exceljs xlsx roundtrip ok.
- ci-deploy.sh: nginx snippet diff warn, :3000 non-loopback reminder, non-fatal.
- deploy/README.md: snippet update steps, firewall section.
decisions:
- rimraf@2 (via exceljs>unzipper>fstream) async `glob(p,opts,cb)` path breaks w/ glob14, only hit for magic-char paths; fstream passes plain paths; unzipper Extract unused by app.
- shellcheck not installed; bash -n ok.
