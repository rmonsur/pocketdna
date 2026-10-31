/** P3 ModelBadge (live step state) + PrivacyBadge (static raw-file mark). */
import { Text, View } from "react-native";

interface ModelProps {
  model: string;
  state: "idle" | "running" | "done" | "fail";
}

export function ModelBadge({ model, state }: ModelProps): React.JSX.Element {
  const border = state === "running" ? "border-primary" : state === "fail" ? "border-red-400" : "border-white/20";
  return (
    <View className={`rounded-pill border px-3 py-1 ${border}`}>
      <Text className="font-mono text-[11px] text-white">
        {model} {state === "done" ? "· done" : state === "running" ? "· live" : state === "fail" ? "· retry" : ""}
      </Text>
    </View>
  );
}

export function PrivacyBadge(): React.JSX.Element {
  return (
    <View className="rounded-pill border border-primary px-3 py-1">
      <Text className="font-mono text-[11px] text-primary">Always private · open weights</Text>
    </View>
  );
}
