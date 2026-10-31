/** P2 Card: one decision per card, badge slot top-left. */
import { Pressable, Text, View } from "react-native";

interface Props {
  title: string;
  body: string;
  onPress: () => void;
  badge?: React.ReactNode;
}

export function Card({ title, body, onPress, badge }: Props): React.JSX.Element {
  return (
    <Pressable onPress={onPress} className="rounded-card bg-surface p-6">
      {badge !== undefined && <View className="mb-3 self-start">{badge}</View>}
      <Text className="text-lg font-bold text-white">{title}</Text>
      <Text className="mt-2 font-mono text-sm text-white/80">{body}</Text>
    </Pressable>
  );
}
