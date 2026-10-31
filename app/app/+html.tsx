/** Web HTML shell: favicon + link-preview (OG) tags. Judges see these on share. */
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

const TITLE = "PocketDNA — Your DNA results have a story. Watch it.";
const DESCRIPTION = "Drop your DNA test, get a 30-second cited documentary of your origins.";
const IMAGE = "/og-image.png";

export default function Root({ children }: PropsWithChildren): React.JSX.Element {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={IMAGE} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
