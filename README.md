# Bahrain Fuel Cost

A mobile-friendly calculator for monthly fuel cost in Bahrain (BHD). Pick a fuel, enter your distance and consumption (or fill-ups per month) and see the cost per month, day, km and year. No account, no backend, no build step.

## Features

- Jayyid 91, Mumtaz 95, Super 98 and Diesel
- Two ways to calculate: **by distance** (km and L/100 km) or **by fill-ups** (litres and fill-ups per month)
- The same use priced on all four fuels
- Prices come from `prices.json`, which a GitHub Action updates every month
- You can type your own price to test a rate. It only applies to the current month
- Your inputs are saved on your device
- Works offline after the first visit and can be added to the iPhone home screen

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Page layout |
| `style.css` | Styling |
| `app.js` | JavaScript: loads prices, calculates, saves your inputs |
| `prices.json` | Current pump prices |
| `scripts/update_prices.py` | Finds the monthly announcement and rewrites `prices.json` |
| `.github/workflows/update-prices.yml` | Runs the script on the 2nd to 5th of each month |
| `manifest.json`, `sw.js`, icons | Home screen app and offline use |

## Publish

Settings > Pages > Deploy from a branch > `main` > `/ (root)`. The site is at `https://<username>.github.io/<repo>/`.

## Monthly prices

The workflow only accepts a page that mentions the current month and year and gives four sensible prices. If it finds none by the 5th, it fails and GitHub emails you. Then edit the four numbers in `prices.json` by hand and commit.

To test it, open Actions > "Update fuel prices" > Run workflow.

## Run locally

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Notes

- Offline mode needs HTTPS (or `localhost`).
- The service worker loads from the network first, so new prices appear as soon as the device is online. To force a full refresh, change `CACHE_NAME` in `sw.js`.
