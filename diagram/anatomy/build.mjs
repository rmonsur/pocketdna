/**
 * The PocketDNA bench: an isometric figure built with the Anatomy kit
 * (wheresryan22/anatomy, MIT). An evidence card rides a carriage from a
 * sealed analyser box, under one Muse lamp, through two audit stamps and on
 * to a take-up reel. Every readout number comes from the same station model
 * that moves the parts (paid-call counts match src/server/pipeline.ts).
 *
 *   node diagram/anatomy/build.mjs            # dark page
 *   node diagram/anatomy/build.mjs --light    # light page
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const kitScript = () => readFileSync(join(HERE, "kit", "iso-kit.mjs"), "utf8").replace(/^export /gm, "");

const WIDTH = 680;
const HEIGHT = 400;

/* ---------- the model: stations along the rail (x), true call counts ---------- */
const STATIONS = [
  { x: -82, name: "On device", calls: 0, model: "worker" },
  { x: -54, name: "Gatekeeper", calls: 1, model: "Spark low" },
  { x: -36, name: "Extractor", calls: 2, model: "Spark medium" },
  { x: -18, name: "Profiler", calls: 3, model: "Spark high" },
  { x: 0, name: "Citations", calls: 4, model: "Spark high" },
  { x: 18, name: "Director", calls: 5, model: "Spark high" },
  { x: 46, name: "Narrative audit", calls: 6, model: "Spark high" },
  { x: 78, name: "Compliance audit", calls: 7, model: "Spark high" },
  { x: 106, name: "Film ready", calls: 7, model: "reel" },
];
const LAMP_ZONE = [-62, 30];
const STAMPS = [46, 78];
const REACH = [STATIONS[0].x, STATIONS[STATIONS.length - 1].x];

/* ---------- world ---------- */
const PLATE = { x: -180, y: -66, w: 360, d: 132, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

const BOX = { x: -164, y: -22, w: 50, d: 44, r: 3 };
const BOX_H = 26;
const LENS = [-139, 0];

const RAIL_FROM = -106;
const RAIL_TO = 126;
const RAIL_Y = [-17, 12];
const CARRIAGE = { x: -18, y: -24, w: 36, d: 48, r: 3 };
const CARRIAGE_Z = 3;
const CARRIAGE_TOP = 8;
const CARD = { x: -13, y: -13, w: 26, d: 26, r: 1.5 };
const CARD_H = 5;
const CARD_TOP = CARRIAGE_TOP + CARD_H;

const LAMP = { post: [-16, -52], x: -16, r: 14, z: 34, h: 14, armZ: 54, postTop: 64 };
const METER = { at: [-100, -54], r: 8, z: 10, h: 3, span: Math.PI * 1.5 };
const MAX_CALLS = 7;
const STAMP = { postY: -32, postTop: 48, armD: 46, head: 18, headH: 7, rest: 38 };
const REEL = { at: [142, 0], r: 22, z: 6, h: 4 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [LAMP.post[0], LAMP.post[1], LAMP.postTop + 2], [REEL.at[0] + REEL.r, REEL.at[1], REEL.z + REEL.h], [STAMPS[1], STAMP.postY, STAMP.postTop + 12]],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: 42 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const facePath = (points) => k.pathOf(points.map(at), true);

/* ---------- parts ---------- */
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  /* ruler strip along the front edge: one tick every 4 units, a major every 5th */
  const strip = { x: -160, y: PLATE.y + PLATE.d - 15, w: 320, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  /* label plate at the back right */
  const label = { x: 112, y: -58, w: 46, d: 16, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: "faint" }));
  [[4, 30], [4, 22], [4, 36]].forEach(([from, len], i) => {
    const y = label.y + 4 + i * 4;
    out.push(L(k.lineOnTop([label.x + from, y], [label.x + from + len, y], 0.8, P), { tone: "lo", free: true }));
  });
  out.push(D([at([label.x + 2, label.y + 2, 0.8]), at([label.x + label.w - 2, label.y + label.d - 2, 0.8])], { size: 0.4 }));
  return out.join("");
}

