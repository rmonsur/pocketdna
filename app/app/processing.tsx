/** Processing (U3): live agent step log. Demo hero screen. */
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ScrollView, Text } from "react-native";
import { ProcessingLogRow } from "../src/components/ProcessingLogRow";
import { RejectionSheet, type NoticeKind } from "../src/components/RejectionSheet";
import { getJob } from "../src/lib/api";
import { usePocket } from "../src/lib/store";

const STEPS = [
  { step: 1, title: "Reading your results", model: "muse-spark" },
  { step: 2, title: "Merging ancient panel", model: "engine" },
  { step: 3, title: "Projecting PC space", model: "engine" },
  { step: 4, title: "Fitting your eras", model: "engine" },
  { step: 5, title: "Selecting citations", model: "muse-spark" },
  { step: 6, title: "Directing your reel", model: "muse-spark" },
  { step: 7, title: "Choosing scenes", model: "muse-image" },
];

const TERMINAL = ["done", "failed", "rejected"];

export default function Processing(): React.JSX.Element {
  const { jobId } = useLocalSearchParams();
  const id = Array.isArray(jobId) ? jobId[0] : (jobId ?? "");
  const router = useRouter();
  const setCurrent = usePocket((s) => s.setCurrent);
  const addEntry = usePocket((s) => s.addEntry);

  const query = useQuery({
    queryKey: ["job", id],
    queryFn: () => getJob(id),
    refetchInterval: (q) => (q.state.data && TERMINAL.includes(q.state.data.state) ? false : 1500),
  });

  const job = query.data ?? null;
  useEffect(() => {
    if (job?.state === "done" && job.reel !== null) {
      setCurrent(job.job_id, job.reel);
      addEntry({ jobId: job.job_id, title: "Your origins", createdAt: new Date().toISOString(), reel: job.reel });
      router.replace("/reel");
    }
  }, [job, setCurrent, addEntry, router]);

  if (job?.state === "rejected" || job?.state === "failed") {
    const kind: NoticeKind = (job.rejection ?? "R4") as NoticeKind;
    return (
      <ScrollView className="flex-1 bg-ink px-6 pt-16">
        <RejectionSheet
          kind={kind}
          primaryLabel="Try again"
          onPrimary={() => router.replace("/upload")}
          secondaryLabel="Back home"
          onSecondary={() => router.replace("/")}
        />
      </ScrollView>
    );
  }

  const byStep = new Map((job?.events ?? []).map((e) => [e.step, e]));
  return (
    <ScrollView className="flex-1 bg-ink px-6 pt-16">
      <Text style={{ fontFamily: "Inter_800ExtraBold" }} className="text-2xl text-white">
        Directing your story
      </Text>
      {STEPS.map((s) => {
        const ev = byStep.get(s.step);
        return (
          <ProcessingLogRow
            key={s.step}
            step={s.step}
            title={ev?.title !== "" && ev?.title !== undefined ? ev.title : s.title}
            model={ev?.model !== "" && ev?.model !== undefined ? ev.model : s.model}
            status={ev?.status === "done" ? "done" : ev?.status === "failed" ? "fail" : ev !== undefined ? "running" : "idle"}
            artifact={ev?.artifact}
          />
        );
      })}
    </ScrollView>
  );
}
