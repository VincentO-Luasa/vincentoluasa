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
assets/js/main.js     neural-cosmos canvas, nav, scroll reveals
```

## Deploy

GitHub Pages: Settings → Pages → Deploy from branch → `main` / root.
