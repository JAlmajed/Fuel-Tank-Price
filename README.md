# Bahrain Fuel Cost

Calculates monthly fuel cost in Bahrain (BHD) from distance or fill-ups, for Jayyid 91, Mumtaz 95, Super 98 and Diesel.

## Files

- `index.html` is the whole app. It reads `prices.json` when it loads.
- `prices.json` holds the current pump prices.
- `scripts/update_prices.py` finds the monthly announcement and rewrites `prices.json`.
- `.github/workflows/update-prices.yml` runs the script on the 2nd to 5th of each month and commits the change.

## Publish

1. Create a GitHub repo and upload these files (keep the folder structure, including `.github`).
2. Go to Settings > Pages, choose "Deploy from a branch", branch `main`, folder `/ (root)`.
3. Your site appears at `https://<username>.github.io/<repo>/`.
4. Go to Actions > "Update fuel prices" > Run workflow once to test.

## If the automatic update fails

The script only accepts a page that mentions the current month and year and gives four sensible prices. If it finds none by the 5th, the workflow fails and GitHub emails you. Then edit `prices.json` by hand and commit. Four numbers, about a minute.

## Run locally

Open `index.html` through a local server (`python3 -m http.server`), because browsers block `fetch` on `file://` pages. If `prices.json` cannot load, the app uses built-in November 2026 prices.
