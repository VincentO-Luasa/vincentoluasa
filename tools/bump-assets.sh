#!/bin/sh
# Stamp each CSS/JS link in index.html with a short hash of the file's contents (?v=...),
# so browsers fetch fresh copies after an update instead of serving cached old ones.
cd "$(dirname "$0")/.." || exit 1
for f in assets/css/*.css assets/js/*.js assets/data/*.js; do
  h=$(shasum "$f" | cut -c1-8)
  sed -i '' -E "s#(\"$f)(\?v=[0-9a-f]+)?\"#\1?v=$h\"#g" index.html
done
