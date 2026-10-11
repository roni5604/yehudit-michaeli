// Floating menu cards along a candle-lit corridor, ordered by year.
// Scroll (or the arrow buttons) glides the camera through the timeline.
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Sparkles } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import SceneShell from "./SceneShell";
import { paperTexture, fontsReady } from "./textures";

type M = { slug: string; title: string; year: string | null; kind: string };
const GAP = 2.4;

function Card({ m, i, onOpen }: { m: M; i: number; onOpen: (s: string) => void }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const ref = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    fontsReady().then(() => setTex(paperTexture({ title: m.title, sub: m.year ?? "", small: "מיכאלי – מטבח כפרי", w: 640, h: 900 })));
  }, [m]);
  const side = i % 2 ? 1 : -1;
  useFrame(({ clock }, dt) => {
    if (!ref.current) return;
    const t = clock.elapsedTime + i;
    ref.current.position.y = 0.15 + Math.sin(t * 0.8) * 0.06;
    ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, -side * (hover ? 0.12 : 0.42), 5, dt);
  });
  return (
    <group ref={ref} position={[side * 1.05, 0.15, -i * GAP]}>
      <mesh
        castShadow
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}
        onClick={(e) => { e.stopPropagation(); onOpen(m.slug); }}
      >
        <boxGeometry args={[1.05, 1.48, 0.012]} />
        <meshStandardMaterial attach="material-0" color="#e8d9bf" />
        <meshStandardMaterial attach="material-1" color="#e8d9bf" />
        <meshStandardMaterial attach="material-2" color="#e8d9bf" />
        <meshStandardMaterial attach="material-3" color="#e8d9bf" />
        <meshStandardMaterial attach="material-4" map={tex ?? undefined} roughness={0.9} emissive="#2a1a10" emissiveIntensity={hover ? 0.25 : 0} />
        <meshStandardMaterial attach="material-5" color="#6b1e2b" roughness={0.7} />
      </mesh>
    </group>
  );
}

function Rig({ count, track, index }: { count: number; track?: string; index: number | null }) {
  const { camera, pointer } = useThree();
  const z = useRef(3);
  useFrame((_, dt) => {
    let p = 0;
    const el = track ? document.querySelector<HTMLElement>(track) : null;
    if (el) {
      const r = el.getBoundingClientRect();
      p = THREE.MathUtils.clamp((innerHeight * 0.5 - r.top) / Math.max(1, r.height), 0, 1);
    }
    const target = index !== null ? 2.6 - index * GAP : 3 - p * (count - 1) * GAP;
    z.current = THREE.MathUtils.damp(z.current, target, 2.5, dt);
    camera.position.set(pointer.x * 0.3, 0.35 + pointer.y * 0.1, z.current);
    camera.lookAt(0, 0.15, z.current - 4);
  });
  return null;
}

export default function MenuCorridor({ menus, track }: { menus: M[]; track?: string }) {
  const [idx, setIdx] = useState<number | null>(null);
  const len = menus.length * GAP + 8;
  const candles = useMemo(() => Array.from({ length: Math.ceil(menus.length / 2) + 2 }, (_, i) => i), [menus.length]);
  return (
    <SceneShell
      label="מסדרון תלת-ממדי של כרטיסי התפריטים של מסעדת מיכאלי, מסודרים לפי שנים. רשימת כל התפריטים מופיעה מתחת."
      height="min(70vh, 640px)"
      camera={{ position: [0, 0.35, 3], fov: 45 }}
      controls={
        <>
          <button type="button" className="scene-btn" onClick={() => setIdx((i) => Math.max(0, (i ?? 0) - 1))} aria-label="לתפריט הקודם">→</button>
          <button type="button" className="scene-btn" onClick={() => setIdx((i) => Math.min(menus.length - 1, (i ?? -1) + 1))} aria-label="לתפריט הבא">←</button>
        </>
      }
    >
      <color attach="background" args={["#130d0a"]} />
      <fog attach="fog" args={["#130d0a", 3, 14]} />
      <ambientLight intensity={0.35} />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={1.5} color="#ffd9b0" position={[0, 2, 2]} scale={[4, 2, 1]} />
      </Environment>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.75, -len / 2 + 4]} receiveShadow>
        <planeGeometry args={[6, len]} />
        <meshStandardMaterial color="#2a1b14" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* candle lights along the corridor */}
      {candles.map((i) => (
        <group key={i} position={[0, -0.3, -i * GAP * 2 + 1]}>
          <pointLight intensity={2.4} distance={4.5} color="#ffb067" decay={1.5} />
          <mesh position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.4, 12]} />
            <meshStandardMaterial color="#f4ecdc" />
          </mesh>
          <mesh position={[0, -0.02, 0]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color="#ffd08a" toneMapped={false} />
          </mesh>
        </group>
      ))}
      {menus.map((m, i) => <Card key={m.slug} m={m} i={i} onOpen={(s) => (location.href = `/menus/${s}`)} />)}
      <Sparkles count={120} scale={[5, 2, len]} position={[0, 0.4, -len / 2 + 4]} size={2} speed={0.25} color="#ffd6a0" opacity={0.6} />
      <Rig count={menus.length} track={track} index={idx} />
    </SceneShell>
  );
}
