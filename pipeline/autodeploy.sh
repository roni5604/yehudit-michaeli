#!/bin/zsh
# Rebuild + deploy every 20 min while image generation runs, then once more at the end.
cd ~/yehudit-michaeli
deploy() {
  n=$(python3 -c "import json;print(len({v['k'] for v in json.load(open('data/images.json')).values()}))")
  npx astro build >/dev/null 2>&1 || { echo "$(date +%H:%M) build failed"; return; }
  git add -A data/images.json public/images >/dev/null 2>&1 && git commit -q -m "Add dish photos ($n)" >/dev/null 2>&1 && git push -q >/dev/null 2>&1
  npx vercel@latest deploy --prod --yes --archive=tgz >/dev/null 2>&1 && echo "$(date +%H:%M) deployed with $n photos" || echo "$(date +%H:%M) deploy failed"
}
while pgrep -f "08_images.py" >/dev/null; do sleep 1200; deploy; done
deploy
echo "FINISHED"
