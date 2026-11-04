/** Fixed translucent header (mockup). */

import { Link } from "react-router-dom";

export function Header(): React.JSX.Element {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-surface-translucent shadow-[0_1px_16px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
      <div className="flex h-20 w-full items-center justify-between gap-6 px-8">
        <Link to="/" className="group flex items-center gap-3">
          <span className="h-2 w-2 animate-pulse rounded-full bg-archival-amber" />
          <span className="text-[22px] font-light tracking-tight text-on-surface">
            Pocket<span className="font-medium text-archival-amber">DNA</span>
          </span>
        </Link>
        <nav className="flex items-center gap-5">
          <Link to="/atlas" className="text-sm text-text-muted transition-colors hover:text-on-surface">
            Atlas
          </Link>
          <Link to="/library" className="text-sm text-text-muted transition-colors hover:text-on-surface">
            Library
          </Link>
        </nav>
      </div>
    </header>
  );
}
