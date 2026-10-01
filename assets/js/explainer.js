/* ──────────────────────────────────────────────
   "My job in 30 seconds" — a toy TCR–pMHC mutation
   explorer on the real 1G4 TCR / NY-ESO-1 / HLA-A2
   crystal structure (PDB 2BNR), rendered with 3Dmol.js.
   Visitors mutate residues of the CDR3β loop and see an
   *illustrative* binding score change. Scores come from
   a small deterministic toy function (weighted by real
   residue–peptide distances), not from a real model.
   ────────────────────────────────────────────── */
(() => {
  const root = document.getElementById("tcrDemo");
  if (!root) return;

  const WT = "CASSYVGNTGELFF";                 // CDR3β of the 1G4 TCR (chain E, residues 90–103)
  const RESI0 = 90;
  const CONSERVED = new Set([0, 1, WT.length - 1]);
  const AA = "ACDEFGHIKLMNPQRSTVWY";
  const AROMATIC = new Set(["W", "F", "Y"]);
  // Closest distance (Å) from each CDR3β residue to the peptide, measured on PDB 2BNR
  const DIST = [14.9, 11.3, 9.2, 5.4, 3.5, 2.9, 3.4, 2.8, 5.9, 4.2, 6.4, 7.8, 10.7, 12.8];

  const COLORS = {
    tcrA: "#3f7383", tcrB: "#76afc0", loop: "#ffffff",
    peptide: "#e2c48f", mhc: "#8f8bbd", select: "#8cc8d9",
    up: "#6fcf97", down: "#eb8a8a", neutral: "#c9cde6",
  };

  const $ = (id) => document.getElementById(id);
  const seqEl = $("tcrSeq"), picker = $("tcrPicker"), pickerGrid = $("tcrPickerGrid"), pickerLabel = $("tcrPickerLabel");
  const fill = $("tcrFill"), verdict = $("tcrVerdict"), mutLabel = $("tcrMut"), space = $("tcrSpace");

  let seq = WT.split("");
  let selected = -1;

  /* ───────── Toy model ───────── */
  function effect(i, aa) {
    if (aa === WT[i]) return 0;
    const h = Math.sin((i + 1) * 12.9898 + (AA.indexOf(aa) + 1) * 78.233) * 43758.5453;
    let d = (h - Math.floor(h)) * 1.2 - 0.85;               // mostly neutral-to-harmful
    if (AROMATIC.has(aa)) d += 0.35;                         // aromatic side chains make good contacts
    if (aa === "P") d -= 0.6;                                // prolines break the loop
    if (i === 5 && aa === "W") d = 1.15;                     // a couple of "hot spots"
    if (i === 8 && aa === "F") d = 0.85;
    const contact = Math.min(1, Math.max(0.1, (9 - DIST[i]) / 5)); // residues far from the peptide barely matter
    return d * contact;
  }
  const score = () => seq.reduce((acc, aa, i) => acc + effect(i, aa), 0);
  const toPct = (s) => 50 + 42 * Math.tanh(s / 1.2);
  const mutName = (i, aa) => `${WT[i]}${i + 1}${aa}`;
  const tone = (e) => (e > 0.2 ? "up" : e < -0.2 ? "down" : "neutral");

  /* ───────── UI ───────── */
  function render() {
    seqEl.innerHTML = "";
    seq.forEach((aa, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = aa;
      b.setAttribute("aria-label", `Position ${i + 1}: ${aa}${CONSERVED.has(i) ? " (conserved)" : ""}`);
      if (CONSERVED.has(i)) { b.disabled = true; b.title = "Conserved residue: not mutated"; }
      if (aa !== WT[i]) b.classList.add("is-mut");
      b.setAttribute("aria-pressed", String(i === selected));
      const n = document.createElement("small");
      n.textContent = i + 1;
      b.appendChild(n);
      b.addEventListener("click", () => select(i === selected ? -1 : i));
      seqEl.appendChild(b);
    });

    const s = score();
    const pct = toPct(s);
    fill.style.width = `${pct}%`;
    const muts = seq.map((aa, i) => (aa !== WT[i] ? mutName(i, aa) : null)).filter(Boolean);
    verdict.classList.remove("up", "down");
    if (!muts.length) verdict.textContent = "Original receptor";
    else if (s > 0.2) { verdict.textContent = "Stronger grip: worth testing"; verdict.classList.add("up"); }
    else if (s < -0.2) { verdict.textContent = "Weaker grip: skip"; verdict.classList.add("down"); }
    else verdict.textContent = "About the same";
    fill.style.background = s > 0.2 ? COLORS.up : s < -0.2 ? COLORS.down : "var(--synapse)";
    mutLabel.textContent = muts.length ? `Mutations: ${muts.join(", ")}` : "No mutations";

    mol.update();
    svgFallback(pct);
  }

  function select(i) {
    if (i >= 0 && CONSERVED.has(i)) return;
    selected = i;
    if (i < 0) { picker.hidden = true; render(); return; }
    pickerLabel.textContent = `Mutate position ${i + 1} (${WT[i]} in the original) to:`;
    pickerGrid.innerHTML = "";
    for (const aa of AA) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = aa;
      const d = effect(i, aa) - effect(i, seq[i]);
      if (aa === seq[i]) b.classList.add("is-current");
      else if (d > 0.2) b.classList.add("up");
      else if (d < -0.2) b.classList.add("down");
      b.addEventListener("click", () => { seq[i] = aa; select(-1); });
      pickerGrid.appendChild(b);
    }
    picker.hidden = false;
    render();
  }

  $("tcrReset").addEventListener("click", () => { seq = WT.split(""); select(-1); });

  $("tcrBest").addEventListener("click", () => {
    let best = null, count = 0;
    for (let i = 0; i < WT.length; i++) {
      if (CONSERVED.has(i)) continue;
      for (const aa of AA) {
        if (aa === WT[i]) continue;
        count++;
        const e = effect(i, aa);
        if (!best || e > best.e) best = { i, aa, e };
      }
    }
    seq = WT.split("");
    seq[best.i] = best.aa;
    select(-1);
    mutLabel.textContent = `Best of ${count} single mutants: ${mutName(best.i, best.aa)}`;
  });

  // Size of the search space, computed rather than hard-coded
  const n = WT.length - CONSERVED.size;
  const choose = (a, b) => { let r = 1; for (let k = 0; k < b; k++) r = (r * (a - k)) / (k + 1); return r; };
  const fmt = (x) => x.toLocaleString("en-US");
  space.innerHTML = `This loop has <strong>${n}</strong> mutable positions: <strong>${fmt(n * 19)}</strong> possible single mutants,
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
    function contact(resi) {
      const res = viewer.selectedAtoms({ chain: "E", resi });
      const pep = viewer.selectedAtoms({ chain: "C" });
      let best = null;
      for (const a of res) for (const b of pep) {
        const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        if (!best || d < best.d) best = { a, b, d };
      }
      return best;
    }

    function view() {
      viewer.zoomTo({ or: [{ chain: "C" }, { chain: "E", resi: "90-103" }] });
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
      viewer.setStyle({ chain: "E", resi: `${RESI0}-${RESI0 + WT.length - 1}` },
        { cartoon: { color: COLORS.loop }, stick: { color: COLORS.loop, radius: 0.12 } });
      viewer.setStyle({ chain: "C" }, { cartoon: { color: COLORS.peptide }, stick: { color: COLORS.peptide, radius: 0.22 } });

      const marked = new Set(seq.map((aa, i) => (aa !== WT[i] ? i : -1)).filter((i) => i >= 0));
      if (selected >= 0) marked.add(selected);
      let k = 0;
      for (const i of [...marked].sort((a, b) => a - b)) {
        const resi = RESI0 + i;
        const mutated = seq[i] !== WT[i];
        const t = mutated ? tone(effect(i, seq[i])) : "select";
        const color = mutated ? COLORS[t] : COLORS.select;
        viewer.setStyle({ chain: "E", resi }, { cartoon: { color: COLORS.loop }, stick: { color, radius: 0.32 } });
        const c = contact(resi);
        if (c && c.d < 7.5) {
          viewer.addCylinder({ start: { x: c.a.x, y: c.a.y, z: c.a.z }, end: { x: c.b.x, y: c.b.y, z: c.b.z },
            radius: 0.07, color, dashed: true, fromCap: 1, toCap: 1 });
        }
        const pos = centroid({ chain: "E", resi });
        // Stagger labels so neighbouring residues don't overlap
        label(mutated ? mutName(i, seq[i]) : `${WT[i]}${i + 1}`, { x: pos.x, y: pos.y + 4 + (k++ % 2) * 3.5, z: pos.z }, color, 12);
      }

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
        viewer.setClickable({ chain: "E", resi: `${RESI0 + 2}-${RESI0 + WT.length - 2}` }, true, (atom) => {
          select(atom.resi - RESI0 === selected ? -1 : atom.resi - RESI0);
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
