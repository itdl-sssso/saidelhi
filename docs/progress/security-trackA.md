# security track A
Done: clientIp x-real-ip/last XFF; nginx XFF=$remote_addr; streamed body limit; null-proto query; exceljs overrides in pnpm-workspace.yaml (audit clean).
Tests: typecheck/lint/test pass (474).
- lead: dropped glob@7>minimatch override (glob 7 sync breaks on minimatch 11). Residual 1 moderate (minimatch via archiver glob; patterns never user-controlled). App on host network 0.0.0.0:3000: x-real-ip trust relies on port 3000 closed in firewall (deploy/README).
