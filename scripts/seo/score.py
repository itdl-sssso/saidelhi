"""Scores a crawl snapshot for SEO and AI-search readiness.

Usage:
    python3 crawl.py                        # writes baseline.json in cwd
    python3 score.py <snapshot_dir>         # reads baseline.json + lh_*.json, writes scorecard.md

Every check is measured from the live site, so a re-run after a deploy shows the change the same day.
"""
import glob, json, os, re, sys, collections
from urllib.parse import urlparse
import requests

SITE = os.environ.get("SEO_BASE", "https://saidelhi.org").rstrip("/")
AI_BOTS = {
    "GPTBot": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)",
    "OAI-SearchBot": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)",
    "ClaudeBot": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
    "PerplexityBot": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
    "Googlebot": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Bingbot": "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
}

snap = sys.argv[1] if len(sys.argv) > 1 else "."
data = json.load(open(os.path.join(snap, "baseline.json")))
pages = [p for p in data["pages"] if p.get("status") == 200 and "title" in p]


def own_canonical(p):
    """False for filtered/paged variants (?view=, ?page=) whose canonical points at another URL."""
    c = (p.get("canonical") or "").split("?")[0].rstrip("/")
    return not c or c.endswith(urlparse(p["url"]).path.rstrip("/")) and "?" not in p["url"]


canon_pages = [p for p in pages if own_canonical(p)]
site = data["site"]
n = len(pages)
# Title uniqueness only among pages that are their own canonical (variants share their base title by design).
titles = collections.Counter((p["title"] or "").strip() for p in canon_pages)


def pct(pred):
    return round(100 * sum(1 for p in pages if pred(p)) / n) if n else 0


def title_ok(p):
    t = (p["title"] or "").strip()
    head = t.split("|")[0].strip()
    return bool(head) and (titles[t] == 1 or not own_canonical(p)) and 20 <= len(t) <= 70


def desc_ok(p):
    d = (p["description"] or "").strip()
    return 50 <= len(d) <= 170


def is_article(p):
    # Legacy Django posts live under /content/; the rebuild uses /news/<slug>, /discourses/<slug>, /events/<id>.
    path = urlparse(p["url"]).path
    return ("/content/" in path and "getallposts" not in p["url"]) or bool(re.search(r"/(news|discourses|events)/[^/]+/?$", path))


arts = [p for p in pages if is_article(p)]
home = next((p for p in pages if p["url"].rstrip("/") == SITE.rstrip("/")), pages[0])

# ---------- live checks ----------
s = requests.Session()
robots = s.get(SITE + "/robots.txt", timeout=20)
robots_txt = robots.text if robots.status_code == 200 else ""
www = s.get(SITE + "/", headers={"Host": "www.saidelhi.org"}, allow_redirects=False, timeout=20)
bot_rows, bots_ok = [], 0
base_len = None
for name, ua in AI_BOTS.items():
    r = s.get(SITE + "/", headers={"User-Agent": ua}, timeout=20)
    blocked_robots = bool(re.search(rf"User-agent:\s*{re.escape(name)}\s*\n(?:[^\n]*\n)*?Disallow:\s*/\s*$", robots_txt, re.I | re.M))
    ok = r.status_code == 200 and len(r.text) > 2000 and not blocked_robots
    bots_ok += ok
    bot_rows.append((name, r.status_code, len(r.text), "blocked" if blocked_robots else "allowed"))

