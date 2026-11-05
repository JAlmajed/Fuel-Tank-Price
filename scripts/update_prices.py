#!/usr/bin/env python3
"""Update prices.json from the monthly Bahrain fuel price announcement.

How it works:
1. Searches Bing News (RSS) for the current month's announcement.
2. Opens the top results and looks for the four prices.
3. Accepts a page only if it mentions the current month and year, and the
   prices pass sanity checks. Otherwise prices.json is left unchanged.

Exit codes: 0 = updated or nothing to do yet, 1 = still no valid prices
on or after the 5th of the month (the workflow then fails and GitHub emails you).
"""
import datetime as dt
import html
import json
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRICES_FILE = ROOT / "prices.json"
UA = {"User-Agent": "Mozilla/5.0 (compatible; bahrain-fuel-cost-bot)"}

LABELS = {
    "jayyid": r"(?:jayyid|jayyed|jeyyid|regular)\s*\(?91\)?|91\s*(?:jayyid|jayyed|jeyyid)",
    "mumtaz": r"(?:mumtaz|premium)\s*\(?95\)?|95\s*mumtaz",
    "super": r"super\s*\(?98\)?|98\s*super",
    "diesel": r"diesel",
}
VALUE = r"[^0-9]{0,25}?(?:(?:bd|bhd)\s*)?(0?\.\d{3}|\d{3}\s*fils)"


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def to_bhd(token):
    token = token.strip().lower()
    if "fils" in token:
        return int(re.sub(r"\D", "", token)) / 1000
    return float(token)


def parse_prices(text):
    """Try "label then price" first, then "price then label". Keep the first sane result."""
    text = html.unescape(re.sub(r"<[^>]+>", " ", text))
    text = re.sub(r"\s+", " ", text)
    for style in ("after", "before"):
        out = {}
        for key, label in LABELS.items():
            if style == "after":
                m = re.search(r"(?:" + label + r")" + VALUE, text, re.I)
                val = round(to_bhd(m.group(1)), 3) if m else None
            else:
                m = re.search(r"(\d{3})\s*fils[^0-9]{0,30}?(?:" + label + r")", text, re.I)
                val = int(m.group(1)) / 1000 if m else None
            if val is None:
                break
            out[key] = val
        if len(out) == len(LABELS) and sane(out):
            return out
    return None


def sane(p):
    if not p or any(not (0.10 <= v <= 1.50) for v in p.values()):
        return False
    return p["jayyid"] < p["mumtaz"] < p["super"]


def candidate_links(month, year):
    q = urllib.parse.quote(f"Bahrain fuel prices {month} {year}")
    rss = get(f"https://www.bing.com/news/search?q={q}&format=rss")
    links = []
    for item in ET.fromstring(rss).iter("item"):
        link = item.findtext("link") or ""
        qs = urllib.parse.parse_qs(urllib.parse.urlparse(link).query)
        links.append(qs.get("url", [link])[0])
    return links[:10]


def main():
    today = dt.date.today()
    month, year = today.strftime("%B"), today.year
    current = json.loads(PRICES_FILE.read_text())
    if current.get("month") == f"{month} {year}":
        print("prices.json already has this month. Nothing to do.")
        return 0

    for url in candidate_links(month, year):
        try:
            page = get(url)
        except Exception as e:  # noqa: BLE001
            print("skip", url, e)
            continue
        if month.lower() not in page.lower() or str(year) not in page:
            continue
        prices = parse_prices(page)
        if not sane(prices):
            continue
        current.update(
            {
                "month": f"{month} {year}",
                "effective": today.replace(day=2).isoformat(),
                "updated": today.isoformat(),
                "prices": prices,
                "source": url,
            }
        )
        PRICES_FILE.write_text(json.dumps(current, indent=2) + "\n")
        print("updated from", url, prices)
        return 0

    print("No valid announcement found yet.")
    return 1 if today.day >= 5 else 0


if __name__ == "__main__":
    sys.exit(main())
