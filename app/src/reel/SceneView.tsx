/** Placeholder scene plates (B3 library lands at build time). Era-tinted full-bleed block. */
import { Text, View } from "react-native";

interface Props {
  sceneId: string;
  epoch?: string;
  alpha: number;
}

const tints: Record<string, string> = {
  bronze: "#3A2A18",
  middle: "#1E2A22",
  modern: "#1A2233",
};

export function SceneView({ sceneId, epoch, alpha }: Props): React.JSX.Element {
  return (
    <View style={{ opacity: alpha }} className="absolute inset-0 items-center justify-center" testID="scene">
      <View className="absolute inset-0" style={{ backgroundColor: tints[epoch ?? ""] ?? "#141210" }} />
      <View className="absolute inset-x-0 top-0 h-40 bg-black/50" />
      <View className="absolute inset-x-0 bottom-0 h-56 bg-black/60" />
      <Text className="font-mono text-xs text-white/40">{sceneId}</Text>
    </View>
  );
}
