/* ──────────────────────────────────────────────
   "My job in 30 seconds" — a toy TCR–pMHC mutation
   explorer. Visitors mutate residues of a CDR3β loop
   and see an *illustrative* binding score change.
   Scores come from a small deterministic toy function,
   not from a real model.
   ────────────────────────────────────────────── */
(() => {
  const root = document.getElementById("tcrDemo");
  if (!root) return;

  const WT = "CASSYVGNTGELFF";                 // example CDR3β loop
  const CONSERVED = new Set([0, 1, WT.length - 1]);
  const AA = "ACDEFGHIKLMNPQRSTVWY";
  const AROMATIC = new Set(["W", "F", "Y"]);

  const seqEl = document.getElementById("tcrSeq");
  const picker = document.getElementById("tcrPicker");
  const pickerGrid = document.getElementById("tcrPickerGrid");
  const pickerLabel = document.getElementById("tcrPickerLabel");
  const fill = document.getElementById("tcrFill");
  const verdict = document.getElementById("tcrVerdict");
  const mutLabel = document.getElementById("tcrMut");
  const tcr = document.getElementById("tcrGroup");
  const bond = document.getElementById("tcrBond");
  const space = document.getElementById("tcrSpace");

  let seq = WT.split("");
  let selected = -1;

  /* Toy effect of putting amino acid `aa` at position `i` (0 for wild type) */
  function effect(i, aa) {
    if (aa === WT[i]) return 0;
    const h = Math.sin((i + 1) * 12.9898 + (AA.indexOf(aa) + 1) * 78.233) * 43758.5453;
    let d = (h - Math.floor(h)) * 1.2 - 0.85;              // mostly neutral-to-harmful
    const central = i >= 4 && i <= 9;
    if (central && AROMATIC.has(aa)) d += 0.35;             // aromatic contacts at the tip
    if (aa === "P") d -= 0.6;                               // prolines break the loop
    if (i === 5 && aa === "W") d = 1.15;                    // a couple of "hot spots"
    if (i === 8 && aa === "F") d = 0.85;
    return d;
  }

  const score = () => seq.reduce((acc, aa, i) => acc + effect(i, aa), 0);
  const toPct = (s) => 50 + 42 * Math.tanh(s / 1.4);
  const mutName = (i, aa) => `${WT[i]}${i + 1}${aa}`;

  function render() {
    // Sequence
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

    // Score
    const s = score();
    const pct = toPct(s);
    fill.style.width = `${pct}%`;
    const muts = seq.map((aa, i) => (aa !== WT[i] ? mutName(i, aa) : null)).filter(Boolean);
    verdict.classList.remove("up", "down");
    if (!muts.length) verdict.textContent = "Wild type";
    else if (s > 0.25) { verdict.textContent = "Stronger binder: worth testing"; verdict.classList.add("up"); }
    else if (s < -0.25) { verdict.textContent = "Weaker binder: skip"; verdict.classList.add("down"); }
    else verdict.textContent = "About the same";
    fill.style.background = s > 0.25 ? "#6fcf97" : s < -0.25 ? "#eb8a8a" : "var(--synapse)";
    mutLabel.textContent = muts.length ? `Mutations: ${muts.join(", ")}` : "No mutations";

    // Schematic: stronger binding pulls the TCR closer to the peptide
    tcr.style.transform = `translateY(${((pct - 50) / 42) * 9}px)`;
    bond.setAttribute("opacity", (0.1 + (pct / 100) * 0.9).toFixed(2));
  }

  function select(i) {
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

  document.getElementById("tcrReset").addEventListener("click", () => { seq = WT.split(""); select(-1); });

  document.getElementById("tcrBest").addEventListener("click", () => {
    let best = null;
    let count = 0;
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

  render();
})();
