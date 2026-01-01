# GitNinja 🥷

A minimal, easy-to-maintain Chrome extension scaffold. This target is to let you iterate quickly and publish to the Chrome Web Store.

## What you get

- `manifest.json` (Manifest V3)
- `popup.html`, `popup.js`, `styles.css`
- `background.js` (service worker placeholder)
- `icons/` with placeholder PNGs (replace with real icons before publishing)
- `package.json` with a simple `zip` script


## Install (development)

1. Open Chrome and go to chrome://extensions
2. Enable **Developer mode**
3. Click **Load unpacked** and pick this project folder

The extension will appear in the toolbar as **GitNinja**.


## Publish to Chrome Web Store (manual)

1. Prepare icons (recommended: 16/48/128 PNGs with a consistent design)
2. Update `manifest.json` version (e.g. `0.1.0` → `0.1.1`)
3. Zip the extension contents (see `npm run zip`) and upload to the Developer Dashboard
4. Fill in listing details, screenshots, and submit for review

Automation options: use the Chrome Web Store API or community CLIs (search for `chrome-webstore-upload-cli`) when you want CI-based deploys.


## Notes

- Icons included are placeholders (1x1 transparent PNG). Replace them before publishing.
- This scaffold intentionally has no build step — plain HTML/CSS/JS makes maintenance easy.


## Next steps / suggestions

- Add content scripts to integrate UI on GitHub pages
- Add OAuth flow or PAT support for advanced GitHub features
- Add tests and CI for linting and packaging


---

Made with ❤️ for quick iterative development. Replace the placeholder assets and fill in store listing details before publishing.
