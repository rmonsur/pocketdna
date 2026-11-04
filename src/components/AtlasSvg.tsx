/** SVG fallback atlas (ATLAS): equirectangular, same sites/wheel as the globe. */

import { geoEquirectangular, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json";
import type { AtlasSite } from "../contracts/atlas";

interface Props {
  sites: AtlasSite[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const ERA_FILL: Record<string, string> = { bronze: "#EEB057", middle: "#C8F45B", modern: "#FFFFFF" };

export function AtlasSvg({ sites, selectedId, onSelect }: Props): React.JSX.Element {
  type FeatureFn = typeof feature;
  const topo = land110 as unknown as Parameters<FeatureFn>[0];
  const landObj = (land110 as unknown as { objects: { land: Parameters<FeatureFn>[1] } }).objects.land;
  const land = feature(topo, landObj) as never;
  const projection = geoEquirectangular().fitSize([800, 400], land as never);
  const path = geoPath(projection);
  const landPath = path(land as never) ?? "";

  return (
    <svg viewBox="0 0 800 400" className="w-full" role="img" aria-label="Fallback map of approved atlas sites">
      <rect width="800" height="400" fill="#0F0E0C" />
      <path d={landPath} fill="#211F1D" stroke="#EEB057" strokeOpacity={0.35} strokeWidth={0.6} />
      {sites.map((site) => {
        const p = projection([site.lon, site.lat]) ?? [0, 0];
        const selected = site.id === selectedId;
        return (
          <g key={site.id} onClick={() => onSelect(site.id)} className="cursor-pointer">
            <circle cx={p[0]} cy={p[1]} r={selected ? 7 : 5} fill={ERA_FILL[site.era]} stroke="#080706" strokeWidth={1.5} />
            <text x={p[0] + 9} y={p[1] + 3} fill="#E6E2DE" fontSize={11} fontFamily="ui-monospace, monospace">
              {site.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
