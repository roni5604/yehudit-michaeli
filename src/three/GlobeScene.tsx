// "מטבחי העולם": a dotted, copper-toned globe with a glowing pin per cuisine.
// Drag to rotate, click a pin (or use the list beside it) to open that cuisine.
import { useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import SceneShell from "./SceneShell";

type Cuisine = { slug: string; he: string; lat: number; lng: number; count: number };
const R = 1.6;

function toVec(lat: number, lng: number, r = R) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const th = ((lng + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}

function Dots() {
  const [geo, setGeo] = useState<THREE.BufferGeometry | null>(null);
  useEffect(() => {
    fetch("/data/globe-dots.json").then((r) => r.json()).then((a: number[]) => {
      const g = new THREE.BufferGeometry();
      const pos = new Float32Array((a.length / 2) * 3);
      for (let i = 0; i < a.length; i += 2) {
        const v = toVec(a[i], a[i + 1], R * 1.002);
        pos.set([v.x, v.y, v.z], (i / 2) * 3);
      }
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      setGeo(g);
    });
  }, []);
  if (!geo) return null;
  return (
    <points geometry={geo}>
      <pointsMaterial size={0.022} color="#d9925e" sizeAttenuation transparent opacity={0.9} />
    </points>
  );
}

function Pin({ c, active, onHover, onOpen }: { c: Cuisine; active: boolean; onHover: (s: string | null) => void; onOpen: (s: string) => void }) {
  const p = useMemo(() => toVec(c.lat, c.lng, R), [c]);
  const tip = useMemo(() => toVec(c.lat, c.lng, R + 0.16 + Math.min(0.3, c.count / 400)), [c]);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(active ? 1.6 : 1 + Math.sin(clock.elapsedTime * 3 + c.lat) * 0.12);
  });
  const mid = p.clone().lerp(tip, 0.5);
  const len = p.distanceTo(tip);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tip.clone().sub(p).normalize());
  return (
    <group>
      <mesh position={mid} quaternion={q}>
        <cylinderGeometry args={[0.006, 0.006, len, 6]} />
        <meshBasicMaterial color="#f3c4cb" transparent opacity={0.7} />
      </mesh>
      <mesh
        ref={ref} position={tip}
        onPointerOver={(e) => { e.stopPropagation(); onHover(c.slug); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { onHover(null); document.body.style.cursor = ""; }}
        onClick={(e) => { e.stopPropagation(); onOpen(c.slug); }}
      >
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color={active ? "#ffffff" : "#e8a9b3"} toneMapped={false} />
      </mesh>
      {active && (
        <Html position={tip} center distanceFactor={6} style={{ pointerEvents: "none" }}>
          <div className="globe-label">{c.he} · {c.count}</div>
        </Html>
      )}
    </group>
  );
}

function FocusOn({ target }: { target: Cuisine | null }) {
  const { camera } = useThree();
  useFrame((_, dt) => {
    if (!target) return;
    const want = toVec(target.lat, target.lng, 5.2);
    camera.position.lerp(want, 1 - Math.exp(-2.5 * dt));
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function GlobeScene({ cuisines }: { cuisines: Cuisine[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const [focus, setFocus] = useState<Cuisine | null>(null);
  const open = (s: string) => (location.href = `/cuisines/${s}`);
  const start = useMemo(() => toVec(38, 25, 5.2), []); // start over the Mediterranean
  return (
    <div className="globe-wrap">
      <SceneShell
        label="גלובוס תלת-ממדי של מטבחי העולם באוסף. לכל מטבח סיכה במדינת המקור; לחיצה פותחת את המתכונים. רשימת המטבחים זמינה גם כקישורים לצד הגלובוס."
        height="min(72vh, 680px)"
        camera={{ position: [start.x, start.y, start.z], fov: 35 }}
        shadows={false}
      >
        <color attach="background" args={["#17110e"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 3, 5]} intensity={1.4} color="#ffe2bf" />
        <mesh>
          <sphereGeometry args={[R, 96, 96]} />
          <meshStandardMaterial color="#2a1d17" roughness={0.85} metalness={0.1} />
        </mesh>
        <mesh scale={1.06}>
          <sphereGeometry args={[R, 64, 64]} />
          <meshBasicMaterial color="#b4693e" transparent opacity={0.07} side={THREE.BackSide} />
        </mesh>
        <Dots />
        {cuisines.map((c) => (
          <Pin key={c.slug} c={c} active={hover === c.slug || focus?.slug === c.slug} onHover={setHover} onOpen={open} />
        ))}
        <OrbitControls enablePan={false} enableZoom={false} autoRotate={!focus && !hover} autoRotateSpeed={0.5} rotateSpeed={0.5} />
        <FocusOn target={focus} />
      </SceneShell>
      <ul className="globe-list" aria-label="מטבחי העולם באוסף">
        {cuisines.map((c) => (
          <li key={c.slug}>
            <a
              href={`/cuisines/${c.slug}`}
              onMouseEnter={() => setFocus(c)} onFocus={() => setFocus(c)}
              onMouseLeave={() => setFocus(null)} onBlur={() => setFocus(null)}
            >
              <span>{c.he}</span><small>{c.count} מתכונים</small>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
