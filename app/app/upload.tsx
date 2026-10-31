/** Upload hub (U1): screenshot / raw file / sample + consent sheet. No privacy toggle. */
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Text, View } from "react-native";
import { BottomSheet } from "../src/components/BottomSheet";
import { PrivacyBadge } from "../src/components/Badges";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { ApiError, createJob, getSampleReel, type PickedFile } from "../src/lib/api";
import { usePocket } from "../src/lib/store";

export default function Upload(): React.JSX.Element {
  const router = useRouter();
  const setCurrent = usePocket((s) => s.setCurrent);
  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pickScreenshot(): Promise<void> {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (!res.canceled && res.assets.length > 0) {
      const a = res.assets[0];
      setPicked({ uri: a.uri, name: a.fileName ?? "screenshot.png", mimeType: a.mimeType ?? "image/png" });
    }
  }

  async function pickRaw(): Promise<void> {
    const res = await DocumentPicker.getDocumentAsync({
      type: ["text/plain", "application/zip"],
      copyToCacheDirectory: true,
    });
    if (!res.canceled && res.assets.length > 0) {
      const a = res.assets[0];
      setPicked({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? "text/plain" });
    }
  }

  async function build(): Promise<void> {
    if (picked === null || busy) return;
    setBusy(true);
    setError("");
    try {
      const job = await createJob(picked);
      setPicked(null);
      router.push({ pathname: "/processing", params: { jobId: job.job_id } });
    } catch (err) {
      setError(err instanceof ApiError ? `${err.code}: ${err.message}` : "upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function watchSample(): Promise<void> {
    const reel = await getSampleReel();
    setCurrent("sample", reel);
    router.push("/reel");
  }

  return (
    <View className="flex-1 bg-ink px-6 pt-16">
      <Text style={{ fontFamily: "Inter_800ExtraBold" }} className="text-2xl text-white">
        Start your Reel
      </Text>
      <View className="mt-6 gap-4">
        <Card title="I have a screenshot" body="PNG/JPEG of your 23andMe or AncestryDNA ancestry composition." onPress={() => void pickScreenshot()} />
        <Card title="I have my raw DNA file" body="23andMe or AncestryDNA .txt or .zip, exactly as downloaded. Raw DNA is always processed privately on open-weight models we host." onPress={() => void pickRaw()} badge={<PrivacyBadge />} />
        <Card title="Watch a sample" body="See a finished Reel with no upload." onPress={() => void watchSample()} />
      </View>
      {error !== "" && <Text className="mt-4 font-mono text-sm text-red-400">{error}</Text>}
      {picked !== null && (
        <BottomSheet title="Confirm" onClose={() => setPicked(null)}>
          <Text className="font-mono text-sm text-white/85">{picked.name}</Text>
          <Text className="mt-2 font-mono text-xs text-white/60">
            Raw files are deleted after processing. Screenshots are parsed for ancestry only.
          </Text>
          <View className="mt-4">
            <Button label={busy ? "Uploading" : "Build my episode"} onPress={() => void build()} disabled={busy} />
          </View>
        </BottomSheet>
      )}
    </View>
  );
}
