/* ──────────────────────────────────────────────
   "My job in 30 seconds" — a toy TCR–pMHC mutation
   explorer on the real 1G4 TCR / NY-ESO-1 / HLA-A2
   crystal structure (PDB 2BNR), rendered with 3Dmol.js.
   Visitors mutate residues of the two CDR3 loops that
   grip the peptide and see an *illustrative* binding
   score change. Scores come from a small deterministic
   toy function (weighted by real residue–peptide
   distances), not from a real model.
   ────────────────────────────────────────────── */
(() => {
  const root = document.getElementById("tcrDemo");
  if (!root) return;

  const AA = "ACDEFGHIKLMNPQRSTVWY";
  const AROMATIC = new Set(["W", "F", "Y"]);

  // The two CDR3 loops of the 1G4 TCR in PDB 2BNR. `dist` is the closest distance (Å)
  // from each residue to the peptide, measured on the structure.
  const LOOPS = [
    { key: "a", name: "CDR3α", short: "α", chain: "D", start: 90, wt: "CAVRPTSGGSYIPTF", color: "#f3a6c8",
      dist: [13.8, 10.3, 7.5, 3.9, 2.9, 3.6, 3.3, 3.8, 3.3, 3.9, 2.7, 5.6, 7.4, 9.6, 11.6],
      hotspots: { "8W": 0.9 } },
    { key: "b", name: "CDR3β", short: "β", chain: "E", start: 90, wt: "CASSYVGNTGELFF", color: "#ffffff",
      dist: [14.9, 11.3, 9.2, 5.4, 3.5, 2.9, 3.4, 2.8, 5.9, 4.2, 6.4, 7.8, 10.7, 12.8],
      hotspots: { "5W": 1.15, "8F": 0.85 } },
  ];
  LOOPS.forEach((L) => (L.conserved = new Set([0, 1, L.wt.length - 1])));

  const COLORS = {
    tcrA: "#3f7383", tcrB: "#76afc0", peptide: "#e2c48f", mhc: "#8f8bbd",
    select: "#8cc8d9", up: "#6fcf97", down: "#eb8a8a", neutral: "#c9cde6",
  };

  const $ = (id) => document.getElementById(id);
  const seqEl = $("tcrSeq"), picker = $("tcrPicker"), pickerGrid = $("tcrPickerGrid"), pickerLabel = $("tcrPickerLabel");
  const fill = $("tcrFill"), verdict = $("tcrVerdict"), mutLabel = $("tcrMut"), space = $("tcrSpace");

  let seqs = LOOPS.map((L) => L.wt.split(""));
  let selected = null;                                  // { l: loop index, i: position } or null

  /* ───────── Toy model ───────── */
  function effect(l, i, aa) {
    const L = LOOPS[l];
    if (aa === L.wt[i]) return 0;
    const h = Math.sin((i + 1) * 12.9898 + (AA.indexOf(aa) + 1) * 78.233 + l * 37.719) * 43758.5453;
    let d = (h - Math.floor(h)) * 1.2 - 0.85;           // mostly neutral-to-harmful
    if (AROMATIC.has(aa)) d += 0.35;                     // aromatic side chains make good contacts
    if (aa === "P") d -= 0.6;                            // prolines break the loop
    if (L.hotspots[`${i}${aa}`] !== undefined) d = L.hotspots[`${i}${aa}`];
    const contact = Math.min(1, Math.max(0.1, (9 - L.dist[i]) / 5)); // residues far from the peptide barely matter
    return d * contact;
  }
  const score = () => seqs.reduce((acc, s, l) => acc + s.reduce((a, aa, i) => a + effect(l, i, aa), 0), 0);
  const toPct = (s) => 50 + 42 * Math.tanh(s / 1.2);
  const mutName = (l, i, aa) => `${LOOPS[l].short}${LOOPS[l].wt[i]}${i + 1}${aa}`;
  const tone = (e) => (e > 0.2 ? "up" : e < -0.2 ? "down" : "neutral");
  const mutations = () => seqs.flatMap((s, l) => s.map((aa, i) => (aa !== LOOPS[l].wt[i] ? { l, i, aa } : null)).filter(Boolean));
  const isSel = (l, i) => selected && selected.l === l && selected.i === i;

  /* ───────── UI ───────── */
  function render() {
    seqEl.innerHTML = "";
    LOOPS.forEach((L, l) => {
      const row = document.createElement("div");
      row.className = "loop-row";
      row.innerHTML = `<span class="loop-row__name loop-row__name--${L.key}">${L.name}</span>`;
      const seq = document.createElement("div");
      seq.className = "seq";
      seq.setAttribute("role", "group");
      seq.setAttribute("aria-label", `${L.name} sequence`);
      seqs[l].forEach((aa, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = aa;
        b.setAttribute("aria-label", `${L.name} position ${i + 1}: ${aa}${L.conserved.has(i) ? " (conserved)" : ""}`);
        if (L.conserved.has(i)) { b.disabled = true; b.title = "Conserved residue: not mutated"; }
        if (aa !== L.wt[i]) b.classList.add("is-mut");
        b.setAttribute("aria-pressed", String(isSel(l, i)));
        const n = document.createElement("small");
        n.textContent = i + 1;
        b.appendChild(n);
        b.addEventListener("click", () => select(isSel(l, i) ? null : { l, i }));
        seq.appendChild(b);
      });
      row.appendChild(seq);
      seqEl.appendChild(row);
    });

    const s = score();
    const pct = toPct(s);
    fill.style.width = `${pct}%`;
    const muts = mutations();
    verdict.classList.remove("up", "down");
    if (!muts.length) verdict.textContent = "Original receptor";
    else if (s > 0.2) { verdict.textContent = "Stronger grip: worth testing"; verdict.classList.add("up"); }
    else if (s < -0.2) { verdict.textContent = "Weaker grip: skip"; verdict.classList.add("down"); }
    else verdict.textContent = "About the same";
    fill.style.background = s > 0.2 ? COLORS.up : s < -0.2 ? COLORS.down : "var(--synapse)";
    mutLabel.textContent = muts.length ? `Mutations: ${muts.map((m) => mutName(m.l, m.i, m.aa)).join(", ")}` : "No mutations";

    mol.update();
    svgFallback(pct);
  }

  function select(sel) {
    if (sel && LOOPS[sel.l].conserved.has(sel.i)) return;
    selected = sel;
    if (!sel) { picker.hidden = true; render(); return; }
    const { l, i } = sel, L = LOOPS[l];
    pickerLabel.textContent = `Mutate ${L.name} position ${i + 1} (${L.wt[i]} in the original) to:`;
    pickerGrid.innerHTML = "";
    for (const aa of AA) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = aa;
      const d = effect(l, i, aa) - effect(l, i, seqs[l][i]);
      if (aa === seqs[l][i]) b.classList.add("is-current");
      else if (d > 0.2) b.classList.add("up");
      else if (d < -0.2) b.classList.add("down");
      b.addEventListener("click", () => { seqs[l][i] = aa; select(null); });
      pickerGrid.appendChild(b);
    }
    picker.hidden = false;
    render();
  }

  $("tcrReset").addEventListener("click", () => { seqs = LOOPS.map((L) => L.wt.split("")); select(null); });

  $("tcrBest").addEventListener("click", () => {
    let best = null, count = 0;
    LOOPS.forEach((L, l) => {
      for (let i = 0; i < L.wt.length; i++) {
        if (L.conserved.has(i)) continue;
        for (const aa of AA) {
          if (aa === L.wt[i]) continue;
          count++;
          const e = effect(l, i, aa);
          if (!best || e > best.e) best = { l, i, aa, e };
        }
      }
    });
    seqs = LOOPS.map((L) => L.wt.split(""));
    seqs[best.l][best.i] = best.aa;
    select(null);
    mutLabel.textContent = `Best of ${count} single mutants: ${mutName(best.l, best.i, best.aa)}`;
  });

  // Size of the search space, computed rather than hard-coded
  const n = LOOPS.reduce((acc, L) => acc + L.wt.length - L.conserved.size, 0);
  const choose = (a, b) => { let r = 1; for (let k = 0; k < b; k++) r = (r * (a - k)) / (k + 1); return r; };
  const fmt = (x) => x.toLocaleString("en-US");
  space.innerHTML = `These two loops have <strong>${n}</strong> mutable positions: <strong>${fmt(n * 19)}</strong> possible single mutants,
    <strong>${fmt(choose(n, 2) * 19 ** 2)}</strong> doubles and <strong>${fmt(choose(n, 3) * 19 ** 3)}</strong> triples.
    Far too many to test in a lab, which is why we predict.`;

  /* ───────── SVG fallback (no WebGL) ───────── */
  function svgFallback(pct) {
    const tcr = $("tcrGroup"), bond = $("tcrBond");
    if (!tcr || $("tcrSvg").hidden) return;
    tcr.style.transform = `translateY(${((pct - 50) / 42) * 9}px)`;
    bond.setAttribute("opacity", (0.1 + (pct / 100) * 0.9).toFixed(2));
  }
  function showFallback(reason) {
    $("tcrMol").hidden = true;
    $("tcrSvg").hidden = false;
    console.info("3D structure unavailable, showing schematic:", reason);
    render();
  }

  /* ───────── 3D structure ───────── */
  const mol = (() => {
    let viewer = null, spinning = false;
    const el = $("tcrViewer"), status = $("tcrMolStatus"), spinBtn = $("molSpin");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const range = (L) => `${L.start}-${L.start + L.wt.length - 1}`;

    const loadScript = (src) => new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src; s.onload = resolve; s.onerror = () => reject(new Error(`failed to load ${src}`));
      document.head.appendChild(s);
    });

    const centroid = (sel) => {
      const atoms = viewer.selectedAtoms(sel);
      const c = atoms.reduce((a, t) => ({ x: a.x + t.x, y: a.y + t.y, z: a.z + t.z }), { x: 0, y: 0, z: 0 });
      return { x: c.x / atoms.length, y: c.y / atoms.length, z: c.z / atoms.length };
    };

    const label = (text, position, color = "#e8eaf6", size = 11) => viewer.addLabel(text, {
      position, fontSize: size, fontColor: color, fontFamily: "JetBrains Mono, monospace",
      backgroundColor: "#05060f", backgroundOpacity: 0.72, borderThickness: 0, inFront: true,
    });

    // Closest pair of atoms between a residue and the peptide
    function contact(chain, resi) {
      const res = viewer.selectedAtoms({ chain, resi });
      const pep = viewer.selectedAtoms({ chain: "C" });
      let best = null;
      for (const a of res) for (const b of pep) {
        const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        if (!best || d < best.d) best = { a, b, d };
      }
      return best;
    }

    function view() {
      viewer.zoomTo({ or: [{ chain: "C" }, ...LOOPS.map((L) => ({ chain: L.chain, resi: range(L) }))] });
      viewer.zoom(0.75);
      viewer.render();
    }

    function setSpin(on) {
      spinning = on && !reduceMotion;
      viewer.spin(spinning ? "y" : false, 0.35);
      spinBtn.textContent = spinning ? "Pause spin" : "Spin";
      spinBtn.setAttribute("aria-pressed", String(spinning));
    }

    function update() {
      if (!viewer) return;
      viewer.removeAllLabels();
      viewer.removeAllShapes();

      viewer.setStyle({ chain: "A" }, { cartoon: { color: COLORS.mhc, thickness: 0.6 } });
      viewer.setStyle({ chain: "D" }, { cartoon: { color: COLORS.tcrA } });
      viewer.setStyle({ chain: "E" }, { cartoon: { color: COLORS.tcrB } });
      for (const L of LOOPS) {
        viewer.setStyle({ chain: L.chain, resi: range(L) },
          { cartoon: { color: L.color }, stick: { color: L.color, radius: 0.13 } });
      }
      viewer.setStyle({ chain: "C" }, { cartoon: { color: COLORS.peptide }, stick: { color: COLORS.peptide, radius: 0.22 } });

      const marked = mutations().map(({ l, i }) => ({ l, i }));
      if (selected && !marked.some((m) => m.l === selected.l && m.i === selected.i)) marked.push(selected);
      marked.sort((a, b) => a.l - b.l || a.i - b.i);
      marked.forEach(({ l, i }, k) => {
        const L = LOOPS[l], resi = L.start + i;
        const mutated = seqs[l][i] !== L.wt[i];
        const color = mutated ? COLORS[tone(effect(l, i, seqs[l][i]))] : COLORS.select;
        viewer.setStyle({ chain: L.chain, resi }, { cartoon: { color: L.color }, stick: { color, radius: 0.32 } });
        const c = contact(L.chain, resi);
        if (c && c.d < 7.5) {
          viewer.addCylinder({ start: { x: c.a.x, y: c.a.y, z: c.a.z }, end: { x: c.b.x, y: c.b.y, z: c.b.z },
            radius: 0.07, color, dashed: true, fromCap: 1, toCap: 1 });
        }
        const pos = centroid({ chain: L.chain, resi });
        // Stagger labels so neighbouring residues don't overlap
        label(mutated ? mutName(l, i, seqs[l][i]) : `${L.short}${L.wt[i]}${i + 1}`,
          { x: pos.x, y: pos.y + 4 + (k % 2) * 3.5, z: pos.z }, color, 12);
      });

      // Orientation labels (coordinates were pre-rotated: receptor up, MHC down)
      label("T-cell receptor ↑ T cell", { x: -16, y: 21, z: 0 }, COLORS.tcrB);
      label("cancer peptide", { x: 14, y: -1, z: 0 }, COLORS.peptide);
      label("MHC holder ↓ cancer cell", { x: -16, y: -11, z: 0 }, COLORS.mhc);
      viewer.render();
    }

    async function init() {
      try {
        const probe = document.createElement("canvas");
        if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) throw new Error("no WebGL");
        await Promise.all([
          window.$3Dmol ? null : loadScript("https://cdn.jsdelivr.net/npm/3dmol@2.4.2/build/3Dmol-min.js"),
          window.STRUCTURE_2BNR ? null : loadScript("assets/data/2bnr-interface.js"),
        ]);
        viewer = window.$3Dmol.createViewer(el, { backgroundColor: "#000000", backgroundAlpha: 0, antialias: true });
        viewer.addModel(window.STRUCTURE_2BNR.pdb, "pdb");
        LOOPS.forEach((L, l) => {
          viewer.setClickable({ chain: L.chain, resi: `${L.start + 2}-${L.start + L.wt.length - 2}` }, true, (atom) => {
            const i = atom.resi - L.start;
            select(isSel(l, i) ? null : { l, i });
          });
        });
        status.hidden = true;
        update();
        view();
        setSpin(true);
        el.addEventListener("pointerdown", () => setSpin(false));
        spinBtn.addEventListener("click", () => setSpin(!spinning));
        $("molReset").addEventListener("click", view);
        new ResizeObserver(() => { viewer.resize(); viewer.render(); }).observe(el);
      } catch (err) {
        showFallback(err.message);
      }
    }

    // Load the viewer (and its ~500 KB library) only when the panel gets close to the screen
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { io.disconnect(); init(); }
    }, { rootMargin: "400px 0px" });
    io.observe(el);

    return { update };
  })();

  render();
})();
