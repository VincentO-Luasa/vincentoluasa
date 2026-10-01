/* ──────────────────────────────────────────────
   Sky mode (press S) — a full-screen, tilted, animated
   solar system framed by constellations. Orbital speeds
   are to scale (Earth: one lap every 24 s); sizes and
   distances are compressed so everything fits.

   Entrance: the page recedes, stars streak in like a
   hyperspace arrival, the system swings from top-down
   to oblique while orbits trace themselves.
   Camera: drag rotates, wheel/pinch zooms to the cursor,
   clicking a planet flies to it and follows it.
   Zooming out keeps going: Solar System → Milky Way →
   Local Group → Laniakea supercluster → the cosmic web of
   the observable universe.
   From the Milky Way outwards, sizes and distances are to
   scale with each other; only the jump from the Solar
   System to the galaxy is compressed.
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
    { name: "Draco", w: 1.2, stars: [[0, .9], [.15, .7], [.3, .75], [.45, .55], [.4, .3], [.55, .15], [.75, .2], [.9, .05], [1, .2], [.88, .3]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 6]] },
    { name: "Boötes", w: .7, stars: [[.5, 1], [.3, .65], [.7, .6], [.25, .3], [.6, .25], [.45, 0]], lines: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5]] },
    { name: "Hercules", w: .8, stars: [[.3, .35], [.7, .3], [.75, .65], [.35, .7], [0, .1], [.1, .95], [1, 0], [.95, 1]], lines: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [3, 5], [1, 6], [2, 7]] },
    { name: "Corona Borealis", w: .5, stars: [[0, .3], [.2, .7], [.45, .9], [.7, .8], [.9, .5], [1, .2]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]] },
    { name: "Sagittarius", w: .9, stars: [[.2, .4], [.45, .2], [.75, .3], [.8, .65], [.45, .7], [.15, .75], [.6, 0], [1, .5]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [1, 6], [2, 6], [2, 7], [3, 7], [4, 1]] },
    { name: "Canis Major", w: .7, stars: [[.55, .1], [.3, .2], [.5, .45], [.3, .7], [.75, .75], [.1, 1], [.65, 1]], lines: [[0, 1], [0, 2], [2, 3], [2, 4], [3, 5], [4, 6]] },
    { name: "Perseus", w: .8, stars: [[.4, 0], [.45, .25], [.5, .45], [.3, .6], [.15, .85], [.7, .6], [.85, .9]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6]] },
    { name: "Andromeda", w: 1.1, stars: [[0, .2], [.35, .35], [.65, .5], [1, .7], [.4, .1], [.7, .25]], lines: [[0, 1], [1, 2], [2, 3], [1, 4], [2, 5]] },
    { name: "Virgo", w: 1, stars: [[.1, .2], [.3, .35], [.5, .3], [.65, .5], [.85, .45], [.45, .65], [.3, .95], [.8, .9]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [3, 7]] },
    { name: "Centaurus", w: 1, stars: [[.2, .1], [.4, .3], [.6, .25], [.5, .55], [.25, .7], [.8, .75], [.1, 1], [.95, 1]], lines: [[0, 1], [1, 2], [1, 3], [3, 4], [3, 5], [4, 6], [5, 7]] },
    { name: "Hydra", w: 1.4, stars: [[0, .2], [.1, .05], [.2, .25], [.35, .4], [.5, .45], [.65, .6], [.8, .7], [1, .9]], lines: [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]] },
    { name: "Auriga", w: .7, stars: [[.5, 0], [.1, .3], [.2, .8], [.75, .95], [.95, .45]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]] },
  ];
  // Where each constellation sits on the celestial sphere: [longitude, latitude] in degrees,
  // longitude 0 being straight ahead in the default view. Spread out so every direction has some.
  const SKY_POS = {
    "Ursa Major": [-38, 3], "Cassiopeia": [32, 6], "Cygnus": [0, 5], "Lyra": [15, -3], "Orion": [42, -46],
    "Scorpius": [-42, -48], "Leo": [-16, -55], "Crux": [20, -58], "Gemini": [75, -12], "Taurus": [110, -22],
    "Pegasus": [-80, -14], "Aquila": [-120, -6], "Ursa Minor": [-8, 38], "Draco": [35, 34], "Boötes": [150, 8],
    "Hercules": [-62, 26], "Corona Borealis": [-96, 22], "Sagittarius": [-160, -30], "Canis Major": [162, -42],
    "Perseus": [72, 20], "Andromeda": [-150, 30], "Virgo": [125, 30], "Centaurus": [92, -66], "Hydra": [-100, -62],
    "Auriga": [180, 5],
  };

  const INTRO_MS = 2200, CLOSE_MS = 380;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeOut = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 4);
  const lerp = (a, b, k) => a + (b - a) * k;

  let W = 0, H = 0, DPR = 1, open = false, raf = 0, t0 = 0, opened = 0, last = 0, closedAt = -Infinity;
  let stars = [], belt = [], placed = [], hits = [], selected = null;

  /* Camera: current values ease towards targets every frame */
  const cam = { yaw: 0, tilt: 0.38, zoom: 1, panX: 0, panY: 0 };
  const target = { yaw: 0, tilt: 0.38, zoom: 1, panX: 0, panY: 0 };
  let dragYaw = 0, dragTilt = 0;      // extra rotation accumulated by dragging
  const pointers = new Map();
  let dragMoved = false, pinchDist = 0;

  function resetCamera(instant) {
    selected = null;
    card.hidden = true;
    dragYaw = 0; dragTilt = 0;
    Object.assign(target, { yaw: 0, tilt: 0.38, zoom: 1, panX: 0, panY: 0 });
    journey = 0;
    if (instant) Object.assign(cam, target);
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!stars.length) stars = makeSphereStars();
    belt = Array.from({ length: 360 }, () => ({ au: 2.2 + Math.random() * 1.1, a0: Math.random() * Math.PI * 2, s: Math.random() * 0.9 + 0.3 }));
    placeConstellations();
  }

  /* ───────── Celestial sphere ─────────
     Stars and constellations are directions on a sphere at infinity: moving inside the
     Solar System doesn't change them, but turning the camera turns the whole sky. */
  const rad = (d) => (d * Math.PI) / 180;
  const dirFrom = (lon, lat) => [Math.sin(lon) * Math.cos(lat), Math.sin(lat), -Math.cos(lon) * Math.cos(lat)];
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };

  function makeSphereStars() {
    const out = [];
    const randDir = () => { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u); return [s * Math.cos(a), u, s * Math.sin(a)]; };
    for (let i = 0; i < 1900; i++) out.push({ d: randDir(), r: Math.random() * 1 + 0.2, a: Math.random() * 0.5 + 0.15, tw: Math.random() * 6, depth: Math.random() * 0.8 + 0.2 });
    // The Milky Way: a denser band along a great circle tilted ~60° to the planets' plane
    const tiltMW = rad(60), nodeMW = rad(-30);
    for (let i = 0; i < 1700; i++) {
      const th = Math.random() * Math.PI * 2, off = ((Math.random() + Math.random() + Math.random() - 1.5) / 1.5) * rad(9);
      let v = [Math.cos(th) * Math.cos(off), Math.sin(off), Math.sin(th) * Math.cos(off)];
      v = [v[0], v[1] * Math.cos(tiltMW) - v[2] * Math.sin(tiltMW), v[1] * Math.sin(tiltMW) + v[2] * Math.cos(tiltMW)];
      v = [v[0] * Math.cos(nodeMW) - v[2] * Math.sin(nodeMW), v[1], v[0] * Math.sin(nodeMW) + v[2] * Math.cos(nodeMW)];
      out.push({ d: v, r: Math.random() * 0.7 + 0.15, a: Math.random() * 0.28 + 0.06, tw: Math.random() * 6, depth: Math.random() * 0.8 + 0.2 });
    }
    return out;
  }

  // Each constellation becomes a set of directions around its centre (about 14° across per unit width)
  function placeConstellations() {
    const SPAN = rad(14);
    placed = CONSTELLATIONS.map((c) => {
      const [lonD, latD] = SKY_POS[c.name];
      const lon = rad(lonD), lat = rad(latD);
      const C = dirFrom(lon, lat);
      const east = [Math.cos(lon), 0, Math.sin(lon)];
      const north = [-Math.sin(lon) * Math.sin(lat), Math.cos(lat), Math.cos(lon) * Math.sin(lat)];
      const dirs = c.stars.map(([x, y]) => {
        const dx = Math.tan((x - 0.5) * c.w * SPAN), dy = Math.tan((0.5 - y) * 0.75 * SPAN);
        return norm([C[0] + east[0] * dx + north[0] * dy, C[1] + east[1] * dx + north[1] * dy, C[2] + east[2] * dx + north[2] * dy]);
      });
      return { ...c, dirs };
    });
  }

  // Camera for the sky: same yaw as the orbits, elevation from the orbit tilt (tilt = sin(elevation))
  function skyCamera(yaw, tilt) {
    const e = Math.asin(clamp(tilt, 0.05, 0.99));
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const F = Math.max(W, H) * 0.5;                  // ~90° field of view across the long side
    const right = [1, 0, 0], up = [0, Math.cos(e), -Math.sin(e)], fwd = [0, -Math.sin(e), -Math.cos(e)];
    return (d) => {
      // rotate the sky with the scene (same rotation as the planets' yaw)
      const x = d[0] * cy - d[2] * sy, y = d[1], z = d[0] * sy + d[2] * cy;
      const depth = x * fwd[0] + y * fwd[1] + z * fwd[2];
      if (depth < 0.08) return null;
      return [W / 2 + (F * (x * right[0] + y * right[1] + z * right[2])) / depth,
              H / 2 - (F * (x * up[0] + y * up[1] + z * up[2])) / depth];
    };
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

  /* ───────── Beyond the Solar System ───────── */
  // World unit from here on: one Milky Way radius (~50,000 light-years).
  const MIN_ZOOM = 8e-9, SOLAR_MIN = 0.4;
  const UNIVERSE_R = 9.3e5;                       // observable-universe radius (46.5 Gly) in Milky Way radii
  let cseed = 11;
  const crand = () => ((cseed = (cseed * 16807) % 2147483647) / 2147483647);
  const cgauss = () => (crand() + crand() + crand() + crand() - 2) / 1.15;

  // A barred spiral: bulge + bar, logarithmic arms, diffuse disk (unit radius)
  function spiralGalaxy(n, { arms = 2, bar = 0.18, pitch = 0.22, spread = 0.07, core = 0.25 } = {}) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const roll = crand();
      if (roll < core) {
        const a = crand() * Math.PI * 2, r = Math.abs(cgauss()) * 0.08;
        pts.push({ x: cgauss() * bar + Math.cos(a) * r, y: cgauss() * bar * 0.3 + Math.sin(a) * r, c: 0 });
      } else if (roll < 0.9) {
        const arm = (crand() * arms) | 0;
        const r = 0.12 + Math.pow(crand(), 0.85) * 0.9;
        const th = Math.log(r / 0.12) / pitch + arm * ((2 * Math.PI) / arms);
        const sp = spread * (0.5 + r);
        pts.push({ x: Math.cos(th) * r + cgauss() * sp, y: Math.sin(th) * r + cgauss() * sp, c: crand() < 0.06 ? 2 : 1 });
      } else {
        const a = crand() * Math.PI * 2, r = Math.sqrt(crand());
        pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, c: 1 });
      }
    }
    return pts;
  }
  const place = (pts, { scale, squash = 1, rot = 0, at }) => pts.map((p) => {
    const x = p.x * scale, y = p.y * scale * squash;
    return { x: at[0] + x * Math.cos(rot) - y * Math.sin(rot), y: at[1] + x * Math.sin(rot) + y * Math.cos(rot), c: p.c };
  });
  const blob = (n, r, at) => Array.from({ length: n }, () => ({ x: at[0] + cgauss() * r, y: at[1] + cgauss() * r * 0.7, c: 1 }));

  const MILKY_WAY = spiralGalaxy(7000, { arms: 4, bar: 0.2 });
  const SUN = { x: 0.52 * Math.cos(-1.9), y: 0.52 * Math.sin(-1.9) };   // ~26,000 ly from the centre
  const polar = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
  const ANDROMEDA = polar(50, 0.6);              // 2.5 million ly
  const TRIANGULUM = polar(58, 0.86);            // ~2.9 million ly, ~16 radii from Andromeda
  const LMC = polar(3.2, 3.5), SMC = polar(4, 3.8);
  const LOCAL_GROUP = [
    ...place(spiralGalaxy(2600, { arms: 2, bar: 0.06, pitch: 0.17, spread: 0.09, core: 0.32 }), { scale: 2.2, squash: 0.3, rot: 0.66, at: ANDROMEDA }),
    ...place(spiralGalaxy(700, { arms: 2, bar: 0.02, core: 0.15, spread: 0.12 }), { scale: 0.6, squash: 0.6, rot: 1.2, at: TRIANGULUM }),
    ...blob(260, 0.12, LMC), ...blob(150, 0.07, SMC),
    // dwarf galaxies around the two big spirals
    ...Array.from({ length: 18 }, (_, i) => {
      const host = i % 2 ? ANDROMEDA : [0, 0];
      const [dx, dy] = polar(2 + crand() * 6, crand() * 6.28);
      return blob(14, 0.08, [host[0] + dx, host[1] + dy]);
    }).flat(),
  ];
  const LG_LABELS = [["Milky Way", [0, 0], 1.2], ["Andromeda", ANDROMEDA, 2.6], ["Triangulum", TRIANGULUM, 0.9]];
  const LG_CENTER = { x: ANDROMEDA[0] * 0.45, y: ANDROMEDA[1] * 0.45 };

  // Cosmic web: galaxy clusters joined by filaments, in a unit disk
  const makeWeb = (nodeCount, count, extra = []) => {
    const nodes = [...extra, ...Array.from({ length: nodeCount }, () => polar(Math.sqrt(crand()) * 0.98, crand() * 6.28))];
    const links = [];
    nodes.forEach((a, i) => {
      nodes.map((b, j) => [Math.hypot(a[0] - b[0], a[1] - b[1]), j]).filter(([, j]) => j !== i)
        .sort((p, q) => p[0] - q[0]).slice(0, 3).forEach(([, j]) => links.push([i, j]));
    });
    const pts = [];
    for (let i = 0; i < count; i++) {
      const r = crand();
      if (r < 0.25) {                                // clusters at the nodes
        const n = nodes[(crand() * nodes.length) | 0];
        pts.push({ x: n[0] + cgauss() * 0.022, y: n[1] + cgauss() * 0.022, b: 1 });
      } else if (r < 0.8) {                          // filaments, slightly bowed and fuzzy
        const [a, b] = links[(crand() * links.length) | 0], t = crand();
        const A = nodes[a], B = nodes[b];
        const bow = Math.sin(t * Math.PI) * 0.04 * (((a * 7 + b) % 3) - 1);
        const nx = -(B[1] - A[1]), ny = B[0] - A[0], nl = Math.hypot(nx, ny) || 1;
        pts.push({ x: A[0] + (B[0] - A[0]) * t + (nx / nl) * bow + cgauss() * 0.012, y: A[1] + (B[1] - A[1]) * t + (ny / nl) * bow + cgauss() * 0.012, b: 0.8 });
      } else {                                       // sparse galaxies in the voids
        const [x, y] = polar(Math.sqrt(crand()), crand() * 6.28);
        pts.push({ x, y, b: 0.35 });
      }
    }
    return pts.filter((p) => Math.hypot(p.x, p.y) < 1);
  };
  const WEB = makeWeb(150, 14000, [[0, 0]]);              // observable universe, centred on us
  // Laniakea, our supercluster (~520 million ly across): the Local Group sits out on its edge,
  // the Great Attractor at its heart
  const LANIAKEA_R = 5200;                                // in Milky Way radii
  const LAN_CENTER = { x: -0.62 * LANIAKEA_R, y: 0.25 * LANIAKEA_R };
  const LANIAKEA = makeWeb(60, 7000, [[0, 0], [0.62, -0.25]]);

  const SCALES = [
    { at: -1, name: "Solar System", size: "about 100 AU across · 8 planets" },
    { at: -3, name: "Milky Way", size: "about 100,000 light-years across · 100–400 billion stars" },
    { at: -4.8, name: "Local Group", size: "about 10 million light-years across · 80+ galaxies" },
    { at: -6.8, name: "Laniakea Supercluster", size: "about 520 million light-years across · ~100,000 galaxies" },
    { at: -Infinity, name: "Observable universe", size: "about 93 billion light-years across · hundreds of billions of galaxies" },
  ];
  const smooth = (L, a, b) => { const x = clamp((a - L) / (a - b), 0, 1); return x * x * (3 - 2 * x); };

  function drawCosmos(L, alphaAll) {
    const G0 = Math.min(W, H) * 0.42;
    const k = (G0 * cam.zoom) / 0.01;               // pixels per Milky Way radius
    // Where the camera is centred: the Sun, then the galactic centre, the Local Group, and us again
    let fx = lerp(SUN.x, 0, smooth(L, -1.3, -2.3)), fy = lerp(SUN.y, 0, smooth(L, -1.3, -2.3));
    const s2 = smooth(L, -3.0, -4.0); fx = lerp(fx, LG_CENTER.x, s2); fy = lerp(fy, LG_CENTER.y, s2);
    const s3 = smooth(L, -4.4, -5.4); fx = lerp(fx, LAN_CENTER.x, s3); fy = lerp(fy, LAN_CENTER.y, s3);
    const s4 = smooth(L, -6.3, -7.3); fx = lerp(fx, 0, s4); fy = lerp(fy, 0, s4);
    const tilt = lerp(cam.tilt, 1, smooth(L, -3.5, -5));
    const ca = Math.cos(cam.yaw), sa = Math.sin(cam.yaw);
    const fxr = fx * ca - fy * sa, fyr = fx * sa + fy * ca;
    const cx = W / 2, cy = H / 2 + 20;
    const sx = (x, y) => cx + (x * ca - y * sa - fxr) * k;
    const sy = (x, y) => cy + (x * sa + y * ca - fyr) * k * tilt;
    const onScreen = (x, y, m = 40) => x > -m && x < W + m && y > -m && y < H + m;

    const mwA = smooth(L, -0.7, -1.5) * alphaAll;
    const lgA = smooth(L, -2.6, -3.3) * (1 - smooth(L, -4.4, -5.2)) * alphaAll;
    const lanA = smooth(L, -4.3, -5.1) * (1 - smooth(L, -6.4, -7.2)) * alphaAll;
    const webA = smooth(L, -6.3, -7.3) * alphaAll;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    if (webA > 0.01) {
      const U = UNIVERSE_R;
      for (const p of WEB) {
        const x = sx(p.x * U, p.y * U), y = sy(p.x * U, p.y * U);
        if (!onScreen(x, y, 2)) continue;
        ctx.fillStyle = `rgba(170,165,255,${0.32 * p.b * webA})`;
        ctx.fillRect(x, y, 1.2, 1.2);
      }
      // The edge of the observable universe, with the cosmic microwave background glowing beyond
      const R = U * k;
      if (R < Math.max(W, H) * 3) {
        const c0x = sx(0, 0), c0y = sy(0, 0);
        const g = ctx.createRadialGradient(c0x, c0y, R * 0.96, c0x, c0y, R * 1.06);
        g.addColorStop(0, "rgba(255,140,80,0)"); g.addColorStop(0.5, `rgba(255,140,80,${0.16 * webA})`); g.addColorStop(1, "rgba(255,140,80,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(c0x, c0y, R * 1.06, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.fillStyle = `rgba(255,190,150,${0.75 * webA})`;
        ctx.textAlign = "center";
        ctx.fillText("EDGE OF THE OBSERVABLE UNIVERSE · COSMIC MICROWAVE BACKGROUND", c0x, c0y - R - 14);
        ctx.textAlign = "start";
        ctx.globalCompositeOperation = "lighter";
      }
    }

    if (lanA > 0.01) {
      for (const p of LANIAKEA) {
        const wx = LAN_CENTER.x + p.x * LANIAKEA_R, wy = LAN_CENTER.y + p.y * LANIAKEA_R;
        const x = sx(wx, wy), y = sy(wx, wy);
        if (!onScreen(x, y, 2)) continue;
        ctx.fillStyle = `rgba(205,190,255,${0.4 * p.b * lanA})`;
        ctx.fillRect(x, y, 1.2, 1.2);
      }
    }

    if (lgA > 0.01) {
      const col = [[255, 220, 170], [185, 205, 255], [255, 150, 190]];
      for (const p of LOCAL_GROUP) {
        const x = sx(p.x, p.y), y = sy(p.x, p.y);
        if (!onScreen(x, y, 2)) continue;
        const c = col[p.c];
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.55 * lgA * clamp(Math.pow(k / 45, 1.5), 0.012, 1)})`;
        ctx.fillRect(x, y, 1.1, 1.1);
      }
    }

    if (mwA > 0.01) {
      const R = k;                                   // Milky Way radius on screen
      const gx = sx(0, 0), gy = sy(0, 0);
      const core = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(3, R * 0.35));
      core.addColorStop(0, `rgba(255,225,180,${0.35 * mwA})`); core.addColorStop(1, "rgba(255,200,140,0)");
      ctx.fillStyle = core;
      ctx.beginPath(); ctx.ellipse(gx, gy, Math.max(3, R * 0.35), Math.max(3, R * 0.35) * tilt, 0, 0, Math.PI * 2); ctx.fill();
      if (R > 4) {
        const col = [[255, 220, 170], [190, 210, 255], [255, 150, 190]];
        const size = clamp(R / 260, 0.8, 2.2);
        for (const p of MILKY_WAY) {
          const x = sx(p.x, p.y), y = sy(p.x, p.y);
          if (!onScreen(x, y, 2)) continue;
          const c = col[p.c];
          ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.5 * mwA * clamp(Math.pow(R / 140, 1.5), 0.012, 1)})`;
          ctx.fillRect(x, y, size, size);
        }
      }
    }
    ctx.restore();

    // Labels: galaxies of the Local Group, and "You are here"
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    if (lanA > 0.3) {
      ctx.fillStyle = `rgba(220,205,255,${0.7 * lanA})`;
      ctx.fillText("Great Attractor", sx(LAN_CENTER.x, LAN_CENTER.y), sy(LAN_CENTER.x, LAN_CENTER.y) + 18);
    }
    if (lgA > 0.2 && k < 60 && k > 0.8) {
      for (const [name, [x, y], r] of LG_LABELS) {
        const X = sx(x, y), Y = sy(x, y) + r * k * tilt + 16;
        if (onScreen(X, Y)) { ctx.fillStyle = `rgba(200,210,240,${0.75 * lgA})`; ctx.fillText(name, X, Y); }
      }
      if (k > 12) for (const [name, [x, y]] of [["Large Magellanic Cloud", LMC], ["Small Magellanic Cloud", SMC]]) {
        ctx.fillStyle = `rgba(200,210,240,${0.5 * lgA})`; ctx.fillText(name, sx(x, y), sy(x, y) + 16);
      }
    }
    const youA = smooth(L, -1.0, -1.6) * alphaAll;
    if (youA > 0.01) {
      const m = smooth(L, -2.8, -3.6);
      const yx = sx(lerp(SUN.x, 0, m), lerp(SUN.y, 0, m)), yy = sy(lerp(SUN.x, 0, m), lerp(SUN.y, 0, m));
      ctx.strokeStyle = `rgba(140,200,217,${0.9 * youA})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(yx, yy, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(232,234,246,${0.9 * youA})`;
      ctx.fillText("You are here", yx, yy - 16);
    }
    ctx.textAlign = "start";
  }

  let scaleShown = "", journey = 0;            // journey: -1 flying out to the universe, +1 flying home
  const scaleEl = document.getElementById("skyScale");
  const journeyBtn = sky.querySelector(".sky__journey");
  function updateHud(L) {
    const sc = SCALES.find((x) => L > x.at);
    if (sc.name !== scaleShown) {
      scaleShown = sc.name;
      scaleEl.innerHTML = `<strong>${sc.name}</strong><span>${sc.size}</span>`;
    }
    const label = L < -4 ? "Back to the Sun ↙" : "Zoom out to the universe ↗";
    if (journeyBtn.textContent !== label) journeyBtn.textContent = label;
  }

  function frame(now) {
    if (!open && now - closedAt > CLOSE_MS) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    const t = reduceMotion ? 0 : (now - t0) / 1000;
    const introT = reduceMotion ? 1 : (now - opened) / INTRO_MS;
    const intro = easeOut(introT);

    // Camera: drag rotation, plus follow mode on a selected planet
    const k = 1 - Math.pow(0.002, dt);               // frame-rate independent easing
    const wantYaw = target.yaw + dragYaw;
    const wantTilt = clamp(target.tilt + dragTilt, 0.12, 0.95);
    cam.yaw = lerp(cam.yaw, wantYaw, k);
    cam.tilt = lerp(cam.tilt, wantTilt, k);
    if (journey) {
      const Lt = Math.log10(target.zoom) + journey * dt * 0.9;   // about one power of ten per second
      target.zoom = clamp(10 ** Lt, MIN_ZOOM, 1);
      if ((journey < 0 && target.zoom <= MIN_ZOOM) || (journey > 0 && target.zoom >= 1)) journey = 0;
    }
    if (target.zoom < SOLAR_MIN) { target.panX = 0; target.panY = 0; if (selected) { selected = null; card.hidden = true; } }
    cam.zoom = Math.exp(lerp(Math.log(cam.zoom), Math.log(target.zoom), k));   // ease in log space across scales
    const L = Math.log10(cam.zoom);
    const solarA = 1 - smooth(L, -0.5, -1.4), constA = 1 - smooth(L, -0.3, -0.8);
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

    const starFade = smooth(L, -4.4, -5.8);
    // Background stars: hyperspace streaks during the entrance, then parallax points
    const cx0 = W / 2, cy0 = H / 2;
    const warp = reduceMotion ? 0 : 1 - easeOut(introT * 1.6);
    const toSky = skyCamera(cam.yaw, lerp(0.97, cam.tilt, intro));   // sweeps down with the opening tilt
    for (const s of stars) {
      const q = toSky(s.d);
      if (!q) continue;
      const sx = q[0], sy = q[1];
      if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue;
      const alpha = s.a * (0.8 + Math.sin(t * 1.3 + s.tw) * 0.2) * (1 - 0.85 * starFade);
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

    drawCosmos(L, 1);
    updateHud(L);

    // Constellations: lines trace in after the arrival (only meaningful as seen from Earth)
    ctx.font = "10.5px 'JetBrains Mono', monospace";
    placed.forEach((c, ci) => {
      const prog = clamp((introT - 0.45 - (ci % 13) * 0.025) / 0.5, 0, 1) * constA;
      if (prog <= 0) return;
      const P = c.dirs.map(toSky);
      if (P.some((q) => !q)) return;                  // partly behind the camera
      if (P.every(([x, y]) => x < -20 || x > W + 20 || y < -20 || y > H + 20)) return;
      ctx.strokeStyle = `rgba(140,200,217,${0.3 * prog})`;
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
      ctx.strokeStyle = selected === p ? `rgba(140,200,217,${0.55 * solarA})` : `rgba(255,255,255,${0.09 * solarA})`;
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
      ctx.fillStyle = `rgba(200,190,170,${0.35 * b.s * beltAlpha * solarA})`;
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
      ctx.globalAlpha = clamp(introT * 3, 0, 1) * Math.max(solarA, 0.0);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(s.x, s.y, sr * 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    };
    const drawBody = (b) => {
      if (b.alpha <= 0 || solarA <= 0.01) return;
      const { p, x, y, size } = b;
      ctx.globalAlpha = b.alpha * solarA;
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
      if (solarA > 0.6) hits.push({ p, x, y, r: Math.max(16, size + 8) });
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
    const z1 = clamp(z0 * factor, MIN_ZOOM, 8);
    journey = 0;
    if (!selected && z1 >= SOLAR_MIN) {
      // Keep the point under the cursor fixed while zooming
      const ox = x - W / 2 - target.panX, oy = y - H / 2 - 20 - target.panY;
      target.panX -= ox * (z1 / z0 - 1);
      target.panY -= oy * (z1 / z0 - 1);
      if (z1 <= 1) { target.panX *= z1; target.panY *= z1; }
    }
    if (z1 < SOLAR_MIN) { target.panX = 0; target.panY = 0; }
    target.zoom = z1;
  }

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    // Zoom faster once past the Solar System: there are eight powers of ten to cross
    zoomAt(Math.exp(-e.deltaY * (target.zoom < SOLAR_MIN ? 0.004 : 0.0015)), e.clientX, e.clientY);
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
  journeyBtn.addEventListener("click", () => {
    selected = null; card.hidden = true;
    journey = Math.log10(cam.zoom) < -4 ? 1 : -1;
  });
  document.querySelectorAll("[data-open-sky]").forEach((b) => b.addEventListener("click", () => setOpen(true)));
  window.addEventListener("resize", () => { if (open) resize(); });
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest("input, textarea, [contenteditable]")) return;
    if (e.key === "s" || e.key === "S") {
      if (!open && document.body.classList.contains("sky-open")) return;   // brain mode is open
      setOpen(!open);
    }
    else if (e.key === "Escape" && open) { if (selected) unfocus(); else setOpen(false); }
    else if (open && (e.key === "+" || e.key === "=")) zoomAt(1.25, W / 2, H / 2);
    else if (open && e.key === "-") zoomAt(0.8, W / 2, H / 2);
  });

  window.Sky = { open: () => setOpen(true), close: () => setOpen(false) };
})();
