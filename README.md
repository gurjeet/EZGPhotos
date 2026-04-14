# EZGPhotos Extension

Browser extension that overlays keyboard-oriented album controls on top of `photos.google.com`.

## Build

1. Run `npm install`.
2. Run `npm run build`.
3. Load the generated `dist/` directory as an unpacked extension in Chrome or Edge.

## Usage

1. Open `https://photos.google.com/` and sign in with Google.
2. Open a photo in Google Photos.
3. Use the EZGPhotos overlay on top of the page.
4. Press left or right arrow keys to move between photos.
5. Press the shortcut letter shown next to an album to add or remove the current photo from that album.

## Notes

- The extension works by reading and driving the Google Photos page DOM. That makes it inherently brittle if Google changes their markup or labels.
- The popup includes a direct “Login with Google” path by opening Google Photos login in a new tab.
- Tests cover the shortcut assignment logic, controller behavior, and the DOM adapter used by the extension.
