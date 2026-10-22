# 12 · Map (centre locator)
**Route** `/centres/map` · **Audience** public · **Priority** P1 · **Status** wireframed, update

## Job
Find the nearest centre.

## Sections
1. Search by pincode or locality, plus a "Use a district" select. (No geolocation; it isn't available in all contexts.)
2. Map with pins (desktop: map left, list right; phone: list first with a "Show map" toggle).
3. List rows: centre name, district, next gathering, distance if a pincode was entered → Centre.
4. Each row has a "Directions" → Google Maps (new tab).

## Acceptance
- Pins link to Centre.
- The list works without the map (accessibility).
