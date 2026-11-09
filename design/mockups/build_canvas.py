import json
import shutil
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import canvas_lib as cl
import base_screens as b
import importlib
import manifest

ROOT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else b.OUT / "canvas"
RUNTIME = cl.HERE / "tools" / "dc-runtime.js"
STYLE_BOARD_H = int(sys.argv[2]) if len(sys.argv) > 2 else 668
CREATED = "2026-11-09T09:46:31Z"
PROJ = ROOT / "project"
PROJ.mkdir(parents=True, exist_ok=True)

def component(body="", methods=""):
    return ("class Component extends DCLogic {\n" + methods + "renderVals() {\nconst st = this.state || {};\nconst o = {};\n"
            + body.strip() + "\nreturn o;\n}\n}")


SAVE = """
const sv = !!st.saved;
o.saved = sv;
o.notSaved = !sv;
o.svCls = sv ? 'on' : '';
o.toggleSave = () => this.setState({ saved: !sv });
"""



VIEW = """
const view = st.view || '__V__';
o.isGrid = view === 'grid';
o.isList = view === 'list';
o.vg = view === 'grid' ? 'on' : '';
o.vl = view === 'list' ? 'on' : '';
o.sv0 = () => this.setState({ view: 'grid' });
o.sv1 = () => this.setState({ view: 'list' });
"""


def votes(n, view=None):
    base, init = [], []
    for fid, by, up, down, sc, mine in b.PROGRAM[:n]:
        base.append([up - (mine == "up"), down - (mine == "down")])
        init.append(mine)
    B, I = json.dumps(base), json.dumps(init)
    methods = f"vote(i, k) {{\nconst v = ((this.state && this.state.v) || {I}).slice();\nv[i] = v[i] === k ? '' : k;\nthis.setState({{ v: v }});\n}}\n"
    body = f"""
const B = {B};
const V = st.v || {I};
B.forEach((b, i) => {{
const m = V[i];
const u = b[0] + (m === 'up' ? 1 : 0);
const d = b[1] + (m === 'down' ? 1 : 0);
const s = u - d;
o['u' + i] = u;
o['d' + i] = d;
o['uc' + i] = m === 'up' ? 'on' : '';
o['dc' + i] = m === 'down' ? 'on' : '';
o['sc' + i] = s > 0 ? '+' + s : (s === 0 ? '0' : '−' + Math.abs(s));
o['scc' + i] = s > 0 ? 'pos' : (s === 0 ? 'zero' : 'neg');
o['vu' + i] = () => this.vote(i, 'up');
o['vd' + i] = () => this.vote(i, 'down');
}});
"""
    if view:
        body += VIEW.replace("__V__", view)
    return component(body, methods)


def wheel(size_cls):
    methods = ("componentDidMount() {\nthis.timer = setTimeout(() => this.setState({ done: true }), 4700);\n}\n"
               "componentWillUnmount() {\nclearTimeout(this.timer);\n}\n")
    body = f"""
const d = !!st.done;
o.done = d;
o.spinning = !d;
o.whCls = d ? 'wh {size_cls}' : 'wh {size_cls} spin';
o.ov = d ? 'La roue a choisi Orbite basse' : 'Léa a lancé la roue';
o.ttl = d ? 'Verdict' : 'Ça tourne';
"""
    return component(body, methods)


def watchlist():
    n = len(b.WL_ITEMS)
    titles = json.dumps([b.FILMS[k]["t"].lower() for k in b.WL_ITEMS], ensure_ascii=False)
    ser = json.dumps([i in b.WL_SERIE for i in range(n)])
    body = f"""
const q = st.q || '';
const ql = q.toLowerCase();
const ty = st.ty || 0;
const fo = !!st.fo;
const menu = st.menu !== false;
const so = st.so || 0;
const dir = st.dir || 'down';
const view = st.view || 'grid';
const T = {titles};
const SER = {ser};
let n = 0;
for (let i = 0; i < {n}; i++) {{
const v = (!ql || T[i].includes(ql)) && (ty === 0 || (ty === 1 && !SER[i]) || (ty === 2 && SER[i]));
o['c' + i] = v;
if (v) n++;
}}
o.cnt = n;
o.filtering = !!ql || ty !== 0;
o.hasNf = ty !== 0;
o.q = q;
o.onQ = (e) => this.setState({{ q: e.target.value }});
o.clear = () => this.setState({{ q: '', ty: 0 }});
o.fo = fo;
o.foCls = fo ? 'on' : '';
o.tFo = () => this.setState({{ fo: !fo }});
[1, 2].forEach((j) => {{
o['ty' + j] = ty === j ? 'on' : '';
o['sty' + j] = () => this.setState({{ ty: ty === j ? 0 : j }});
}});
for (let j = 0; j < 6; j++) {{
o['so' + j] = so === j ? 'on' : '';
o['soa' + j] = so === j;
o['ss' + j] = () => this.setState(so === j ? {{ dir: dir === 'down' ? 'up' : 'down' }} : {{ so: j, dir: 'down' }});
}}
o.sdir = dir === 'up' ? 'up' : '';
o.menu = menu;
o.tMenu = () => this.setState({{ menu: !menu }});
o.isGrid = view === 'grid';
o.isList = view === 'list';
o.vg = view === 'grid' ? 'on' : '';
o.vl = view === 'list' ? 'on' : '';
o.sv0 = () => this.setState({{ view: 'grid' }});
o.sv1 = () => this.setState({{ view: 'list' }});
"""
    return component(body)


