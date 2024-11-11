import coordinate from "./munsell-coordinate";
import interpolate from "./munsell-interpolate";
import { Canvas, GroupProps, ThreeEvent, useFrame } from "@react-three/fiber";
import { PresentationControls } from "@react-three/drei";
import { useMemo, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";

function range(n = 0) {
  const ret = new Array(n);
  for (; n--; ) ret[n] = n;
  return ret;
}

const I = 40; // hue
const J = 15; // value
const K = 13; // 26; // chroma

let ijk = { i: 10, j: 11, k: 4 };

const listeners = new Set<Function>();

const set = ({ i = ijk.i, j = ijk.j, k = ijk.k }) => {
  ijk = { i, j, k };
  listeners.forEach((f) => f());
};

const sub = (update = () => {}) => {
  listeners.add(update);
  return () => {
    listeners.delete(update);
  };
};

const get = () => ijk;

const useIJK = () => useSyncExternalStore(sub, get, get);

function cssrgb(color: number[]) {
  const [r, g, b] = color.map((c) => (c * 255) << 0);
  return `rgb(${r}, ${g}, ${b})`;
}

function csspx(x: number) {
  return `${x}px`;
}

interface Stop {
  stopPropagation: Function;
}

function createPointer() {
  let el: HTMLDivElement;
  let isEnter = false;

  const enter = (color: number[]) => {
    return <E extends Stop>(e: E) => {
      e.stopPropagation();
      isEnter = true;
      const background = cssrgb(color);
      el.textContent = background;
      Object.assign(el.style, { display: "flex", background });
    };
  };

  const leave = () => {
    el.style.display = "none";
  };

  const move = (e: MouseEvent) => {
    const top = csspx(e.clientY);
    const left = csspx(e.clientX);
    Object.assign(el.style, { top, left });
  };

  const mount = () => {
    el = document.createElement("div");
    document.body.appendChild(el);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseleave", leave);
    Object.assign(el.style, {
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
  };

  const clean = () => {
    el.remove();
  };

  return { mount, clean, enter, leave };
}

const pointer = createPointer();

function createInstances() {
  const ret = [];
  for (let i = 0; i < I; i++) {
    for (let j = 0; j < J; j++) {
      for (let k = 0; k < K; k++) {
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

function createStore(instances: Instances) {
  // dummy
  const col = new THREE.Color();
  const mat = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();

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
    const { color } = instances[e.instanceId!];
    pointer.enter(color);
  };

  const mount = () => {
    pointer.mount();
    instances.forEach(init);
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  const ref = (_mesh: THREE.InstancedMesh | null) => {
    if (!_mesh) return pointer.clean();
    mesh = _mesh;
    mount();
  };

  return { ref, enter };
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

const PI = 3.14;
const _I = (2 * PI) / I;

function Ring() {
  const ijk = useIJK();
  return range(K).map((k) =>
    range(I).map((i) => {
      const color = interpolate(i, ijk.j, k);
      const disable = isNaN(color[0]) || isNaN(color[1]) || isNaN(color[2]);
      if (disable) return null;
      return (
        <mesh
          key={i}
          onClick={() => set({ i })}
          onPointerEnter={pointer.enter(color)}
        >
          <ringGeometry
            args={[k - 0.5, k + 0.5, 30, 8, _I * (I - i - 1), _I * 0.9]}
          />
          <meshBasicMaterial color={color} />
        </mesh>
      );
    })
  );
}

function MoveZ(props: GroupProps) {
  const ijk = useIJK();
  return <group position-z={ijk.j - 1.5}  {...props} />;
}

const width = `calc(min(${(100 / J) << 0}vw, ${(100 / K) << 0}vh))`;
const height = width;

function Palette() {
  const ijk = useIJK();
  return range(K).map((_k) =>
    range(J).map((j) => {
      const k = K - _k - 1;
      const key = `${j}-${k}`;
      const color = interpolate(ijk.i, j, k);
      const disable = isNaN(color[0]) || isNaN(color[1]) || isNaN(color[2]);
      const background = cssrgb(color);
      return (
        <div
          key={key}
          onPointerEnter={pointer.enter(color)}
          style={
            disable
              ? {}
              : {
                  width,
                  height,
                  background,
                  pointerEvents: "auto",
                  borderRadius: `calc(${width} * 0.1)`,
                }
          }
          onClick={() => set({ j, k: K - k - 1 })}
        />
      );
    })
  );
}

function RotateGroup(props: GroupProps) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(() => {
    ref.current.rotation.z += 0.0005;
  });
  return <group ref={ref} {...props} />;
}

function App() {
  const aspect = window.innerWidth / window.innerHeight;
  return (
    <>
      <Canvas
        style={{ position: "fixed", top: 0, left: 0 }}
        linear
        flat
        legacy
        orthographic
        camera={{
          position: [0, 0, 10],
          zoom: 2,
          top: K / aspect,
          bottom: -K / aspect,
          left: -K,
          right: K,
          near: 1,
          far: 200,
        }}
      >
        <color attach="background" args={["#A1A1A1"]} />
        <PresentationControls snap global polar={[-PI, PI]}>
          <RotateGroup>
            <group position-z={-J / 2 - 1} rotation-x={PI / 2}>
              <Instances />
            </group>
            <group position-z={-J / 2}>
              <MoveZ>
                <Ring />
              </MoveZ>
            </group>
          </RotateGroup>
        </PresentationControls>
      </Canvas>
      <div
        style={{
          bottom: 0,
          gap: `calc(${width} * 0.1)`,
          left: "50%",
          transform: "translateX(-50%)",
          position: "fixed",
          display: "grid",
          justifyContent: "center",
          pointerEvents: "none",
          gridTemplateColumns: `repeat(${J}, 1fr)`,
        }}
      >
        <Palette />
      </div>
    </>
  );
}

export default App;
