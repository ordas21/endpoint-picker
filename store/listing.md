# Chrome Web Store listing

Paste these into the developer dashboard. Category: Developer Tools. Language: English.

## Name

Endpoint Picker

## Summary

The manifest description is already the summary:

Click any text on a page and see the API request and JSON field behind it.

## Detailed description

Click a value on any page and Endpoint Picker shows the network response that supplied it.

Point at a name, a price, or a status. The panel names the request, the status code, and the JSON path, such as payouts[0].vendor. When the page called fetch from a script, it also shows that file and line. Other responses that contain the same text are listed under the first match.

Use it when the Network panel is a wall of calls and you only know what you see on the screen.

How to use it

1. Click the Endpoint Picker icon and choose Start inspecting, or press Alt+Shift+E.
2. Click the text on the page.
3. Copy the endpoint, the JSON path, or a curl command.

What it can see

Fetch, XHR, server-sent events, and text WebSocket messages made by the page after the extension loads. Reload a tab that was already open.

What it does not do

It does not upload response bodies. They stay in the tab's memory until you clear them, leave the page, or close the tab. It does not read requests made inside a worker. A date or price the page formats itself will match only when the response stores that same text. Responses larger than about 2MB are skipped.

Privacy: https://ordas21.github.io/endpoint-picker/privacy.html

## Single purpose

Shows the network response and JSON field that supplied the text the user clicks.

## Permission justification

Endpoint Picker wraps fetch and XMLHttpRequest at document start so it can match on-screen text to response bodies. It needs host access on every site because the user can inspect any tab, and the site is not known in advance. Response data is kept in the tab's memory and is not sent off the device.

## Privacy certifications

- Data is not sold or transferred to third parties.
- Data is not used for purposes unrelated to showing which response supplied the clicked text.
- Data is not used to determine creditworthiness or for lending.
- Website content is processed locally in the tab and is not collected on a server.

## Privacy policy URL

https://ordas21.github.io/endpoint-picker/privacy.html

## Homepage

https://ordas21.github.io/endpoint-picker/

## Graphics

Upload these files from docs/media/:

- hero.png and also.png are the 1280×800 screenshots. Put hero.png first.
- tile.png is the 440×280 small promo tile.
- tile-large.png is the 920×680 large promo tile.
- marquee.png is the 1400×560 marquee.
- The store icon is icons/icon128.png.

## Package

Upload dist/endpoint-picker-1.0.0.zip. It contains only the extension.
