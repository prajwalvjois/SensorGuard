import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';
import useStore from '../../store/useStore';

// Converts lat/lon-like angles to sphere surface XYZ
function spherePoint(r, phi, theta) {
  return [
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  ];
}

// Wireframe globe using EdgesGeometry for the clean look
function Globe({ threatLevel }) {
  const meshRef  = useRef();
  const glowRef  = useRef();

  const edges = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1.9, 3);
    return new THREE.EdgesGeometry(geo);
  }, []);

  const color = '#94a3b8';

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.12;
    if (glowRef.current) glowRef.current.rotation.y += delta * 0.12;
  });

  return (
    <group>
      {/* Main wireframe */}
      <lineSegments ref={meshRef} geometry={edges}>
        <lineBasicMaterial color={color} transparent opacity={0.35} />
      </lineSegments>

      {/* Inner glow sphere */}
      <mesh ref={glowRef}>
        <icosahedronGeometry args={[1.85, 2]} />
        <meshBasicMaterial
          color={'#ffffff'}
          transparent
          opacity={0.8}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Equator ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.9, 0.004, 8, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} />
      </mesh>

      {/* Meridian rings */}
      {[0, Math.PI / 3, (2 * Math.PI) / 3].map((angle, i) => (
        <mesh key={i} rotation={[0, angle, Math.PI / 2]}>
          <torusGeometry args={[1.9, 0.003, 8, 64]} />
          <meshBasicMaterial color={color} transparent opacity={0.12} />
        </mesh>
      ))}
    </group>
  );
}

// Individual attack marker on globe surface
function AttackMarker({ phi, theta, type, intensity }) {
  const ref = useRef();
  const color = type === 'REPLAY_ATTACK' ? '#db2777' : type?.includes('SPOOF') ? '#ea580c' : '#4f46e5';
  const [pos] = useState(() => spherePoint(2.0, phi, theta));

  useFrame(({ clock }) => {
    if (ref.current) {
      const pulse = Math.sin(clock.elapsedTime * 3) * 0.3 + 0.7;
      ref.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={pos}>
      {/* Core */}
      <mesh ref={ref}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Halo */}
      <mesh>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>
      {/* Line to center */}
      <Line
        points={[[0, 0, 0], [pos[0] * -0.95, pos[1] * -0.95, pos[2] * -0.95]]}
        color={color}
        lineWidth={0.5}
        opacity={0.3}
        transparent
      />
    </group>
  );
}

// Atmosphere haze
function Atmosphere() {
  return (
    <mesh>
      <sphereGeometry args={[2.15, 32, 32]} />
      <meshBasicMaterial
        color="#e2e8f0"
        transparent
        opacity={0.15}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

// Grid of lat/lon lines for realism
function LatLonGrid() {
  const lines = useMemo(() => {
    const result = [];
    // Latitude lines
    for (let lat = -60; lat <= 60; lat += 30) {
      const phi = ((90 - lat) * Math.PI) / 180;
      const pts = [];
      for (let lon = 0; lon <= 360; lon += 5) {
        const theta = (lon * Math.PI) / 180;
        pts.push(new THREE.Vector3(...spherePoint(1.91, phi, theta)));
      }
      result.push(pts);
    }
    return result;
  }, []);

  return (
    <>
      {lines.map((pts, i) => (
        <Line key={i} points={pts} color="#cbd5e1" lineWidth={0.3} opacity={0.15} transparent />
      ))}
    </>
  );
}

// Main scene
function Scene({ attacks, threatLevel }) {
  const markers = useMemo(() => attacks.slice(0, 8).map((a, i) => ({
    ...a,
    phi:   (Math.random() * Math.PI * 0.8) + Math.PI * 0.1,
    theta: Math.random() * Math.PI * 2,
    key:   i,
  })), [attacks.length]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 4, 4]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-4, -4, -4]} intensity={0.4} color="#e0e7ff" />

      <Globe threatLevel={threatLevel} />
      <LatLonGrid />
      <Atmosphere />

      {markers.map((m) => (
        <AttackMarker key={m.key} phi={m.phi} theta={m.theta} type={m.type} intensity={m.anomalyScore} />
      ))}

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.4}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={(3 * Math.PI) / 4}
      />
    </>
  );
}

export default function ThreatGlobe() {
  const { alerts, anomalyScore } = useStore();

  const recentAttacks = useMemo(() =>
    alerts.filter(a => a.severity !== 'info').slice(0, 8),
  [alerts]);

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden flex flex-col h-[400px]">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(226,232,240,0.6)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
          <h2 className="text-slate-800 font-extrabold text-xl">Threat Topology</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">
            {recentAttacks.length} active marker{recentAttacks.length !== 1 ? 's' : ''}
          </span>
          <span
            className="text-xs font-bold px-3 py-1 rounded bg-indigo-50 text-indigo-600 border border-indigo-100"
          >
            3D · Interactive
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 w-full relative">
        <Canvas
          camera={{ position: [0, 0, 4.5], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 1.5]}
          style={{ background: 'transparent' }}
        >
          <Scene attacks={recentAttacks} threatLevel={anomalyScore} />
        </Canvas>
      </div>
    </div>
  );
}
