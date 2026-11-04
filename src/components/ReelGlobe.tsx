/**
 * Reel globe (ATLAS): SVG orthographic view of reference sampling locations
 * for the current beat, driven only by beat progress. Export-safe (no WebGL).
 */

import { useMemo } from "react";
import { geoGraticule, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json";
import type { AtlasScene } from "../contracts/index";
import { cameraAt, visibleMarkers } from "../reel/globe";

interface Props {
  scene: AtlasScene;
  beatProgress: number;
  /** 0..1 opacity of the whole globe layer. */
  alpha: number;
}

const SIZE = 600;
const RADIUS = 185;
const LABELS_SHOWN = 3;
const ROTATION_QUANTUM_DEG = 0.5;

type FeatureFn = typeof feature;
const topo = land110 as unknown as Parameters<FeatureFn>[0];
const landObj = (land110 as unknown as { objects: { land: Parameters<FeatureFn>[1] } }).objects.land;
const LAND = feature(topo, landObj) as never;
const GRATICULE = geoGraticule().step([30, 30])();

function quantize(value: number): number {
  return Math.round(value / ROTATION_QUANTUM_DEG) * ROTATION_QUANTUM_DEG;
}

export function ReelGlobe({ scene, beatProgress, alpha }: Props): React.JSX.Element {
  const camera = cameraAt(scene, beatProgress);
  const rotate: [number, number, number] = [quantize(camera.rotate[0]), quantize(camera.rotate[1]), 0];
  const scale = RADIUS * camera.zoom;

  const { landPath, gridPath, projection } = useMemo(() => {
    const projection = geoOrthographic().translate([SIZE / 2, SIZE / 2]).scale(scale).rotate(rotate).clipAngle(90);
    const path = geoPath(projection);
    return { landPath: path(LAND) ?? "", gridPath: path(GRATICULE) ?? "", projection };
  }, [rotate[0], rotate[1], scale]);

  const shown = visibleMarkers(scene.markers, camera.reveal);
  const maxWeight = Math.max(...scene.markers.map((m) => m.weight), 0.0001);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="absolute left-1/2 top-[33%] w-[112%] max-w-none -translate-x-1/2 -translate-y-1/2"
      style={{ opacity: alpha }}
      aria-label={scene.legend}
      role="img"
    >
      <defs>
        <radialGradient id="reel-globe-ocean" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#2a241c" />
          <stop offset="70%" stopColor="#120f0c" />
          <stop offset="100%" stopColor="#050403" />
        </radialGradient>
        <radialGradient id="reel-globe-rim" cx="50%" cy="50%" r="50%">
          <stop offset="86%" stopColor="#EEB057" stopOpacity="0" />
          <stop offset="100%" stopColor="#EEB057" stopOpacity="0.35" />
        </radialGradient>
      </defs>
      <circle cx={SIZE / 2} cy={SIZE / 2} r={scale * 1.04} fill="url(#reel-globe-rim)" />
      <circle cx={SIZE / 2} cy={SIZE / 2} r={scale} fill="url(#reel-globe-ocean)" />
      <path d={gridPath} fill="none" stroke="#EEB057" strokeOpacity={0.12} strokeWidth={0.6} />
      <path d={landPath} fill="#3a3026" stroke="#d9c3a3" strokeOpacity={0.55} strokeWidth={0.8} />
      {shown.map((m, i) => {
        const point = projection([m.lon, m.lat]);
        if (point === null) return null;
        /* Hidden hemisphere: points are not clipped by the projection, so test the great-circle angle to the centre. */
        const toRad = Math.PI / 180;
        const lat0 = -rotate[1] * toRad;
        const lon0 = -rotate[0] * toRad;
        const facing = Math.sin(lat0) * Math.sin(m.lat * toRad) + Math.cos(lat0) * Math.cos(m.lat * toRad) * Math.cos(m.lon * toRad - lon0);
        if (facing < 0.05) return null;
        const r = 5 + 11 * Math.sqrt(m.weight / maxWeight);
        const labelled = i < LABELS_SHOWN;
        return (
          <g key={m.id}>
            <circle cx={point[0]} cy={point[1]} r={r * 2.2} fill="#EEB057" fillOpacity={0.12} />
            <circle cx={point[0]} cy={point[1]} r={r} fill="#EEB057" stroke="#0A0908" strokeWidth={2} />
            {labelled && (
              <text x={point[0] + r + 6} y={point[1] + 4} fill="#F5EFE6" fontSize={17} fontFamily="Inter, sans-serif" fontWeight={500} paintOrder="stroke" stroke="#0A0908" strokeWidth={4}>
                {m.place ?? m.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
