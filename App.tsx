import coordinate from "./munsell-coordinate";
import interpolate from "./munsell-interpolate";
import { Canvas, ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

function createInstances() {
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
}

type Instances = ReturnType<typeof createInstances>;

type Instance = Instances[number];

function createPointer() {
  const pointer = document.createElement("div");
  Object.assign(pointer.style, {
    display: "none",
    position: "fixed",
    text: "center",
    fontSize: "10px",
    alignItems: "center",
    width: "75px",
    height: "75px",
    borderRadius: "9999px",
    border: "2px solid #000",
  });
  return pointer;
}

function cssrgb(color: number[]) {
  const [r, g, b] = color.map((c) => (c * 255) << 0);
  return `rgb(${r}, ${g}, ${b})`;
}

function csspx(x: number) {
  return `${x}px`;
}

function createStore(instances: Instances) {
  // dummy
  const col = new THREE.Color();
  const mat = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  // writabe
  let pointer: HTMLDivElement;
  let mesh: THREE.InstancedMesh;

  const init = ({ coord, color }: Instance, index: number) => {
    pos.set(...coord.pos);
    quat.setFromEuler(new THREE.Euler(...coord.rot));
    scale.set(...coord.scale);
    mat.compose(pos, quat, scale);
    mesh.setMatrixAt(index, mat);
    col.set(...color);
    mesh.setColorAt(index, col);
  };

  const enter = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const { color } = instances[e.instanceId!];
    const background = cssrgb(color);
    pointer.textContent = background;
    Object.assign(pointer.style, { display: "flex", background });
  };

  const leave = () => {
    pointer.style.display = "none";
  };

  const move = (e: MouseEvent) => {
    const top = csspx(e.clientY);
    const left = csspx(e.clientX);
    console.log(top, left)
    Object.assign(pointer.style, { top, left });
  };

  const mount = () => {
    pointer = createPointer();
    document.body.appendChild(pointer);
    window.addEventListener("mousemove", move);
    instances.forEach(init);
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  const clean = () => {
    pointer.remove();
  };

  const ref = (_mesh: THREE.InstancedMesh | null) => {
    if (!_mesh) return clean();
    mesh = _mesh;
    mount();
  };

  return { ref, enter, leave };
}

function Instances() {
  const material = useMemo(() => new THREE.MeshBasicMaterial(), []);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const instances = useMemo(() => createInstances(), []);
  const store = useMemo(() => createStore(instances), []);

  return (
    <instancedMesh
      ref={store.ref}
      onPointerEnter={store.enter}
      args={[geometry, material, instances.length]}
    />
  );
}

function App() {
  return (
    <Canvas style={{ position: "fixed", top: 0, left: 0 }} linear flat legacy>
      <color attach="background" args={["#A1A1A1"]} />
      <group position-y={-4}>
        <Instances />
      </group>
      <OrbitControls />
    </Canvas>
  );
}

export default App;