def create_desk():
    body = f"""
const t = st.title !== undefined ? st.title : 'Soirée chez Léa';
const th = st.theme !== undefined ? st.theme : 'Nuits blanches';
o.title = t;
o.theme = th;
o.titleOr = t.trim() || 'Sans titre';
o.hasTheme = th.trim().length > 0;
o.onTitle = (e) => this.setState({{ title: e.target.value }});
o.onTheme = (e) => this.setState({{ theme: e.target.value }});
const S = {json.dumps(b.SUGG, ensure_ascii=False)};
S.forEach((x, j) => {{
o['sg' + j] = () => this.setState({{ theme: x }});
}});
"""
    return component(body)


def create_mob():
    body = f"""
const t = st.title !== undefined ? st.title : 'Soirée chez Léa';
const th = st.theme !== undefined ? st.theme : {json.dumps(b.THEME_LONG, ensure_ascii=False)};
o.title = t;
o.onTitle = (e) => this.setState({{ title: e.target.value }});
o.theme = th;
o.tooLong = th.length > 60;
o.thErr = th.length > 60 ? 'err' : '';
o.onTheme = (e) => this.setState({{ theme: e.target.value }});
"""
    return component(body)


def rate():
    body = f"""
const r = st.r || 4;
const L = {json.dumps(b.RATE_LABELS, ensure_ascii=False)};
for (let n = 1; n <= 5; n++) {{
o['s' + n] = n <= r ? 'on' : '';
o['r' + n] = () => this.setState({{ r: n }});
}}
o.rlab = L[r - 1];
"""
    return component(body)


LOGIC = {
    "01": component(SAVE), "02": votes(6, "grid"), "93": votes(6, "list"), "03": wheel("big"), "04": component(SAVE), "06": watchlist(),
    "08": create_desk(), "10": component(SAVE), "11": component(SAVE), "12": votes(5), "13": wheel("sml"), "15": rate(),
    "17": component(SAVE), "19": create_mob(),
}

MODULES = []
for mname in sorted({m for *_, m in manifest.SCREENS if m}):
    if (cl.HERE / f"{mname}.py").exists():
        MODULES.append(importlib.import_module(mname))

screens, style_board = b.render(dc=True)
b.STATIC_DIR.mkdir(parents=True, exist_ok=True)
static_screens = {}
(PROJ / "Main.dc.html").write_text(cl.artboard("00, La planche", style_board, 1120, STYLE_BOARD_H, component()), encoding="utf-8", newline="\n")
done = {"00"}
for num, slug, label, html in screens:
    w, h = cl.size(num)
    (PROJ / cl.file_name(num)).write_text(cl.artboard(f"{num}, {label}", html, w, h, LOGIC.get(num, component())), encoding="utf-8", newline="\n")
    done.add(num)
for mod in MODULES:
    for num, html in cl.render_module(mod, True).items():
        w, h = cl.size(num)
        (PROJ / cl.file_name(num)).write_text(cl.artboard(f"{num}, {cl.META[num]['label']}", html, w, h, mod.LOGIC.get(num), mod.CSS), encoding="utf-8", newline="\n")
        done.add(num)
    for num, html in cl.render_module(mod, False).items():
        (b.STATIC_DIR / f"{num}-{cl.META[num]['slug']}.html").write_text(cl.static_page(num, html, mod.CSS), encoding="utf-8")

GAP_X, GAP_ROW, NOTE, GAP_SECTION = 80, 120, 223, 360
CONTENTS_FILE, CONTENTS_W, CONTENTS_H = "Sommaire.dc.html", 2140, int(sys.argv[3]) if len(sys.argv) > 3 else 1080
boards, order, notes = {}, [], {}

