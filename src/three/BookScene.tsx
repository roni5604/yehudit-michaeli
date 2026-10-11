// Interactive 3D recipe book (categories index). Hebrew binding: you read the
// right page first and turn pages from left to right. Pages curl as they turn.
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import SceneShell from "./SceneShell";
import { paperTexture, woodTexture, fontsReady } from "./textures";

type PageInfo = { slug: string; he: string; en: string; icon: string; count: number };
const W = 1.5, H = 2.0, SEG = 28;

function makeTex(p: PageInfo | undefined, idx: number, total: number) {
  if (!p) return paperTexture({ title: "סוף הספר", sub: "Fin", small: "תודה שדפדפתם", ornament: true });
  return paperTexture({ title: p.he, sub: p.en, small: `${p.count.toLocaleString("he-IL")} מתכונים · פרק ${idx + 1} מתוך ${total}` });
}

const mirrors = new WeakMap<THREE.Texture, THREE.Texture>();
function mirror(t: THREE.Texture | null) {
  if (!t) return null;
  let m = mirrors.get(t);
  if (!m) { m = t.clone(); m.wrapS = THREE.RepeatWrapping; m.repeat.x = -1; m.offset.x = 1; m.needsUpdate = true; mirrors.set(t, m); }
  return m;
}

/** Flat page lying on XZ plane, x ∈ [0, W] from the spine (local). */
function pageGeometry() {
  const g = new THREE.PlaneGeometry(W, H, SEG, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(W / 2, 0, 0);
  return g;
}

function bend(geo: THREE.BufferGeometry, rest: Float32Array, theta: number) {
  // theta: 0 → page lies on the right, π → lies on the left. Curl strongest mid-turn.
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const curl = Math.sin(theta) * 0.9;
  for (let i = 0; i < pos.count; i++) {
    const x0 = rest[i * 3];
    const t = x0 / W;
    const a = theta + curl * t * t * (theta < Math.PI / 2 ? 1 : -1) * 0.6;
    // integrate along the arc analytically for a smooth curve
    const r = x0;
    pos.setX(i, Math.cos(a) * r);
    pos.setY(i, Math.sin(a) * r * 0.98 + 0.012);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

function Book({ pages, spread, dir, onTurned, onOpen }: {
  pages: PageInfo[]; spread: number; dir: 0 | 1 | -1; onTurned: () => void; onOpen: (slug: string) => void;
}) {
  const [texs, setTexs] = useState<THREE.Texture[] | null>(null);
  useEffect(() => {
    let alive = true;
    fontsReady().then(() => {
      if (!alive) return;
      const n = pages.length;
      setTexs(Array.from({ length: n + 2 }, (_, i) => makeTex(pages[i], i, n)));
    });
    return () => { alive = false; };
  }, [pages]);

  const turnGeo = useMemo(pageGeometry, []);
  const rest = useMemo(() => Float32Array.from(turnGeo.attributes.position.array as Float32Array), [turnGeo]);
  const flat = useMemo(pageGeometry, []);
  const prog = useRef(0);
  const turning = useRef<THREE.Group>(null);

  const k = spread * 2;
  // which textures are visible
  const tex = (i: number) => (texs ? texs[Math.max(0, Math.min(texs.length - 1, i))] : null);
  const rightIdx = dir === -1 ? k - 2 : k;
  const leftIdx = dir === 1 ? k + 3 : k + 1;
  const turnFront = dir === 1 ? k + 2 : k; // visible when lying right
  const turnBack = dir === 1 ? k + 1 : k - 1; // visible when lying left

  const frontMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.92, side: THREE.FrontSide }), []);
  const backMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.92, side: THREE.BackSide }), []);
  useEffect(() => {
    const f = tex(turnFront), b = tex(turnBack);
    frontMat.map = f; frontMat.needsUpdate = true;
    if (b) { const bb = b.clone(); bb.wrapS = THREE.RepeatWrapping; bb.repeat.x = -1; bb.offset.x = 1; bb.needsUpdate = true; backMat.map = bb; backMat.needsUpdate = true; }
  }, [texs, turnFront, turnBack]);

  useEffect(() => { prog.current = 0; }, [dir, spread]);

  useFrame((_, dt) => {
    if (!dir) return;
    prog.current = Math.min(1, prog.current + dt * 1.15);
    const e = THREE.MathUtils.smootherstep(prog.current, 0, 1);
    const theta = dir === 1 ? Math.PI * (1 - e) : Math.PI * e; // next: left→right
    bend(turnGeo, rest, theta);
    if (prog.current >= 1) onTurned();
  });

  const click = (idx: number) => (e: any) => { e.stopPropagation(); const p = pages[idx]; if (p) onOpen(p.slug); };

  return (
    <group rotation={[-0.08, 0, 0]}>
      {/* cover & page block */}
      <mesh position={[0, -0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[W * 2 + 0.22, 0.06, H + 0.2]} />
        <meshStandardMaterial color="#5a1622" roughness={0.55} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * W) / 2, -0.012, 0]} castShadow receiveShadow>
          <boxGeometry args={[W - 0.02, 0.05, H - 0.02]} />
          <meshStandardMaterial color="#efe3cc" roughness={0.9} />
        </mesh>
      ))}
      {/* static right page */}
      <mesh geometry={flat} position={[0, 0.014, 0]} receiveShadow onClick={click(rightIdx)}>
        <meshStandardMaterial key={`r${texs ? rightIdx : "x"}`} map={tex(rightIdx)} roughness={0.92} />
      </mesh>
      {/* static left page (mirror of right) */}
      <mesh geometry={flat} position={[0, 0.014, 0]} rotation={[0, 0, Math.PI]} receiveShadow onClick={click(leftIdx)}>
        <meshStandardMaterial key={`l${texs ? leftIdx : "x"}`} map={mirror(tex(leftIdx))} roughness={0.92} side={THREE.BackSide} />
      </mesh>
      {/* turning page */}
      {dir !== 0 && (
        <group ref={turning} position={[0, 0.02, 0]}>
          <mesh geometry={turnGeo} material={frontMat} castShadow />
          <mesh geometry={turnGeo} material={backMat} castShadow />
        </group>
      )}
      {/* spine ribbon */}
      <mesh position={[0, 0.02, H / 2 + 0.05]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.05, 0.005, 0.5]} />
        <meshStandardMaterial color="#b4693e" roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  );
}

