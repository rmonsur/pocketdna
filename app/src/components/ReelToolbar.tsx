/** P6 ReelToolbar: Replay / Atlas / Share / Library. Bottom-anchored, one-handed. */
import { Pressable, Text, View } from "react-native";

interface Props {
  onReplay: () => void;
  onAtlas: () => void;
  onShare: () => void;
  onLibrary: () => void;
}

const items: Array<{ key: "replay" | "atlas" | "share" | "library"; label: string }> = [
  { key: "replay", label: "Replay" },
  { key: "atlas", label: "Atlas" },
  { key: "share", label: "Share" },
  { key: "library", label: "Library" },
];

export function ReelToolbar({ onReplay, onAtlas, onShare, onLibrary }: Props): React.JSX.Element {
  const handlers = { replay: onReplay, atlas: onAtlas, share: onShare, library: onLibrary };
  return (
    <View className="flex-row justify-between bg-black/60 px-6 py-3">
      {items.map((item) => (
        <Pressable key={item.key} onPress={handlers[item.key]} className="min-h-[44px] min-w-[64px] items-center justify-center">
          <Text className="font-mono text-sm text-white">{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
