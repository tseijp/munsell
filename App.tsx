import coordinate from "./munsell-coordinate";
import interpolate from "./munsell-interpolate";
import { range, rgb, px } from "./utils";
import { Canvas, GroupProps, ThreeEvent, useFrame } from "@react-three/fiber";
import { gsap } from "gsap";
import { useDrag } from "rege/react";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";

const I = 40; // hue
const J = 15; // value
const K = 13; // 26; // chroma

const HUE = ["R", "YR", "Y", "GY", "G", "BG", "B", "PB", "P", "RP"];
const hue = (i = 0) => {
  const index = (i / 4) << 0;
  let ret = HUE[index];
  const num = i / 4 - index + 0.25;
  return `${num * 10}${ret}`;
};

let ijk = { i: 9, j: 13, k: 4 };

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

interface Stop {
  stopPropagation: Function;
}

function createPointer() {
  let text: HTMLDivElement;
  let box: HTMLDivElement;
  let el: HTMLDivElement;

  const enter = (color: number[]) => {
    return <E extends Stop>(e: E) => {
      e.stopPropagation();
      const background = rgb(color);
      text.textContent = background;
      box.style.background = background;
      el.style.display = "flex";
    };
  };

  const leave = () => {
    el.style.display = "none";
  };

  const move = (e: MouseEvent) => {
    const top = px(e.clientY + 8);
    const left = px(e.clientX + 8);
    Object.assign(el.style, { top, left });
  };

  const ref = (_el: HTMLDivElement) => {
    if (!_el) return;
    el = _el;
    box = _el.children[0] as HTMLDivElement;
    text = _el.children[1] as HTMLDivElement;
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseleave", leave);
  };

  return { enter, leave, ref };
}

const pointer = createPointer();

const Pointer = () => {
  return (
    <div
      ref={pointer.ref}
      style={{
        display: "none",
        position: "fixed",
        gap: "0.5rem",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          width: "75px",
          height: "75px",
          borderRadius: width,
          border: "2px solid #000",
        }}
      ></div>
      <div
        style={{
          color: "black",
          mixBlendMode: "difference",
          filter: "invert(1)",
        }}
      ></div>
    </div>
  );
};

function createInstances() {
  const ret = [];
  for (let i = 0; i < I; i++) {
    for (let j = 0; j < J; j++) {
      for (let k = 0; k < K; k++) {
        const color = interpolate(i, j, k);
        if (color.some(isNaN)) continue;
        const coord = coordinate(i, j, k);
        ret.push({ coord, color, i, j, k });
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

  const click = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const { i, j, k } = instances[e.instanceId!];
    set({ i, j, k });
  };

  const enter = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const { color } = instances[e.instanceId!];
    pointer.enter(color)(e);
  };

  const mount = () => {
    instances.forEach(init);
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  const ref = (_mesh: THREE.InstancedMesh | null) => {
    if (!_mesh) return;
    mesh = _mesh;
    mount();
  };

  return { ref, click, enter };
}

function Instances() {
  const material = useMemo(() => new THREE.MeshBasicMaterial(), []);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const instances = useMemo(() => createInstances(), []);
  const store = useMemo(() => createStore(instances), []);

  return (
    <instancedMesh
      ref={store.ref}
      onPointerDown={store.click}
      onPointerEnter={store.enter}
      args={[geometry, material, instances.length]}
    />
  );
}

const PI = 3.14;
const { round } = Math;
const _I = (2 * PI) / I;

function Ring() {
  const ijk = useIJK();
  return range(K).map((k) =>
    range(I).map((i) => {
      const key = `${i}-${k}`;
      const color = interpolate(i, ijk.j, k);
      const active = i === ijk.i && k === ijk.k;
      const disable = isNaN(color[0]) || isNaN(color[1]) || isNaN(color[2]);
      const args = [k - 0.5, k + 0.5, 0, 0, _I * (I - i - 1), _I * 0.9];
      return (
        <mesh
          key={key}
          onClick={() => set({ i, k })}
          onPointerEnter={pointer.enter(color)}
        >
          <ringGeometry args={args as any} />
          <meshBasicMaterial
            visible={!disable}
            wireframe={active}
            color={active ? (ijk.j < 7 ? "#fff" : "#000") : color}
            side={THREE.DoubleSide}
          />
        </mesh>
      );
    })
  );
}

function MoveZ(props: GroupProps) {
  const ijk = useIJK();
  return <group position-z={ijk.j - 1.5} {...props} />;
}

const width = `calc(min(${(80 / J) << 0}vw, ${(80 / K) << 0}vh))`;
const height = width;

function Palette() {
  const ijk = useIJK();
  return range(K).map((_k) =>
    range(J).map((j) => {
      const k = K - _k - 1;
      const key = `${j}-${k}`;
      const active = ijk.j === j && ijk.k === k;
      const color = interpolate(ijk.i, j, k);
      const disable = isNaN(color[0]) || isNaN(color[1]) || isNaN(color[2]);
      const background = rgb(color);
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
                  boxShadow: active
                    ? `0 0 0 2px ${j < 7 ? "#fff" : "#000"}`
                    : "",
                }
          }
          onClick={() => set({ j, k })}
        />
      );
    })
  );
}

function HVC() {
  const { i, j, k } = useIJK();
  const color = useMemo(() => interpolate(i, j, k), [i, j, k]);

  useEffect(() => {
    gsap.to(document.body, { background: rgb(color), ease: "expo.out" });
  }, [color]);

  return (
    <div
      style={{
        padding: "0.5rem 1rem",
        borderRadius: "0.5rem",
        backdropFilter: "blur(5px)",
        backgroundColor: "rgba(0, 0, 0, 0.075)",
        boxShadow: "rgba(0, 0, 0, 0.3) 2px 8px 8px",
      }}
    >
      <div>Munsell Color System</div>
      <div>
        {hue(i)} {j - 4 < 0 ? 0 : j - 4}.0/{k * 2}.0
      </div>
    </div>
  );
}

let isActive = false;

function RotateGroup(props: GroupProps) {
  const ref = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (isActive) return;
    ref.current.rotation.z += 0.0005;
  });

  useEffect(() => {
    let timeoutId = 0;
    const handleMove = () => {
      isActive = true;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        isActive = false;
      }, 1000);
    };
    window.addEventListener("mousemove", handleMove);
  }, []);

  return <group ref={ref} {...props} />;
}

const weight = PI / 360 / 2;
const step = PI / 2;
const aspect = window.innerWidth / window.innerHeight;

function App() {
  const ref = useRef<THREE.Group>(null!);
  const drag = useDrag(() => {
    const group = ref.current;
    if (!group) return;
    const { offset, isDragEnd } = drag;
    let [y, x] = offset;
    x *= weight;
    y *= weight;
    if (isDragEnd) {
      x = round(x / step) * step;
      y = round(y / step) * step;
      offset[0] = y / weight;
      offset[1] = x / weight;
    }
    gsap.to(group.rotation, { x, y, ease: "expo.out" });
  });

  return (
    <>
      <Canvas
        ref={drag.ref as any}
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
        <group ref={ref}>
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
        </group>
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
      <div
        style={{
          position: "fixed",
          top: "50px",
          fontSize: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
          color: "black",
          mixBlendMode: "difference",
          filter: "invert(1)",
        }}
      >
        <HVC />
      </div>
      <Pointer />
    </>
  );
}

export default App;
