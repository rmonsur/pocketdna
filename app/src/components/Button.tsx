/** P1 Button: primary / secondary / pill. 44pt targets, no emoji. */
import { Pressable, Text } from "react-native";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "pill";
  disabled?: boolean;
}

export function Button({ label, onPress, variant = "primary", disabled = false }: Props): React.JSX.Element {
  const shell =
    variant === "primary"
      ? "bg-primary"
      : variant === "pill"
        ? "bg-primary rounded-pill"
        : "bg-surface";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`min-h-[44px] items-center justify-center rounded-control px-6 ${shell} ${disabled ? "opacity-40" : ""}`}
    >
      <Text className={`font-bold ${variant === "secondary" ? "text-white" : "text-ink"}`}>{label}</Text>
    </Pressable>
  );
}
