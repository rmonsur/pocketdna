/** Atlas (U6, degrade path): static per-era maps. Interactive globe follows if scope allows. */
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { Button } from "../src/components/Button";
import { getSampleReel } from "../src/lib/api";
import { usePocket } from "../src/lib/store";
import { MapInset } from "../src/reel/MapInset";

const ERAS = [
  { epoch: "bronze", title: "Bronze Age" },
  { epoch: "middle", title: "Middle Ages" },
  { epoch: "modern", title: "Modern" },
] as const;

export default function Atlas(): React.JSX.Element {
  const router = useRouter();
  const currentReel = usePocket((s) => s.currentReel);
  const sample = useQuery({ queryKey: ["sample-reel"], queryFn: getSampleReel, enabled: currentReel === null });
  const reel = currentReel ?? sample.data ?? null;

  return (
    <ScrollView className="flex-1 bg-ink px-6 pt-16">
      <Text style={{ fontFamily: "Inter_800ExtraBold" }} className="text-2xl text-white">
        Atlas
      </Text>
      {reel === null && <Text className="mt-4 font-mono text-sm text-white/70">Loading</Text>}
      {reel !== null &&
        ERAS.map((era) => {
          const beat = reel.beats.find((b) => b.epoch === era.epoch) ?? null;
          return (
            <View key={era.epoch} className="mt-6 rounded-card bg-surface p-6">
              <Text className="font-mono text-sm text-primary">{era.title}</Text>
              <View className="mt-3">
                <MapInset path={beat?.map_path ?? []} point={null} height={140} />
              </View>
              <Text className="mt-3 font-mono text-xs text-white/70">{beat?.copy ?? ""}</Text>
              <View className="mt-4">
                <Button label="Watch this beat" onPress={() => router.push("/reel")} variant="secondary" />
              </View>
            </View>
          );
        })}
    </ScrollView>
  );
}