CONTENTS_CSS = f"""
.S.contents{{width:{CONTENTS_W}px;height:{CONTENTS_H}px;box-sizing:border-box;padding:56px 64px;border-radius:14px;overflow:hidden}}
.contents-hd h1{{font-size:64px;margin:12px 0 14px}}
.contents-hd p{{margin:0;color:var(--tx2);font-size:16px;line-height:1.5;max-width:760px}}
.contents-g{{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:40px;margin-top:44px}}
.contents-c h2{{font-size:24px;margin:0;padding-bottom:14px;border-bottom:1px solid var(--line)}}
.contents-d{{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--tx3);margin:20px 0 6px}}
.S .contents-i{{display:flex;align-items:center;gap:12px;min-height:32px;padding:4px 10px;margin:0 -10px;border-radius:6px;font-size:14px;line-height:1.3;cursor:pointer}}
.S .contents-i:hover{{background:var(--s1)}}
.S .contents-i:hover span{{color:var(--acc-tx)}}
.contents-i b{{flex:none;width:22px;color:var(--tx3);font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}}
"""


def section_nums(pid):
    return [n for n, *_ in manifest.SCREENS if n != "00" and n in done and cl.META[n]["page"] == pid]


def contents_page():
    cols = ""
    for pid, pname in manifest.PAGES:
        nums = section_nums(pid)
        blocks = ""
        for dev, lab in (("desk", "Ordinateur"), ("mob", "Téléphone")):
            items = [n for n in nums if cl.META[n]["device"] == dev]
            if items:
                links = "".join(f'<a class="contents-i" href="{cl.file_name(n)}"><b>{n}</b><span>{cl.META[n]["label"]}</span></a>' for n in items)
                blocks += f'<div class="contents-d">{lab}</div>{links}'
        cols += f'<section class="contents-c"><h2 class="disp">{pname}</h2>{blocks}</section>'
    total = len(done) - 1
    return (f'<div class="S contents"><header class="contents-hd"><div class="ov">Movie Picker, Salle obscure en bleu</div><h1 class="disp">Sommaire</h1>'
            f'<p>Les {total} écrans de la maquette, sur ordinateur et sur téléphone. Lancez le mode Play sur ce sommaire, '
            f'puis cliquez sur un écran pour l’ouvrir et naviguer dans l’application.</p></header><div class="contents-g">{cols}</div></div>')


(PROJ / CONTENTS_FILE).write_text(cl.artboard("Sommaire", contents_page(), CONTENTS_W, CONTENTS_H, component(), CONTENTS_CSS), encoding="utf-8", newline="\n")


def place(file, x, y, w, h, title, interactive=True):
    entry = {"x": x, "y": y, "w": w, "h": h, "title": title, "radius": 14 if w > 400 else 38}
    if interactive:
        entry["is_interactive"] = True
    boards[file] = entry
    order.append(file)


def board(num, x, y):
    w, h = cl.size(num)
    place(cl.file_name(num), x, y, w, h, f"{num}, {cl.META[num]['label']}")


def note(key, x, y, text, max_w):
    notes[key] = {"x": x, "y": y, "text": text, "kind": "title1", "maxW": max_w}


CONTENTS_X = 1120 + 240
note("t-planche", 0, 0, "Planche", 1120)
place("Main.dc.html", 0, NOTE, 1120, STYLE_BOARD_H, "00, La planche", False)
note("t-sommaire", CONTENTS_X, 0, "Sommaire", CONTENTS_W)
place(CONTENTS_FILE, CONTENTS_X, NOTE, CONTENTS_W, CONTENTS_H, "Sommaire")
y = NOTE + max(STYLE_BOARD_H, CONTENTS_H) + GAP_SECTION

for pid, pname in manifest.PAGES:
    nums = section_nums(pid)
    if not nums:
        continue
    desk = [n for n in nums if cl.META[n]["device"] == "desk"]
    mob = [n for n in nums if cl.META[n]["device"] == "mob"]
    note(f"t-{pid}", 0, y, pname, 5 * 1120 + 4 * GAP_X)
    y += NOTE
    for i, n in enumerate(desk):
        r, c = divmod(i, 5)
        board(n, c * (1120 + GAP_X), y + r * (700 + GAP_ROW))
    if desk:
        y += ((len(desk) + 4) // 5) * (700 + GAP_ROW)
    for i, n in enumerate(mob):
        r, c = divmod(i, 10)
        board(n, c * (375 + GAP_X), y + r * (800 + GAP_ROW))
    if mob:
        y += ((len(mob) + 9) // 10) * (800 + GAP_ROW)
    y += GAP_SECTION - GAP_ROW

index = {"v": 3, "createdOnFiles": {"v": 1, "at": CREATED}, "title": "Movie Picker, Salle obscure en bleu", "launch": {"view": "canvas", "page": "main"},
         "pages": [{"id": "main", "name": "Maquettes"}], "boards": boards, "order": order, "notes": notes, "designSystems": []}
(PROJ / "canvas.json").write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")
missing = sorted(set(cl.META) - done)
if RUNTIME.exists():
    shutil.copy(RUNTIME, PROJ / "support.js")
print(f"canvas written to {PROJ}: {len(order)} artboards, screens missing from the manifest: {missing or 'none'}")
if not RUNTIME.exists():
    print(f"no local preview: {RUNTIME} is missing, see README.md")
