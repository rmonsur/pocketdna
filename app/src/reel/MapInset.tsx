/** MapInset: d3-free SVG path inset. Zero network, pure function of waypoints. */
import Svg, { Circle, Polyline } from "react-native-svg";
import type { LonLat } from "./engine";

interface Props {
  path: LonLat[];
  point: LonLat | null;
  height?: number;
}

function project(p: LonLat): [number, number] {
  return [(p[0] + 180) / 3.6, (90 - p[1]) / 3];
}

export function MapInset({ path, point, height = 120 }: Props): React.JSX.Element | null {
  if (path.length === 0) return null;
  const pts = path.map(project).map((p) => p.join(",")).join(" ");
  const dot = point !== null ? project(point) : null;
  return (
    <Svg height={height} width={height * 1.6} viewBox="0 0 100 60">
      <Polyline points={pts} fill="none" stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={1.5} />
      {dot !== null && <Circle cx={dot[0]} cy={dot[1]} r={3} fill="#EEB057" />}
    </Svg>
  );
}
