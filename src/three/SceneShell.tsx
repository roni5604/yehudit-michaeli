// Shared wrapper for every 3D scene:
//  • mounts the <Canvas> only when WebGL is available and the user has not asked for reduced motion
//  • pauses rendering when off-screen or when "stop animations" is on (WCAG 2.2.2)
//  • exposes a visible Pause/Play control and a text alternative
//  • falls back to a static poster (decorative) otherwise
import { Canvas, type CanvasProps } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import "./scene.css";

function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
const motionOff = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("a11y-no-motion");

interface Props {
  label: string; // accessible description of the scene
  poster?: ReactNode; // static fallback
  className?: string;
  height?: string;
  children: ReactNode;
  camera?: CanvasProps["camera"];
  dpr?: CanvasProps["dpr"];
  shadows?: boolean;
  /** render one still frame even when motion is off (scene is then static, not hidden) */
  stillWhenReduced?: boolean;
  controls?: ReactNode; // extra accessible controls (e.g. prev/next)
}

export default function SceneShell({ label, poster, className, height = "min(78vh, 760px)", children, camera, dpr = [1, 1.75], shadows = true, stillWhenReduced = true, controls }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [can, setCan] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setCan(webglOK());
    const r = motionOff();
    setReduced(r);
    setPaused(r);
    const onA11y = () => { const m = motionOff(); setReduced(m); setPaused(m); };
    window.addEventListener("ym:a11y", onA11y);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120px" });
    if (ref.current) io.observe(ref.current);
    return () => { io.disconnect(); window.removeEventListener("ym:a11y", onA11y); };
  }, []);

  const running = visible && !paused;
  const showCanvas = can && (!reduced || stillWhenReduced);

  return (
    <div ref={ref} className={`scene ${className ?? ""}`} style={{ height }}>
      <div className="scene-a11y visually-hidden">{label}</div>
      {showCanvas ? (
        <Canvas
          aria-hidden="true"
          tabIndex={-1}
          shadows={shadows}
          dpr={dpr}
          camera={camera ?? { position: [0, 2.2, 6], fov: 35 }}
          frameloop={running ? "always" : "demand"}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        >
          <Suspense fallback={null}>{children}</Suspense>
        </Canvas>
      ) : (
        <div className="scene-poster" aria-hidden="true">{poster}</div>
      )}
      {showCanvas && (
        <div className="scene-ui">
          {controls}
          <button
            type="button" className="scene-btn" aria-pressed={paused}
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "הפעלת האנימציה" : "עצירת האנימציה"}
          >
            {paused ? "▶" : "❚❚"}
          </button>
        </div>
      )}
    </div>
  );
}
