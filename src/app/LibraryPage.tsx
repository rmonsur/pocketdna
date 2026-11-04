/** Library: saved episodes poster wall (localStorage). Sample always present. */

import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";

interface Entry {
  id: string;
  title: string;
  when: string;
}

const SAMPLE: Entry = { id: "sample", title: "Sample Reel (replay)", when: "Saved episode" };

export function LibraryPage(): React.JSX.Element {
  let entries: Entry[] = [SAMPLE];
  try {
    const raw = localStorage.getItem("pocketdna-library");
    if (raw !== null) entries = [SAMPLE, ...(JSON.parse(raw) as Entry[])];
  } catch {
    entries = [SAMPLE];
  }
  return (
    <div className="relative min-h-screen bg-background-obsidian text-on-surface">
      <Header />
      <main className="mx-auto max-w-[1100px] px-6 pb-16 pt-28">
        <h1 className="text-[40px] font-light tracking-tight">Library</h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {entries.map((e) => (
            <Link
              key={e.id}
              to="/"
              className="rounded-2xl bg-surface-translucent p-6 backdrop-blur-xl transition-transform hover:scale-[1.01]"
            >
              <p className="text-lg text-text-primary">{e.title}</p>
              <p className="mt-1 font-mono text-xs text-text-muted">{e.when}</p>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
