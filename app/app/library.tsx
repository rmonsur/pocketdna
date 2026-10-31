/** Library (U8): poster wall keyed by device id. Sample always present. */
import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { Card } from "../src/components/Card";
import { getSampleReel } from "../src/lib/api";
import { usePocket } from "../src/lib/store";

export default function Library(): React.JSX.Element {
  const router = useRouter();
  const entries = usePocket((s) => s.entries);
  const setCurrent = usePocket((s) => s.setCurrent);

  async function watchSample(): Promise<void> {
    setCurrent("sample", await getSampleReel());
    router.push("/reel");
  }

  return (
    <ScrollView className="flex-1 bg-ink px-6 pt-16">
      <Text style={{ fontFamily: "Inter_800ExtraBold" }} className="text-2xl text-white">
        Library
      </Text>
      <View className="mt-6 gap-4">
        <Card title="Sample Reel" body="A finished origins story. Always here." onPress={() => void watchSample()} />
        {entries.map((e) => (
          <Card
            key={e.jobId}
            title={e.title}
            body={e.createdAt.slice(0, 10)}
            onPress={() => {
              setCurrent(e.jobId, e.reel);
              router.push("/reel");
            }}
          />
        ))}
      </View>
    </ScrollView>
  );
}
