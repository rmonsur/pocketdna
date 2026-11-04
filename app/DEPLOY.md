# PocketDNA deploy runbook

Pivot Oct 31: judges run the repo locally (see README). Hosting is optional polish.
TestFlight is KILLED; section B is kept only as history and must not be executed.

## A. Web + custom domain (~30 min + DNS wait, ~$12)

1. Buy the domain (any registrar, ~$12/yr). Pick something short judges can type.
2. Export the web build: `cd app && npm install && npm run export:web` → `dist/` (injects OG tags).
3. Host the static `dist/` on Vercel (or Netlify/Cloudflare Pages):
   `npx vercel --prod ./dist` (serves `/og-image.png` from `public/` automatically).
4. Point DNS: apex `@` → host's A/ALIAS, `www` → CNAME per host instructions. Wait for TLS.
5. Verify: cold load shows Welcome + sample reel; paste the URL in a chat app and confirm
   the OG title/image card renders (the cheap judge points); drag a screenshot anywhere
   per USER_FLOW 1b once drop lands (pickers work meanwhile).
6. Set `EXPO_PUBLIC_API_URL` in the host env to the Modal API URL (see backend deploy).

## B. KILLED (Oct 31): TestFlight via EAS

Prereqs: Apple Developer Program ($99/yr), an App Store Connect app record,
`npm i -g eas-cli`, `eas login`.

1. `cd app && eas init` → paste the project id into `app.json` (`extra.eas.projectId`).
2. Fill `eas.json` submit ids: `appleId`, `ascAppId`, `appleTeamId`.
3. `eas build --profile production --platform ios` (cloud build, ~15-30 min).
4. `eas submit --platform ios --latest` → TestFlight. Review usually 1-2 days.
5. Add the demo Apple ID as a TestFlight tester; confirm install + sample reel plays.

## Costs

Domain ~$12/yr, Apple Developer $99/yr. EAS free tier covers hackathon builds.
No server spend beyond existing Modal/Meta/Baseten credits.

## Rollback

Web: redeploy previous `dist/` (host keeps history). iOS: expire the TestFlight
build; judges still have the web link — the demo never depends on TestFlight.
