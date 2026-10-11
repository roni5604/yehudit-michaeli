// The original Michaeli restaurant logo as a floating 3D sign: a cream enamel
// plaque in a brushed-copper frame, swaying gently and following the pointer.
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Float, RoundedBox, ContactShadows } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import SceneShell from "./SceneShell";

function Plaque() {
  const tex = useLoader(THREE.TextureLoader, "/brand/michaeli-logo.png");
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const ref = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  const aspect = 1312 / 369;
  const W = 3.4, H = W / aspect;
  const copper = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#c77a48", metalness: 1, roughness: 0.3, clearcoat: 0.6 }), []);
  useFrame(({ clock }, dt) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, Math.sin(t * 0.4) * 0.25 + pointer.x * 0.35, 3, dt);
    ref.current.rotation.x = THREE.MathUtils.damp(ref.current.rotation.x, -pointer.y * 0.2, 3, dt);
  });
  return (
    <group ref={ref}>
      <RoundedBox args={[W + 0.5, H + 0.5, 0.14]} radius={0.08} smoothness={6} material={copper} castShadow />
      <RoundedBox args={[W + 0.3, H + 0.3, 0.16]} radius={0.05} smoothness={6} castShadow>
        <meshPhysicalMaterial color="#f8f1e6" roughness={0.35} clearcoat={0.8} clearcoatRoughness={0.15} />
      </RoundedBox>
      <mesh position={[0, 0, 0.0815]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial map={tex} transparent roughness={0.5} />
      </mesh>
      {/* hanging chains */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (W / 2 - 0.2), H / 2 + 0.75, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 1.2, 8]} />
          <primitive object={copper} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

export default function LogoScene() {
  return (
    <SceneShell label="הלוגו המקורי של מסעדת מיכאלי – מטבח כפרי, כשלט תלוי בתלת-ממד: הכיתוב מיכאלי בכתב יד עם עלה ירוק." height="min(52vh, 480px)" camera={{ position: [0, 0, 5.4], fov: 35 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 5]} intensity={1.8} castShadow />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} position={[-3, 2, 3]} scale={[3, 3, 1]} color="#fff3df" />
        <Lightformer form="rect" intensity={1.5} position={[3, -1, 3]} scale={[3, 2, 1]} color="#ffcf9e" />
      </Environment>
      <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.35}>
        <Plaque />
      </Float>
      <ContactShadows position={[0, -1.3, 0]} opacity={0.35} scale={8} blur={2.6} far={2} />
    </SceneShell>
  );
}
