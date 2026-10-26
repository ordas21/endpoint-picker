# Endpoint Picker

Click a value on a page. See the request and the JSON field that returned it.

The site and privacy policy: https://ordas21.github.io/endpoint-picker/

## Install from the release

1. Download the zip from [Releases](https://github.com/ordas21/endpoint-picker/releases/latest) and unzip it.
2. Open `chrome://extensions` and turn on Developer mode.
3. Choose Load unpacked and select the unzipped folder.
4. Reload the tab you want to inspect.

Press Alt+Shift+E, click any text, then Esc to leave. The shortcut can be changed at `chrome://extensions/shortcuts`.

## What you get

The panel shows the method, status, URL, and JSON path. When the stack includes a page script, it shows that file and line. Copy the endpoint, the path, or a curl command. Other responses that contain the same text are listed underneath.

Fetch, XHR, server-sent events, and text WebSocket messages are visible after the extension loads. Requests made inside a worker are not. Response bodies stay in the tab and are not uploaded.

## Develop

```sh
node --test test/match.test.js
sh scripts/package.sh
```

The store zip is written to `dist/`. Listing copy for the Chrome Web Store is in `store/listing.md`.
