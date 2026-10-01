/* ──────────────────────────────────────────────
   "Make a neuron fire" — a live Hodgkin–Huxley (1952)
   squid-axon neuron. Classic parameters, membrane
   voltage in mV, time in ms, integrated with small
   Euler steps. Each action potential dispatches a
   `neuron-spike` event that the background network
   echoes. Also draws the small orrery on the sky card.
   ────────────────────────────────────────────── */
(() => {
  const canvas = document.getElementById("hhCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const slider = document.getElementById("hhCurrent");
  const currentOut = document.getElementById("hhCurrentOut");
  const rateOut = document.getElementById("hhRate");
  const naBar = document.getElementById("hhNa"), kBar = document.getElementById("hhK");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Hodgkin–Huxley parameters (µF/cm², mS/cm², mV)
  const C = 1, G_NA = 120, G_K = 36, G_L = 0.3, E_NA = 50, E_K = -77, E_L = -54.387;
  const DT = 0.01;                 // integration step (ms)
  const SIM_SPEED = 18;            // simulated ms per real second
  const WINDOW_MS = 100;           // width of the trace

  const safe = (x) => (Math.abs(x) < 1e-7 ? 1e-7 : x);
  const rates = (V) => ({
    an: (0.01 * (V + 55)) / (1 - Math.exp(-safe(V + 55) / 10)) || 0.1,
    bn: 0.125 * Math.exp(-(V + 65) / 80),
    am: (0.1 * (V + 40)) / (1 - Math.exp(-safe(V + 40) / 10)) || 1,
    bm: 4 * Math.exp(-(V + 65) / 18),
    ah: 0.07 * Math.exp(-(V + 65) / 20),
    bh: 1 / (1 + Math.exp(-(V + 35) / 10)),
  });

  let V = -65, m = 0.053, h = 0.596, n = 0.318;
  let simT = 0, pulseUntil = -1, above = false;
  const trace = [];                // { t, V }
  const spikes = [];               // spike times (ms)

  function step(I) {
    const r = rates(V);
    m += DT * (r.am * (1 - m) - r.bm * m);
    h += DT * (r.ah * (1 - h) - r.bh * h);
    n += DT * (r.an * (1 - n) - r.bn * n);
    const iNa = G_NA * m ** 3 * h * (V - E_NA);
    const iK = G_K * n ** 4 * (V - E_K);
    const iL = G_L * (V - E_L);
    V += (DT * (I - iNa - iK - iL)) / C;
    simT += DT;
    // Spike detection on the upward crossing of 0 mV
    if (!above && V > 0) {
      above = true;
      spikes.push(simT);
      document.dispatchEvent(new CustomEvent("neuron-spike"));
    } else if (above && V < -20) above = false;
  }

  let W = 0, H = 0, DPR = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.round(r.width); H = Math.round(r.height);
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  const vMin = -85, vMax = 55;
  const yOf = (v) => 10 + (1 - (v - vMin) / (vMax - vMin)) * (H - 26);

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // Reference lines: resting potential and 0 mV
    ctx.font = "10.5px 'JetBrains Mono', monospace";
    for (const [v, label] of [[0, "0 mV"], [-65, "rest −65 mV"]]) {
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(0, yOf(v)); ctx.lineTo(W, yOf(v)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(154,160,195,0.7)";
      ctx.fillText(label, 6, yOf(v) - 5);
    }
    if (trace.length < 2) return;
    const t1 = simT, t0 = t1 - WINDOW_MS;
    const xOf = (t) => ((t - t0) / WINDOW_MS) * W;
    // Glow under spikes, then the trace itself
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(140,200,217,0.18)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    trace.forEach((p, i) => (i ? ctx.lineTo(xOf(p.t), yOf(p.V)) : ctx.moveTo(xOf(p.t), yOf(p.V))));
    ctx.stroke();
    ctx.strokeStyle = "#8cc8d9";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // Spike markers at the top
    ctx.fillStyle = "#d9bd8c";
    for (const s of spikes) if (s > t0) { ctx.beginPath(); ctx.arc(xOf(s), 8, 2.5, 0, Math.PI * 2); ctx.fill(); }
    // Time scale
    ctx.fillStyle = "rgba(154,160,195,0.7)";
    ctx.textAlign = "right";
    ctx.fillText(`${WINDOW_MS} ms`, W - 6, H - 4);
    ctx.textAlign = "start";
  }

  function updateReadouts() {
    const I = Number(slider.value);
    currentOut.textContent = `${I.toFixed(1)} µA/cm²`;
    while (spikes.length > 20) spikes.shift();
    // Rate from the last inter-spike interval, dropping to 0 once the neuron goes quiet
    let hz = 0;
    if (spikes.length >= 2) {
      const isi = spikes[spikes.length - 1] - spikes[spikes.length - 2];
      if (simT - spikes[spikes.length - 1] < Math.max(40, isi * 1.5)) hz = 1000 / isi;
    }
    rateOut.textContent = `${Math.round(hz)} Hz`;
    naBar.style.width = `${Math.min(100, m ** 3 * h * 100 * 2.5)}%`;   // scaled so a spike fills the bar
    kBar.style.width = `${Math.min(100, n ** 4 * 100 * 1.6)}%`;
  }

  let last = 0, visible = false, raf = 0;
  function loop(now) {
    const dtReal = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    const I = Number(slider.value) + (simT < pulseUntil ? 15 : 0);
    const steps = Math.round((dtReal * SIM_SPEED) / DT);
    for (let k = 0; k < steps; k++) {
      step(I);
      if (k % 5 === 0) trace.push({ t: simT, V });
    }
    while (trace.length && trace[0].t < simT - WINDOW_MS) trace.shift();
    draw();
    updateReadouts();
    raf = visible && !reduceMotion ? requestAnimationFrame(loop) : 0;
  }

  // Pre-roll to a steady resting state so the trace starts flat
  for (let k = 0; k < 3000; k++) step(0);
  spikes.length = 0;
  for (let t = simT - WINDOW_MS; t <= simT; t += 0.5) trace.push({ t, V });

  document.getElementById("hhZap").addEventListener("click", () => {
    pulseUntil = simT + 1;        // 1 ms, 15 µA/cm² pulse: enough for one action potential
    if (reduceMotion) { for (let k = 0; k < 2000; k++) { step(simT < pulseUntil ? 15 : Number(slider.value)); trace.push({ t: simT, V }); } draw(); updateReadouts(); }
  });
  slider.addEventListener("input", updateReadouts);

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf && !reduceMotion) { last = 0; raf = requestAnimationFrame(loop); }
  }).observe(canvas);
  draw();
  updateReadouts();

  /* ───────── Small orrery on the "cosmos" card ───────── */
  const mini = document.getElementById("miniOrrery");
  if (!mini) return;
  const mctx = mini.getContext("2d");
  const ORBITS = [[0.22, 0.24, "#b9b2a8", 1.6], [0.36, 0.62, "#e9cf9f", 2.4], [0.5, 1, "#6fa8dc", 2.6], [0.66, 1.88, "#d9734e", 2], [0.88, 11.9, "#d8b98c", 4.2]];
  let mw = 0, mh = 0;
  function mresize() {
    const r = mini.getBoundingClientRect();
    const d = Math.min(window.devicePixelRatio || 1, 2);
    mw = r.width; mh = r.height;
    mini.width = mw * d; mini.height = mh * d;
    mctx.setTransform(d, 0, 0, d, 0, 0);
  }
  new ResizeObserver(mresize).observe(mini);
  mresize();
  let mvis = false, mraf = 0;
  function mloop(now) {
    const t = reduceMotion ? 0 : now / 1000;
    const cx = mw / 2, cy = mh / 2, R = Math.min(mw / 2, mh / 0.9) * 0.92;
    mctx.clearRect(0, 0, mw, mh);
    const g = mctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.22);
    g.addColorStop(0, "rgba(255,236,190,1)"); g.addColorStop(0.3, "rgba(255,206,120,0.9)"); g.addColorStop(1, "rgba(255,150,60,0)");
    mctx.fillStyle = g; mctx.beginPath(); mctx.arc(cx, cy, R * 0.22, 0, Math.PI * 2); mctx.fill();
    ORBITS.forEach(([fr, years, color, size], i) => {
      const r = R * fr;
      mctx.strokeStyle = "rgba(255,255,255,0.08)";
      mctx.beginPath(); mctx.ellipse(cx, cy, r, r * 0.4, 0, 0, Math.PI * 2); mctx.stroke();
      const a = i * 1.3 + (t / (12 * years)) * Math.PI * 2;
      mctx.fillStyle = color;
      mctx.beginPath(); mctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.4, size, 0, Math.PI * 2); mctx.fill();
    });
    mraf = mvis && !reduceMotion ? requestAnimationFrame(mloop) : 0;
  }
  new IntersectionObserver(([e]) => {
    mvis = e.isIntersecting;
    if (mvis && !mraf) mraf = requestAnimationFrame(mloop);
  }).observe(mini);
})();
