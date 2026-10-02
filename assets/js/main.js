/* ──────────────────────────────────────────────
   Quiet neural sky — a faint starfield with a sparse
   network of "neurons". Nothing fires on its own: the
   network wakes up around the cursor (neurons light up
   and link to it, and fire when you pass close by),
   and clicking the sky sends a signal cascade.
   ────────────────────────────────────────────── */
(() => {
  document.documentElement.classList.remove("no-js");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ───────── Canvas ───────── */
  const canvas = document.getElementById("cosmos");
  const ctx = canvas.getContext("2d");
  const ACCENT = [140, 200, 217];
  const SIGNAL = [217, 189, 140];
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  const HOVER_R = 170;   // radius in which neurons sense the cursor
  const FIRE_R = 55;     // passing this close fires a neuron

  let W = 0, H = 0, DPR = 1;
  let stars = [], neurons = [], signals = [];
  let linkDist = 150;
  const mouse = { x: -9999, y: -9999, active: false, lastMove: 0 };
  let scrollY = window.scrollY;
  let running = false;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    linkDist = Math.max(120, Math.min(180, Math.sqrt(W * H) / 6.5));
    build();
  }

  function build() {
    const area = W * H;
    stars = Array.from({ length: Math.round(area / 5000) }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 0.9 + 0.2,
      a: Math.random() * 0.35 + 0.1,
      depth: Math.random() * 0.5 + 0.1,
      tw: Math.random() * Math.PI * 2,
    }));
    const count = Math.max(18, Math.min(48, Math.round(area / 28000)));
    neurons = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08,
      r: Math.random() * 0.8 + 1,
      glow: 0,          // proximity to cursor (0–1), eased
      charge: 0,        // brightness after firing, decays
      refractory: 0,
    }));
    signals = [];
  }

  function neighbours(i) {
    const a = neurons[i], out = [];
    neurons.forEach((b, j) => {
      if (j !== i && (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < linkDist * linkDist) out.push(j);
    });
    return out;
  }

  function fire(i, gen, maxGen) {
    const n = neurons[i];
    if (n.refractory > 0) return;
    n.charge = 1;
    n.refractory = 120;
    neighbours(i)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
      .forEach((j) => signals.push({ from: i, to: j, t: 0, speed: 0.02, gen, maxGen }));
    wake();
  }

  function step() {
    ctx.clearRect(0, 0, W, H);
    const now = performance.now();
    const mouseMoving = mouse.active && now - mouse.lastMove < 120;

    // Stars: static, with a barely perceptible shimmer
    for (const s of stars) {
      s.tw += 0.006;
      let y = (s.y - scrollY * s.depth * 0.1) % H;
      if (y < 0) y += H;
      ctx.fillStyle = `rgba(255,255,255,${s.a * (0.85 + Math.sin(s.tw) * 0.15)})`;
      ctx.beginPath();
      ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Neurons: slow drift, cursor proximity
    neurons.forEach((n, i) => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < -20) n.x = W + 20; else if (n.x > W + 20) n.x = -20;
      if (n.y < -20) n.y = H + 20; else if (n.y > H + 20) n.y = -20;

      let target = 0;
      if (mouse.active) {
        const d = Math.hypot(n.x - mouse.x, n.y - mouse.y);
        if (d < HOVER_R) target = 1 - d / HOVER_R;
        if (d < FIRE_R && mouseMoving) fire(i, 0, 1);
      }
      n.glow += (target - n.glow) * 0.12;
      n.charge *= 0.95;
      if (n.refractory > 0) n.refractory--;
    });

    // Links between neurons
    ctx.lineWidth = 0.6;
    for (let i = 0; i < neurons.length; i++) {
      const a = neurons[i];
      for (let j = i + 1; j < neurons.length; j++) {
        const b = neurons[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > linkDist) continue;
        const k = 1 - d / linkDist;
        const lit = Math.max(Math.min(a.glow, b.glow), a.charge, b.charge);
        ctx.strokeStyle = rgba(ACCENT, k * (0.06 + lit * 0.5));
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }

    // Links from cursor to nearby neurons
    if (mouse.active) {
      for (const n of neurons) {
        if (n.glow < 0.02) continue;
        ctx.strokeStyle = rgba(ACCENT, n.glow * 0.45);
        ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(n.x, n.y); ctx.stroke();
      }
    }

    // Signals
    for (let k = signals.length - 1; k >= 0; k--) {
      const sig = signals[k];
      const a = neurons[sig.from], b = neurons[sig.to];
      sig.t += sig.speed;
      if (sig.t >= 1) {
        signals.splice(k, 1);
        if (sig.gen < sig.maxGen) fire(sig.to, sig.gen + 1, sig.maxGen);
        else b.charge = Math.max(b.charge, 0.5);
        continue;
      }
      const x = a.x + (b.x - a.x) * sig.t, y = a.y + (b.y - a.y) * sig.t;
      const t0 = Math.max(0, sig.t - 0.15);
      const tx = a.x + (b.x - a.x) * t0, ty = a.y + (b.y - a.y) * t0;
      const g = ctx.createLinearGradient(tx, ty, x, y);
      g.addColorStop(0, rgba(SIGNAL, 0));
      g.addColorStop(1, rgba(SIGNAL, 0.7));
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
      ctx.lineWidth = 0.6;
    }

    // Neuron bodies
    for (const n of neurons) {
      const lit = Math.max(n.glow, n.charge);
      if (lit > 0.02) {
        const R = 4 + lit * 10;
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, R);
        g.addColorStop(0, rgba(n.charge > n.glow ? SIGNAL : ACCENT, 0.35 * lit));
        g.addColorStop(1, rgba(ACCENT, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(n.x, n.y, R, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = `rgba(255,255,255,${0.35 + lit * 0.55})`;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
    }

  }

  // Animate continuously (the drift is slow and cheap), but skip work when the tab is hidden
  function loop() {
    if (document.hidden) { running = false; return; }
    step();
    requestAnimationFrame(loop);
  }
  function wake() {
    if (reduceMotion || running) return;
    running = true;
    requestAnimationFrame(loop);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) wake(); });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); if (reduceMotion) step(); }, 150);
  });
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    mouse.x = e.clientX; mouse.y = e.clientY;
    mouse.active = true; mouse.lastMove = performance.now();
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => { mouse.active = false; });
  window.addEventListener("blur", () => { mouse.active = false; });
  window.addEventListener("click", (e) => {
    if (e.target.closest("a, button, input, textarea")) return;
    let best = -1, bestD = Infinity;
    neurons.forEach((n, i) => {
      const d = Math.hypot(n.x - e.clientX, n.y - e.clientY);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best >= 0 && bestD < 250) { neurons[best].refractory = 0; fire(best, 0, 3); }
  });

  // The Hodgkin–Huxley demo announces each action potential; echo it in the background network
  document.addEventListener("neuron-spike", () => {
    if (reduceMotion || !neurons.length) return;
    const i = (Math.random() * neurons.length) | 0;
    neurons[i].refractory = 0;
    fire(i, 0, 2);
  });

  resize();
  if (reduceMotion) step();
  else wake();

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

  /* ───────── Career: per-role "more" toggle (small screens) ───────── */
  document.querySelectorAll(".timeline__item").forEach((item) => {
    const extra = item.querySelectorAll(".timeline__body li").length - 2;
    if (extra <= 0) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip-btn more-btn";
    btn.textContent = `+ ${extra} more`;
    btn.addEventListener("click", () => {
      const open = item.classList.toggle("is-open");
      btn.textContent = open ? "Show less" : `+ ${extra} more`;
    });
    item.querySelector(".timeline__body ul").after(btn);
  });

  /* ───────── Lab notebook: expand the protocol history (small screens) ───────── */
  const labMore = document.getElementById("labMore");
  if (labMore) labMore.addEventListener("click", () => {
    const log = document.getElementById("labLog");
    const open = log.classList.toggle("is-expanded");
    labMore.setAttribute("aria-expanded", String(open));
    labMore.textContent = open ? "Show less" : "Show the full protocol history";
  });

  /* ───────── Easter eggs ───────── */
  const toastEl = document.createElement("div");
  toastEl.className = "toast";
  toastEl.setAttribute("role", "status");
  document.body.appendChild(toastEl);
  let toastTimer;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 2600);
  };

  const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let konamiPos = 0;

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest("input, textarea, [contenteditable]")) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    konamiPos = key === KONAMI[konamiPos] ? konamiPos + 1 : key === KONAMI[0] ? 1 : 0;
    if (konamiPos === KONAMI.length) {
      konamiPos = 0;
      neurons.forEach((n, i) => { if (i % 3 === 0) { n.refractory = 0; fire(i, 0, 4); } });
      toast("Brainstorm! Every neuron at once.");
      return;
    }
  });

  console.log(
    "%cHi, curious mind 👋%c\nIf you're reading the console, we'd probably get along.\nTry pressing S on the page for the sky, or the Konami code.\nSay hello: vincent.oluasa@gmail.com",
    "font: 600 14px Inter, sans-serif; color: #8cc8d9;",
    "font: 12px Inter, sans-serif; color: #9aa0c3;"
  );
})();
