import importlib
import json
import pathlib
import shutil
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import canvas_lib as cl
import manifest

name = sys.argv[1]
out = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else cl.HERE / "build" / "preview" / name
mod = importlib.import_module(name)
expected = {n for n, *_ , m in manifest.SCREENS if m == name}
missing = sorted(expected - set(mod.SCREENS))
extra = sorted(set(mod.SCREENS) - expected)
(out / "screens").mkdir(parents=True, exist_ok=True)
(out / "project").mkdir(parents=True, exist_ok=True)
(out / "shots").mkdir(parents=True, exist_ok=True)

for num, html in cl.render_module(mod, False).items():
    (out / "screens" / f"{num}-{cl.META[num]['slug']}.html").write_text(cl.static_page(num, html, mod.CSS), encoding="utf-8")
for num, html in cl.render_module(mod, True).items():
    w, h = cl.size(num)
    (out / "project" / cl.file_name(num)).write_text(cl.artboard(f"{num}, {cl.META[num]['label']}", html, w, h, mod.LOGIC.get(num), mod.CSS), encoding="utf-8", newline="\n")
runtime = cl.HERE / "tools" / "dc-runtime.js"
if not runtime.exists():
    raise SystemExit(f"{runtime} is missing, see README.md")
shutil.copy(runtime, out / "project" / "support.js")
(out / "slugs.json").write_text(json.dumps(sorted(manifest.SLUGS)), encoding="utf-8")
print("screens expected but not rendered:", missing or "none")
print("screens missing from the manifest:", extra or "none")
r = subprocess.run(["node", str(cl.HERE / "tools" / "check-module.cjs"), str(out / "project"), str(out / "shots"), str(out / "slugs.json")], capture_output=True, text=True, encoding="utf-8")
print(r.stdout)
print(r.stderr[-3000:])
