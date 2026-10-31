/** U9 rejection + parked states: designed copy, next action, never a dead alert. */
import { Text, View } from "react-native";
import { Button } from "./Button";

export type NoticeKind = "R1" | "R2" | "R3" | "R4" | "R5";

const copy: Record<NoticeKind, { title: string; body: string }> = {
  R1: {
    title: "Ancestry only",
    body: "PocketDNA reads ancestry only. We never interpret health data. Upload the ancestry composition screen instead.",
  },
  R2: {
    title: "Could not read that",
    body: "Please upload the ancestry composition screen from 23andMe or AncestryDNA as PNG or JPEG.",
  },
  R3: {
    title: "File problem",
    body: "That is not a readable 23andMe or AncestryDNA export. Re-export the raw .txt (or .zip) and try again.",
  },
  R4: {
    title: "Something failed",
    body: "A pipeline step failed. Your partial progress is kept; retry to resume where it stopped.",
  },
  R5: {
    title: "Private engine busy",
    body: "The open-weights endpoint is unreachable. Wait and retry, or continue with a screenshot.",
  },
};

interface Props {
  kind: NoticeKind;
  onPrimary: () => void;
  primaryLabel: string;
  onSecondary?: () => void;
  secondaryLabel?: string;
}

export function RejectionSheet({ kind, onPrimary, primaryLabel, onSecondary, secondaryLabel }: Props): React.JSX.Element {
  return (
    <View className="rounded-card bg-surface p-6">
      <Text className="text-lg font-bold text-white">{copy[kind].title}</Text>
      <Text className="mt-2 font-mono text-sm text-white/80">{copy[kind].body}</Text>
      <View className="mt-6 gap-3">
        <Button label={primaryLabel} onPress={onPrimary} />
        {onSecondary !== undefined && secondaryLabel !== undefined && (
          <Button label={secondaryLabel} onPress={onSecondary} variant="secondary" />
        )}
      </View>
    </View>
  );
}