contact = next((p for p in pages if "contact" in p["url"]), None) or next((p for p in pages if urlparse(p["url"]).path.rstrip("/") == "/about"), None)
contact_html = s.get(contact["url"], timeout=20).text if contact else ""
art_html = {p["url"]: s.get(p["url"], timeout=20).text for p in arts[:10]}
schema_types = collections.Counter()
for p in [home] + arts[:10]:
    html = art_html.get(p["url"]) or s.get(p["url"], timeout=20).text
    for block in re.findall(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', html, re.S):
        schema_types.update(re.findall(r'"@type"\s*:\s*"([^"]+)"', block))
# HTML attribute names are case-insensitive (React writes dateTime=).
dated = sum(1 for h in art_html.values() if re.search(r'<time[^>]*datetime=|"datePublished"|"startDate"', h, re.I))

checks = []  # (group, name, score 0-100, weight, detail)


def add(group, name, score, weight, detail=""):
    checks.append((group, name, max(0, min(100, round(score))), weight, detail))


# ---------- SEO technical ----------
add("SEO", "Unique, descriptive <title>", pct(title_ok), 3, f"{pct(title_ok)}% of {n} pages")
add("SEO", "Meta description 50-170 chars", pct(desc_ok), 3, f"{pct(desc_ok)}% of pages")
add("SEO", "Exactly one <h1>", pct(lambda p: len(p["h1"]) == 1), 2, "")
add("SEO", "Canonical tag", pct(lambda p: bool(p["canonical"])), 2, "")
add("SEO", "Open Graph tags (link previews)", pct(lambda p: p["og"] >= 3), 1, "")
add("SEO", "Image alt text", 100 * (1 - sum(p["imgs_no_alt"] for p in pages) / max(1, sum(p["imgs"] for p in pages))), 1, "")
add("SEO", "robots.txt present", 100 if site.get("/robots.txt") == 200 else 0, 2, str(site.get("/robots.txt")))
add("SEO", "sitemap.xml present", 100 if site.get("/sitemap.xml") == 200 else 0, 3, str(site.get("/sitemap.xml")))
add("SEO", "www redirects to apex (one host)", 100 if www.status_code in (301, 308) else 0, 2, f"www -> {www.status_code}")
bad_urls = [p["url"] for p in pages if p["url"].endswith("-None/")]
add("SEO", "No broken '-None' slugs", 0 if bad_urls else 100, 1, f"{len(bad_urls)} found")
add("SEO", "Favicon", 100 if site.get("/favicon.ico") == 200 else 0, 1, str(site.get("/favicon.ico")))
add("SEO", "Pages >= 300 words", pct(lambda p: p["words"] >= 300), 1, "")

# ---------- Performance ----------
lh = [json.load(open(f)) for f in sorted(glob.glob(os.path.join(snap, "lh_*.json")))]
if lh:
    perf = sum(d["categories"]["performance"]["score"] for d in lh) / len(lh) * 100
    lhseo = sum(d["categories"]["seo"]["score"] for d in lh) / len(lh) * 100
    lcp = max(d["audits"]["largest-contentful-paint"]["numericValue"] for d in lh) / 1000
    weight = max(d["audits"]["total-byte-weight"]["numericValue"] for d in lh) / 1024 / 1024
    add("Performance", "Lighthouse performance (mobile, avg)", perf, 3, f"{perf:.0f}")
    add("Performance", "Lighthouse SEO (avg)", lhseo, 2, f"{lhseo:.0f}")
    add("Performance", "Worst LCP <= 2.5 s", 100 if lcp <= 2.5 else max(0, 100 - (lcp - 2.5) * 10), 3, f"{lcp:.1f} s")
    add("Performance", "Heaviest page <= 2 MB", 100 if weight <= 2 else max(0, 100 - (weight - 2) * 15), 2, f"{weight:.1f} MB")

# ---------- AI search readiness ----------
add("AI", "AI and search crawlers get full HTML", 100 * bots_ok / len(AI_BOTS), 3, f"{bots_ok}/{len(AI_BOTS)} bots")
add("AI", "robots.txt names AI crawlers explicitly", 100 if re.search(r"GPTBot|ClaudeBot|PerplexityBot", robots_txt) else 0, 1, "")
add("AI", "llms.txt present", 100 if site.get("/llms.txt") == 200 else 0, 1, str(site.get("/llms.txt")))
add("AI", "Organization schema on home", 100 if {"Organization", "NGO", "NonprofitOrganization"} & set(schema_types) else 0, 3, ", ".join(schema_types) or "none")
add("AI", "Article/Event schema on posts", pct(lambda p: p["jsonld"] > 0 and is_article(p)) * n / max(1, len(arts)), 3, f"{sum(1 for p in arts if p['jsonld'])}/{len(arts)} posts")
add("AI", "Visible publish dates on posts", 100 * dated / max(1, len(art_html)), 2, f"{dated}/{len(art_html)} sampled")
facts = sum(bool(re.search(rx, contact_html)) for rx in [r"\b\d{6}\b", r"(\+91|\b0\d{2,4})[\s-]?\d{3,}", r"[\w.]+@[\w.]+\.\w+"])
add("AI", "Contact facts in text (PIN, phone, email)", 100 * facts / 3, 2, f"{facts}/3")
add("AI", "Hindi pages with hreflang", pct(lambda p: p["hreflang"] > 0), 2, "")
add("AI", "Meta descriptions (used as answer snippets)", pct(desc_ok), 1, "")

# ---------- report ----------
groups = collections.OrderedDict()
for g, *_ in checks:
    groups.setdefault(g, [])
for c in checks:
    groups[c[0]].append(c)


def gscore(cs):
    return round(sum(c[2] * c[3] for c in cs) / sum(c[3] for c in cs))


overall = round(sum(gscore(cs) for cs in groups.values()) / len(groups))
out = [f"# SEO and AI search scorecard: {data['date']}", "", f"Pages crawled: {n}", "",
       "| Area | Score /100 |", "|---|---|"]
out += [f"| {g} | {gscore(cs)} |" for g, cs in groups.items()] + [f"| **Overall** | **{overall}** |", ""]
for g, cs in groups.items():
    out += [f"## {g}", "", "| Check | Score | Weight | Detail |", "|---|---|---|---|"]
    out += [f"| {c[1]} | {c[2]} | {c[3]} | {c[4]} |" for c in cs] + [""]
out += ["## Crawler access", "", "| Bot | Status | Bytes | robots.txt |", "|---|---|---|---|"]
out += [f"| {b} | {st} | {ln} | {rb} |" for b, st, ln, rb in bot_rows]
open(os.path.join(snap, "scorecard.md"), "w").write("\n".join(out) + "\n")
json.dump({"date": data["date"], "overall": overall, "groups": {g: gscore(cs) for g, cs in groups.items()},
           "checks": checks}, open(os.path.join(snap, "scorecard.json"), "w"), indent=1, ensure_ascii=False)
print("\n".join(out))
