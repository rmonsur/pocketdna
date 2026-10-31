/** Client state: device-id keyed library + current reel. No auth this hackathon. */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ReelDto } from "./schemas";

export interface LibraryEntry {
  jobId: string;
  title: string;
  createdAt: string;
  reel: ReelDto | null;
}

interface PocketState {
  deviceId: string;
  entries: LibraryEntry[];
  currentReel: ReelDto | null;
  currentJobId: string | null;
  setCurrent: (jobId: string | null, reel: ReelDto | null) => void;
  addEntry: (entry: LibraryEntry) => void;
}

function newDeviceId(): string {
  return `d-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export const usePocket = create<PocketState>()(
  persist(
    (set) => ({
      deviceId: newDeviceId(),
      entries: [],
      currentReel: null,
      currentJobId: null,
      setCurrent: (jobId, reel) => set({ currentJobId: jobId, currentReel: reel }),
      addEntry: (entry) => set((s) => ({ entries: [entry, ...s.entries].slice(0, 20) })),
    }),
    { name: "pocketdna", storage: createJSONStorage(() => AsyncStorage) },
  ),
);
