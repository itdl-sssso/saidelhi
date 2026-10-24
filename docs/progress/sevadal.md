# Sevadal rename + proxy fixes
Done: UI rename (messages, forms, bot, templates, exports, catalog, specs, tests); route /admin/sevadal + 301 from /admin/volunteers; proxy redirect-before-404; probe retry once (fail-open logged only on 2 errors, never cached).
B3: /districts/south-east lists 2 of 5 samithis = centres only (spec 13 "Centres list"; only samithis with address+coords get a centre). Intended, no change.
Internal ids unchanged (DB, permission keys, API paths, contract fields).
