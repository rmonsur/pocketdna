/** Atlas scenes: gazetteer-only markers, weighted focus, deterministic camera. */
import assert from "node:assert";
import type { EvidenceRecord } from "../src/contracts/index.ts";
import { AtlasSceneSchema } from "../src/contracts/index.ts";
import { ATLAS_LEGEND, convergenceScene, eraScene, focusOf, markersFor } from "../src/server/atlasScenes.ts";
import type { Gazetteer, GazetteerEntry } from "../src/server/gazetteer.ts";
import { labelFor, placeText, publicationYear } from "../src/server/gazetteer.ts";
import { cameraAt, visibleMarkers, wrapLon } from "../src/reel/globe.ts";

function entry(id: string, lat: number | null, lon: number | null): GazetteerEntry {
  return {
    id,
    label: `${id} family`,
    eras: ["middle"],
    groupId: id,
    locality: lat === null ? null : "Site",
    country: lat === null ? null : "Country",
    lat,
    lon,
    dateText: "about 50 BCE",
    publication: "KumarFuMolBiolEvol2021",
    doi: "10.1093/molbev/msab216",
    individuals: 2,
    match: "sample",
  };
}

const gazetteer: Gazetteer = new Map([
  ["A", entry("A", 38.1, 67.3)],
  ["B", entry("B", 43.0, 11.9)],
  ["C", entry("C", null, null)],
]);

const evidence: EvidenceRecord = {
  kind: "raw",
  basisId: "test",
  markerCount: 10,
  usableMarkers: 5,
  epochs: [
    {
      era: "middle",
      shares: [
        { id: "A", label: "A", weight: 0.6, low: 0.5, high: 0.7 },
        { id: "C", label: "C", weight: 0.3, low: 0.2, high: 0.4 },
        { id: "B", label: "B", weight: 0.1, low: 0, high: 0.2 },
        { id: "zero", label: "zero", weight: 0, low: 0, high: 0 },
      ],
      closest: [],
    },
  ],
  limitations: [],
};

const markers = markersFor(evidence.epochs[0].shares, gazetteer);
assert.deepEqual(markers.map((m) => m.id), ["A", "B"], "unlocated and zero-weight sources are omitted");
assert.equal(markers[0].place, "Site, Country");

const focus = focusOf(markers);
assert.ok(focus[0] > 11.9 && focus[0] < 67.3, "focus lies between the markers in longitude");
assert.ok(Math.abs(focus[0] - 67.3) < Math.abs(focus[0] - 11.9), "focus leans to the heavier marker");

const scene = eraScene(evidence, "middle", gazetteer);
assert.ok(scene !== undefined);
assert.equal(scene.preset, "locate-region");
assert.equal(scene.legend, ATLAS_LEGEND);
AtlasSceneSchema.parse(scene);
assert.equal(eraScene(evidence, "bronze", gazetteer), undefined, "no epoch, no scene");
assert.equal(eraScene({ kind: "provider", vendor: "x", shares: [], limitations: [] }, "middle", gazetteer), undefined, "provider evidence has no atlas");

const convergence = convergenceScene(evidence, gazetteer);
assert.ok(convergence !== undefined && convergence.preset === "affinity-overview");

assert.equal(placeText(undefined), null);
assert.equal(labelFor(gazetteer, "A"), "A family");
assert.equal(labelFor(gazetteer, "HGDP00653", "Italian (AD 650–1450)"), "Italian (AD 650–1450)");
assert.equal(labelFor(gazetteer, "Some_Group"), "Some Group");
assert.equal(publicationYear("KumarFuMolBiolEvol2021"), 2021);
assert.equal(publicationYear(null), null);

/* Globe camera: deterministic, bounded, settles on the focus. */
const start = cameraAt(scene, 0);
const settled = cameraAt(scene, 0.5);
assert.deepEqual(cameraAt(scene, 0.25), cameraAt(scene, 0.25), "same progress, same camera");
assert.equal(start.reveal, 0);
assert.ok(Math.abs(settled.rotate[0] + scene.focus[0]) < 0.01, "settled longitude faces the focus");
assert.ok(Math.abs(settled.rotate[1] + scene.focus[1]) < 0.01, "settled latitude faces the focus");
assert.ok(start.rotate[0] !== settled.rotate[0], "camera moves during the settle");
assert.equal(cameraAt(scene, 1).reveal, 1);
assert.equal(wrapLon(190), -170);
assert.equal(wrapLon(-190), 170);
assert.deepEqual(visibleMarkers(["a", "b", "c"], 0.34), ["a", "b"]);
assert.deepEqual(visibleMarkers(["a", "b", "c"], 0), []);

console.log("PASS atlasScenes");
