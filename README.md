# vincentoluasa

Personal website of Vincent O'Luasa: Research Engineer in BioAI at InstaDeep.

A dependency-free static site (HTML + CSS + vanilla JS). The background is a starfield
where the brightest stars are wired together like neurons: signals fire along the
connections and cascade, and moving or clicking the cursor sets off nearby neurons.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Structure

```
index.html            content (all sections)
assets/css/style.css  theme & layout
assets/js/main.js       background neural sky, nav, scroll reveals, easter eggs
assets/js/explainer.js  "My job in 30 seconds": TCR–pMHC mutation explorer on PDB 2BNR (3Dmol.js, toy scores)
assets/data/            2BNR interface coordinates (CC0), wrapped in JS so it loads from file://
assets/js/playground.js graph-search playground (BFS, DFS, Dijkstra, A*, greedy, bidirectional)
assets/js/notebook.js   lab-notebook progress chart
assets/js/sky.js        sky mode (press S): animated solar system + constellations
assets/js/neuron.js     Hodgkin–Huxley "make a neuron fire" demo + mini orrery
assets/js/brain.js      brain mode (press B): 3D digital brain with firing neurons
```

Placeholders awaiting real content are marked with `class="ph"` in `index.html`
(Now panel, lab notebook entries, hobby photos): `grep -n 'class="ph"' index.html`.

## Deploy

Live at **https://vincento-luasa.github.io/vincentoluasa/** (GitHub Pages, `main` / root).
Every push to `main` redeploys automatically within a minute or two.
