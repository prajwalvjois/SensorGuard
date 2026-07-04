import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const NODE_COUNT = 120;
const MAX_DIST = 3.5;
const SPEED = 0.0006;

function NetworkParticles({ threatLevel = 0 }) {
  const pointsRef = useRef();
  const linesRef = useRef();

  // Generate stable initial node positions & velocities
  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(NODE_COUNT * 3);
    const velocities = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      velocities.push(
        (Math.random() - 0.5) * SPEED,
        (Math.random() - 0.5) * SPEED,
        (Math.random() - 0.5) * SPEED * 0.3,
      );
    }
    return { positions, velocities };
  }, []);

  // Pre-allocate line buffers (max connections)
  const linePositions = useMemo(() => new Float32Array(NODE_COUNT * NODE_COUNT * 6), []);
  const lineColors    = useMemo(() => new Float32Array(NODE_COUNT * NODE_COUNT * 6), []);

  useFrame(() => {
    const pos = positions;

    // Move nodes
    for (let i = 0; i < NODE_COUNT; i++) {
      pos[i * 3]     += velocities[i * 3];
      pos[i * 3 + 1] += velocities[i * 3 + 1];
      pos[i * 3 + 2] += velocities[i * 3 + 2];
      // Boundary bounce
      if (Math.abs(pos[i * 3])     > 11) velocities[i * 3]     *= -1;
      if (Math.abs(pos[i * 3 + 1]) > 7)  velocities[i * 3 + 1] *= -1;
      if (Math.abs(pos[i * 3 + 2]) > 4)  velocities[i * 3 + 2] *= -1;
    }

    // Update points geometry
    if (pointsRef.current) {
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Build line segments between close nodes
    let lineIdx = 0;
    const threat = threatLevel;

    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const dx = pos[i * 3] - pos[j * 3];
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < MAX_DIST) {
          const alpha = (1 - dist / MAX_DIST) * 0.6;

          linePositions[lineIdx * 6]     = pos[i * 3];
          linePositions[lineIdx * 6 + 1] = pos[i * 3 + 1];
          linePositions[lineIdx * 6 + 2] = pos[i * 3 + 2];
          linePositions[lineIdx * 6 + 3] = pos[j * 3];
          linePositions[lineIdx * 6 + 4] = pos[j * 3 + 1];
          linePositions[lineIdx * 6 + 5] = pos[j * 3 + 2];

          // Color: indigo at normal, rose-tinted at threat
          // Normal: r: 0.38, g: 0.39, b: 0.96 (indigo-500)
          // Threat: r: 0.88, g: 0.15, b: 0.46 (rose-600)
          const baseR = 0.38; const baseG = 0.39; const baseB = 0.96;
          const threatR = 0.88; const threatG = 0.15; const threatB = 0.46;
          
          const r = baseR + (threatR - baseR) * threat;
          const g = baseG + (threatG - baseG) * threat;
          const b = baseB + (threatB - baseB) * threat;

          lineColors[lineIdx * 6]     = r * alpha;
          lineColors[lineIdx * 6 + 1] = g * alpha;
          lineColors[lineIdx * 6 + 2] = b * alpha;
          lineColors[lineIdx * 6 + 3] = r * alpha;
          lineColors[lineIdx * 6 + 4] = g * alpha;
          lineColors[lineIdx * 6 + 5] = b * alpha;

          lineIdx++;
        }
      }
    }

    if (linesRef.current) {
      linesRef.current.geometry.setDrawRange(0, lineIdx * 2);
      linesRef.current.geometry.attributes.position.needsUpdate = true;
      linesRef.current.geometry.attributes.color.needsUpdate = true;
    }
  });

  return (
    <>
      {/* Nodes */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          color="#818cf8"
          transparent
          opacity={0.8}
          sizeAttenuation
        />
      </points>

      {/* Connections */}
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[lineColors, 3]} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.6} />
      </lineSegments>
    </>
  );
}

export default function NetworkField({ threatLevel = 0 }) {
  return (
    <div className="absolute inset-0" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 12], fov: 60 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <fog attach="fog" args={['#ffffff', 15, 30]} />
        <NetworkParticles threatLevel={threatLevel} />
      </Canvas>
    </div>
  );
}
