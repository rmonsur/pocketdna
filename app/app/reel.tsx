/** Reel (U4) + Evidence overlay (U5) + toolbar (P6). Hero output. */
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Share, Text, View } from "react-native";
import { BottomSheet } from "../src/components/BottomSheet";
import { CitationChip } from "../src/components/CitationChip";
import { ReelToolbar } from "../src/components/ReelToolbar";
import { getSampleReel } from "../src/lib/api";
import type { BeatDto } from "../src/lib/schemas";
import { usePocket } from "../src/lib/store";
import { ReelStage } from "../src/reel/ReelStage";

export default function ReelScreen(): React.JSX.Element {
  const router = useRouter();
  const currentReel = usePocket((s) => s.currentReel);
  const setCurrent = usePocket((s) => s.setCurrent);
  const [paused, setPaused] = useState(false);
  const [beat, setBeat] = useState<BeatDto | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const params = useLocalSearchParams();
  const rawT = Array.isArray(params.t) ? params.t[0] : params.t;
  const staticT = params.static === "1" && rawT !== undefined ? Number(rawT) : undefined;

  const sample = useQuery({
    queryKey: ["sample-reel"],
    queryFn: getSampleReel,
    enabled: currentReel === null,
  });
  const reel = currentReel ?? sample.data ?? null;
  useEffect(() => {
    if (currentReel === null && sample.data !== undefined) setCurrent("sample", sample.data);
  }, [currentReel, sample.data, setCurrent]);

  async function share(): Promise<void> {
    await Share.share({ message: "Watch my origins on PocketDNA." });
  }

  if (reel === null) {
    return (
      <View className="flex-1 items-center justify-center bg-ink">
        <Text className="font-mono text-sm text-white/70">Loading reel</Text>
      </View>
    );
  }
  return (
    <View className="flex-1 bg-ink pt-12">
      <ReelStage
        key={resetToken}
        reel={reel}
        paused={paused}
        staticT={staticT}
        onTap={(b) => {
          setPaused(true);
          setBeat(b);
        }}
      />
      <ReelToolbar
        onReplay={() => {
          setPaused(false);
          setBeat(null);
          setResetToken((n) => n + 1);
        }}
        onAtlas={() => router.push("/atlas")}
        onShare={() => void share()}
        onLibrary={() => router.push("/library")}
      />
      {beat !== null && (
        <BottomSheet
          title="Evidence"
          onClose={() => {
            setBeat(null);
            setPaused(false);
          }}
        >
          <Text className="font-mono text-sm text-white">{beat.copy}</Text>
          {beat.explainer !== "" && (
            <Text className="mt-2 font-mono text-xs text-white/70">{beat.explainer}</Text>
          )}
          {beat.citation_ids.length > 0 && (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {beat.citation_ids.map((id) => (
                <CitationChip key={id} label={id} />
              ))}
            </View>
          )}
        </BottomSheet>
      )}
    </View>
  );
}
