/** P5 ProcessingLogRow: terminal-agent step row with artifact line on completion. */
import { Text, View } from "react-native";
import { ModelBadge } from "./Badges";

interface Props {
  step: number;
  title: string;
  model: string;
  status: "idle" | "running" | "done" | "fail";
  artifact?: string;
}

export function ProcessingLogRow({ step, title, model, status, artifact }: Props): React.JSX.Element {
  return (
    <View className="border-b border-white/10 py-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-sm text-white">
          {step}. {title}
        </Text>
        <ModelBadge model={model} state={status} />
      </View>
      {artifact !== undefined && artifact !== "" && (
        <Text className="mt-1 font-mono text-xs text-primary">{artifact}</Text>
      )}
    </View>
  );
}
