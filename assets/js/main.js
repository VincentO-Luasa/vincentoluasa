/* ──────────────────────────────────────────────
   Neural cosmos — a starfield whose brightest stars
   are wired together like neurons. Signals (action
   potentials) travel along the connections and can
   cascade; the cursor excites nearby neurons.
   ────────────────────────────────────────────── */
(() => {
  document.documentElement.classList.remove("no-js");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ───────── Canvas ───────── */
  const canvas = document.getElementById("cosmos");
  const ctx = canvas.getContext("2d");
  const COLORS = {
    synapse: [126, 240, 255],
    nebula: [177, 140, 255],
    ember: [255, 197, 110],
  };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  let W = 0, H = 0, DPR = 1;
  let stars = [], neurons = [], signals = [], meteors = [];
  let linkDist = 150;
  const mouse = { x: -9999, y: -9999, active: false };
  let scrollY = window.scrollY;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    linkDist = Math.max(110, Math.min(170, Math.sqrt(W * H) / 7));
    build();
  }

  function build() {
    const area = W * H;

    stars = Array.from({ length: Math.round(area / 2600) }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.1 + 0.2,
      depth: Math.random() * 0.6 + 0.1,          // parallax factor
      tw: Math.random() * Math.PI * 2,           // twinkle phase
      ts: Math.random() * 0.02 + 0.005,          // twinkle speed
      hue: Math.random() < 0.12 ? COLORS.nebula : Math.random() < 0.08 ? COLORS.ember : [255, 255, 255],
    }));

    const count = Math.max(28, Math.min(90, Math.round(area / 16000)));
    neurons = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.4 + 1.1,
      charge: 0,                                  // glow after firing
      refractory: 0,                              // frames before it can fire again
      color: Math.random() < 0.7 ? COLORS.synapse : COLORS.nebula,
    }));
    signals = [];
  }

  function neighbours(i) {
    const a = neurons[i];
    const out = [];
    for (let j = 0; j < neurons.length; j++) {
      if (j === i) continue;
      const b = neurons[j];
      const dx = a.x - b.x, dy = a.y - b.y;
      if (dx * dx + dy * dy < linkDist * linkDist) out.push(j);
    }
    return out;
  }

  function fire(i, generation = 0) {
    const n = neurons[i];
    if (n.refractory > 0) return;
    n.charge = 1;
    n.refractory = 90;
    const targets = neighbours(i);
    // Fire along a few random dendrites
    targets.sort(() => Math.random() - 0.5).slice(0, 2 + (Math.random() * 2) | 0).forEach((j) => {
      signals.push({ from: i, to: j, t: 0, speed: 0.012 + Math.random() * 0.012, gen: generation });
    });
  }

  function spawnMeteor() {
    const fromLeft = Math.random() < 0.5;
    meteors.push({
      x: fromLeft ? Math.random() * W * 0.5 : W * 0.5 + Math.random() * W * 0.5,
      y: Math.random() * H * 0.4,
      vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 4),
      vy: 2.5 + Math.random() * 2,
      life: 1,
    });
  }

  let frame = 0;
  function draw() {
    frame++;
    ctx.clearRect(0, 0, W, H);

    /* Stars, with gentle scroll parallax */
    for (const s of stars) {
      s.tw += s.ts;
      const a = 0.35 + Math.sin(s.tw) * 0.3 + 0.3;
      let y = (s.y - scrollY * s.depth * 0.15) % H;
      if (y < 0) y += H;
      ctx.fillStyle = rgba(s.hue, a * 0.85);
      ctx.beginPath();
      ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    /* Move neurons */
    for (const n of neurons) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < -20) n.x = W + 20; else if (n.x > W + 20) n.x = -20;
      if (n.y < -20) n.y = H + 20; else if (n.y > H + 20) n.y = -20;
      n.charge *= 0.965;
      if (n.refractory > 0) n.refractory--;

      // Cursor excites nearby neurons
      if (mouse.active) {
        const dx = n.x - mouse.x, dy = n.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 120 * 120) {
          if (d2 < 70 * 70 && Math.random() < 0.04) fire(neurons.indexOf(n));
          // slight attraction — like a gravity well
          n.vx -= dx * 0.00003;
          n.vy -= dy * 0.00003;
        }
      }
      // Speed limit
      const sp = Math.hypot(n.vx, n.vy);
      if (sp > 0.45) { n.vx *= 0.45 / sp; n.vy *= 0.45 / sp; }
    }

    /* Dendrites */
    ctx.lineWidth = 0.6;
    for (let i = 0; i < neurons.length; i++) {
      const a = neurons[i];
      for (let j = i + 1; j < neurons.length; j++) {
        const b = neurons[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > linkDist * linkDist) continue;
        const k = 1 - Math.sqrt(d2) / linkDist;
        const boost = Math.max(a.charge, b.charge);
        ctx.strokeStyle = rgba(COLORS.synapse, k * 0.13 + boost * k * 0.35);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    /* Signals travelling along dendrites */
    for (let s = signals.length - 1; s >= 0; s--) {
      const sig = signals[s];
      const a = neurons[sig.from], b = neurons[sig.to];
      sig.t += sig.speed;
      if (sig.t >= 1) {
        signals.splice(s, 1);
        // Propagate with decaying probability
        if (sig.gen < 4 && Math.random() < 0.55 - sig.gen * 0.1) fire(sig.to, sig.gen + 1);
        else b.charge = Math.max(b.charge, 0.6);
        continue;
      }
      const x = a.x + (b.x - a.x) * sig.t;
      const y = a.y + (b.y - a.y) * sig.t;
      // tail
      const tx = a.x + (b.x - a.x) * Math.max(0, sig.t - 0.12);
      const ty = a.y + (b.y - a.y) * Math.max(0, sig.t - 0.12);
      const grad = ctx.createLinearGradient(tx, ty, x, y);
      grad.addColorStop(0, rgba(COLORS.ember, 0));
      grad.addColorStop(1, rgba(COLORS.ember, 0.9));
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = rgba(COLORS.ember, 1);
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    /* Neuron bodies */
    for (const n of neurons) {
      const glow = 6 + n.charge * 18;
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glow);
      g.addColorStop(0, rgba(n.charge > 0.3 ? COLORS.ember : n.color, 0.35 + n.charge * 0.5));
      g.addColorStop(1, rgba(n.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(n.x, n.y, glow, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba([255, 255, 255], 0.75 + n.charge * 0.25);
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + n.charge * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    /* Meteors */
    for (let m = meteors.length - 1; m >= 0; m--) {
      const met = meteors[m];
      met.x += met.vx;
      met.y += met.vy;
      met.life -= 0.012;
      if (met.life <= 0) { meteors.splice(m, 1); continue; }
      const grad = ctx.createLinearGradient(met.x, met.y, met.x - met.vx * 14, met.y - met.vy * 14);
      grad.addColorStop(0, `rgba(255,255,255,${met.life})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(met.x, met.y);
      ctx.lineTo(met.x - met.vx * 14, met.y - met.vy * 14);
      ctx.stroke();
    }

    /* Spontaneous activity */
    if (frame % 70 === 0) fire((Math.random() * neurons.length) | 0);
    if (Math.random() < 0.0025) spawnMeteor();

    requestAnimationFrame(draw);
  }

  function drawStatic() {
    // Reduced motion: a single still frame of the network
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      ctx.fillStyle = rgba(s.hue, 0.6);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineWidth = 0.6;
    for (let i = 0; i < neurons.length; i++) {
      for (let j = i + 1; j < neurons.length; j++) {
        const a = neurons[i], b = neurons[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > linkDist) continue;
        ctx.strokeStyle = rgba(COLORS.synapse, (1 - d / linkDist) * 0.15);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    for (const n of neurons) {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); if (reduceMotion) drawStatic(); }, 150);
  });
  window.addEventListener("pointermove", (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
  }, { passive: true });
  window.addEventListener("pointerleave", () => { mouse.active = false; });
  document.addEventListener("mouseleave", () => { mouse.active = false; });
  window.addEventListener("click", (e) => {
    // Clicking the sky fires the nearest neuron
    if (e.target.closest("a, button")) return;
    let best = -1, bestD = Infinity;
    neurons.forEach((n, i) => {
      const d = Math.hypot(n.x - e.clientX, n.y - e.clientY);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best >= 0 && bestD < 200) { neurons[best].refractory = 0; fire(best); }
  });

  resize();
  if (reduceMotion) drawStatic();
  else requestAnimationFrame(draw);

  /* ───────── Nav ───────── */
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  const navAnchors = [...links.querySelectorAll('a[href^="#"]')];

  const onScroll = () => {
    scrollY = window.scrollY;
    nav.classList.toggle("is-scrolled", scrollY > 30);
    if (scrollY < window.innerHeight * 0.5) navAnchors.forEach((a) => a.classList.remove("is-active"));
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const setMenu = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    links.classList.toggle("is-open", open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  links.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  // Highlight current section in nav
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navAnchors.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${entry.target.id}`));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("section[id]").forEach((s) => sectionObserver.observe(s));

  /* ───────── Reveal on scroll ───────── */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  // Stagger siblings that reveal together
  document.querySelectorAll(".reveal").forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
    el.style.setProperty("--d", `${Math.min(siblings.indexOf(el), 6) * 0.07}s`);
    revealObserver.observe(el);
  });

  /* ───────── Count-up stats ───────── */
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count);
      const suffix = el.dataset.suffix || "";
      if (reduceMotion) { el.textContent = target + suffix; return; }
      const start = performance.now();
      const dur = 1400;
      const step = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + (p === 1 ? suffix : "");
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      countObserver.unobserve(el);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll("[data-count]").forEach((el) => countObserver.observe(el));

  /* ───────── Card spotlight ───────── */
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  document.getElementById("year").textContent = new Date().getFullYear();
})();
