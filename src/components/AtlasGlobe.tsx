/** Three.js globe (ATLAS): approved sites only, t-driven spin, drag to rotate. */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json";
import type { AtlasSite } from "../contracts/atlas";

interface Props {
  sites: AtlasSite[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onError: () => void;
}

const ERA_COLORS: Record<string, number> = { bronze: 0xeeb057, middle: 0xc8f45b, modern: 0xffffff };

function toXYZ(lon: number, lat: number, r: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

function coastlines(radius: number): THREE.LineSegments {
  type FeatureFn = typeof feature;
  const topo = land110 as unknown as Parameters<FeatureFn>[0];
  const landObj = (land110 as unknown as { objects: { land: Parameters<FeatureFn>[1] } }).objects.land;
  const land = feature(topo, landObj) as unknown as {
    geometry: { coordinates: number[][][][] };
  };
  const positions: number[] = [];
  for (const polygon of land.geometry.coordinates) {
    for (const ring of polygon) {
      for (let i = 1; i < ring.length; i += 1) {
        const a = toXYZ(ring[i - 1][0], ring[i - 1][1], radius);
        const b = toXYZ(ring[i][0], ring[i][1], radius);
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xd5c4b2, transparent: true, opacity: 0.5 }));
}

export function AtlasGlobe({ sites, selectedId, onSelect, onError }: Props): React.JSX.Element {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ dragging: false, lastX: 0, offset: 0, spin: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (mount === null) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      onError();
      return;
    }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 3.1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x141310 }),
    );
    group.add(sphere);
    group.add(coastlines(1.002));

    const markers = new Map<string, THREE.Mesh>();
    for (const site of sites) {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(site.id === selectedId ? 0.02 : 0.013, 16, 16),
        new THREE.MeshBasicMaterial({ color: ERA_COLORS[site.era] ?? 0xffffff }),
      );
      marker.position.copy(toXYZ(site.lon, site.lat, 1.01));
      marker.userData.siteId = site.id;
      group.add(marker);
      markers.set(site.id, marker);
    }
    const anchors = ["bronze", "middle", "modern"]
      .map((era) => sites.find((s) => s.era === era))
      .filter((s): s is AtlasSite => s !== undefined);
    for (let i = 1; i < anchors.length; i += 1) {
      const a = toXYZ(anchors[i - 1].lon, anchors[i - 1].lat, 1.01);
      const b = toXYZ(anchors[i].lon, anchors[i].lat, 1.01);
      const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(1.3);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const arc = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)),
        new THREE.LineBasicMaterial({ color: 0xeeb057, transparent: true, opacity: 0.8 }),
      );
      group.add(arc);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onClick = (e: PointerEvent): void => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([...markers.values()]);
      const id = hits[0]?.object.userData.siteId as string | undefined;
      if (id !== undefined) onSelect(id);
    };
    const down = (e: PointerEvent): void => {
      stateRef.current.dragging = true;
      stateRef.current.lastX = e.clientX;
    };
    const move = (e: PointerEvent): void => {
      const s = stateRef.current;
      if (!s.dragging) return;
      s.offset += (e.clientX - s.lastX) * 0.005;
      s.lastX = e.clientX;
    };
    const up = (): void => {
      stateRef.current.dragging = false;
    };
    renderer.domElement.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("click", onClick);

    const resize = (): void => {
      const w = mount.clientWidth || 640;
      const h = mount.clientHeight || 480;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = performance.now();
    const tick = (now: number): void => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!stateRef.current.dragging) stateRef.current.spin += dt * 0.04;
      group.rotation.y = stateRef.current.spin + stateRef.current.offset;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [sites, selectedId, onSelect, onError]);

  return <div ref={mountRef} className="h-[420px] w-full cursor-grab active:cursor-grabbing lg:h-[520px]" role="img" aria-label="Interactive globe of approved atlas sites" />;
}