/* The sealed analyser: raw genotypes go in through the lid lens, a card comes out of the slot. */
function analyser() {
  const out = [];
  out.push(S(k.slabOf(BOX, 0, BOX_H, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(BOX, 18, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BOX, 3), BOX_H, P, 4), { tone: "faint" }));
  const rivets = k.corners(BOX, 5).map(([x, y]) => at([x, y, BOX_H]));
  out.push(D(rivets, { size: 0.45 }));
  /* exit slot on the +x face, level with the card */
  const fx = BOX.x + BOX.w;
  out.push(L(facePath([[fx, -14, CARRIAGE_TOP], [fx, 14, CARRIAGE_TOP], [fx, 14, CARD_TOP + 1], [fx, -14, CARD_TOP + 1]]), { tone: "lo" }));
  /* lens: a knurled eyepiece on the lid */
  out.push(S(k.cylinder(LENS[0], LENS[1], 9, BOX_H, 3, P, 36), { tone: "mid" }));
  out.push(S(k.cylinder(LENS[0], LENS[1], 7.4, BOX_H + 3, 4, P, 36), { tone: "hi" }));
  out.push(L(k.knurl(LENS[0], LENS[1], 7.4, BOX_H + 3, BOX_H + 7, 40, P), { tone: "lo" }));
  out.push(L(k.ring(LENS[0], LENS[1], 5.2, BOX_H + 7, P, 32), { tone: "lo" }));
  out.push(L(k.ring(LENS[0], LENS[1], 2, BOX_H + 7, P, 16), { tone: "mid" }));
  /* thumb latch on the near side */
  const latch = [BOX.x + 10, BOX.y + BOX.d];
  out.push(S(k.slabOf({ x: latch[0] - 1.4, y: latch[1], w: 2.8, d: 3, r: 0.8 }, 14, 4, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(latch[0], latch[1] + 3.6, 2.4, 13, 6, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(latch[0], latch[1] + 3.6, 2.4, 13, 19, 18, P), { tone: "lo" }));
  return out.join("");
}

function rails() {
  const out = [];
  for (const y of RAIL_Y) {
    out.push(S(k.slabOf({ x: RAIL_FROM, y, w: RAIL_TO - RAIL_FROM, d: 5, r: 1 }, 0, 3, P, 3, 0.4), { tone: "mid" }));
    out.push(D([RAIL_FROM + 6, RAIL_TO - 6].map((x) => at([x, y + 2.5, 3])), { size: 0.4 }));
  }
  for (const x of [RAIL_FROM - 5, RAIL_TO]) {
    out.push(S(k.slabOf({ x, y: -24, w: 5, d: 48, r: 1.2 }, 0, 7, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 2.5, -19, 7]), at([x + 2.5, 19, 7])], { size: 0.45 }));
  }
  return out.join("");
}

