import * as THREE from 'three';

export function initSpace(): () => void {
  const canvas = document.getElementById('scene') as HTMLCanvasElement | null;
  if (!canvas) return () => {};

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.body.classList.add('scene-on');

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch {
    return () => {};
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(0, 0, 12);

  const planetGroup = new THREE.Group();
  scene.add(planetGroup);

  function surfaceTexture() {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    const g = c.getContext('2d');
    if (!g) return null;

    const base = g.createLinearGradient(0, 0, 0, 512);
    base.addColorStop(0, '#3b1d6e');
    base.addColorStop(0.45, '#5b21b6');
    base.addColorStop(0.75, '#312e81');
    base.addColorStop(1, '#1e1b4b');
    g.fillStyle = base;
    g.fillRect(0, 0, 1024, 512);

    for (var i = 0; i < 140; i++) {
      var x = Math.random() * 1024;
      var y = Math.random() * 512;
      var r = 12 + Math.random() * 70;
      var blob = g.createRadialGradient(x, y, 0, x, y, r);
      var warm = Math.random() > 0.55;
      blob.addColorStop(0, warm ? 'rgba(196,181,253,0.30)' : 'rgba(56,189,248,0.22)');
      blob.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = blob;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }

    g.globalAlpha = 0.06;
    for (var b = 0; b < 512; b += 4) {
      g.fillStyle = b % 8 === 0 ? '#ffffff' : '#000000';
      g.fillRect(0, b, 1024, 2);
    }
    g.globalAlpha = 1;

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return tex;
  }

  const planetTexture = surfaceTexture();
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(2.15, 64, 64),
    new THREE.MeshStandardMaterial({ map: planetTexture, roughness: 0.85, metalness: 0.05 })
  );
  planetGroup.add(planet);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(2.42, 48, 48),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color(0x8b6cf6) } },
      vertexShader:
        'varying vec3 vN; varying vec3 vP;' +
        'void main(){ vN = normalize(normalMatrix * normal);' +
        'vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz;' +
        'gl_Position = projectionMatrix * mv; }',
      fragmentShader:
        'uniform vec3 uColor; varying vec3 vN; varying vec3 vP;' +
        'void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(-vP))), 2.6);' +
        'gl_FragColor = vec4(uColor, f * 0.9); }',
    })
  );
  planetGroup.add(atmosphere);

  const ringGeo = new THREE.RingGeometry(3.1, 4.5, 128);
  const pos = ringGeo.attributes.position;
  const uv = ringGeo.attributes.uv;
  const v = new THREE.Vector3();
  for (var k = 0; k < pos.count; k++) {
    v.fromBufferAttribute(pos, k);
    uv.setXY(k, (v.length() - 3.1) / 1.4, 0.5);
  }
  const ring = new THREE.Mesh(
    ringGeo,
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(0xc4b5fd) } },
      vertexShader:
        'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform vec3 uColor; varying vec2 vUv;' +
        'void main(){ float e = smoothstep(0.0,0.18,vUv.x) * (1.0 - smoothstep(0.62,1.0,vUv.x));' +
        'float band = 0.55 + 0.45 * sin(vUv.x * 46.0);' +
        'gl_FragColor = vec4(uColor, e * band * 0.5); }',
    })
  );
  ring.rotation.x = Math.PI * 0.5 - 0.42;
  ring.rotation.z = 0.18;
  planetGroup.add(ring);

  planetGroup.rotation.z = 0.28;

  scene.add(new THREE.AmbientLight(0x6d5bd0, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(-4, 2.5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x67e8f9, 0.8);
  rim.position.set(5, -2, -3);
  scene.add(rim);

  function galaxy() {
    const COUNT = 9000,
      ARMS = 4,
      RADIUS = 46;
    const p = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const inner = new THREE.Color(0xffd7a8),
      outer = new THREE.Color(0x6d28d9),
      c = new THREE.Color();
    for (var i = 0; i < COUNT; i++) {
      var r = Math.pow(Math.random(), 0.55) * RADIUS;
      var arm = ((i % ARMS) / ARMS) * Math.PI * 2;
      var spin = r * 0.12;
      var spread = Math.pow(Math.random(), 2.4) * (Math.random() < 0.5 ? 1 : -1) * (0.6 + r * 0.06);
      p[i * 3] = Math.cos(arm + spin) * r + spread;
      p[i * 3 + 1] = spread * 0.35 + (Math.random() - 0.5) * 1.2;
      p[i * 3 + 2] = Math.sin(arm + spin) * r + spread;
      c.copy(inner).lerp(outer, Math.min(1, r / RADIUS + Math.random() * 0.18));
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.19,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
  }

  const spiral = galaxy();
  spiral.position.set(6, -3, -34);
  spiral.rotation.set(1.05, 0.2, 0.35);
  scene.add(spiral);

  function stars() {
    const COUNT = 2600;
    const p = new Float32Array(COUNT * 3);
    for (var i = 0; i < COUNT; i++) {
      var r = 60 + Math.random() * 60;
      var th = Math.random() * Math.PI * 2;
      var ph = Math.acos(2 * Math.random() - 1);
      p[i * 3] = r * Math.sin(ph) * Math.cos(th);
      p[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      p[i * 3 + 2] = r * Math.cos(ph);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xdfe6ff,
        size: 0.34,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      })
    );
  }
  const starField = stars();
  scene.add(starField);

  const PLANET_R = 2.15;
  const panel = document.getElementById('panel');
  let baseScale = 1;

  function visibleHeight(dist: number): number {
    return 2 * dist * Math.tan((camera.fov * Math.PI) / 180 / 2);
  }

  function layout() {
    const w = window.innerWidth,
      h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    const dist = 13;
    camera.position.set(0, 0, dist);
    const vh = visibleHeight(dist);

    if (w <= 900) {
      var panelH = panel ? panel.getBoundingClientRect().height : h * 0.45;
      var freeH = Math.max(160, h - panelH);
      var diameterPx = Math.min(freeH * 0.82, w * 0.86);
      baseScale = diameterPx / (((2 * PLANET_R) / vh) * h);
      var centreFraction = (freeH * 0.5) / h;
      planetGroup.position.set(0, (0.5 - centreFraction) * vh, 0);
      spiral.position.set(1.5, 3, -34);
    } else {
      baseScale = h < 760 ? 0.85 : 1;
      planetGroup.position.set(vh * (w > 1500 ? 0.34 : 0.3), 0.1, 0);
      spiral.position.set(6, -3, -34);
    }
  }
  layout();

  let resizeTimer: number;
  function onResize(): void {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(layout, 120);
  }
  window.addEventListener('resize', onResize, { passive: true });

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let velX = 0.0016;
  let velY = 0;
  let tiltX = 0;
  let tiltY = 0;
  let targetTiltX = 0;
  let targetTiltY = 0;

  function onDown(e: PointerEvent): void {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas?.setPointerCapture?.(e.pointerId);
  }

  function onMove(e: PointerEvent): void {
    targetTiltX = ((e.clientY / window.innerHeight) * 2 - 1) * 0.12;
    targetTiltY = ((e.clientX / window.innerWidth) * 2 - 1) * 0.12;
    if (!dragging) return;
    velY = (e.clientX - lastX) * 0.0045;
    velX = (e.clientY - lastY) * 0.0045;
    planetGroup.rotation.y += velY;
    planetGroup.rotation.x = Math.max(-0.8, Math.min(0.8, planetGroup.rotation.x + velX));
    lastX = e.clientX;
    lastY = e.clientY;
  }

  function onUp(): void {
    if (!dragging) return;
    dragging = false;
    velY = Math.max(-0.06, Math.min(0.06, velY));
  }

  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  let frame = 0;
  let running = true;
  const t0 = performance.now();
  let intro = 0;

  function onVisibility(): void {
    running = !document.hidden;
    if (running) frame = requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange', onVisibility);

  function tick(now: number): void {
    if (!running) return;
    frame = requestAnimationFrame(tick);
    const t = (now - t0) / 1000;

    if (intro < 1) {
      intro = reduceMotion ? 1 : Math.min(1, t / 1.6);
      const e = 1 - Math.pow(1 - intro, 3);
      planetGroup.scale.setScalar(baseScale * (0.55 + 0.45 * e));
      spiral.material.opacity = 0.85 * e;
      starField.material.opacity = 0.75 * e;
    } else {
      planetGroup.scale.setScalar(baseScale);
    }

    if (!reduceMotion) {
      if (!dragging) {
        velY += (0.0016 - velY) * 0.03;
        velX *= 0.93;
        planetGroup.rotation.y += velY;
        planetGroup.rotation.x += velX;
        planetGroup.rotation.x *= 0.995;
      }
      spiral.rotation.y += 0.00035;
      starField.rotation.y += 0.00012;
      ring.rotation.z += 0.0006;
    }

    tiltX += (targetTiltX - tiltX) * 0.05;
    tiltY += (targetTiltY - tiltY) * 0.05;
    camera.rotation.x = -tiltX * 0.35;
    camera.rotation.y = -tiltY * 0.35;

    renderer.render(scene, camera);
  }

  frame = requestAnimationFrame(tick);
  canvas.classList.add('ready');

  return function teardown(): void {
    running = false;
    cancelAnimationFrame(frame);
    window.clearTimeout(resizeTimer);
    window.removeEventListener('resize', onResize);
    canvas.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    document.removeEventListener('visibilitychange', onVisibility);
    document.body.classList.remove('scene-on');

    scene.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh | THREE.Points;
      mesh.geometry?.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    });
    planetTexture?.dispose();
    renderer.dispose();
  };
}
