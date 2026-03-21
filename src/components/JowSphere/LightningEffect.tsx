"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { JowState } from "@/stores/jowStore";

interface LightningBolt {
  points: THREE.Vector3[];
  opacity: number;
  speed: number;
  timer: number;
  lifespan: number;
}

function createBolt(radius: number): LightningBolt {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI;

  const start = new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi)
  );

  const dir = start.clone().normalize();
  const length = 0.4 + Math.random() * 0.8;
  const segments = 5 + Math.floor(Math.random() * 5);
  const points: THREE.Vector3[] = [start.clone()];

  let current = start.clone();
  for (let i = 0; i < segments; i++) {
    const t = (i + 1) / segments;
    const next = start.clone().add(dir.clone().multiplyScalar(length * t));
    next.x += (Math.random() - 0.5) * 0.15;
    next.y += (Math.random() - 0.5) * 0.15;
    next.z += (Math.random() - 0.5) * 0.15;
    points.push(next);
    current = next;
  }

  return {
    points,
    opacity: 0.8 + Math.random() * 0.2,
    speed: 2 + Math.random() * 3,
    timer: 0,
    lifespan: 0.1 + Math.random() * 0.2,
  };
}

interface Props {
  jowState: JowState;
  radius?: number;
}

export default function LightningEffect({ jowState, radius = 1.1 }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const boltsRef = useRef<LightningBolt[]>([]);
  const linesRef = useRef<THREE.LineSegments[]>([]);
  const MAX_BOLTS = 12;

  const spawnRate = useMemo(() => {
    switch (jowState) {
      case "idle":      return 0.08;
      case "listening": return 0.04;
      case "thinking":  return 0.02;
      case "speaking":  return 0.03;
      case "error":     return 0.05;
    }
  }, [jowState]);

  const boltColor = useMemo(() => {
    switch (jowState) {
      case "idle":      return "#A855F7";
      case "listening": return "#60A5FA";
      case "thinking":  return "#FCD34D";
      case "speaking":  return "#C084FC";
      case "error":     return "#F87171";
    }
  }, [jowState]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // spawn novos raios
    if (Math.random() < spawnRate && boltsRef.current.length < MAX_BOLTS) {
      boltsRef.current.push(createBolt(radius));
    }

    // atualizar e remover raios expirados
    boltsRef.current = boltsRef.current.filter((b) => {
      b.timer += delta;
      return b.timer < b.lifespan;
    });

    // limpar grupo e redesenhar
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }

    boltsRef.current.forEach((bolt) => {
      const progress = bolt.timer / bolt.lifespan;
      const alpha = bolt.opacity * (1 - progress);

      const positions: number[] = [];
      for (let i = 0; i < bolt.points.length - 1; i++) {
        positions.push(
          bolt.points[i].x, bolt.points[i].y, bolt.points[i].z,
          bolt.points[i + 1].x, bolt.points[i + 1].y, bolt.points[i + 1].z
        );
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color(boltColor),
        transparent: true,
        opacity: alpha,
        linewidth: 1,
      });

      const line = new THREE.LineSegments(geo, mat);
      groupRef.current!.add(line);
    });
  });

  return <group ref={groupRef} />;
}