function Rig() {
  const { camera, pointer } = useThree();
  useFrame((_, dt) => {
    camera.position.lerp(new THREE.Vector3(pointer.x * 0.5, 3.6 + pointer.y * 0.2, 2.7), 1 - Math.exp(-2 * dt));
    camera.lookAt(0, 0, 0.1);
  });
  return null;
}

export default function BookScene({ pages }: { pages: PageInfo[] }) {
  const [spread, setSpread] = useState(0);
  const [dir, setDir] = useState<0 | 1 | -1>(0);
  const spreads = Math.ceil(pages.length / 2);
  const next = () => { if (!dir && spread < spreads - 1) setDir(1); };
  const prev = () => { if (!dir && spread > 0) setDir(-1); };
  const onTurned = () => { setSpread((s) => s + dir); setDir(0); };
  const right = pages[spread * 2], left = pages[spread * 2 + 1];
  const wood = useMemo(() => (typeof document !== "undefined" ? woodTexture(1024, 11) : null), []);

  return (
    <div className="book-scene">
      <SceneShell
        label="ספר מתכונים תלת-ממדי שאפשר לדפדף בו. כל עמוד הוא פרק: שם הקטגוריה ומספר המתכונים בה. לחיצה על עמוד פותחת את הפרק."
        height="min(70vh, 640px)"
        camera={{ position: [0, 3.6, 2.7], fov: 38 }}
        controls={
          <>
            <button type="button" className="scene-btn" onClick={prev} disabled={spread === 0 || !!dir} aria-label="לעמוד הקודם">→</button>
            <button type="button" className="scene-btn" onClick={next} disabled={spread >= spreads - 1 || !!dir} aria-label="לעמוד הבא">←</button>
          </>
        }
      >
        <color attach="background" args={["#21160f"]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[-2, 5, 3]} intensity={2.2} color="#ffe6c4" castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[2, 2, 1]} intensity={4} color="#ffb36b" distance={6} />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={2} color="#fff0dc" position={[0, 4, 2]} scale={[5, 3, 1]} />
        </Environment>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.095, 0]} receiveShadow>
          <planeGeometry args={[12, 8]} />
          <meshStandardMaterial map={wood ?? undefined} roughness={0.65} />
        </mesh>
        <Book pages={pages} spread={spread} dir={dir} onTurned={onTurned} onOpen={(s) => (location.href = `/categories/${s}`)} />
        <ContactShadows position={[0, -0.09, 0]} opacity={0.5} scale={8} blur={2} far={1.5} />
        <Rig />
      </SceneShell>
      <p className="book-caption" aria-live="polite">
        {right && <a href={`/categories/${right.slug}`}>{right.he}</a>}
        {left && <> · <a href={`/categories/${left.slug}`}>{left.he}</a></>}
        <span> · עמודים {spread * 2 + 1}–{Math.min(pages.length, spread * 2 + 2)} מתוך {pages.length}</span>
      </p>
    </div>
  );
}
