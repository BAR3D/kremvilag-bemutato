// Krémvilág — körbeforgatható 3D termék a termékfotóból.
// A fotó körvonalából (tools/profile3d.py → product.shape) forgástestet építünk: az elülső felére a fotó kerül
// (soronként a termék valódi szélességéhez igazítva), a hátsó fele a termék saját színét kapja.
// Húzással forgatható (tehetetlenséggel), magától is lassan forog; csak akkor rajzol, ha látszik.
import * as THREE from './vendor/three.module.min.mjs';

const SEG = 56;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function envMap(renderer) {
  // stúdió-környezet a fényes csillogáshoz (lágybox-fények), kiegészítő modul nélkül
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x2a1a20);
  const box = (w, h, x, y, z, c, ry = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); m.rotation.z += ry; s.add(m);
  };
  box(6, 3, 0, 4, 4, 0xffffff);
  box(3, 6, -6, 1, 1, 0xffe6d2);
  box(2, 6, 6, 0, -2, 0xf6dcc0);
  box(8, 2, 0, -5, 0, 0x5a3a40);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.04).texture;
  pm.dispose();
  return tex;
}

function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(40,20,25,.55)'); grd.addColorStop(1, 'rgba(40,20,25,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// forgástest egy félhengere [t0, t1] szögtartományban; uvFn(i, θ) adja a textúra-koordinátát
function half(shape, height, t0, t1, uvFn, colorFn) {
  const R = shape.r, n = R.length;
  // profil: felső zárópont, sorok, alsó zárópont
  const prof = [{ r: 0, y: height / 2, row: 0 }];
  R.forEach((r, i) => prof.push({ r, y: height / 2 - (i + 0.5) / n * height, row: i }));
  prof.push({ r: 0, y: -height / 2, row: n - 1 });
  const pos = [], nor = [], uv = [], col = [], idx = [];
  prof.forEach((p, k) => {
    const a = prof[Math.max(0, k - 1)], b = prof[Math.min(prof.length - 1, k + 1)];
    const dr = (b.r - a.r), dy = (b.y - a.y) || -1e-4;
    // a profil síkjában a normális: (−dy, dr) irányú, kifelé
    let nr = -dy, ny = dr; const L = Math.hypot(nr, ny) || 1; nr /= L; ny /= L;
    for (let j = 0; j <= SEG; j++) {
      const t = t0 + (t1 - t0) * j / SEG;
      const s = Math.sin(t), c = Math.cos(t);
      pos.push(p.r * s, p.y, p.r * c);
      nor.push(nr * s, ny, nr * c);
      const u = uvFn(p.row, s, p.r); uv.push(u[0], u[1]);
      if (colorFn) { const cc = colorFn(p.row); col.push(cc[0], cc[1], cc[2]); }
    }
  });
  for (let k = 0; k < prof.length - 1; k++) {
    for (let j = 0; j < SEG; j++) {
      const a = k * (SEG + 1) + j, b = a + SEG + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (colorFn) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

function buildProduct(shape, texture, env) {
  const height = shape.aspect * 2;           // a legszélesebb pont átmérője = 2 egység
  const [bx, by, , bh] = shape.box;
  const n = shape.r.length;
  const front = half(shape, height, -Math.PI / 2, Math.PI / 2, (row, s, r) => {
    const x = shape.cx[row] + s * r * shape.rmax;
    const y = by + (row + 0.5) / n * bh;
    return [x / shape.w, 1 - y / shape.h];
  });
  const lin = c => new THREE.Color(`rgb(${c[0]},${c[1]},${c[2]})`);
  const backCols = shape.back.map(c => { const k = lin(c); return [k.r, k.g, k.b]; });
  const back = half(shape, height, Math.PI / 2, Math.PI * 1.5, () => [0, 0], row => backCols[row]);
  const common = { roughness: 0.32, metalness: 0.0, envMap: env, envMapIntensity: 0.9, clearcoat: 0.6, clearcoatRoughness: 0.25 };
  const mFront = new THREE.MeshPhysicalMaterial({ ...common, map: texture, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.32 });
  const mBack = new THREE.MeshPhysicalMaterial({ ...common, vertexColors: true, emissive: 0x000000 });
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(front, mFront), new THREE.Mesh(back, mBack));
  grp.userData.height = height;
  return grp;
}

export function mount(el, product, opts = {}) {
  const shape = product.shape;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.className = 'v3d-canvas';
  el.appendChild(canvas);

  const scene = new THREE.Scene();
  const env = envMap(renderer);
  scene.add(new THREE.HemisphereLight(0xfff3ea, 0x3a2228, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xe8c39e, 1.4); rim.position.set(-4, 2, -4); scene.add(rim);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  const world = new THREE.Group(); scene.add(world);
  let obj = null;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; scene.add(shadow);

  const loader = new THREE.TextureLoader();
  let disposed = false;
  function load(p) {
    loader.load(p.images[0], tex => {
      if (disposed) { tex.dispose(); return; }
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      if (obj) { world.remove(obj); obj.traverse(o => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose(); }); }
      obj = buildProduct(p.shape, tex, env);
      world.add(obj);
      const h = obj.userData.height;
      shadow.position.y = -h / 2 - 0.01; shadow.scale.set(3.2, 1.6, 1);
      fit();
      el.classList.add('ready');
      kick();
    });
  }

  function fit() {
    const w = el.clientWidth, hgt = el.clientHeight;
    if (!w || !hgt) return;
    renderer.setSize(w, hgt, false);
    camera.aspect = w / hgt;
    const h = obj ? obj.userData.height : 2;
    const tilt = 0.18;
    // a tárgy (magasság h, szélesség 2) férjen bele kényelmesen
    const vfov = camera.fov * Math.PI / 180;
    const need = Math.max(h * 1.45, 3.1 / camera.aspect);
    const dist = need / 2 / Math.tan(vfov / 2) + 1.2;
    camera.position.set(0, Math.sin(tilt) * dist, Math.cos(tilt) * dist);
    camera.lookAt(0, -h * 0.02, 0);
    camera.updateProjectionMatrix();
    kick();
  }

  // húzás, tehetetlenség, automatikus forgás
  let rot = opts.start ?? -0.5, vel = 0, tiltX = 0, drag = null, idleAt = 0, hinted = false;
  const onDown = e => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture?.(e.pointerId); el.classList.add('grabbing'); kick(); };
  const onMove = e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    vel = dx * 0.012; rot += vel;
    tiltX = Math.max(-0.35, Math.min(0.35, tiltX + dy * 0.004));
    if (!hinted) { hinted = true; el.classList.add('touched'); }
  };
  const onUp = () => { if (!drag) return; drag = null; idleAt = performance.now(); el.classList.remove('grabbing'); };
  canvas.addEventListener('pointerdown', onDown);
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerup', onUp);
  canvas.addEventListener('dblclick', () => { vel = 0; tiltX = 0; rot = -0.5; kick(); });

  let visible = true, raf = 0, last = performance.now();
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }, { threshold: 0 });
  io.observe(el);
  const ro = new ResizeObserver(fit); ro.observe(el);

  function frame(now) {
    raf = 0;
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!drag) {
      vel *= 0.94; rot += vel;
      if (!reduced && Math.abs(vel) < 0.002 && now - idleAt > 1800) rot += dt * 0.45;
      tiltX *= 0.96;
    }
    world.rotation.y = rot;
    world.rotation.x = tiltX;
    if (obj) { const t = now / 1000; obj.position.y = reduced ? 0 : Math.sin(t * 1.3) * 0.03; }
    renderer.render(scene, camera);
    if (visible && !(reduced && !drag && Math.abs(vel) < 0.001)) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible && !disposed) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  load(product);
  return {
    setProduct(p) { el.classList.remove('ready'); load(p); },
    dispose() {
      disposed = true; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
      removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp);
      obj?.traverse(o => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose(); });
      env.dispose(); renderer.dispose(); canvas.remove();
    },
  };
}
