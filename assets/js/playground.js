/* ──────────────────────────────────────────────
   Playground — graph search on a network of neurons.
   Browser take on github.com/VincentO-Luasa/graph_search_algorithms:
   BFS, DFS, Dijkstra and A*, animated, plus a race mode.
   ────────────────────────────────────────────── */
(() => {
  const canvas = document.getElementById("pgCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const descEl = document.getElementById("pgDesc");
  const statsEl = document.getElementById("pgStats");
  const algoBtns = [...document.querySelectorAll("#pgAlgos button")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const C = {
    edge: "rgba(255,255,255,0.08)",
    node: "rgba(255,255,255,0.45)",
    seen: [140, 200, 217],
    path: [217, 189, 140],
    start: "#6fcf97",
    goal: "#eb8a8a",
  };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  const ALGOS = {
    bfs: {
      name: "BFS",
      desc: "<strong>Breadth-first search</strong> explores in rings, like a ripple spreading from the start. It finds the path with the fewest hops, but ignores how long each connection is.",
    },
    dfs: {
      name: "DFS",
      desc: "<strong>Depth-first search</strong> dives down one branch as far as it can before backtracking. Simple and memory-light, but its path is rarely the shortest.",
    },
    dijkstra: {
      name: "Dijkstra",
      desc: "<strong>Dijkstra’s algorithm</strong> always expands the closest unexplored neuron, so it is guaranteed to find the shortest path by distance.",
    },
    astar: {
      name: "A*",
      desc: "<strong>A*</strong> is Dijkstra with a sense of direction: it favours neurons that lie towards the goal, finding the same shortest path while exploring far less.",
    },
  };

  let W = 0, H = 0, DPR = 1;
  let nodes = [], adj = [];
  let start = 0, goal = 0, nextPick = "start";
  let algo = "bfs";
  let anim = null;         // { result, shown, t0 }
  let visible = false, rafId = 0;

  /* ───────── Graph generation ───────── */
  function generate() {
    const area = W * H;
    const n = Math.max(28, Math.min(80, Math.round(area / 5200)));
    const minD = Math.sqrt(area / n) * 0.62;
    const pad = 26;
    nodes = [];
    let tries = 0;
    while (nodes.length < n && tries < n * 60) {
      tries++;
      const p = { x: pad + Math.random() * (W - 2 * pad), y: pad + Math.random() * (H - 2 * pad - 24) };
      if (nodes.every((q) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2 > minD * minD)) nodes.push(p);
    }
    const dist = (a, b) => Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y);
    const edges = new Set();
    const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
    nodes.forEach((_, i) => {
      nodes.map((_, j) => j).filter((j) => j !== i)
        .sort((a, b) => dist(i, a) - dist(i, b))
        .slice(0, 3)
        .forEach((j) => edges.add(key(i, j)));
    });
    // Union–find to make sure the network is connected
    const parent = nodes.map((_, i) => i);
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    edges.forEach((e) => { const [a, b] = e.split("-").map(Number); parent[find(a)] = find(b); });
    for (;;) {
      const roots = new Set(nodes.map((_, i) => find(i)));
      if (roots.size <= 1) break;
      let best = null;
      for (let a = 0; a < nodes.length; a++)
        for (let b = a + 1; b < nodes.length; b++)
          if (find(a) !== find(b) && (!best || dist(a, b) < best.d)) best = { a, b, d: dist(a, b) };
      edges.add(key(best.a, best.b));
      parent[find(best.a)] = find(best.b);
    }
    adj = nodes.map(() => []);
    edges.forEach((e) => {
      const [a, b] = e.split("-").map(Number);
      const w = dist(a, b);
      adj[a].push({ to: b, w });
      adj[b].push({ to: a, w });
    });
    // Shuffle neighbour order once so DFS behaves like DFS, not like a sweep
    adj.forEach((list) => list.sort(() => Math.random() - 0.5));

    start = nodes.reduce((m, p, i) => (p.x < nodes[m].x ? i : m), 0);
    goal = nodes.reduce((m, p, i) => (p.x > nodes[m].x ? i : m), 0);
    nextPick = "start";
    anim = null;
    showIdle();
  }

  /* ───────── Algorithms ───────── */
  function search(kind) {
    const n = nodes.length;
    const prev = new Array(n).fill(-1);
    const order = [];
    const h = (i) => Math.hypot(nodes[i].x - nodes[goal].x, nodes[i].y - nodes[goal].y);

    if (kind === "bfs" || kind === "dfs") {
      const seen = new Array(n).fill(false);
      const list = [start];
      seen[start] = kind === "bfs";
      while (list.length) {
        const u = kind === "bfs" ? list.shift() : list.pop();
        if (kind === "dfs") { if (seen[u]) continue; seen[u] = true; }
        order.push(u);
        if (u === goal) break;
        const nbrs = kind === "dfs" ? [...adj[u]].reverse() : adj[u];
        for (const { to } of nbrs) {
          if (kind === "bfs" && !seen[to]) { seen[to] = true; prev[to] = u; list.push(to); }
          if (kind === "dfs" && !seen[to]) { prev[to] = u; list.push(to); }
        }
      }
    } else {
      const g = new Array(n).fill(Infinity);
      const done = new Array(n).fill(false);
      g[start] = 0;
      for (;;) {
        let u = -1, best = Infinity;
        for (let i = 0; i < n; i++) {
          if (done[i] || g[i] === Infinity) continue;
          const f = g[i] + (kind === "astar" ? h(i) : 0);
          if (f < best) { best = f; u = i; }
        }
        if (u < 0) break;
        done[u] = true;
        order.push(u);
        if (u === goal) break;
        for (const { to, w } of adj[u]) {
          if (!done[to] && g[u] + w < g[to]) { g[to] = g[u] + w; prev[to] = u; }
        }
      }
    }

    const path = [];
    for (let v = goal; v !== -1; v = prev[v]) path.unshift(v);
    if (path[0] !== start) path.length = 0;
    let length = 0;
    for (let i = 1; i < path.length; i++)
      length += Math.hypot(nodes[path[i]].x - nodes[path[i - 1]].x, nodes[path[i]].y - nodes[path[i - 1]].y);
    return { kind, order, path, hops: Math.max(0, path.length - 1), length };
  }

  /* ───────── Drawing ───────── */
  function draw(now) {
    ctx.clearRect(0, 0, W, H);

    let seenSet = new Set(), pathShown = 0, result = anim && anim.result;
    if (anim) {
      const elapsed = now - anim.t0;
      const perNode = Math.min(70, 2600 / Math.max(1, result.order.length));
      const k = reduceMotion ? result.order.length : Math.min(result.order.length, Math.floor(elapsed / perNode) + 1);
      seenSet = new Set(result.order.slice(0, k));
      if (k >= result.order.length) {
        const tPath = elapsed - result.order.length * perNode;
        pathShown = reduceMotion ? result.path.length : Math.min(result.path.length, tPath / 90 + 1);
        if (!anim.reported) { anim.reported = true; report(result); }
      }
    }

    // Edges
    ctx.lineWidth = 1;
    adj.forEach((list, a) => list.forEach(({ to }) => {
      if (to < a) return;
      const lit = seenSet.has(a) && seenSet.has(to);
      ctx.strokeStyle = lit ? rgba(C.seen, 0.28) : C.edge;
      ctx.beginPath(); ctx.moveTo(nodes[a].x, nodes[a].y); ctx.lineTo(nodes[to].x, nodes[to].y); ctx.stroke();
    }));

    // Path
    if (result && pathShown > 1) {
      ctx.strokeStyle = rgba(C.path, 0.95);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      const full = Math.floor(pathShown);
      result.path.slice(0, full).forEach((v, i) => (i ? ctx.lineTo(nodes[v].x, nodes[v].y) : ctx.moveTo(nodes[v].x, nodes[v].y)));
      const frac = pathShown - full;
      if (frac > 0 && full < result.path.length) {
        const a = nodes[result.path[full - 1]], b = nodes[result.path[full]];
        ctx.lineTo(a.x + (b.x - a.x) * frac, a.y + (b.y - a.y) * frac);
      }
      ctx.stroke();

      // A signal that keeps travelling along the finished path
      if (pathShown >= result.path.length && result.path.length > 1 && !reduceMotion) {
        const t = ((now / 1600) % 1) * (result.path.length - 1);
        const i = Math.floor(t), f = t - i;
        const a = nodes[result.path[i]], b = nodes[result.path[i + 1]];
        const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 12);
        g.addColorStop(0, rgba(C.path, 0.9));
        g.addColorStop(1, rgba(C.path, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Nodes
    nodes.forEach((p, i) => {
      let r = 3, fillStyle = C.node;
      if (seenSet.has(i)) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 11);
        g.addColorStop(0, rgba(C.seen, 0.45));
        g.addColorStop(1, rgba(C.seen, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, Math.PI * 2); ctx.fill();
        fillStyle = rgba(C.seen, 1);
        r = 3.5;
      }
      if (i === start || i === goal) { fillStyle = i === start ? C.start : C.goal; r = 6; }
      ctx.fillStyle = fillStyle;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      if (i === start || i === goal) {
        ctx.strokeStyle = fillStyle;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });
  }

  function loop(now) {
    draw(now);
    rafId = visible ? requestAnimationFrame(loop) : 0;
  }
  function kick() { if (visible && !rafId) rafId = requestAnimationFrame(loop); }

  /* ───────── UI ───────── */
  const fmtLen = (px) => Math.round(px / 10);

  function showIdle() {
    descEl.innerHTML = ALGOS[algo].desc;
    statsEl.innerHTML = `<span>${nodes.length} neurons · click to set ${nextPick}</span>`;
    kick();
  }

  function report(r) {
    statsEl.innerHTML = r.path.length
      ? `explored <b>${r.order.length}</b> / ${nodes.length} neurons<br>path <b>${r.hops}</b> hops · length <b>${fmtLen(r.length)}</b>`
      : `explored <b>${r.order.length}</b> neurons · no path`;
  }

  function run() {
    anim = { result: search(algo), t0: performance.now(), reported: false };
    descEl.innerHTML = ALGOS[algo].desc;
    statsEl.innerHTML = `<span>searching…</span>`;
    kick();
  }

  function race() {
    const results = Object.keys(ALGOS).map(search);
    const maxSeen = Math.max(...results.map((r) => r.order.length));
    const bestLen = Math.min(...results.map((r) => r.length));
    const fewest = Math.min(...results.map((r) => r.order.length));
    statsEl.innerHTML = `<div class="race">${results.map((r) => `
      <span>${ALGOS[r.kind].name}</span>
      <span class="race__bar${r.order.length === fewest ? " is-best" : ""}" style="width:${(r.order.length / maxSeen) * 100}%"></span>
      <span>${r.order.length} explored</span>
      <span>${Math.abs(r.length - bestLen) < 0.5 ? "<b>shortest</b>" : `+${Math.round((r.length / bestLen - 1) * 100)}% longer`}</span>`).join("")}
    </div>`;
    descEl.innerHTML = "Same start, same goal. Bars show how many neurons each algorithm had to explore (green = fewest). A* usually explores the least while still finding the shortest path; DFS wanders.";
    const shown = results.find((r) => r.kind === algo);
    anim = { result: shown, t0: performance.now() - 1e6, reported: true };
    kick();
  }

  algoBtns.forEach((b) => b.addEventListener("click", () => {
    algo = b.dataset.algo;
    algoBtns.forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    anim = null;
    run();
  }));
  document.getElementById("pgRun").addEventListener("click", run);
  document.getElementById("pgRace").addEventListener("click", race);
  document.getElementById("pgNew").addEventListener("click", generate);

  canvas.addEventListener("click", (e) => {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let best = -1, bestD = 28;
    nodes.forEach((p, i) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bestD) { bestD = d; best = i; } });
    if (best < 0) return;
    if (nextPick === "start") { if (best !== goal) start = best; nextPick = "goal"; }
    else { if (best !== start) goal = best; nextPick = "start"; }
    anim = null;
    showIdle();
  });

  function resize() {
    const r = canvas.getBoundingClientRect();
    const newW = Math.round(r.width), newH = Math.round(r.height);
    if (newW === W && newH === H) return;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = newW; H = newH;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    generate();
  }
  new ResizeObserver(resize).observe(canvas);

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) kick();
  }).observe(canvas);

  resize();
})();
