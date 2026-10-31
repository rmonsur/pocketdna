/** P7 BottomSheet: slide-up over paused content with scrim. */
import { Pressable, Text, View } from "react-native";
import { Button } from "./Button";

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheet({ title, onClose, children }: Props): React.JSX.Element {
  return (
    <View className="absolute inset-0 justify-end bg-black/70">
      <Pressable onPress={onClose} className="flex-1" />
      <View className="max-h-[80%] rounded-t-card bg-surface p-6">
        <Text className="text-lg font-bold text-white">{title}</Text>
        <View className="mt-4">{children}</View>
        <View className="mt-6">
          <Button label="Close" onPress={onClose} variant="secondary" />
        </View>
      </View>
    </View>
  );
}
