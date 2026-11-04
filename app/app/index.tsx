/** Welcome (U8): one sentence, one CTA, sample safety net. */
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "../src/components/Button";
import { ApiError, getSampleReel } from "../src/lib/api";
import { usePocket } from "../src/lib/store";

export default function Welcome(): React.JSX.Element {
  const router = useRouter();
  const setCurrent = usePocket((s) => s.setCurrent);
  const [error, setError] = useState("");

  async function watchSample(): Promise<void> {
    setError("");
    try {
      const reel = await getSampleReel();
      setCurrent("sample", reel);
      router.push("/reel");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "sample unavailable");
    }
  }

  return (
    <View className="flex-1 justify-center bg-ink px-8">
      <Text style={{ fontFamily: "Inter_800ExtraBold" }} className="text-4xl leading-tight text-white">
        Your DNA results have a story. Watch it.
      </Text>
      <Text className="mt-4 font-mono text-sm text-white/70">
        A two-minute documentary of your origins, every claim cited.
      </Text>
      <View className="mt-10 gap-3">
        <Button label="Make your Reel" onPress={() => router.push("/upload")} variant="pill" />
        <Button label="Watch a sample Reel" onPress={() => void watchSample()} variant="secondary" />
      </View>
      {error !== "" && <Text className="mt-4 font-mono text-sm text-red-400">{error}</Text>}
    </View>
  );
}