/* Carriage with four bushings, a pull knob and the evidence card on top. */
function carriage() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(CARRIAGE, 3), CARRIAGE_Z, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(CARRIAGE, CARRIAGE_Z, CARRIAGE_TOP - CARRIAGE_Z, P, 5, 0.6), { tone: "mid" }));
  for (const [x, y] of k.corners(CARRIAGE, 4)) {
    out.push(S(k.slabOf({ x: x - 3, y: y - 2.5, w: 6, d: 5, r: 1 }, CARRIAGE_Z, 7, P, 3, 0.4), { tone: "mid" }));
    out.push(D([at([x, y, CARRIAGE_Z + 7])], { size: 0.4, tone: "lo" }));
  }
  out.push(D([-10, 0, 10].map((x) => at([x, CARRIAGE.y + CARRIAGE.d - 2.6, CARRIAGE_TOP])), { size: 0.4, tone: "lo" }));
  const handle = [CARRIAGE.x + CARRIAGE.w - 8, CARRIAGE.y + CARRIAGE.d + 3];
  out.push(S(k.slabOf({ x: handle[0] - 2, y: CARRIAGE.y + CARRIAGE.d - 1, w: 4, d: 4, r: 1 }, CARRIAGE_Z + 1, 3, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(handle[0], handle[1] + 1, 3, CARRIAGE_Z, 5, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(handle[0], handle[1] + 1, 3, CARRIAGE_Z, CARRIAGE_Z + 5, 18, P), { tone: "lo" }));
  /* the card: the subject */
  out.push(S(k.slabOf(CARD, CARRIAGE_TOP, CARD_H, P, 3, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(CARD, 2.5), CARD_TOP, P, 3), { tone: "faint" }));
  [[-8, -7, 12], [-8, -3, 9], [-8, 1, 14]].forEach(([x, y, len]) => {
    out.push(L(k.lineOnTop([x, y], [x + len, y], CARD_TOP, P), { tone: "lo", free: true }));
  });
  out.push(`<g data-part="card-dot">${D([at([8, 7, CARD_TOP])], { size: 0.8, tone: "lit" })}</g>`);
  return out.join("");
}

/* The Muse lamp: one post at the back, an arm over the rail, a housing with a light band. */
function lampBack() {
  const out = [];
  const [px, py] = LAMP.post;
  out.push(S(k.cylinder(px, py, 5, 0, 4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(px, py, 3.2, 4, LAMP.armZ - 4 - 4, P, 28), { tone: "mid", crease: "none" }));
  out.push(L([24, 44].map((z) => k.sideArc(px, py, 3.2, z, P, 16)).join(""), { tone: "faint" }));
  return out.join("");
}
function lampFront() {
  const out = [];
  const [px, py] = LAMP.post;
  const clamp = { x: px - 6, y: py - 6, w: 12, d: 12, r: 2.5 };
  out.push(S(k.slabOf(clamp, LAMP.armZ - 4, 10, P, 4, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(px, py, 3.2, LAMP.armZ + 6, LAMP.postTop - LAMP.armZ - 6, P, 28), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(px, py, 3.8, LAMP.postTop, 2, P, 28), { tone: "mid" }));
  const thumb = [clamp.x + clamp.w + 2.6, py];
  out.push(S(k.slabOf({ x: clamp.x + clamp.w, y: py - 1.4, w: 3, d: 2.8, r: 0.8 }, LAMP.armZ + 1, 3, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(thumb[0] + 1.6, py, 2.4, LAMP.armZ - 1, 6, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(thumb[0] + 1.6, py, 2.4, LAMP.armZ - 1, LAMP.armZ + 5, 18, P), { tone: "lo" }));
  /* arm from the clamp out over the rail */
  const arm = { x: LAMP.x - 3, y: py + 6, w: 6, d: -py - 6 + 2, r: 2 };
  out.push(S(k.slabOf(arm, LAMP.armZ, 4, P, 4, 0.5), { tone: "mid" }));
  out.push(D([at([LAMP.x, arm.y + 4, LAMP.armZ + 4]), at([LAMP.x, arm.y + arm.d - 4, LAMP.armZ + 4])], { size: 0.45 }));
  /* stem, cap, housing, light band and bezel */
  out.push(S(k.cylinder(LAMP.x, 0, 2.2, LAMP.z + LAMP.h, LAMP.armZ - LAMP.z - LAMP.h, P, 16), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(LAMP.x, 0, LAMP.r + 1.5, LAMP.z + LAMP.h - 2, 2, P, 56), { tone: "mid" }));
  out.push(S(k.cylinder(LAMP.x, 0, LAMP.r, LAMP.z, LAMP.h - 2, P, 56, 0.6), { tone: "hi", crease: "lo" }));
  out.push(`<g data-part="lamp-band">${L(k.sideArc(LAMP.x, 0, LAMP.r, LAMP.z + 3, P, 40), { tone: "lo" })}</g>`);
  out.push(L(k.sideArc(LAMP.x, 0, LAMP.r, LAMP.z + LAMP.h - 5, P, 40), { tone: "faint" }));
  out.push(L(k.knurl(LAMP.x, 0, LAMP.r, LAMP.z + LAMP.h - 5, LAMP.z + LAMP.h - 2, 72, P, 0.3), { tone: "lo" }));
  /* indicator on the cap: lit while a Spark stage is under the lamp */
  out.push(S(k.cylinder(LAMP.x + 9, 6, 1.8, LAMP.z + LAMP.h, 1.6, P, 16), { tone: "mid" }));
  out.push(`<g data-part="lamp-dot">${D([at([LAMP.x + 9, 6, LAMP.z + LAMP.h + 1.6])], { size: 0.7, tone: "lo" })}</g>`);
  return out.join("");
}

/* A C-frame audit stamp: post at the back, arm over the rail, a head on a plunger. */
function stampBack(cx) {
  const out = [];
  out.push(S(k.cylinder(cx, STAMP.postY, 4.2, 0, 3, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(cx, STAMP.postY, 2.8, 3, STAMP.postTop - 3, P, 24), { tone: "mid", crease: "none" }));
  out.push(L([16, 32].map((z) => k.sideArc(cx, STAMP.postY, 2.8, z, P, 14)).join(""), { tone: "faint" }));
  return out.join("");
}
function stampHead(cx, headZ) {
  const head = { x: cx - STAMP.head / 2, y: -STAMP.head / 2, w: STAMP.head, d: STAMP.head, r: 2 };
  const out = [];
  out.push(S(k.cylinder(cx, 0, 1.6, headZ + STAMP.headH, STAMP.postTop - headZ - STAMP.headH, P, 16), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf(head, headZ, STAMP.headH, P, 3, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(head, 2.2), headZ + STAMP.headH, P, 3), { tone: "faint" }));
  return out.join("");
}
function stampFront(cx, index) {
  const out = [];
  out.push(`<g data-part="stamp-${index}">${stampHead(cx, STAMP.rest)}</g>`);
  const arm = { x: cx - 5, y: STAMP.postY - 2, w: 10, d: STAMP.armD, r: 2 };
  out.push(S(k.slabOf(arm, STAMP.postTop, 6, P, 4, 0.6), { tone: "mid" }));
  out.push(D([at([cx, arm.y + 4, STAMP.postTop + 6]), at([cx, arm.y + arm.d - 4, STAMP.postTop + 6])], { size: 0.45 }));
  out.push(S(k.cylinder(cx, 0, 1.6, STAMP.postTop + 6, 2, P, 16), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(cx, 0, 4.4, STAMP.postTop + 8, 4, P, 28), { tone: "mid" }));
  out.push(L(k.knurl(cx, 0, 4.4, STAMP.postTop + 8, STAMP.postTop + 12, 28, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([cx, 0], [cx + 4.4, 0], STAMP.postTop + 12, P), { tone: "hi" }));
  return out.join("");
}

/* Take-up reel: spindle, disc with a tick ring and a pointer that turns with the film. */
function reelStatic() {
  const [x, y] = REEL.at;
  const out = [];
  out.push(S(k.cylinder(x, y, 5, 0, REEL.z, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, REEL.r, REEL.z, REEL.h, P, 72, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.sideArc(x, y, REEL.r, REEL.z + 1.6, P, 40), { tone: "faint" }));
  out.push(L(k.ring(x, y, REEL.r - 2, REEL.z + REEL.h, P, 72), { tone: "lo" }));
  out.push(L(k.ring(x, y, 4, REEL.z + REEL.h, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 2.2, REEL.z + REEL.h, 3, P, 16), { tone: "mid" }));
  return out.join("");
}
const reelTicksAt = (turn) => {
  const [x, y] = REEL.at;
  const ticks = k.radialTicks(x, y, REEL.r - 3, 36, 6, REEL.z + REEL.h, [1.3, 2.8], P, turn * Math.PI * 2);
  return L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" });
};
const reelPointerAt = (turn) => {
  const [x, y] = REEL.at;
  const a = turn * Math.PI * 2;
  return k.lineOnTop([x + Math.sin(a) * 4.4, y - Math.cos(a) * 4.4], [x + Math.sin(a) * (REEL.r - 5), y - Math.cos(a) * (REEL.r - 5)], REEL.z + REEL.h + 0.2, P);
};


/* Spare-card tray at the front left: the citation index and gazetteer the stages read from. */
function tray() {
  const plan = { x: -150, y: 26, w: 44, d: 16, r: 1.5 };
  const out = [];
  out.push(S(k.slabOf(plan, 0, 3, P, 4, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 2), 3, P, 4), { tone: "faint" }));
  for (const x of [-146, -128]) {
    const slot = { x, y: plan.y + 3, w: 14, d: 10, r: 1 };
    out.push(L(k.planOutline(slot, 3, P, 3), { tone: "lo" }));
    out.push(S(k.slabOf(k.insetPlan(slot, 1), 3, 1.2, P, 3), { tone: "hi", crease: "none" }));
  }
  out.push(D(k.corners(plan, 2.5).map(([x, y]) => at([x, y, 3])), { size: 0.4 }));
  return out.join("");
}

/* Call meter at the back: a dial whose needle reads the paid calls made so far (cap 7 text calls). */
function meter() {
  const [x, y] = METER.at;
  const out = [];
  out.push(S(k.cylinder(x, y, 4, 0, METER.z, P, 24), { tone: "mid" }));
  out.push(L(k.sideArc(x, y, 4, 4, P, 12), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, METER.r, METER.z, METER.h, P, 48, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, METER.r, METER.z, METER.z + METER.h, 40, P, 0.3), { tone: "lo" }));
  out.push(L(k.ring(x, y, METER.r - 1.4, METER.z + METER.h, P, 48), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, METER.r - 2, 15, 7, METER.z + METER.h, [1, 2], P, -METER.span / 2, METER.span);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(x, y, 1, METER.z + METER.h, P, 12), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x + METER.r - 0.5, y: y - 1.6, w: 3, d: 3.2, r: 0.8 }, METER.z + 0.5, 2, P, 2), { tone: "mid", crease: "none" }));
  return out.join("");
}
const needleAt = (calls) => {
  const [x, y] = METER.at;
  const a = -METER.span / 2 + (calls / MAX_CALLS) * METER.span;
  return k.lineOnTop([x - Math.sin(a) * 1.6, y + Math.cos(a) * 1.6], [x + Math.sin(a) * (METER.r - 3), y - Math.cos(a) * (METER.r - 3)], METER.z + METER.h + 0.2, P);
};

const startX = STATIONS[0].x;
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "The PocketDNA bench. A sealed analyser box at the left releases an evidence card through a slot. The card rides a carriage along two rails: under one lamp that lights for each Muse Spark stage, under two stamp presses that drop for the narrative and compliance audits, and on to a take-up reel that winds the finished film.",
  body: [
    plate(),
    tray(),
    analyser(),
    meter(),
    `<path data-part="meter-needle" class="iso-line" data-tone="hi" data-free="start" d="${needleAt(0)}" style="stroke-width:0.9"/>`,
    rails(),
    lampBack(),
    stampBack(STAMPS[0]),
    stampBack(STAMPS[1]),
    `<g data-part="carriage" transform="${k.translateAlong(P, [startX, 0, 0])}">${carriage()}</g>`,
    lampFront(),
    stampFront(STAMPS[0], 0),
    stampFront(STAMPS[1], 1),
    reelStatic(),
    `<g data-part="reel-ticks">${reelTicksAt(0)}</g>`,
    `<path data-part="reel-pointer" class="iso-line" data-tone="lo" data-free="end" d="${reelPointerAt(0)}" style="stroke-width:1.1"/>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const STATIONS = ${JSON.stringify(STATIONS)};
const LAMP_ZONE = ${JSON.stringify(LAMP_ZONE)};
const STAMPS = ${JSON.stringify(STAMPS)};
const REACH = ${JSON.stringify(REACH)};
const REST = ${STAMP.rest}, CARD_TOP = ${CARD_TOP}, POST_TOP = ${STAMP.postTop}, HEAD_H = ${STAMP.headH}, HEAD = ${STAMP.head};
const REEL = ${JSON.stringify(REEL)};
const METER = ${JSON.stringify(METER)}, MAX_CALLS = ${MAX_CALLS};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const carriage = svg.querySelector('[data-part="carriage"]');
const heads = STAMPS.map((_, i) => svg.querySelector('[data-part="stamp-' + i + '"]'));
const lampBand = svg.querySelector('[data-part="lamp-band"] path');
const lampDot = svg.querySelector('[data-part="lamp-dot"] g');
const cardDot = svg.querySelector('[data-part="card-dot"] g');
const reelTicks = svg.querySelector('[data-part="reel-ticks"]');
const reelPointer = svg.querySelector('[data-part="reel-pointer"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const stops = STATIONS.map((s) => s.x);
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const S = (paths, style) => solidSvg(paths, style);
const L = (d, style) => lineSvg(d, style);
function headSvg(cx, headZ) {
  const head = { x: cx - HEAD / 2, y: -HEAD / 2, w: HEAD, d: HEAD, r: 2 };
  return S(cylinder(cx, 0, 1.6, headZ + HEAD_H, POST_TOP - headZ - HEAD_H, P, 16), { tone: "mid", crease: "none" })
    + S(slabOf(head, headZ, HEAD_H, P, 3, 0.5), { tone: "hi", crease: "lo", lit: headZ < REST - 1 })
    + L(planOutline(insetPlan(head, 2.2), headZ + HEAD_H, P, 3), { tone: "faint" });
}
const reelTicksAt = ${reelTicksAt.toString().replace(/k\./g, "")};
const reelPointerAt = ${reelPointerAt.toString().replace(/k\./g, "")};
const nearest = (x) => STATIONS.reduce((best, s) => (Math.abs(s.x - x) < Math.abs(best.x - x) ? s : best), STATIONS[0]);
let x = ${startX}, target = x;
const head = STAMPS.map(() => ({ at: REST, rate: 0 }));
let frame = 0, last = 0, clock = 0, touring = true, visible = false, idleTimer = 0;
const tourAt = (t) => stops[Math.floor(t / 2.0) % stops.length];
const wantHead = (i) => (Math.abs(x - STAMPS[i]) < 5 ? CARD_TOP : REST);
const turnOf = (cx) => Math.max(0, cx - STAMPS[1] - 10) / (REACH[1] - STAMPS[1] - 10);
let lastHead = heads.map(() => NaN), lastTurn = NaN, lastOn = null, lastStamped = null, lastCalls = NaN;
const meterNeedle = svg.querySelector('[data-part="meter-needle"]');
const needleAt = ${needleAt.toString().replace(/k\./g, "")};
function draw() {
  carriage.setAttribute("transform", translateAlong(P, [x, 0, 0]));
  heads.forEach((el, i) => {
    const z = Math.round(head[i].at * 20) / 20;
    if (z !== lastHead[i]) { el.innerHTML = headSvg(STAMPS[i], z); lastHead[i] = z; }
  });
  const on = x >= LAMP_ZONE[0] && x <= LAMP_ZONE[1];
  const stamped = head.some((h) => h.at < REST - 1);
  if (on !== lastOn) { lampBand.setAttribute("data-tone", on ? "lit" : "lo"); lampDot.setAttribute("data-tone", on ? "lit" : "lo"); lastOn = on; }
  const turn = Math.round(turnOf(x) * 200) / 200;
  if (turn !== lastTurn) { reelTicks.innerHTML = reelTicksAt(turn); reelPointer.setAttribute("d", reelPointerAt(turn)); reelPointer.setAttribute("data-tone", turn > 0 ? "lit" : "lo"); lastTurn = turn; }
  const focus = on || stamped || turn > 0;
  if (focus !== lastStamped) { cardDot.setAttribute("data-tone", focus ? "hi" : "lit"); lastStamped = focus; }
  const s = nearest(x);
  const text = s.name + " · " + s.calls + " paid call" + (s.calls === 1 ? "" : "s") + " · " + s.model;
  const calls = Math.round(s.calls * 10) / 10;
  if (calls !== lastCalls) { meterNeedle.setAttribute("d", needleAt(calls)); lastCalls = calls; }
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(STATIONS.indexOf(s)));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; target = tourAt(clock); }
  x = calm ? target : x + (target - x) * (1 - Math.exp(-dt / 0.3));
  if (Math.abs(target - x) < 0.01) x = target;
  let moving = false;
  head.forEach((h, i) => {
    const want = wantHead(i);
    const stiff = 380, drag = calm ? 2 * Math.sqrt(380) : 22;
    for (let step = 0; step < 4; step++) { h.rate += ((want - h.at) * stiff - h.rate * drag) * dt / 4; h.at += h.rate * dt / 4; }
    if (Math.abs(want - h.at) < 0.005 && Math.abs(h.rate) < 0.005) { h.at = want; h.rate = 0; } else moving = true;
  });
  draw();
  const settled = !touring && x === target && !moving;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; target = clamp(next, REACH[0], REACH[1]); clearTimeout(idleTimer); idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 3600); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp(((event.clientX - box.left) / box.width - 0.18) / 0.64, 0, 1);
  steer(REACH[0] + share * (REACH[1] - REACH[0]));
});
stage.addEventListener("pointerleave", () => steer(target));
stage.addEventListener("keydown", (event) => {
  const here = stops.reduce((best, stop, index) => (Math.abs(stop - target) < Math.abs(stops[best] - target) ? index : best), 0);
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.min(stops.length - 1, here + 1);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.max(0, here - 1);
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = stops.length - 1;
  if (to === null) return;
  event.preventDefault();
  steer(stops[to]);
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "The PocketDNA bench",
  hint: "Hover or press arrow keys",
  readout: `${STATIONS[0].name} · 0 paid calls · ${STATIONS[0].model}`,
  keys: [
    { mark: "lit", label: "Working now: the lamp band for a Spark stage, a stamp for an audit, the reel pointer for the film" },
    { mark: "raised", label: "The evidence card: a derived summary, never the genotypes, which stay sealed in the box" },
  ],
  caption:
    "A sealed analyser (the browser worker) releases an evidence card through a slot; the tray holds the citation index it reads. One lamp (Muse Spark, through the server-only adapter) lights for every reasoning stage: gatekeeper, extractor, profiler, citations, director. Two stamps are the narrative and compliance audits; both must press before the reel winds the film. The readout and the dial at the back count the seven paid text calls, as in src/server/pipeline.ts; the image stage adds up to twelve more.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="PocketDNA bench: arrow keys move the evidence card from stage to stage" aria-valuemin="0" aria-valuemax="${STATIONS.length - 1}" aria-valuenow="0">${svg}</div>`,
});

const file = theme === "light" ? "pocketdna-bench-light.html" : "pocketdna-bench.html";
writeFileSync(join(HERE, file), k.pageHtml({ title: "The PocketDNA bench", theme, body, script: kitScript() + live, width: 720 }));
process.stdout.write(`wrote ${file}\n`);
