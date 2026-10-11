// The brand emblem, extruded in brushed gold from the real logo SVG.
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Float } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import SceneShell from "./SceneShell";

function Emblem() {
  const data = useLoader(SVGLoader, "/brand/logo-mark.svg");
  const ref = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  const { geoms, rings } = useMemo(() => {
    const geoms: { g: THREE.ExtrudeGeometry; accent: boolean }[] = [];
    for (const path of data.paths) {
      const style = (path.userData as any)?.style ?? {};
      const fill = style.fill;
      if (fill && fill !== "none") {
        for (const shape of SVGLoader.createShapes(path)) {
          const g = new THREE.ExtrudeGeometry(shape, { depth: 6, bevelEnabled: true, bevelThickness: 1.4, bevelSize: 0.6, bevelSegments: 3, curveSegments: 10 });
          geoms.push({ g, accent: /b4693e/i.test(fill) });
        }
      }
      // stroked stems → tubes along the polyline
      if (style.stroke && style.stroke !== "none" && (!fill || fill === "none")) {
        for (const sp of path.subPaths) {
          const pts = sp.getPoints().map((p: THREE.Vector2) => new THREE.Vector3(p.x, p.y, 3));
          if (pts.length > 4) {
            const curve = new THREE.CatmullRomCurve3(pts);
            geoms.push({ g: new THREE.TubeGeometry(curve, 80, 1.1, 8, false) as any, accent: true });
          }
        }
      }
    }
    return { geoms, rings: [96, 90.5] };
  }, [data]);

  const gold = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#e0b25f", metalness: 1, roughness: 0.28, clearcoat: 0.5 }), []);
  const copper = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#c77a48", metalness: 1, roughness: 0.32 }), []);

  useFrame(({ clock }, dt) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.rotation.y = THREE.MathUtils.damp(ref.current.rotation.y, Math.sin(t * 0.35) * 0.55 + pointer.x * 0.4, 3, dt);
    ref.current.rotation.x = THREE.MathUtils.damp(ref.current.rotation.x, -pointer.y * 0.25, 3, dt);
  });

  return (
    <group ref={ref}>
      {/* SVG space: y down, 200×200 → flip & center */}
      <group scale={[0.018, -0.018, 0.018]} position={[-1.8, 1.8, 0]}>
        {geoms.map((x, i) => <mesh key={i} geometry={x.g} material={x.accent ? copper : gold} castShadow />)}
        {rings.map((r, i) => (
          <mesh key={r} position={[100, 100, 3]}>
            <torusGeometry args={[r, i === 0 ? 2.2 : 1, 16, 160]} />
            <primitive object={i === 0 ? gold : copper} attach="material" />
          </mesh>
        ))}
        <mesh position={[100, 100, -1]}>
          <cylinderGeometry args={[97, 97, 2, 128]} />
          <meshStandardMaterial color="#4a1520" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

export default function LogoScene() {
  return (
    <SceneShell label="סמל המותג של יהודית מיכאלי בתלת-ממד, מוזהב: זר זית, כובע שף והאותיות י·מ." height="min(56vh, 520px)" camera={{ position: [0, 0, 6.2], fov: 35 }} shadows={false}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 5]} intensity={2} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={4} position={[-3, 2, 3]} scale={[3, 3, 1]} color="#fff3df" />
        <Lightformer form="rect" intensity={2} position={[3, -1, 3]} scale={[3, 2, 1]} color="#ffcf9e" />
        <Lightformer form="ring" intensity={2} position={[0, 4, -2]} scale={3} color="#ffffff" />
      </Environment>
      <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.5}>
        <group rotation={[0, 0, 0]}>
          <Emblem />
        </group>
      </Float>
    </SceneShell>
  );
}
