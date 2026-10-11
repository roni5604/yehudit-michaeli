// "שולחן השפית": the home-page hero. Everything is procedural: lathe-turned
// copper cocotte, glass, bowl, candle; canvas-drawn wood & linen; shader steam.
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, Float } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import SceneShell from "./SceneShell";
import { woodTexture, linenTexture, softDot } from "./textures";

const V = (x: number, y: number) => new THREE.Vector2(x, y);

// ───────────── copper cocotte ─────────────
function Cocotte() {
  const body = useMemo(() => new THREE.LatheGeometry(
    [V(0, 0), V(0.82, 0.0), V(0.95, 0.04), V(1.02, 0.14), V(1.05, 0.45), V(1.04, 0.7), V(1.07, 0.74), V(1.07, 0.78), V(1.0, 0.78), V(0.98, 0.72), V(0.98, 0.1), V(0, 0.1)], 96), []);
  const copper = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#d27a45", metalness: 0.92, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.18, envMapIntensity: 2.2 }), []);
  const brass = useMemo(() => new THREE.MeshStandardMaterial({ color: "#b8913f", metalness: 1, roughness: 0.32 }), []);
  const tin = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d9d4ca", metalness: 0.9, roughness: 0.35, side: THREE.BackSide }), []);
  return (
    <group position={[0, 0, 0]}>
      <mesh geometry={body} material={copper} castShadow receiveShadow />
      <mesh geometry={body} material={tin} scale={[0.985, 1, 0.985]} />
      <Stew />

      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.13, 0.58, 0]} rotation={[0, 0, Math.PI / 2]} material={brass} castShadow>
          <torusGeometry args={[0.13, 0.035, 16, 32, Math.PI]} />
        </mesh>
      ))}
    </group>
  );
}

