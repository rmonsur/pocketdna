# 2026-10-31 web-bundle-fix1 — black unstyled page
Cause: missing metro.config.js withNativeWind wrapper, so global.css shipped raw
(@tailwind directives, 56 bytes, zero utilities). Welcome rendered without any styling.
Fix: added app/metro.config.js. Verified: export CSS now 9,293 bytes with
justify-center, bg-ink, text-white, bg-primary, rounded-pill all present.
Builder action: restart `npx expo start` (Metro reads config at boot) + hard refresh.
Cost: $0.
