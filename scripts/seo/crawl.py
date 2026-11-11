"""Polite same-domain crawl of saidelhi.org. Records on-page SEO facts per URL to baseline.json."""
import json, time, re, sys
from urllib.parse import urljoin, urlparse, urldefrag
import requests
from bs4 import BeautifulSoup

import os
BASE = os.environ.get("SEO_BASE", "https://saidelhi.org").rstrip("/")
START = BASE + "/"
HOST = BASE.split("://", 1)[1]
MAX = 150
UA = "Mozilla/5.0 (compatible; saidelhi-seo-baseline/1.0)"
s = requests.Session(); s.headers["User-Agent"] = UA

seen, queue, pages = set(), [START], []
while queue and len(pages) < MAX:
    url = queue.pop(0)
    if url in seen: continue
    seen.add(url)
    t0 = time.time()
    try:
        r = s.get(url, timeout=20, allow_redirects=False)
    except Exception as e:
        pages.append({"url": url, "error": str(e)}); continue
    rec = {"url": url, "status": r.status_code, "ms": int((time.time()-t0)*1000), "bytes": len(r.content)}
    if r.is_redirect:
        rec["location"] = r.headers.get("Location")
        nxt = urljoin(url, rec["location"])
        if urlparse(nxt).netloc.endswith(HOST): queue.append(nxt)
    if r.status_code == 200 and "text/html" in r.headers.get("Content-Type", ""):
        soup = BeautifulSoup(r.text, "html.parser")
        md = soup.find("meta", attrs={"name": "description"})
        imgs = soup.find_all("img")
        body = soup.body.get_text(" ", strip=True) if soup.body else ""
        rec.update({
            "title": (soup.title.get_text(" ", strip=True) if soup.title else None),
            "description": md.get("content") if md else None,
            "h1": [h.get_text(" ", strip=True) for h in soup.find_all("h1")],
            "canonical": (soup.find("link", rel="canonical") or {}).get("href"),
            "lang": soup.html.get("lang") if soup.html else None,
            "hreflang": len(soup.find_all("link", hreflang=True)),
            "og": len(soup.find_all("meta", property=re.compile("^og:"))),
            "jsonld": len(soup.find_all("script", type="application/ld+json")),
            "words": len(body.split()),
            "imgs": len(imgs),
            "imgs_no_alt": sum(1 for i in imgs if not (i.get("alt") or "").strip()),
            "iframes": [f.get("src", "")[:60] for f in soup.find_all("iframe")],
        })
        for a in soup.find_all("a", href=True):
            u = urldefrag(urljoin(url, a["href"]))[0]
            p = urlparse(u)
            if p.scheme in ("http", "https") and p.netloc.replace("www.", "") == HOST \
               and not p.path.startswith(("/static/", "/media/", "/saidelhi-backend")) and u not in seen:
                queue.append(u)
    pages.append(rec)
    time.sleep(0.5)

extra = {}
for path in ["/robots.txt", "/sitemap.xml", "/llms.txt", "/favicon.ico"]:
    r = s.get(BASE + path, timeout=20)
    extra[path] = r.status_code
r = s.get(START, headers={"Host": "www.saidelhi.org"}, allow_redirects=False, timeout=20); extra["www->"] = (r.status_code, r.headers.get("Location"))
json.dump({"date": time.strftime("%Y-%m-%d"), "pages": pages, "site": extra}, open("baseline.json", "w"), indent=1, ensure_ascii=False)
print(len(pages), "pages;", extra)