// ───────────── bourguignon inside the pot ─────────────
function Stew() {
  const chunks = useMemo(() => {
    const r = (s: number) => { const x = Math.sin(s * 71.7) * 43758.5453; return x - Math.floor(x); };
    return Array.from({ length: 26 }, (_, i) => {
      const a = r(i) * Math.PI * 2, d = Math.sqrt(r(i + 5)) * 0.82;
      const kind = i % 4 === 0 ? "carrot" : i % 6 === 1 ? "onion" : i % 5 === 2 ? "mush" : "beef";
      return { p: [Math.cos(a) * d, 0.575 + r(i + 9) * 0.025, Math.sin(a) * d] as [number, number, number], s: 0.085 + r(i + 2) * 0.05, rot: r(i + 4) * 3, kind };
    });
  }, []);
  return (
    <group>
      <mesh position={[0, 0.615, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.975, 64]} />
        <meshPhysicalMaterial color="#5a1a0e" roughness={0.12} clearcoat={1} clearcoatRoughness={0.05} sheen={0.4} sheenColor="#a0442a" />
      </mesh>
      {chunks.map((c, i) => (
        <mesh key={i} position={c.p} rotation={c.kind === "carrot" ? [0.15, c.rot, 0.1] : [c.rot, c.rot * 1.3, 0]} scale={c.kind === "beef" ? [1.35, 0.6, 1.05] : 1} castShadow>
          {c.kind === "carrot" ? <cylinderGeometry args={[c.s * 0.55, c.s * 0.55, c.s * 0.28, 18]} /> : c.kind === "mush" ? <sphereGeometry args={[c.s * 0.62, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /> : c.kind === "onion" ? <sphereGeometry args={[c.s * 0.45, 16, 12]} /> : <dodecahedronGeometry args={[c.s * 0.8, 0]} />}
          <meshPhysicalMaterial color={c.kind === "carrot" ? "#e07a2a" : c.kind === "mush" ? "#c9ad86" : c.kind === "onion" ? "#efe2c8" : "#7a3420"} roughness={c.kind === "beef" ? 0.62 : 0.4} clearcoat={0.7} clearcoatRoughness={0.25} />
        </mesh>
      ))}
      {/* thyme leaves on top */}
      {Array.from({ length: 18 }, (_, i) => (
        <mesh key={`t${i}`} position={[Math.cos(i * 2.4) * 0.5 * ((i % 4) / 4 + 0.3), 0.66, Math.sin(i * 2.4) * 0.5 * ((i % 4) / 4 + 0.3)]} rotation={[-Math.PI / 2, 0, i]}>
          <circleGeometry args={[0.025, 6]} />
          <meshStandardMaterial color="#5f7d3a" />
        </mesh>
      ))}
    </group>
  );
}

// ───────────── steam ─────────────
const steamVert = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime; uniform float uSeed;
  void main() {
    vUv = uv;
    vec3 p = position;
    float t = uTime * 0.35 + uSeed;
    p.x += sin(p.y * 2.2 + t * 2.0) * 0.18 * uv.y;
    p.z += cos(p.y * 1.7 + t * 1.4) * 0.08 * uv.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;
const steamFrag = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime; uniform float uSeed; uniform float uOpacity;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
  float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.22 + uSeed;
    float n = fbm(vec2(uv.x * 2.6, uv.y * 3.4 - t * 1.6));
    float wisp = smoothstep(0.42, 0.85, n);
    float edge = smoothstep(0.0, 0.32, uv.x) * smoothstep(1.0, 0.68, uv.x);
    float fade = smoothstep(0.0, 0.18, uv.y) * smoothstep(1.0, 0.45, uv.y);
    float a = wisp * edge * fade * uOpacity;
    gl_FragColor = vec4(vec3(1.0, 0.98, 0.95), a);
  }`;

function Steam({ count = 3 }: { count?: number }) {
  const mats = useMemo(() => Array.from({ length: count }, (_, i) => new THREE.ShaderMaterial({
    vertexShader: steamVert, fragmentShader: steamFrag, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uSeed: { value: i * 3.7 }, uOpacity: { value: 0.55 } },
  })), [count]);
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();
  useFrame((_, dt) => {
    mats.forEach((m) => (m.uniforms.uTime.value += dt));
    if (group.current) group.current.quaternion.copy(camera.quaternion); // billboard
  });
  return (
    <group position={[0, 0.95, 0]}>
      <group ref={group}>
        {mats.map((m, i) => (
          <mesh key={i} material={m} position={[(i - 1) * 0.28, 1.05, i * 0.02]} scale={[1, 1, 1]}>
            <planeGeometry args={[0.9, 2.1, 1, 24]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ───────────── wine glass ─────────────
function WineGlass(props: JSX.IntrinsicElements["group"]) {
  const glass = useMemo(() => new THREE.LatheGeometry(
    [V(0, 0), V(0.34, 0.0), V(0.36, 0.015), V(0.06, 0.04), V(0.035, 0.08), V(0.03, 0.62), V(0.06, 0.7), V(0.28, 0.82), V(0.36, 1.0), V(0.37, 1.18), V(0.34, 1.4), V(0.33, 1.42)], 64), []);
  const wine = useMemo(() => new THREE.LatheGeometry(
    [V(0, 0.72), V(0.06, 0.72), V(0.26, 0.83), V(0.33, 0.98), V(0.335, 1.04), V(0, 1.04)], 64), []);
  return (
    <group {...props}>
      <mesh geometry={glass} castShadow>
        <meshPhysicalMaterial transmission={1} thickness={0.08} roughness={0.04} ior={1.5} color="#ffffff" transparent opacity={1} side={THREE.DoubleSide} envMapIntensity={1.4} />
      </mesh>
      <mesh geometry={wine} scale={[0.95, 1, 0.95]}>
        <meshPhysicalMaterial color="#5e0b1c" roughness={0.1} transmission={0.35} thickness={0.6} ior={1.34} attenuationColor="#3a0410" attenuationDistance={0.4} />
      </mesh>
    </group>
  );
}

// ───────────── olive bowl ─────────────
function OliveBowl(props: JSX.IntrinsicElements["group"]) {
  const bowl = useMemo(() => new THREE.LatheGeometry(
    [V(0, 0.0), V(0.24, 0.0), V(0.27, 0.03), V(0.5, 0.2), V(0.56, 0.3), V(0.55, 0.32), V(0.5, 0.25), V(0.26, 0.08), V(0, 0.06)], 64), []);
  const olives = useMemo(() => {
    const r = (s: number) => { const x = Math.sin(s * 99.13) * 43758.5453; return x - Math.floor(x); };
    return Array.from({ length: 14 }, (_, i) => {
      const a = r(i) * Math.PI * 2, d = 0.06 + r(i + 7) * 0.3;
      return { p: [Math.cos(a) * d, 0.16 + r(i + 3) * 0.08 + (d < 0.15 ? 0.06 : 0), Math.sin(a) * d] as [number, number, number], rot: r(i + 11) * 3, c: i % 3 === 0 ? "#3d2a35" : "#5b6b2c" };
    });
  }, []);
  return (
    <group {...props}>
      <mesh geometry={bowl} castShadow receiveShadow>
        <meshPhysicalMaterial color="#f1e9dc" roughness={0.25} clearcoat={0.8} side={THREE.DoubleSide} />
      </mesh>
      {olives.map((o, i) => (
        <mesh key={i} position={o.p} rotation={[o.rot, o.rot * 0.7, 0]} scale={[0.07, 0.07, 0.095]} castShadow>
          <sphereGeometry args={[1, 20, 16]} />
          <meshPhysicalMaterial color={o.c} roughness={0.28} clearcoat={1} clearcoatRoughness={0.15} />
        </mesh>
      ))}
    </group>
  );
}

// ───────────── rosemary sprig ─────────────
function Rosemary(props: JSX.IntrinsicElements["group"]) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 70;
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < N; i++) {
      const t = i / N;
      const side = i % 2 ? 1 : -1;
      e.set(0, 0, side * (0.9 + Math.sin(i) * 0.25) + Math.PI / 2);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(t * 1.1 - 0.55, 0.025, side * 0.012), q, new THREE.Vector3(1 - t * 0.4, 1, 1));
      ref.current!.setMatrixAt(i, m);
    }
    ref.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group {...props}>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.025, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.012, 1.2, 6]} />
        <meshStandardMaterial color="#6b5a3a" roughness={0.8} />
      </mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, N]} castShadow>
        <capsuleGeometry args={[0.008, 0.11, 2, 6]} />
        <meshStandardMaterial color="#47603a" roughness={0.6} />
      </instancedMesh>
    </group>
  );
}

// ───────────── baguette ─────────────
function Baguette(props: JSX.IntrinsicElements["group"]) {
  return (
    <group {...props}>
      <mesh rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.8]} castShadow receiveShadow>
        <capsuleGeometry args={[0.16, 1.9, 12, 32]} />
        <meshStandardMaterial color="#c28a45" roughness={0.75} />
      </mesh>
      {[-0.6, -0.2, 0.2, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.13, 0]} rotation={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.32, 0.02, 0.05]} />
          <meshStandardMaterial color="#e8c487" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ───────────── candle ─────────────
function Candle(props: JSX.IntrinsicElements["group"]) {
  const light = useRef<THREE.PointLight>(null);
  const flame = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const f = 1 + Math.sin(t * 13) * 0.05 + Math.sin(t * 7.3) * 0.07 + Math.sin(t * 23.1) * 0.03;
    if (light.current) light.current.intensity = 3.2 * f;
    if (flame.current) { flame.current.scale.set(1, f, 1); flame.current.rotation.z = Math.sin(t * 3) * 0.06; }
  });
  return (
    <group {...props}>
      <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.27, 0.12, 48]} />
        <meshStandardMaterial color="#b8913f" metalness={1} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.9, 32]} />
        <meshPhysicalMaterial color="#f4ecdc" roughness={0.6} transmission={0.15} thickness={0.5} />
      </mesh>
      <mesh ref={flame} position={[0, 1.08, 0]}>
        <coneGeometry args={[0.035, 0.16, 16]} />
        <meshBasicMaterial color="#ffcf73" toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 1.15, 0]} color="#ffb36b" distance={6} decay={1.6} castShadow={false} />
    </group>
  );
}

// ───────────── flour dust ─────────────
function Dust({ count = 260 }) {
  const ref = useRef<THREE.Points>(null);
  const { geo, speeds } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 9; p[i * 3 + 1] = Math.random() * 4; p[i * 3 + 2] = (Math.random() - 0.5) * 5;
      s[i] = 0.02 + Math.random() * 0.05;
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return { geo: g, speeds: s };
  }, [count]);
  const tex = useMemo(() => softDot(), []);
  useFrame(({ clock }, dt) => {
    const a = geo.attributes.position as THREE.BufferAttribute;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      let y = a.getY(i) + speeds[i] * dt;
      if (y > 4) y = 0;
      a.setY(i, y);
      a.setX(i, a.getX(i) + Math.sin(t * 0.3 + i) * 0.0015);
    }
    a.needsUpdate = true;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial map={tex} size={0.045} transparent opacity={0.55} depthWrite={false} color="#fff4e0" sizeAttenuation />
    </points>
  );
}

// ───────────── camera choreography ─────────────
const SHOTS = [
  { pos: new THREE.Vector3(1.05, 2.7, 6.9), look: new THREE.Vector3(1.1, 0.65, 0) }, // establishing (tableau sits left of the copy)
  { pos: new THREE.Vector3(-1.6, 1.7, 3.2), look: new THREE.Vector3(0, 0.9, 0) }, // cocotte close-up
  { pos: new THREE.Vector3(2.6, 1.6, 2.8), look: new THREE.Vector3(1.9, 0.9, 0.4) }, // wine & candle
  { pos: new THREE.Vector3(0.0, 6.2, 2.2), look: new THREE.Vector3(0, 0, 0) }, // overhead "recipe" view
];

function Rig({ track }: { track?: string }) {
  const { camera, pointer, size } = useThree();
  const look = useRef(new THREE.Vector3().copy(SHOTS[0].look));
  const prog = useRef(0);
  useFrame((_, dt) => {
    let p = 0;
    const el = track ? document.querySelector<HTMLElement>(track) : null;
    if (el) {
      const r = el.getBoundingClientRect();
      p = THREE.MathUtils.clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
    }
    prog.current = THREE.MathUtils.damp(prog.current, p, 4, dt);
    const seg = prog.current * (SHOTS.length - 1);
    const i = Math.min(Math.floor(seg), SHOTS.length - 2);
    const k = THREE.MathUtils.smootherstep(seg - i, 0, 1);
    const target = new THREE.Vector3().lerpVectors(SHOTS[i].pos, SHOTS[i + 1].pos, k);
    const lt = new THREE.Vector3().lerpVectors(SHOTS[i].look, SHOTS[i + 1].look, k);
    if (size.width < 900 && i === 0) { const off = 1.15 * (1 - k); target.x -= off; lt.x -= off; target.z += 1.2 * (1 - k); }
    target.x += pointer.x * 0.35;
    target.y += pointer.y * 0.18;
    camera.position.lerp(target, 1 - Math.exp(-3 * dt));
    look.current.lerp(lt, 1 - Math.exp(-3 * dt));
    camera.lookAt(look.current);
  });
  return null;
}

function Table() {
  const wood = useMemo(() => { const t = woodTexture(); t.repeat.set(1.6, 1); return t; }, []);
  const linen = useMemo(() => linenTexture(), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 8]} />
        <meshStandardMaterial map={wood} roughness={0.62} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0.12]} position={[-0.2, 0.004, 0.1]} receiveShadow>
        <planeGeometry args={[3.2, 2.2]} />
        <meshStandardMaterial map={linen} roughness={0.95} />
      </mesh>
    </group>
  );
}

function Scene({ track }: { track?: string }) {
  return (
    <>
      <color attach="background" args={["#1a120e"]} />
      <fog attach="fog" args={["#1a120e", 9, 18]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[-4, 6, 3]} intensity={2.2} color="#ffe2bf" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}>
        <orthographicCamera attach="shadow-camera" args={[-6, 6, 6, -6, 0.5, 20]} />
      </directionalLight>
      <spotLight position={[3, 5, 4]} angle={0.5} penumbra={0.8} intensity={30} color="#ffd2a6" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} color="#ffe6c8" position={[-4, 3, 2]} scale={[4, 3, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ffbe86" position={[4, 2, -2]} scale={[3, 2, 1]} />
        <Lightformer form="ring" intensity={2} color="#fff3e2" position={[0, 6, 0]} scale={4} />
        <Lightformer form="rect" intensity={1.4} color="#ffd9b0" position={[0, 1.5, 6]} scale={[8, 2.5, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#ffe8cc" position={[-5, 1, 0]} rotation={[0, Math.PI / 2, 0]} scale={[4, 3, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#6b1e2b" position={[5, 1, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[4, 2, 1]} />
      </Environment>

      <Table />
      <group position={[-0.2, 0, 0.1]}>
        <Cocotte />
        <Steam />
      </group>
      <WineGlass position={[1.75, 0, 0.55]} />
      <Candle position={[2.65, 0, -0.55]} />
      <OliveBowl position={[-1.95, 0, 0.95]} />
      <Rosemary position={[-0.9, 0, 1.55]} rotation={[0, 0.5, 0]} />
      <Rosemary position={[1.05, 0, 1.45]} rotation={[0, -0.9, 0]} scale={0.8} />
      <Baguette position={[-2.6, 0.13, -0.9]} rotation={[0, 0.65, 0]} />
      <Float speed={1} rotationIntensity={0} floatIntensity={0.15}><Dust /></Float>
      <ContactShadows position={[0, 0.006, 0]} opacity={0.55} scale={12} blur={2.4} far={3} resolution={1024} color="#1a0d06" />
      <Rig track={track} />
    </>
  );
}

export default function HeroScene({ track }: { track?: string }) {
  return (
    <SceneShell
      label="הדמיה תלת-ממדית של שולחן השפית: סיר נחושת מעלה אדים, כוס יין אדום, נר דולק, קערת זיתים, ענפי רוזמרין ובגט טרי על שולחן עץ."
      height="100%"
      className="hero-scene"
      camera={{ position: [1.05, 2.7, 6.9], fov: 32, near: 0.1, far: 50 }}
      poster={<img src="/brand/hero-poster.jpg" alt="" />}
    >
      <Scene track={track} />
    </SceneShell>
  );
}
