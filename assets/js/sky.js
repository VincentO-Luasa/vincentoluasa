/* ──────────────────────────────────────────────
   Sky mode (press S) — a full-screen, tilted, animated
   solar system framed by constellations. Orbital speeds
   are to scale (Earth: one lap every 24 s); sizes and
   distances are compressed so everything fits.

   Entrance: the page recedes, stars streak in like a
   hyperspace arrival, the system swings from top-down
   to oblique while orbits trace themselves.
   Camera: mouse move looks around (yaw/tilt + parallax),
   drag rotates further, wheel/pinch zooms to the cursor,
   clicking a planet flies to it and follows it.
   ────────────────────────────────────────────── */
(() => {
  const sky = document.getElementById("sky");
  if (!sky) return;
  const canvas = sky.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const card = document.getElementById("skyCard");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const EARTH_LAP_S = 24;
  const PLANETS = [
    { name: "Mercury", au: 0.39, years: 0.241, size: 2.4, color: "#b9b2a8", facts: ["0.39 AU from the Sun", "Year: 88 days"], fun: "A single solar day (176 Earth days) lasts longer than its year." },
    { name: "Venus", au: 0.72, years: 0.615, size: 4, color: "#e9cf9f", facts: ["0.72 AU from the Sun", "Year: 225 days"], fun: "The hottest planet (about 465 °C), and it spins backwards." },
    { name: "Earth", au: 1, years: 1, size: 4.2, color: "#6fa8dc", facts: ["1 AU from the Sun", "Year: 365 days"], fun: "You are here. So is everyone you know, and every protein you’ve ever heard of.", moon: true },
    { name: "Mars", au: 1.52, years: 1.881, size: 3.2, color: "#d9734e", facts: ["1.52 AU from the Sun", "Year: 687 days"], fun: "Home of Olympus Mons, a volcano about 2.5 times the height of Everest." },
    { name: "Jupiter", au: 5.2, years: 11.86, size: 10, color: "#d8b98c", bands: true, facts: ["5.2 AU from the Sun", "Year: 11.9 years"], fun: "About 1,300 Earths would fit inside, and the Great Red Spot is a storm wider than our planet." },
    { name: "Saturn", au: 9.54, years: 29.46, size: 8.5, color: "#e3d29a", rings: true, facts: ["9.5 AU from the Sun", "Year: 29.5 years"], fun: "Less dense than water, and its rings are mostly chunks of ice." },
    { name: "Uranus", au: 19.2, years: 84.0, size: 6, color: "#a3dbe2", facts: ["19.2 AU from the Sun", "Year: 84 years"], fun: "It rolls around the Sun on its side, tilted about 98°." },
    { name: "Neptune", au: 30.1, years: 164.8, size: 6, color: "#5b7fd6", facts: ["30.1 AU from the Sun", "Year: 165 years"], fun: "The fastest winds in the Solar System, over 2,000 km/h." },
  ];

  // Simplified constellation shapes in a unit box
  const CONSTELLATIONS = [
    { name: "Ursa Major", w: 1.3, stars: [[0, .1], [.02, .4], [.3, .47], [.32, .2], [.52, .18], [.72, .12], [.95, .26]], lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]] },
    { name: "Ursa Minor", w: 1, stars: [[0, .1], [.22, .2], [.42, .28], [.6, .32], [.62, .62], [.92, .68], [.9, .38]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
    { name: "Cassiopeia", w: 1, stars: [[0, .2], [.25, .85], [.5, .4], [.75, .95], [1, .1]], lines: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    { name: "Orion", w: .8, stars: [[.1, .12], [.75, .16], [.36, .5], [.48, .47], [.6, .44], [.2, .95], [.88, .9], [.45, 0]], lines: [[0, 7], [7, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]] },
    { name: "Cygnus", w: .8, stars: [[.5, 0], [.5, .4], [.5, 1], [.05, .28], [.95, .52]], lines: [[0, 1], [1, 2], [3, 1], [1, 4]] },
    { name: "Lyra", w: .55, stars: [[.5, 0], [.32, .35], [.68, .4], [.28, .92], [.62, .98]], lines: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4]] },
    { name: "Scorpius", w: .9, stars: [[.05, .05], [.15, .1], [.25, .02], [.22, .25], [.3, .42], [.38, .58], [.42, .74], [.52, .88], [.68, .97], [.84, .92], [.9, .78]], lines: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10]] },
    { name: "Leo", w: 1.2, stars: [[.18, .55], [.12, .32], [.22, .12], [.38, .06], [.44, .24], [.34, .4], [.62, .62], [.88, .48], [.98, .7]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 6], [6, 8], [8, 7], [7, 5]] },
    { name: "Gemini", w: .7, stars: [[.2, 0], [.26, .5], [.18, 1], [.62, .05], [.68, .5], [.6, 1], [.05, .7], [.85, .75]], lines: [[0, 1], [1, 2], [3, 4], [4, 5], [0, 3], [1, 6], [4, 7]] },
    { name: "Crux", w: .5, stars: [[.5, 0], [.5, 1], [.1, .42], [.9, .5], [.66, .62]], lines: [[0, 1], [2, 3]] },
    { name: "Pegasus", w: 1, stars: [[.2, .2], [.75, .2], [.75, .75], [.2, .75], [0, .02], [1, .95]], lines: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [2, 5]] },
    { name: "Taurus", w: .9, stars: [[.5, .55], [.32, .42], [.12, .25], [.38, .6], [.16, .5], [0, .35], [.7, .65], [.95, .8]], lines: [[0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [0, 6], [6, 7]] },
    { name: "Aquila", w: .8, stars: [[.5, .45], [.4, .38], [.6, .52], [.05, .2], [.95, .8], [.5, 1], [.45, 0]], lines: [[1, 0], [0, 2], [1, 3], [2, 4], [0, 5], [0, 6]] },
  ];

  const INTRO_MS = 2200, CLOSE_MS = 380;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeOut = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 4);
  const lerp = (a, b, k) => a + (b - a) * k;

  let W = 0, H = 0, DPR = 1, open = false, raf = 0, t0 = 0, opened = 0, last = 0, closedAt = -Infinity;
  let stars = [], belt = [], placed = [], hits = [], selected = null;

  /* Camera: current values ease towards targets every frame */
  const cam = { yaw: 0, tilt: 0.38, zoom: 1, panX: 0, panY: 0 };
  const target = { yaw: 0, tilt: 0.38, zoom: 1, panX: 0, panY: 0 };
  let lookX = 0, lookY = 0;           // mouse position in [-1, 1], for gentle look-around
  let dragYaw = 0, dragTilt = 0;      // extra rotation accumulated by dragging
  const pointers = new Map();
  let dragMoved = false, pinchDist = 0;

  function resetCamera(instant) {
    selected = null;
    card.hidden = true;
    dragYaw = 0; dragTilt = 0;
    Object.assign(target, { yaw: 0, tilt: 0.38, zoom: 1, panX: 0, panY: 0 });
    if (instant) Object.assign(cam, target);
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    stars = Array.from({ length: Math.round((W * H) / 2400) }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1 + 0.2,
      a: Math.random() * 0.5 + 0.15, tw: Math.random() * 6, depth: Math.random() * 0.8 + 0.2,
    }));
    belt = Array.from({ length: 360 }, () => ({ au: 2.2 + Math.random() * 1.1, a0: Math.random() * Math.PI * 2, s: Math.random() * 0.9 + 0.3 }));
    placeConstellations();
  }

  // Spread constellations around the frame, leaving the centre to the Solar System
  function placeConstellations() {
    const narrow = W < 700;
    const spots = narrow
      ? [[.62, .17], [.05, .25], [.7, .3], [.05, .72], [.68, .72], [.3, .84], [.08, .88], [.7, .88]]
      : [[.03, .2], [.36, .06], [.6, .05], [.82, .1], [.02, .45], [.88, .4],
         [.03, .74], [.2, .84], [.42, .88], [.62, .86], [.84, .72], [.13, .62], [.22, .2]];
    const base = Math.min(W, H) * (narrow ? 0.16 : 0.11);
    placed = CONSTELLATIONS.slice(0, spots.length).map((c, i) => {
      const [fx, fy] = spots[i];
      const bw = base * c.w, bh = base * 0.75;
      return { ...c, pts: c.stars.map(([x, y]) => [fx * W + x * bw, fy * H + y * bh]) };
    });
  }

  /* World → screen. Orbits live in a plane; yaw spins it, tilt squashes it. */
  const narrow = () => W < 700;
  const baseR = () => Math.min(W * (narrow() ? 0.47 : 0.46), H * 0.62);
  const orbitR = (au) => baseR() * (0.14 + 0.86 * Math.sqrt(au / 30.1));
  function project(r, ang, introScale) {
    const a = ang + cam.yaw;
    const z = cam.zoom * introScale;
    return {
      x: W / 2 + cam.panX + Math.cos(a) * r * z,
      y: H / 2 + 20 + cam.panY + Math.sin(a) * r * cam.tilt * z,
      depth: Math.sin(a),
    };
  }
  const planetAngle = (p, i, t) => i * 1.7 + (t / (EARTH_LAP_S * p.years)) * Math.PI * 2;

  function frame(now) {
    if (!open && now - closedAt > CLOSE_MS) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    const t = reduceMotion ? 0 : (now - t0) / 1000;
    const introT = reduceMotion ? 1 : (now - opened) / INTRO_MS;
    const intro = easeOut(introT);

    // Camera: look-around from the mouse + drag, plus follow mode on a selected planet
    const k = 1 - Math.pow(0.002, dt);               // frame-rate independent easing
    const lookYaw = lookX * 0.35, lookTilt = -lookY * 0.18;
    const wantYaw = target.yaw + dragYaw + lookYaw;
    const wantTilt = clamp(target.tilt + dragTilt + lookTilt, 0.12, 0.95);
    cam.yaw = lerp(cam.yaw, wantYaw, k);
    cam.tilt = lerp(cam.tilt, wantTilt, k);
    cam.zoom = lerp(cam.zoom, target.zoom, k);
    if (selected) {
      const i = PLANETS.indexOf(selected);
      const pos = project(orbitR(selected.au), planetAngle(selected, i, t), 1);
      // Keep the followed planet centred: shift pan by however far it sits from the centre
      target.panX = cam.panX - (pos.x - W / 2);
      target.panY = cam.panY - (pos.y - H / 2 - 20);
    }
    cam.panX = lerp(cam.panX, target.panX, selected ? 1 - Math.pow(0.0005, dt) : k);
    cam.panY = lerp(cam.panY, target.panY, selected ? 1 - Math.pow(0.0005, dt) : k);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#03040b";
    ctx.fillRect(0, 0, W, H);

    // Background stars: hyperspace streaks during the entrance, then parallax points
    const cx0 = W / 2, cy0 = H / 2;
    const warp = reduceMotion ? 0 : 1 - easeOut(introT * 1.6);
    const px = -lookX * 18, py = -lookY * 12;
    for (const s of stars) {
      const sx = s.x + px * s.depth, sy = s.y + py * s.depth;
      const alpha = s.a * (0.8 + Math.sin(t * 1.3 + s.tw) * 0.2);
      if (warp > 0.02) {
        const len = warp * 0.55 * s.depth;
        ctx.strokeStyle = `rgba(200,225,255,${alpha * (0.6 + warp * 0.4)})`;
        ctx.lineWidth = s.r;
        ctx.beginPath();
        ctx.moveTo(cx0 + (sx - cx0) * (1 - len), cy0 + (sy - cy0) * (1 - len));
        ctx.lineTo(sx, sy);
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath(); ctx.arc(sx, sy, s.r, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Constellations: lines trace in after the arrival, with a little more parallax
    ctx.font = "10.5px 'JetBrains Mono', monospace";
    const cpx = -lookX * 30, cpy = -lookY * 20;
    placed.forEach((c, ci) => {
      const prog = clamp((introT - 0.45 - ci * 0.025) / 0.5, 0, 1);
      if (prog <= 0) return;
      const P = c.pts.map(([x, y]) => [x + cpx, y + cpy]);
      ctx.strokeStyle = `rgba(140,200,217,${0.35 * prog})`;
      ctx.lineWidth = 0.8;
      c.lines.forEach(([i, j], li) => {
        const lp = clamp(prog * c.lines.length - li, 0, 1);
        if (lp <= 0) return;
        ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]);
        ctx.lineTo(P[i][0] + (P[j][0] - P[i][0]) * lp, P[i][1] + (P[j][1] - P[i][1]) * lp); ctx.stroke();
      });
      for (const [x, y] of P) {
        ctx.fillStyle = `rgba(255,255,255,${0.85 * prog})`;
        ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
      }
      const lx = Math.min(...P.map((p) => p[0]));
      const ly = Math.max(...P.map((p) => p[1])) + 15;
      ctx.fillStyle = `rgba(140,200,217,${0.6 * prog})`;
      ctx.fillText(c.name.toUpperCase(), lx, ly);
    });

    // Solar System: swings from top-down to the camera's tilt as it arrives
    const introScale = 0.35 + 0.65 * intro;
    const camTilt = cam.tilt;
    cam.tilt = lerp(1, camTilt, intro);
    const sizeK = (baseR() / 340) * Math.pow(cam.zoom, 0.85) * introScale;

    // Orbits trace themselves in during the entrance
    PLANETS.forEach((p, i) => {
      const prog = clamp(introT * 1.8 - i * 0.07, 0, 1);
      if (prog <= 0) return;
      const r = orbitR(p.au) * cam.zoom * introScale;
      ctx.strokeStyle = selected === p ? "rgba(140,200,217,0.55)" : "rgba(255,255,255,0.09)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(W / 2 + cam.panX, H / 2 + 20 + cam.panY, r, r * cam.tilt, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
      ctx.stroke();
    });

    // Asteroid belt
    const beltAlpha = clamp(introT * 1.5 - 0.3, 0, 1);
    for (const b of belt) {
      const ang = b.a0 + (t / (EARTH_LAP_S * Math.pow(b.au, 1.5))) * Math.PI * 2;
      const q = project(orbitR(b.au), ang, introScale);
      ctx.fillStyle = `rgba(200,190,170,${0.35 * b.s * beltAlpha})`;
      ctx.fillRect(q.x, q.y, 1.1, 1.1);
    }

    // Planets, inner ones appearing first; draw the far side before the Sun
    const bodies = PLANETS.map((p, i) => {
      const q = project(orbitR(p.au), planetAngle(p, i, t), introScale);
      return { p, i, ...q, size: Math.max(1.8, p.size * sizeK), alpha: clamp(introT * 2 - 0.2 - i * 0.09, 0, 1) };
    });
    hits = [];
    const sunPos = project(0, 0, introScale);
    const sun = () => {
      const s = sunPos;
      const sr = Math.max(9, 22 * sizeK);
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, sr * 4);
      g.addColorStop(0, "rgba(255,236,190,1)");
      g.addColorStop(0.18, "rgba(255,206,120,0.95)");
      g.addColorStop(0.4, "rgba(255,170,80,0.25)");
      g.addColorStop(1, "rgba(255,150,60,0)");
      ctx.globalAlpha = clamp(introT * 3, 0, 1);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(s.x, s.y, sr * 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    };
    const drawBody = (b) => {
      if (b.alpha <= 0) return;
      const { p, x, y, size } = b;
      ctx.globalAlpha = b.alpha;
      if (p.rings) {
        ctx.strokeStyle = "rgba(227,210,154,0.55)";
        ctx.lineWidth = Math.max(1, size * 0.28);
        ctx.beginPath(); ctx.ellipse(x, y, size * 2.1, size * 2.1 * Math.max(0.2, cam.tilt), -0.35, 0, Math.PI * 2); ctx.stroke();
      }
      // Lit from the Sun's side
      const dl = Math.hypot(sunPos.x - x, sunPos.y - y) || 1;
      const lx = x + ((sunPos.x - x) / dl) * size * 0.45, ly = y + ((sunPos.y - y) / dl) * size * 0.45;
      const g = ctx.createRadialGradient(lx, ly, size * 0.1, x, y, size * 1.05);
      g.addColorStop(0, p.color);
      g.addColorStop(0.6, p.color);
      g.addColorStop(1, "rgba(25,25,40,1)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
      if (p.bands) {
        ctx.strokeStyle = "rgba(150,110,70,0.5)";
        ctx.lineWidth = Math.max(0.8, size * 0.14);
        for (const dy of [-0.35, 0.1, 0.45]) {
          const half = Math.sqrt(1 - dy * dy) * size * 0.95;
          ctx.beginPath(); ctx.moveTo(x - half, y + dy * size); ctx.lineTo(x + half, y + dy * size); ctx.stroke();
        }
      }
      if (p.moon) {
        const ma = (t / (EARTH_LAP_S * 0.0748)) * Math.PI * 2;
        const mr = size * 2.6;
        ctx.fillStyle = "#cfcfcf";
        ctx.beginPath(); ctx.arc(x + Math.cos(ma) * mr, y + Math.sin(ma) * mr * Math.max(0.35, cam.tilt), Math.max(1, size * 0.3), 0, Math.PI * 2); ctx.fill();
      }
      if (selected === p) {
        ctx.strokeStyle = "rgba(140,200,217,0.9)";
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, size + 6, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.font = "10.5px 'JetBrains Mono', monospace";
      ctx.fillStyle = selected === p ? "#e8eaf6" : "rgba(232,234,246,0.6)";
      ctx.textAlign = "center";
      ctx.fillText(p.name, x, y + size + 14);
      ctx.textAlign = "start";
      ctx.globalAlpha = 1;
      hits.push({ p, x, y, r: Math.max(16, size + 8) });
    };
    bodies.filter((b) => b.depth < 0).sort((a, b) => a.y - b.y).forEach(drawBody);
    sun();
    bodies.filter((b) => b.depth >= 0).sort((a, b) => a.y - b.y).forEach(drawBody);
    cam.tilt = camTilt;

    raf = requestAnimationFrame(frame);
  }

  /* ───────── Interaction ───────── */
  function focusPlanet(p) {
    selected = p;
    card.innerHTML = `<h3>${p.name}</h3><ul>${p.facts.map((f) => `<li>${f}</li>`).join("")}</ul><p>${p.fun}</p>`;
    card.hidden = false;
    // Zoom so the planet is comfortably large, whatever its size
    target.zoom = clamp(30 / (p.size * (baseR() / 340)), 2, 7);
  }
  function unfocus() {
    selected = null;
    card.hidden = true;
    target.zoom = 1; target.panX = 0; target.panY = 0;
  }

  function zoomAt(factor, x, y) {
    const z0 = target.zoom;
    const z1 = clamp(z0 * factor, 0.5, 8);
    if (!selected) {
      // Keep the point under the cursor fixed while zooming
      const ox = x - W / 2 - target.panX, oy = y - H / 2 - 20 - target.panY;
      target.panX -= ox * (z1 / z0 - 1);
      target.panY -= oy * (z1 / z0 - 1);
      if (z1 <= 1) { target.panX *= z1; target.panY *= z1; }
    }
    target.zoom = z1;
  }

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
  }, { passive: false });

  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
    dragMoved = false;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") {
      lookX = (e.clientX / W) * 2 - 1;
      lookY = (e.clientY / H) * 2 - 1;
    }
    const pt = pointers.get(e.pointerId);
    if (pt) {
      const dx = e.clientX - pt.x, dy = e.clientY - pt.y;
      pt.x = e.clientX; pt.y = e.clientY;
      if (Math.hypot(pt.x - pt.x0, pt.y - pt.y0) > 4) dragMoved = true;
      if (pointers.size === 1) {
        dragYaw += dx * 0.006;
        dragTilt = clamp(dragTilt - dy * 0.003, -0.3, 0.6);
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist) zoomAt(d / pinchDist, (a.x + b.x) / 2, (a.y + b.y) / 2);
        pinchDist = d;
      }
    }
    canvas.style.cursor = pt ? "grabbing" : hits.some((h) => Math.hypot(h.x - e.clientX, h.y - e.clientY) < h.r) ? "pointer" : "grab";
  });
  const endPointer = (e) => {
    const pt = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDist = 0;
    if (!pt || dragMoved || e.type === "pointercancel") return;
    // A click (no drag): fly to a planet, or back out
    const hit = hits.find((h) => Math.hypot(h.x - e.clientX, h.y - e.clientY) < h.r);
    if (hit) focusPlanet(hit.p);
    else if (selected) unfocus();
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);

  /* ───────── Open / close ───────── */
  let hideTimer = 0;
  function setOpen(on) {
    if (on === open) return;
    open = on;
    clearTimeout(hideTimer);
    if (on) {
      sky.hidden = false;
      resize();
      resetCamera(true);
      lookX = lookY = 0;
      opened = performance.now();
      if (!t0) t0 = opened;
      last = 0;
      document.body.classList.add("sky-open");
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => sky.classList.add("is-open"));
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
      sky.querySelector(".sky__close").focus({ preventScroll: true });
    } else {
      closedAt = performance.now();
      sky.classList.remove("is-open");
      document.body.classList.remove("sky-open");
      document.body.style.overflow = "";
      hideTimer = setTimeout(() => { sky.hidden = true; cancelAnimationFrame(raf); }, CLOSE_MS);
    }
  }

  sky.querySelector(".sky__close").addEventListener("click", () => setOpen(false));
  sky.querySelector(".sky__reset").addEventListener("click", () => resetCamera(false));
  document.querySelectorAll("[data-open-sky]").forEach((b) => b.addEventListener("click", () => setOpen(true)));
  window.addEventListener("resize", () => { if (open) resize(); });
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest("input, textarea, [contenteditable]")) return;
    if (e.key === "s" || e.key === "S") setOpen(!open);
    else if (e.key === "Escape" && open) { if (selected) unfocus(); else setOpen(false); }
    else if (open && (e.key === "+" || e.key === "=")) zoomAt(1.25, W / 2, H / 2);
    else if (open && e.key === "-") zoomAt(0.8, W / 2, H / 2);
  });

  window.Sky = { open: () => setOpen(true), close: () => setOpen(false) };
})();
