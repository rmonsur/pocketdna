/** ReelStage: rAF clock driving frameAt(reel, t). Tap pauses + reports the beat. */
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { CitationChip } from "../components/CitationChip";
import type { BeatDto, ReelDto } from "../lib/schemas";
import { frameAt } from "./engine";
import { MapInset } from "./MapInset";
import { SceneView } from "./SceneView";

interface Props {
  reel: ReelDto;
  paused: boolean;
  onTap: (beat: BeatDto) => void;
  /** Deterministic export mode: render exactly this t, no clock. */
  staticT?: number;
}

export function ReelStage({ reel, paused, onTap, staticT }: Props): React.JSX.Element {
  const [liveT, setLiveT] = useState(0);
  const t = staticT ?? liveT;
  const tRef = useRef(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (staticT !== undefined) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number): void => {
      if (!pausedRef.current && tRef.current < reel.duration_s) {
        tRef.current = Math.min(tRef.current + (now - last) / 1000, reel.duration_s);
        setLiveT(tRef.current);
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reel.duration_s, staticT]);

  const frame = frameAt(reel, t);
  const beat = frame.beat as BeatDto;
  return (
    <Pressable
      onPress={() => onTap(beat)}
      className="relative w-full max-w-[430px] flex-1 self-center overflow-hidden bg-ink"
    >
      <SceneView sceneId={beat.scene_id} epoch={beat.epoch} alpha={frame.sceneAlpha} />
      <View className="absolute inset-x-0 top-10 items-end px-5">
        <MapInset path={beat.map_path} point={frame.mapPoint} />
      </View>
      <View className="absolute inset-x-0 bottom-0 px-5 pb-6">
        <Text style={{ fontFamily: "Inter_800ExtraBold" }} className="text-2xl text-white">
          {beat.copy}
        </Text>
        {beat.explainer !== "" && (
          <Text className="mt-2 font-mono text-sm text-white/85">{beat.explainer}</Text>
        )}
        {beat.citation_ids.length > 0 && (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {beat.citation_ids.map((id) => (
              <CitationChip key={id} label={id} />
            ))}
          </View>
        )}
        <View className="mt-4 h-1 w-full bg-white/15">
          <View className="h-1 bg-primary" style={{ width: `${(t / reel.duration_s) * 100}%` }} />
        </View>
      </View>
    </Pressable>
  );
}
