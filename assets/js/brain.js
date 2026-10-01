/* ──────────────────────────────────────────────
   Brain mode (press B) — a full-screen digital human
   brain: ~2,200 neurons sampled on a procedural brain
   shape (two folded hemispheres, cerebellum, brainstem),
   wired to their nearest neighbours. Neurons fire on
   their own and signals cascade through the network.

   Entrance: neurons fly in from a scattered starfield
   and assemble into the brain.
   Camera: drag to rotate, wheel/pinch to zoom, click a
   region to face it, trigger a burst and read about it.
   ────────────────────────────────────────────── */
(() => {
  const root = document.getElementById("brainMode");
  if (!root) return;
  const canvas = root.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const card = document.getElementById("brainCard");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const REGIONS = {
    frontal: { name: "Frontal lobe", color: [143, 200, 230], text: "Planning, decisions, voluntary movement and, usually in the left hemisphere, speech production (Broca’s area).", fun: "It is the last part of the brain to mature, well into your mid-twenties." },
    parietal: { name: "Parietal lobe", color: [167, 163, 230], text: "Touch and body sense, spatial awareness, and our sense of numbers.", fun: "It is why you can touch your nose with your eyes closed." },
    temporal: { name: "Temporal lobe", color: [120, 210, 200], text: "Hearing, understanding language (Wernicke’s area) and memory: the hippocampus sits on its inner side.", fun: "A region on its underside specialises in recognising faces." },
    occipital: { name: "Occipital lobe", color: [150, 180, 255], text: "Vision. Signals from your eyes travel all the way to the back of your head to be seen.", fun: "Each hemisphere sees the opposite half of the world." },
    cerebellum: { name: "Cerebellum", color: [230, 190, 140], text: "Balance, coordination and learning movements, from walking to a calisthenics hold.", fun: "About 10% of the brain’s volume, yet it holds roughly 80% of its neurons." },
    brainstem: { name: "Brainstem", color: [220, 150, 170], text: "Breathing, heart rate, sleep and wakefulness, and the relay for every signal between brain and body.", fun: "It runs the vital functions you never have to think about." },
  };

  const INTRO_MS = 2600, CLOSE_MS = 380;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeInOut = (x) => { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const easeOut = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
  const lerp = (a, b, k) => a + (b - a) * k;

  /* ───────── Build the brain ───────── */
  // Deterministic pseudo-random so the brain looks the same every visit
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;

  const nodes = [];   // { x, y, z, region, sx, sy, sz (start), delay }
  const add = (x, y, z, region) => nodes.push({ x, y, z, region });

  function regionOf(x, y, z) {
    if (Math.abs(x) > 0.42 && y < 0.05 && z > -0.55) return "temporal";
    if (z > 0.18) return "frontal";
    if (z < -0.5) return "occipital";
    return "parietal";
  }

  // Folding pattern: a sum of plane waves over the surface; neurons are kept only
  // on the ridges, so the gyri show up as meandering bands of light
  const waves = Array.from({ length: 7 }, () => {
    const u = rand() * 2 - 1, phi = rand() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    return { kx: s * Math.cos(phi), ky: u, kz: s * Math.sin(phi), f: 9 + rand() * 5, ph: rand() * 6.28 };
  });
  const ridge = (x, y, z) => waves.reduce((acc, w) => acc + Math.sin(w.f * (w.kx * x + w.ky * y + w.kz * z) + w.ph), 0) / waves.length;

  // Cortex: two hemispheres, each a folded half-ellipsoid with a flat medial wall
  for (const side of [-1, 1]) {
    let made = 0, tries = 0;
    while (made < 2000 && tries++ < 60000) {
      const u = rand() * 2 - 1, phi = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      let dx = s * Math.cos(phi), dy = u, dz = s * Math.sin(phi);
      if (dx * side < 0) dx = -dx;                       // keep to this hemisphere
      if (ridge(dx, dy, dz) < 0.06) continue;            // sulci stay dark
      const fold = 1 + 0.035 * ridge(dx * 1.7, dy * 1.7, dz * 1.7);
      let x = side * (0.06 + 0.58 * Math.abs(dx)) * fold;
      let y = 0.7 * dy * fold;
      let z = 1.02 * dz * fold;
      if (dz > 0.55) y *= 0.92;                          // rounded frontal pole
      if (dz < -0.7) y *= 0.86;                          // tapering occipital pole
      if (y < -0.15) y = -0.15 + (y + 0.15) * 0.5;       // flatter underside
      // Temporal lobe: hangs down and out along the sides
      if (Math.abs(dx) > 0.5 && dy < 0.08 && dz > -0.45 && dz < 0.6) {
        const k = 1 - Math.abs(dz - 0.08) / 0.55;
        y -= 0.2 * Math.max(0, k);
        x *= 1.05;
      }
      if (y < -0.42 && z < -0.15) continue;              // leave room for the cerebellum
      add(x, y + 0.12, z, regionOf(x, y, z));
      made++;
    }
    // A sprinkle of deeper neurons
    for (let k = 0; k < 110; k++) {
      const x = side * (0.12 + Math.abs(gauss()) * 0.3), y = gauss() * 0.3 + 0.1, z = gauss() * 0.55;
      add(x, y, z, regionOf(x, y, z));
    }
  }
  // Cerebellum: finely striated ellipsoid tucked under the back
  for (let made = 0, tries = 0; made < 520 && tries < 6000; tries++) {
    const u = rand() * 2 - 1, phi = rand() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    if (Math.sin(u * 34) < -0.1) continue;
    add(0.52 * s * Math.cos(phi), -0.48 + 0.22 * u, -0.66 + 0.3 * s * Math.sin(phi), "cerebellum");
    made++;
  }
  // Brainstem: a tapering column
  for (let k = 0; k < 190; k++) {
    const t = rand(), a = rand() * Math.PI * 2, r = 0.13 - t * 0.04;
    add(Math.cos(a) * r, -0.28 - t * 0.85, -0.28 - t * 0.12 + Math.sin(a) * r, "brainstem");
  }

  // Wire each neuron to its nearest neighbours (spatial grid keeps this fast)
  const edges = [], adj = nodes.map(() => []);
  (() => {
    const cell = 0.09, grid = new Map();
    const key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
    nodes.forEach((n, i) => { const k = key(n.x, n.y, n.z); (grid.get(k) || grid.set(k, []).get(k)).push(i); });
    const seen = new Set();
    nodes.forEach((n, i) => {
      const cx = Math.floor(n.x / cell), cy = Math.floor(n.y / cell), cz = Math.floor(n.z / cell);
      const near = [];
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++)
        for (const j of grid.get(`${cx + a},${cy + b},${cz + c}`) || []) {
          if (j === i) continue;
          const d = Math.hypot(n.x - nodes[j].x, n.y - nodes[j].y, n.z - nodes[j].z);
          if (d < 0.11) near.push([d, j]);
        }
      near.sort((p, q) => p[0] - q[0]).slice(0, 2).forEach(([, j]) => {
        const k = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (seen.has(k)) return;
        seen.add(k); edges.push([i, j]); adj[i].push(j); adj[j].push(i);
      });
    });
  })();

  // Region centroids, for camera focus and labels
  const centroids = {};
  for (const r of Object.keys(REGIONS)) {
    const pts = nodes.filter((n) => n.region === r);
    centroids[r] = pts.reduce((c, n) => ({ x: c.x + n.x / pts.length, y: c.y + n.y / pts.length, z: c.z + n.z / pts.length }), { x: 0, y: 0, z: 0 });
  }

  const hint = document.getElementById("brainHint");
  if (hint) hint.textContent = `Drag to rotate, scroll to zoom, click a region to explore it. Each of these ${nodes.length.toLocaleString("en-US")} dots stands in for about ${Math.round(86e9 / nodes.length / 1e6)} million real neurons.`;

  /* ───────── State ───────── */
  let W = 0, H = 0, DPR = 1, open = false, raf = 0, opened = 0, last = 0, closedAt = -Infinity, hideTimer = 0;
  const HOME = { yaw: -1.35, pitch: 0.2, zoom: 1 };     // side view, front to the left
  const cam = { ...HOME };
  const target = { ...HOME };
  let autoSpin = true, focus = null, hover = null;
  const charge = new Float32Array(nodes.length);     // glow after firing
  const refractory = new Float32Array(nodes.length);
  let signals = [];
  const proj = nodes.map(() => ({ x: 0, y: 0, d: 0, s: 1 }));
  let stars = [];

  // Pre-rendered glow sprite
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 32;
  (() => {
    const g = sprite.getContext("2d").createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,225,170,1)"); g.addColorStop(0.25, "rgba(255,200,120,0.55)"); g.addColorStop(1, "rgba(255,180,90,0)");
    const c = sprite.getContext("2d"); c.fillStyle = g; c.fillRect(0, 0, 32, 32);
  })();

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    stars = Array.from({ length: Math.round((W * H) / 3200) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 0.9 + 0.2, a: Math.random() * 0.4 + 0.1 }));
  }

  function prepareIntro() {
    // Every neuron starts somewhere out in a wide shell of "stars"
    nodes.forEach((n) => {
      const u = Math.random() * 2 - 1, phi = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u), r = 2 + Math.random() * 2.2;
      n.sx = s * Math.cos(phi) * r; n.sy = u * r; n.sz = s * Math.sin(phi) * r;
      n.delay = Math.random() * 0.35 + (n.region === "brainstem" || n.region === "cerebellum" ? 0.15 : 0);
    });
  }

  function fire(i, gen, maxGen) {
    if (refractory[i] > 0) return;
    charge[i] = 1;
    refractory[i] = 0.6;
    const nb = adj[i];
    const count = Math.min(nb.length, 1 + (Math.random() < 0.5 ? 1 : 0));
    for (let k = 0; k < count; k++) {
      const j = nb[(Math.random() * nb.length) | 0];
      signals.push({ a: i, b: j, t: 0, speed: 2.5 + Math.random() * 2, gen, maxGen });
    }
  }
  function burst(region, n = 45) {
    const idx = nodes.map((nd, i) => (nd.region === region ? i : -1)).filter((i) => i >= 0);
    for (let k = 0; k < n; k++) { const i = idx[(Math.random() * idx.length) | 0]; refractory[i] = 0; fire(i, 0, 5); }
  }

  /* ───────── Frame ───────── */
  function frame(now) {
    if (!open && now - closedAt > CLOSE_MS) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    const introT = reduceMotion ? 1 : (now - opened) / INTRO_MS;

    // Camera easing; slow auto-rotation until the visitor takes over
    if (autoSpin && !focus && !reduceMotion) target.yaw += dt * 0.12;
    const k = 1 - Math.pow(0.003, dt);
    cam.yaw = lerp(cam.yaw, target.yaw, k);
    cam.pitch = lerp(cam.pitch, target.pitch, k);
    cam.zoom = lerp(cam.zoom, target.zoom, k);

    // Activity: spontaneous firing (gentler during the entrance), decays, signal travel
    if (introT > 0.8 && !reduceMotion) {
      const expected = 14 * dt;                       // ~14 spontaneous firings per second
      const count = Math.floor(expected) + (Math.random() < expected % 1 ? 1 : 0);
      for (let c = 0; c < count; c++) fire((Math.random() * nodes.length) | 0, 0, 4);
    }
    for (let i = 0; i < nodes.length; i++) { charge[i] *= Math.pow(0.04, dt); if (refractory[i] > 0) refractory[i] -= dt; }
    const next = [];
    for (const s of signals) {
      const d = Math.hypot(nodes[s.a].x - nodes[s.b].x, nodes[s.a].y - nodes[s.b].y, nodes[s.a].z - nodes[s.b].z) || 0.05;
      s.t += (dt * s.speed * 0.12) / d;
      if (s.t >= 1) {
        if (s.gen < s.maxGen && Math.random() < 0.62) fire(s.b, s.gen + 1, s.maxGen);
        else charge[s.b] = Math.max(charge[s.b], 0.5);
      } else next.push(s);
    }
    signals = next.length > 1500 ? next.slice(-1500) : next;

    // Projection (yaw around Y, pitch around X, perspective)
    const cy0 = Math.cos(cam.yaw), sy0 = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const base = Math.min(W, H) * (W < 700 ? 0.4 : 0.36) * cam.zoom;
    const D = 6, cx = W / 2, cyS = H / 2 + 10;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const a = reduceMotion ? 1 : easeInOut((introT - n.delay) / 0.75);
      const x = lerp(n.sx ?? n.x, n.x, a), y = lerp(n.sy ?? n.y, n.y, a), z = lerp(n.sz ?? n.z, n.z, a);
      const x1 = x * cy0 + z * sy0, z1 = -x * sy0 + z * cy0;
      const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      const s = (base * D) / Math.max(1.2, D - z2);
      const p = proj[i];
      p.x = cx + x1 * s; p.y = cyS - y2 * s; p.d = z2; p.s = s;
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#03040b";
    ctx.fillRect(0, 0, W, H);
    for (const st of stars) { ctx.fillStyle = `rgba(255,255,255,${st.a})`; ctx.fillRect(st.x, st.y, st.r, st.r); }

    // Connections, faded in once the brain has assembled
    const wiring = easeOut((introT - 0.75) / 0.5);
    if (wiring > 0) {
      ctx.strokeStyle = `rgba(140,200,217,${0.06 * wiring})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (const [i, j] of edges) { ctx.moveTo(proj[i].x, proj[i].y); ctx.lineTo(proj[j].x, proj[j].y); }
      ctx.stroke();
    }

    // Neurons (additive glow); the focused region is tinted, others dimmed
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < nodes.length; i++) {
      const p = proj[i], n = nodes[i];
      const depth = clamp(0.55 + p.d * 0.45, 0.15, 1);
      const inFocus = !focus || n.region === focus;
      const hov = hover && n.region === hover && !focus;
      const col = (focus && inFocus) || hov ? REGIONS[n.region].color : [150, 205, 225];
      const alpha = depth * (inFocus ? (hov ? 1 : 0.75) : 0.16);
      ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha})`;
      const r = (focus && inFocus ? 1.7 : 1.35) * clamp(p.s / base, 0.6, 1.6);
      ctx.fillRect(p.x - r / 2, p.y - r / 2, r, r);
      if (charge[i] > 0.05) {
        const g = 6 + charge[i] * 14 * clamp(p.s / base, 0.6, 1.6);
        ctx.globalAlpha = Math.min(1, charge[i] * depth * 1.2);
        ctx.drawImage(sprite, p.x - g, p.y - g, g * 2, g * 2);
        ctx.globalAlpha = 1;
      }
    }
    // Signals travelling along axons
    ctx.fillStyle = "rgba(255,210,140,0.9)";
    for (const s of signals) {
      const A = proj[s.a], B = proj[s.b];
      const x = A.x + (B.x - A.x) * s.t, y = A.y + (B.y - A.y) * s.t;
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    ctx.globalCompositeOperation = "source-over";

    // Region label (hover or focus)
    const lab = focus || hover;
    if (lab && introT > 1) {
      const c = centroids[lab];
      const x1 = c.x * cy0 + c.z * sy0, z1 = -c.x * sy0 + c.z * cy0;
      const y2 = c.y * cp - z1 * sp, z2 = c.y * sp + z1 * cp, s = (base * D) / Math.max(1.2, D - z2);
      const lx = cx + x1 * s, ly = cyS - y2 * s;
      ctx.font = "12px 'JetBrains Mono', monospace";
      const text = REGIONS[lab].name;
      const w = ctx.measureText(text).width + 14;
      ctx.fillStyle = "rgba(5,6,15,0.78)";
      ctx.fillRect(lx - w / 2, ly - 11, w, 20);
      ctx.fillStyle = `rgb(${REGIONS[lab].color.join(",")})`;
      ctx.textAlign = "center";
      ctx.fillText(text, lx, ly + 3);
      ctx.textAlign = "start";
    }

    raf = requestAnimationFrame(frame);
  }

  /* ───────── Interaction ───────── */
  function regionAt(x, y) {
    let best = null, bd = 14;
    for (let i = 0; i < nodes.length; i++) {
      const p = proj[i];
      if (p.d < -0.2) continue;                       // ignore the far side
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) { bd = d; best = nodes[i].region; }
    }
    return best;
  }

  function focusRegion(r) {
    focus = r;
    autoSpin = false;
    const c = centroids[r];
    // Turn the camera so the region faces the viewer
    const want = Math.atan2(-c.x, c.z);
    let dy = want - (target.yaw % (Math.PI * 2));
    dy = ((dy + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    target.yaw += dy;
    target.pitch = clamp(0.15 - c.y * 0.6, -0.5, 0.7);
    target.zoom = 1.25;
    const R = REGIONS[r];
    card.innerHTML = `<h3>${R.name}</h3><p class="brain-card__text">${R.text}</p><p>${R.fun}</p>`;
    card.hidden = false;
    burst(r);
  }
  function unfocus() {
    focus = null;
    card.hidden = true;
    target.zoom = 1;
  }
  function resetView() {
    unfocus();
    autoSpin = true;
    Object.assign(target, { yaw: cam.yaw, pitch: HOME.pitch, zoom: 1 });
  }

  const pointers = new Map();
  let moved = false, pinch = 0;
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    target.zoom = clamp(target.zoom * Math.exp(-e.deltaY * 0.0015), 0.5, 3.5);
  }, { passive: false });
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
    moved = false;
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
  });
  canvas.addEventListener("pointermove", (e) => {
    const pt = pointers.get(e.pointerId);
    if (pt) {
      const dx = e.clientX - pt.x, dy = e.clientY - pt.y;
      pt.x = e.clientX; pt.y = e.clientY;
      if (Math.hypot(pt.x - pt.x0, pt.y - pt.y0) > 4) { moved = true; autoSpin = false; }
      if (pointers.size === 1) {
        target.yaw += dx * 0.008;
        target.pitch = clamp(target.pitch + dy * 0.006, -1.2, 1.2);
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) target.zoom = clamp(target.zoom * (d / pinch), 0.5, 3.5);
        pinch = d;
      }
    } else if (e.pointerType === "mouse") {
      hover = regionAt(e.clientX, e.clientY);
    }
    canvas.style.cursor = pt ? "grabbing" : hover ? "pointer" : "grab";
  });
  const endPointer = (e) => {
    const pt = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = 0;
    if (!pt || moved || e.type === "pointercancel") return;
    const r = regionAt(e.clientX, e.clientY);
    if (r) focusRegion(r);
    else if (focus) unfocus();
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("pointerleave", () => { hover = null; });

  /* ───────── Open / close ───────── */
  function setOpen(on) {
    if (on === open) return;
    open = on;
    clearTimeout(hideTimer);
    if (on) {
      root.hidden = false;
      resize();
      prepareIntro();
      focus = null; hover = null; card.hidden = true; autoSpin = true;
      Object.assign(target, HOME);
      Object.assign(cam, { yaw: -3.0, pitch: 0.55, zoom: 0.75 });  // swing in from another angle
      charge.fill(0); refractory.fill(0); signals = [];
      opened = performance.now(); last = 0;
      document.body.classList.add("sky-open");
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => root.classList.add("is-open"));
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
      root.querySelector(".brain__close").focus({ preventScroll: true });
    } else {
      closedAt = performance.now();
      root.classList.remove("is-open");
      document.body.classList.remove("sky-open");
      document.body.style.overflow = "";
      hideTimer = setTimeout(() => { root.hidden = true; cancelAnimationFrame(raf); }, CLOSE_MS);
    }
  }

  root.querySelector(".brain__close").addEventListener("click", () => setOpen(false));
  root.querySelector(".brain__reset").addEventListener("click", resetView);
  document.querySelectorAll("[data-open-brain]").forEach((b) => b.addEventListener("click", () => setOpen(true)));
  window.addEventListener("resize", () => { if (open) resize(); });
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest("input, textarea, [contenteditable]")) return;
    if (e.key === "b" || e.key === "B") {
      if (!open && document.body.classList.contains("sky-open")) return;   // the sky is open
      setOpen(!open);
    } else if (e.key === "Escape" && open) { if (focus) unfocus(); else setOpen(false); }
  });
})();
