/** P4 CitationChip: one-line truncated cite, tap opens the source. */
import { Linking, Pressable, Text } from "react-native";

interface Props {
  label: string;
  url?: string;
}

export function CitationChip({ label, url }: Props): React.JSX.Element {
  return (
    <Pressable
      onPress={() => {
        if (url !== undefined) void Linking.openURL(url);
      }}
      className="rounded-pill border border-white/20 bg-black/40 px-3 py-1"
    >
      <Text className="font-mono text-[11px] text-white" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
