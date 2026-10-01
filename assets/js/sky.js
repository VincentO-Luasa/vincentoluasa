/* ──────────────────────────────────────────────
   Sky mode (press S) — a full-screen, tilted, animated
   solar system framed by constellations. Orbital speeds
   are to scale (Earth: one lap every 24 s); sizes and
   distances are compressed so everything fits.
   Click a planet for a fact card.
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

  let W = 0, H = 0, DPR = 1, open = false, raf = 0, t0 = 0, opened = 0;
  let stars = [], belt = [], placed = [], hits = [], selected = null;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    stars = Array.from({ length: Math.round((W * H) / 2600) }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1 + 0.2, a: Math.random() * 0.5 + 0.15, tw: Math.random() * 6,
    }));
    belt = Array.from({ length: 340 }, () => ({ au: 2.2 + Math.random() * 1.1, a0: Math.random() * Math.PI * 2, s: Math.random() * 0.9 + 0.3 }));
    placeConstellations();
  }

  // Spread constellations around the frame, leaving the centre to the Solar System
  function placeConstellations() {
    // Fractions of the viewport; the top-left corner is kept free for the title
    const narrow = W < 700;
    const spots = narrow
      ? [[.62, .17], [.05, .25], [.7, .3], [.05, .72], [.68, .72], [.3, .84], [.08, .88], [.7, .88]]
      : [[.03, .2], [.36, .06], [.6, .05], [.82, .1], [.02, .45], [.88, .4],
         [.03, .74], [.2, .84], [.42, .88], [.62, .86], [.84, .72], [.13, .62], [.22, .2]];
    const base = Math.min(W, H) * (narrow ? 0.16 : 0.11);
    placed = CONSTELLATIONS.slice(0, spots.length).map((c, k) => {
      const [fx, fy] = spots[k % spots.length];
      const bw = base * c.w, bh = base * 0.75;
      return { ...c, pts: c.stars.map(([x, y]) => [fx * W + x * bw, fy * H + y * bh]) };
    });
  }

  const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

  function frame(now) {
    if (!open) return;
    const t = reduceMotion ? 0 : (now - t0) / 1000;
    const intro = reduceMotion ? 1 : ease((now - opened) / 1600);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#03040b";
    ctx.fillRect(0, 0, W, H);

    // Background stars
    for (const s of stars) {
      ctx.fillStyle = `rgba(255,255,255,${s.a * (0.8 + Math.sin(t * 1.3 + s.tw) * 0.2)})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }

    // Constellations, drawn in progressively during the intro
    ctx.font = "10.5px 'JetBrains Mono', monospace";
    placed.forEach((c, k) => {
      const a = Math.max(0, Math.min(1, intro * 1.6 - k * 0.04));
      if (a <= 0) return;
      ctx.strokeStyle = `rgba(140,200,217,${0.35 * a})`;
      ctx.lineWidth = 0.8;
      for (const [i, j] of c.lines) {
        ctx.beginPath(); ctx.moveTo(c.pts[i][0], c.pts[i][1]); ctx.lineTo(c.pts[j][0], c.pts[j][1]); ctx.stroke();
      }
      for (const [x, y] of c.pts) {
        ctx.fillStyle = `rgba(255,255,255,${0.85 * a})`;
        ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
      }
      const lx = Math.min(...c.pts.map((p) => p[0]));
      const ly = Math.max(...c.pts.map((p) => p[1])) + 15;
      ctx.fillStyle = `rgba(140,200,217,${0.6 * a})`;
      ctx.fillText(c.name.toUpperCase(), lx, ly);
    });

    // Solar System: tilt from top-down to an oblique view as it opens
    const cx = W / 2, cy = H / 2 + 20;
    const narrow = W < 700;
    const R = Math.min(W * (narrow ? 0.47 : 0.46), H * 0.62) * (0.6 + 0.4 * intro);
    const tilt = 1 - (narrow ? 0.4 : 0.62) * intro;
    const orbitR = (au) => R * (0.14 + 0.86 * Math.sqrt(au / 30.1));
    const k = R / 340;

    // Orbits
    ctx.lineWidth = 1;
    for (const p of PLANETS) {
      ctx.strokeStyle = selected === p ? "rgba(140,200,217,0.5)" : "rgba(255,255,255,0.09)";
      ctx.beginPath(); ctx.ellipse(cx, cy, orbitR(p.au), orbitR(p.au) * tilt, 0, 0, Math.PI * 2); ctx.stroke();
    }

    // Asteroid belt
    for (const b of belt) {
      const ang = b.a0 + (t / (EARTH_LAP_S * Math.pow(b.au, 1.5))) * Math.PI * 2;
      const r = orbitR(b.au);
      ctx.fillStyle = `rgba(200,190,170,${0.35 * b.s})`;
      ctx.fillRect(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * tilt, 1.1, 1.1);
    }

    // Planet positions; draw the ones behind the Sun first
    const bodies = PLANETS.map((p, i) => {
      const ang = i * 1.7 + (t / (EARTH_LAP_S * p.years)) * Math.PI * 2;
      const r = orbitR(p.au);
      return { p, ang, x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r * tilt, z: Math.sin(ang), size: Math.max(2, p.size * k) };
    });
    const sun = () => {
      const sr = Math.max(9, 22 * k);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, sr * 4);
      g.addColorStop(0, "rgba(255,236,190,1)");
      g.addColorStop(0.18, "rgba(255,206,120,0.95)");
      g.addColorStop(0.4, "rgba(255,170,80,0.25)");
      g.addColorStop(1, "rgba(255,150,60,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, sr * 4, 0, Math.PI * 2); ctx.fill();
    };
    hits = [];
    const drawBody = (b) => {
      const { p, x, y, size } = b;
      if (p.rings) {
        ctx.strokeStyle = "rgba(227,210,154,0.55)";
        ctx.lineWidth = Math.max(1, size * 0.28);
        ctx.beginPath(); ctx.ellipse(x, y, size * 2.1, size * 2.1 * Math.max(0.25, tilt), -0.35, 0, Math.PI * 2); ctx.stroke();
      }
      // Lit from the Sun's side
      const dl = Math.hypot(cx - x, cy - y) || 1;
      const lx = x + ((cx - x) / dl) * size * 0.45, ly = y + ((cy - y) / dl) * size * 0.45;
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
        const ma = t / (EARTH_LAP_S * 0.0748) * Math.PI * 2;
        const mr = size * 2.6;
        ctx.fillStyle = "#cfcfcf";
        ctx.beginPath(); ctx.arc(x + Math.cos(ma) * mr, y + Math.sin(ma) * mr * Math.max(0.4, tilt), Math.max(1, size * 0.3), 0, Math.PI * 2); ctx.fill();
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
      hits.push({ p, x, y, r: Math.max(16, size + 8) });
    };
    bodies.filter((b) => b.z < 0).sort((a, b) => a.y - b.y).forEach(drawBody);
    sun();
    bodies.filter((b) => b.z >= 0).sort((a, b) => a.y - b.y).forEach(drawBody);

    raf = requestAnimationFrame(frame);
  }

  function showCard(p) {
    selected = p;
    card.innerHTML = `<h3>${p.name}</h3><ul>${p.facts.map((f) => `<li>${f}</li>`).join("")}</ul><p>${p.fun}</p>`;
    card.hidden = false;
  }

  canvas.addEventListener("click", (e) => {
    const hit = hits.find((h) => Math.hypot(h.x - e.clientX, h.y - e.clientY) < h.r);
    if (hit) showCard(hit.p);
    else { selected = null; card.hidden = true; }
  });
  canvas.addEventListener("pointermove", (e) => {
    canvas.style.cursor = hits.some((h) => Math.hypot(h.x - e.clientX, h.y - e.clientY) < h.r) ? "pointer" : "default";
  });

  function setOpen(on) {
    if (on === open) return;
    open = on;
    sky.hidden = !on;
    document.body.style.overflow = on ? "hidden" : "";
    if (on) {
      resize();
      selected = null; card.hidden = true;
      opened = performance.now();
      if (!t0) t0 = opened;
      raf = requestAnimationFrame(frame);
      sky.querySelector(".sky__close").focus({ preventScroll: true });
    } else {
      cancelAnimationFrame(raf);
    }
  }

  sky.querySelector(".sky__close").addEventListener("click", () => setOpen(false));
  document.querySelectorAll("[data-open-sky]").forEach((b) => b.addEventListener("click", () => setOpen(true)));
  window.addEventListener("resize", () => { if (open) resize(); });
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest("input, textarea, [contenteditable]")) return;
    if (e.key === "s" || e.key === "S") setOpen(!open);
    else if (e.key === "Escape" && open) setOpen(false);
  });

  window.Sky = { open: () => setOpen(true), close: () => setOpen(false) };
})();
