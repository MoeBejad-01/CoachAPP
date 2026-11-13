// WebGL dumbbell for the call-to-action band. Loaded on demand (see
// Dumbbell3D) so three.js stays out of the main bundle.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface DumbbellScene {
  pause(): void;
  resume(): void;
  dispose(): void;
}

/** A bumper-plate profile (radius, height) revolved into a plate with a recessed face. */
function plateGeometry(r: number, w: number) {
  const hole = 0.13;
  const c = Math.min(0.05, w / 3);
  const face = w * 0.36;
  const pts: THREE.Vector2[] = [new THREE.Vector2(hole, -face), new THREE.Vector2(r * 0.68, -face), new THREE.Vector2(r * 0.74, -w / 2)];
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r - c + Math.cos(a) * c, -w / 2 + c + Math.sin(a) * c));
  }
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r - c + Math.cos(a) * c, w / 2 - c + Math.sin(a) * c));
  }
  pts.push(new THREE.Vector2(r * 0.74, w / 2), new THREE.Vector2(r * 0.68, face), new THREE.Vector2(hole, face));
  return new THREE.LatheGeometry(pts, 72);
}

export function createDumbbellScene(canvas: HTMLCanvasElement): DumbbellScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04).texture;
  scene.environment = env;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 5, 4);
  const rim = new THREE.DirectionalLight(0x7fe7d6, 2.4);
  rim.position.set(-4, 1.5, -3);
  scene.add(key, rim);

  const chrome = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, metalness: 1, roughness: 0.2 });
  const grip = new THREE.MeshStandardMaterial({ color: 0xc4cad2, metalness: 1, roughness: 0.48 });
  const plates = [0x0b3d91, 0x007aff, 0x3ba7f2].map((color) => new THREE.MeshPhysicalMaterial({
    color, metalness: 0.1, roughness: 0.4, clearcoat: 0.9, clearcoatRoughness: 0.2, side: THREE.DoubleSide,
  }));

  const dumbbell = new THREE.Group();
  dumbbell.rotation.set(0.12, 0, 0.16);
  scene.add(dumbbell);

  const geometries: THREE.BufferGeometry[] = [];
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number) => {
    geometries.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.z = Math.PI / 2;
    mesh.position.x = x;
    dumbbell.add(mesh);
  };

  add(new THREE.CylinderGeometry(0.11, 0.11, 2.1, 40), grip, 0);
  for (const s of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 40), chrome, s * 1.0);
    let x = 1.08;
    ([[0.92, 0.24], [0.76, 0.2], [0.6, 0.16]] as const).forEach(([r, w], i) => {
      add(plateGeometry(r, w), plates[i], s * (x + w / 2));
      x += w + 0.02;
    });
    add(new THREE.CylinderGeometry(0.14, 0.14, 0.3, 40), chrome, s * (x + 0.15));
    add(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 40), chrome, s * (x + 0.32));
  }

  const controls = new OrbitControls(camera, canvas);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 2.4;
  controls.minPolarAngle = Math.PI / 2 - 0.6;
  controls.maxPolarAngle = Math.PI / 2 + 0.25;
  // Keep vertical swipes scrolling the page on touch screens.
  canvas.style.touchAction = 'pan-y';

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Back off far enough for the full length to fit, whatever the aspect ratio.
    const fit = 4.9 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    const dist = Math.max(6.6, fit);
    camera.position.set(0, dist * 0.18, dist);
    camera.updateProjectionMatrix();
    controls.update();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const clock = new THREE.Clock();
  const frame = () => {
    dumbbell.position.y = Math.sin(clock.getElapsedTime() * 1.1) * 0.06;
    controls.update();
    renderer.render(scene, camera);
  };
  renderer.setAnimationLoop(frame);

  return {
    pause() { renderer.setAnimationLoop(null); },
    resume() { renderer.setAnimationLoop(frame); },
    dispose() {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      controls.dispose();
      geometries.forEach((g) => g.dispose());
      [chrome, grip, ...plates].forEach((m) => m.dispose());
      env.dispose();
      room.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
