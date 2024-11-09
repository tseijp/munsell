import coordinate from "./munsell-coordinate";
import interpolate from "./munsell-interpolate";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";

function Instances() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const material = useMemo(() => new THREE.MeshBasicMaterial(), []);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const instances = useMemo(() => {
    const ret = [];

    for (let i = 0; i < 40; i++) {
      for (let j = 0; j < 15; j++) {
        for (let k = 0; k < 26; k++) {
          const color = interpolate(i, j, k);
          if (color.some(isNaN)) continue;
          const coord = coordinate(i, j, k);
          ret.push({ coord, color });
        }
      }
    }

    return ret;
  }, []);

  useEffect(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const col = new THREE.Color();
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    instances.forEach(({ coord, color }, idx) => {
      position.set(...coord.pos);
      quaternion.setFromEuler(new THREE.Euler(...coord.rot));
      scale.set(...coord.scale);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(idx, matrix);
      col.set(...color);
      mesh.setColorAt(idx, col);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, instances.length]}
    />
  );
}

function App() {
  return (
    <Canvas style={{ position: "fixed", top: 0, left: 0 }}>
      <color attach="background" args={["#A1A1A1"]} />
      <group position-y={-7}>
        <Instances />
      </group>
      <OrbitControls />
    </Canvas>
  );
}

export default App;
