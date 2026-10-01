/* ──────────────────────────────────────────────
   Lab notebook — progress chart of the autonomous
   research run: best validation score so far across
   54 experiments, against two ProteinMPNN baselines.
   Values recreated from the run's progress plot
   (≈ marks values read off the plot, not logged labels).
   ────────────────────────────────────────────── */
(() => {
  const plot = document.getElementById("runChartPlot");
  if (!plot) return;

  const TOTAL = 54;
  // Each entry: experiment where the best score improved, new best, what changed
  const STEPS = [
    { exp: 1, val: 0.423, approx: true, note: "Starting baseline" },
    { exp: 11, val: 0.429, approx: true, note: "Deeper model" },
    { exp: 15, val: 0.432, approx: true, note: "Backbone angle features" },
    { exp: 22, val: 0.447, approx: true, note: "Longer training (100 epochs)" },
    { exp: 23, val: 0.450, approx: true, note: "Frame-transition features" },
    { exp: 24, val: 0.453, approx: true, note: "Distance-aware attention" },
    { exp: 31, val: 0.457, approx: false, note: "Phase 2: longer runs" },
    { exp: 32, val: 0.489, approx: false, note: "Two-stage fine-tuning" },
  ];
  const BASELINES = [
    { val: 0.435, label: "ProteinMPNN · 5 epochs (phase 1 target)", short: "ProteinMPNN · 5 ep" },
    { val: 0.475, label: "ProteinMPNN · pretrained (phase 2 target)", short: "ProteinMPNN · pretrained" },
  ];

  const fmt = (s) => `${s.approx ? "≈" : ""}${s.val.toFixed(3)}`;

  // Accessible table view
  const tbody = document.querySelector("#runChartTable tbody");
  tbody.innerHTML = STEPS.map((s) => `<tr><td>${s.exp}</td><td>${fmt(s)}</td><td>${s.note}</td></tr>`).join("");

  const tip = document.createElement("div");
  tip.className = "run-tip";
  plot.appendChild(tip);

  function draw() {
    const W = Math.max(300, plot.clientWidth);
    const H = Math.round(Math.min(300, Math.max(220, W * 0.5)));
    const m = { t: 18, r: 14, b: 30, l: 40 };
    const y0 = 0.41, y1 = 0.50;
    const x = (e) => m.l + ((e - 1) / (TOTAL - 1)) * (W - m.l - m.r);
    const y = (v) => m.t + (1 - (v - y0) / (y1 - y0)) * (H - m.t - m.b);

    // Step path: flat until the next improvement, then a vertical jump
    let d = `M${x(STEPS[0].exp)},${y(STEPS[0].val)}`;
    STEPS.slice(1).forEach((s) => { d += ` H${x(s.exp)} V${y(s.val)}`; });
    d += ` H${x(TOTAL)}`;
    const area = `${d} V${y(y0)} H${x(STEPS[0].exp)} Z`;

    const grid = [0.42, 0.44, 0.46, 0.48, 0.50].map((v) =>
      `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>
       <text class="axis-label" x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${v.toFixed(2)}</text>`).join("");
    const xticks = [1, 10, 20, 30, 40, 54].map((e) =>
      `<text class="axis-label" x="${x(e)}" y="${H - 8}" text-anchor="middle">${e}</text>`).join("");
    const base = BASELINES.map((b) =>
      `<line class="baseline" x1="${m.l}" x2="${W - m.r}" y1="${y(b.val)}" y2="${y(b.val)}"/>
       <text class="baseline-label" x="${W - m.r}" y="${y(b.val) + 15}" text-anchor="end">${W < 480 ? b.short : b.label}</text>`).join("");
    const best = STEPS[STEPS.length - 1];
    const pts = STEPS.map((s, k) => {
      const isBest = k === STEPS.length - 1;
      return `<circle class="pt${isBest ? " pt--best" : ""}" cx="${x(s.exp)}" cy="${y(s.val)}" r="${isBest ? 6 : 4.5}"/>
              <circle class="hit" data-k="${k}" cx="${x(s.exp)}" cy="${y(s.val)}" r="14"><title>Experiment ${s.exp}: ${fmt(s)}, ${s.note}</title></circle>`;
    }).join("");

    plot.querySelector("svg")?.remove();
    plot.insertAdjacentHTML("afterbegin", `
      <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"
           aria-label="Step chart: the best validation score rises from about 0.42 to 0.489 over 54 experiments, passing both ProteinMPNN baselines at experiment 32.">
        ${grid}${xticks}
        ${base}
        <path class="area" d="${area}"/>
        <path class="line" d="${d}"/>
        ${pts}
        <text class="best-label" x="${x(best.exp) - 10}" y="${y(best.val) + 4}" text-anchor="end">Best: ${best.val.toFixed(3)}</text>
      </svg>`);

    plot.querySelectorAll(".hit").forEach((c) => {
      const s = STEPS[Number(c.dataset.k)];
      const show = () => {
        tip.innerHTML = `<b>Experiment ${s.exp} · ${fmt(s)}</b>${s.note}`;
        tip.style.left = `${x(s.exp)}px`;
        tip.style.top = `${y(s.val)}px`;
        tip.classList.add("is-on");
      };
      c.addEventListener("pointerenter", show);
      c.addEventListener("focus", show);
      c.addEventListener("pointerleave", () => tip.classList.remove("is-on"));
    });
  }

  new ResizeObserver(draw).observe(plot);
  draw();
})();
