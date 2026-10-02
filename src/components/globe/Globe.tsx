import React, { useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as THREE from 'three';
import { Canvas, useFrame, useLoader, useThree } from './r3f';
import { earthTextureSource } from './earthAsset';
import { DEG, getCountryByCode, latLonToXYZ, xyzToLatLon } from '../../utils/geo';

export type GlobeHandle = { focus: (lat: number, lon: number) => void };
export type Selection = { lat: number; lon: number; code: string | null } | null;

type Ctl = {
  rotX: number; // inclinação (lat do ponto central), rad
  rotY: number; // giro (lon), rad
  velX: number;
  velY: number;
  zoom: number; // distância da câmera
  zoomTarget: number;
  target: { rx: number; ry: number } | null;
  idleSince: number;
  dragging: boolean;
};

const R = 1;
const MIN_ZOOM = 1.7;
const MAX_ZOOM = 5;

const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const focusAngles = (lat: number, lon: number) => ({ rx: lat * DEG, ry: (-90 - lon) * DEG });

function Stars() {
  const geom = useMemo(() => {
    const n = 1400;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(40 + Math.random() * 20);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  return (
    <points geometry={geom}>
      <pointsMaterial color="#ffffff" size={0.18} sizeAttenuation transparent opacity={0.85} depthWrite={false} />
    </points>
  );
}

const atmosphereVert = `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const atmosphereFrag = `
varying vec3 vNormal;
void main() {
  float i = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
  gl_FragColor = vec4(0.30, 0.62, 1.0, 1.0) * i * 0.7;
}`;

function Atmosphere() {
  return (
    <mesh scale={1.14}>
      <sphereGeometry args={[R, 64, 64]} />
      <shaderMaterial
        vertexShader={atmosphereVert}
        fragmentShader={atmosphereFrag}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

/** Contorno luminoso do país selecionado, desenhado sobre a superfície. */
function CountryOutline({ code }: { code: string | null }) {
  const objects = useMemo(() => {
    if (!code) return [];
    const c = getCountryByCode(code);
    if (!c) return [];
    const mat = new THREE.LineBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.95, depthWrite: false });
    const out: THREE.LineLoop[] = [];
    for (const poly of c.polygons) {
      const ring = poly[0];
      const pts: number[] = [];
      for (let i = 0; i < ring.length; i += 2) pts.push(...latLonToXYZ(ring[i + 1], ring[i], R * 1.004));
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      out.push(new THREE.LineLoop(g, mat));
    }
    return out;
  }, [code]);

  return (
    <>
      {objects.map((o, i) => (
        <primitive key={i} object={o} />
      ))}
    </>
  );
}

function Marker({ lat, lon }: { lat: number; lon: number }) {
  const ring = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => latLonToXYZ(lat, lon, R * 1.006), [lat, lon]);
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...pos).normalize()), [pos]);
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime % 1.6) / 1.6;
    if (ring.current) {
      ring.current.scale.setScalar(1 + t * 2.4);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - t);
    }
  });
  return (
    <group position={pos} quaternion={quat}>
      <mesh>
        <circleGeometry args={[0.012, 24]} />
        <meshBasicMaterial color="#ffd24a" />
      </mesh>
      <mesh ref={ring}>
        <ringGeometry args={[0.014, 0.019, 32]} />
        <meshBasicMaterial color="#ffd24a" transparent depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

type SceneProps = {
  ctl: React.MutableRefObject<Ctl>;
  selection: Selection;
  sheetOpen: boolean;
  shiftUp: boolean; // painel inferior aberto: sobe o globo
  pickRef: React.MutableRefObject<((x: number, y: number) => { lat: number; lon: number } | null) | null>;
};

function Scene({ ctl, selection, sheetOpen, shiftUp, pickRef }: SceneProps) {
  const texture = useLoader(THREE.TextureLoader, earthTextureSource) as THREE.Texture;
  const globe = useRef<THREE.Group>(null);
  const earth = useRef<THREE.Mesh>(null);
  const shift = useRef<THREE.Group>(null);
  const { camera, size } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }, [texture]);

  useEffect(() => {
    pickRef.current = (x, y) => {
      if (!earth.current || !globe.current) return null;
      const ndc = new THREE.Vector2((x / size.width) * 2 - 1, -(y / size.height) * 2 + 1);
      globe.current.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObject(earth.current, false)[0];
      if (!hit) return null;
      const local = globe.current.worldToLocal(hit.point.clone());
      return xyzToLatLon(local.x, local.y, local.z);
    };
  }, [camera, size, raycaster, pickRef]);

  useFrame((_, dt) => {
    const c = ctl.current;
    dt = Math.min(dt, 0.05);
    if (c.target) {
      const k = 1 - Math.exp(-6 * dt);
      c.rotX += (c.target.rx - c.rotX) * k;
      c.rotY += angleDiff(c.rotY, c.target.ry) * k;
      if (Math.abs(c.target.rx - c.rotX) < 0.002 && Math.abs(angleDiff(c.rotY, c.target.ry)) < 0.002) c.target = null;
    } else if (!c.dragging) {
      c.rotY += c.velY * dt;
      c.rotX = Math.max(-1.35, Math.min(1.35, c.rotX + c.velX * dt));
      const damp = Math.exp(-3.2 * dt);
      c.velX *= damp; c.velY *= damp;
      const idle = (Date.now() - c.idleSince) / 1000;
      if (!sheetOpen && idle > 2.5 && Math.abs(c.velY) < 0.05) c.rotY += 0.06 * dt; // giro lento ocioso
    }
    c.zoom += (c.zoomTarget - c.zoom) * (1 - Math.exp(-8 * dt));
    camera.position.z = c.zoom * Math.max(1, 0.9 / (size.width / size.height)); // em telas estreitas afasta para o globo caber
    if (globe.current) globe.current.rotation.set(c.rotX, c.rotY, 0, 'XYZ');
    if (shift.current) {
      const ty = shiftUp ? 0.24 * camera.position.z : 0; // sobe o globo para ficar acima do painel
      shift.current.position.y += (ty - shift.current.position.y) * (1 - Math.exp(-5 * dt));
    }
  });

  return (
    <>
      <ambientLight intensity={1.15} />
      <directionalLight position={[-3, 2, 4]} intensity={1.6} />
      <Stars />
      <group ref={shift}>
        <group ref={globe}>
          <mesh ref={earth}>
            <sphereGeometry args={[R, 96, 96]} />
            <meshStandardMaterial map={texture} roughness={0.9} metalness={0} />
          </mesh>
          {selection && <CountryOutline code={selection.code} />}
          {selection && <Marker lat={selection.lat} lon={selection.lon} />}
        </group>
        <Atmosphere />
      </group>
    </>
  );
}

type Props = {
  selection: Selection;
  sheetOpen: boolean;
  /** true quando as notícias ficam nas laterais (telas largas): globo permanece centralizado */
  sideLayout?: boolean;
  onPick: (lat: number, lon: number) => void;
};

export const Globe = React.forwardRef<GlobeHandle, Props>(function Globe({ selection, sheetOpen, sideLayout, onPick }, ref) {
  const ctl = useRef<Ctl>({
    ...{ rotX: 0.35, rotY: (-90 + 45) * DEG, velX: 0, velY: 0 },
    zoom: 3.4, zoomTarget: 3.2, target: null, idleSince: Date.now(), dragging: false,
  });
  const pickRef = useRef<SceneProps['pickRef']['current']>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useImperativeHandle(ref, () => ({
    focus: (lat, lon) => {
      ctl.current.target = focusAngles(lat, lon);
      ctl.current.velX = ctl.current.velY = 0;
    },
  }));

  // ao abrir o painel de notícias, aproxima um pouco; ao fechar, volta
  useEffect(() => {
    ctl.current.zoomTarget = sheetOpen ? 3.4 : Math.max(ctl.current.zoomTarget, 3.2);
    ctl.current.idleSince = Date.now();
  }, [sheetOpen]);

  const gestures = useMemo(() => {
    const c = ctl.current;
    let startZoom = c.zoomTarget;
    const speed = () => 0.0042 * Math.max(0.25, (c.zoom - 1) / 2.4);
    const pan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(4)
      .onBegin(() => { c.dragging = true; c.target = null; c.velX = c.velY = 0; })
      .onChange((e) => {
        c.rotY += e.changeX * speed();
        c.rotX = Math.max(-1.35, Math.min(1.35, c.rotX + e.changeY * speed()));
        c.idleSince = Date.now();
      })
      .onEnd((e) => {
        c.velY = (e.velocityX * speed()) * 0.9;
        c.velX = (e.velocityY * speed()) * 0.9;
      })
      .onFinalize(() => { c.dragging = false; c.idleSince = Date.now(); });
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onBegin(() => { startZoom = c.zoomTarget; })
      .onUpdate((e) => { c.zoomTarget = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, startZoom / e.scale)); c.idleSince = Date.now(); });
    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDistance(10)
      .onEnd((e, ok) => {
        if (!ok) return;
        const p = pickRef.current?.(e.x, e.y);
        if (p) onPickRef.current(p.lat, p.lon);
      });
    return Gesture.Race(tap, Gesture.Simultaneous(pan, pinch));
  }, []);

  return (
    <GestureDetector gesture={gestures}>
      <View style={{ flex: 1 }} collapsable={false}>
        <Canvas camera={{ position: [0, 0, 3.4], fov: 45, near: 0.1, far: 200 }} gl={{ antialias: true }}>
          <React.Suspense fallback={null}>
            <Scene ctl={ctl} selection={selection} sheetOpen={sheetOpen} shiftUp={sheetOpen && !sideLayout} pickRef={pickRef} />
          </React.Suspense>
        </Canvas>
      </View>
    </GestureDetector>
  );
});
