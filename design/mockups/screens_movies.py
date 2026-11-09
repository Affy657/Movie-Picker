import json
import random
import unicodedata

import base_screens as b

XI = {
    "history": '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    "dice": '<rect width="12" height="12" x="2" y="10" rx="2" ry="2"/><path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"/><path d="M6 18h.01"/><path d="M10 14h.01"/><path d="M15 6h.01"/><path d="M18 9h.01"/>',
    "import": '<path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><path d="M8 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4"/>',
    "adown": '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    "aup": '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    "layers": '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    "pause": '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    "volume": '<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.4 18.4a9 9 0 0 0 0-12.8"/>',
    "max": '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
    "calplus": '<path d="M8 2v4"/><path d="M16 2v4"/><path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"/><path d="M3 10h18"/><path d="M16 19h6"/><path d="M19 16v6"/>',
    "warn": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    "more": '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',
    "ext": '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3"/>',
    "lfilter": '<path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/>',
    "listplus": '<path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="M18 9v6"/><path d="M21 12h-6"/>',
}


def xi(name, size=18, stroke=2):
    if name not in XI:
        return b.ic(name, size, stroke)
    return (f'<svg class="ic" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{stroke}" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{XI[name]}</svg>')


ic = b.ic
FILMS = b.FILMS

X = {
    "orbite": dict(dir="Clara Venn", gen=["Science-fiction", "Drame"], av=["flatrate", "rent"], pv=["Netflix", "Canal+"], rt=132, lang="en"),
    "marseille": dict(dir="Malik Ferrand", gen=["Crime", "Thriller"], av=["flatrate"], pv=["Canal+"], rt=114, lang="fr"),
    "projo": dict(dir="Jeanne Morel", gen=["Drame", "Histoire"], av=["rent", "buy"], pv=[], rt=121, lang="fr"),
    "sable": dict(dir="Clara Venn", gen=["Aventure", "Action"], av=["flatrate"], pv=["Prime Video"], rt=148, lang="en"),
    "kyoto": dict(dir="Ren Aoki", gen=["Romance", "Drame"], av=["flatrate"], pv=["Netflix"], rt=107, lang="ja"),
    "brume": dict(dir="Ilse Varga", gen=["Thriller", "Horreur", "Mystère"], av=["rent"], pv=[], rt=99, lang="fr"),
    "volets": dict(dir="Clara Venn", gen=["Comédie", "Familial"], av=["flatrate"], pv=["Disney+"], rt=112, lang="fr"),
    "km": dict(dir="Clara Venn", gen=["Aventure", "Drame"], av=["buy"], pv=[], rt=118, lang="fr"),
    "verre": dict(dir="Clara Venn", gen=["Action", "Science-fiction"], av=["flatrate", "rent"], pv=["Prime Video"], rt=125, lang="en"),
    "phare": dict(dir="Clara Venn", gen=["Familial", "Aventure"], av=["flatrate"], pv=["Disney+", "Canal+"], rt=104, lang="fr"),
}

GENRES = ["Action", "Comédie", "Thriller", "Horreur", "Science-fiction", "Drame", "Aventure", "Fantastique", "Romance", "Crime",
          "Animation", "Familial", "Documentaire", "Mystère", "Histoire", "Musique", "Guerre", "Western"]
AVAIL = [("flatrate", "Streaming"), ("rent", "Location"), ("buy", "Achat")]
DECADES = ["2020", "2010", "2000", "1990", "1980"]
VOTES = [6, 7, 8]
LANGS = [("fr", "Français"), ("en", "Anglais"), ("ja", "Japonais"), ("ko", "Coréen"), ("es", "Espagnol"), ("de", "Allemand"), ("it", "Italien"), ("zh", "Chinois")]


def vote(k):
    return float(FILMS[k]["r"].replace(",", "."))


def norm(s):
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")


def js(obj):
    return json.dumps(obj, ensure_ascii=False)


def inner(html):
    return html[html.index(">") + 1: html.rindex("</div>")]


def parent(fn):
    dc = b.DC
    b.DC = False
    try:
        return inner(b.embedded(fn))
    finally:
        b.DC = dc


def grp(label, body, cls="xb-cr"):
    return f'<div class="xb-grp"><div class="xb-lab">{label}</div><div class="{cls}">{body}</div></div>'


def chip(cls_name, on, handler, label, extra=""):
    return f'<button type="button" class="xb-ch{extra} {b.hole(cls_name, "on" if on else "")}"{b.on(handler)}>{label}</button>'


def afchip(label, handler):
    return f'<button type="button" class="xb-af" aria-label="Retirer le filtre {label}"{b.on(handler)}>{label}{ic("x", 13)}</button>'


def sort_chips(labels, static_idx=0, static_dir="desc"):
    out = ""
    for j, lab in enumerate(labels):
        on = j == static_idx
        down = b.when(f"od{j}", xi("adown", 13), on and static_dir == "desc")
        up = b.when(f"ou{j}", xi("aup", 13), on and static_dir == "asc")
        out += f'<button type="button" class="xb-ch {b.hole(f"oc{j}", "on" if on else "")}"{b.on(f"os{j}")}>{down}{up}{lab}</button>'
    return out


def card(k, slug, cls="", badge="", over="", meta=None, after=""):
    f = FILMS[k]
    m = meta if meta is not None else f'<span>{f["y"]}</span>{b.tmdb(f["r"])}'
    return (f'<div class="xb-cd {cls}"><div class="xb-pw"><a class="xb-pl" aria-label="Voir la fiche de {f["t"]}"{b.href(slug)}>{b.poster(k)}</a>{badge}{over}</div>'
            f'{after}<div class="xb-t">{f["t"]}</div><div class="xb-m">{m}</div></div>')


def sfield(placeholder, static_val, cls="", aria="Chercher un film"):
    if b.DC:
        inp = f'<input class="xb-in" value="{b.hx("q")}" onChange="{b.hx("onQ")}" placeholder="{placeholder}" aria-label="{aria}">'
        clr = b.when("hasQ", f'<button type="button" class="xb-clr" aria-label="Effacer la recherche"{b.on("clearQ")}>{ic("x", 15)}</button>', bool(static_val))
    elif static_val:
        inp = f'<span class="xb-in">{static_val}<i class="caret"></i></span>'
        clr = f'<button type="button" class="xb-clr" aria-label="Effacer la recherche">{ic("x", 15)}</button>'
    else:
        inp = f'<span class="xb-in xb-ph"><i class="caret"></i>{placeholder}</span>'
        clr = ""
    return f'<label class="xb-fld f {cls}">{xi("search", 18)}{inp}{clr}</label>'


def hist(entries, mob=False):
    rows = "".join(b.when(f"h{i}", f'<div class="xb-hr"><button type="button" class="xb-hb" aria-label="Rechercher « {h} »"{b.on(f"pickH{i}")}>{xi("history", 16)}<span>{h}</span></button>'
                                     f'<button type="button" class="xb-hx" aria-label="Supprimer « {h} » de l’historique"{b.on(f"rmH{i}")}>{ic("x", 14)}</button></div>')
                   for i, h in enumerate(entries))
    return (f'<div class="xb-hist{" m" if mob else ""}"><div class="xb-hh"><span>Recherches récentes</span>'
            f'<button type="button" class="xb-lk"{b.on("clearH")}>Effacer tout</button></div>{rows}</div>')


def slider(dm0=True):
    return (f'<button type="button" class="xb-sl {b.hole("dmC", "" if dm0 else "full")}" aria-label="Durée maximum"{b.on("tdm")}>'
            f'<span class="xb-tr"><i class="xb-rg"></i><b class="xb-k0"></b><b class="xb-k1"></b></span>'
            f'<span class="xb-sll"><span>Aucun minimum</span><span>{b.hole("dmL", "2h30 ou moins" if dm0 else "Aucun maximum")}</span></span></button>')


def afs(av0=-1, dm0=False):
    out = "".join(b.when(f"fa{j}", afchip(lab, f"ta{j}"), j == av0) for j, (_, lab) in enumerate(AVAIL))
    out += b.when("fdm", afchip("2h30 ou moins", "tdm"), dm0)
    out += "".join(b.when(f"fv{j}", afchip(f"{v}+", f"tv{j}"), False) for j, v in enumerate(VOTES))
    out += "".join(b.when(f"fd{j}", afchip(f"{d}s", f"td{j}"), False) for j, d in enumerate(DECADES))
    out += "".join(b.when(f"fg{j}", afchip(lab, f"tg{j}"), False) for j, lab in enumerate(GENRES))
    out += "".join(b.when(f"fl{j}", afchip(lab, f"tl{j}"), False) for j, (_, lab) in enumerate(LANGS))
    out += f'<button type="button" class="xb-lk"{b.on("clearF")}>Effacer les filtres</button>'
    return b.when("anyF", f'<div class="xb-afs a">{out}</div>', av0 >= 0 or dm0)


CV = ["orbite", "sable", "verre", "phare", "km", "volets"]
Q35 = "Clara Venn"
TYPES = ["Films", "Séries"]
GS35 = [GENRES.index("Science-fiction")]


def meta3(k):
    f = FILMS[k]
    return f'<span>{f["y"]}</span>{b.tmdb(f["r"])}<span>{f["d"]}</span>'


def list_static(k, gs=()):
    qa = norm(Q35)
    return (qa in norm(FILMS[k]["t"]) or qa in norm(X[k]["dir"])) and (not gs or any(GENRES[g] in X[k]["gen"] for g in gs))


def lfield():
    if b.DC:
        inp = f'<input class="xb-in" value="{b.hx("lq")}" onChange="{b.hx("onLq")}" placeholder="Filtrer dans cette liste" aria-label="Filtrer dans cette liste">'
    else:
        inp = '<span class="xb-in xb-ph">Filtrer dans cette liste</span>'
    return f'<label class="xb-fld s">{xi("search", 16)}{inp}</label>'


def list_pop():
    gen = "".join(chip(f"g{j}", j in GS35, f"tg{j}", lab) for j, lab in enumerate(GENRES))
    typ = "".join(chip(f"ty{j}", False, f"tt{j}", lab) for j, lab in enumerate(TYPES))
    dec = "".join(chip(f"d{j}", False, f"td{j}", f"{d}s") for j, d in enumerate(DECADES))
    return (f'<div class="xb-pop l" role="dialog" aria-label="Filtres"><div class="xb-poph"><b>Filtres</b><button type="button" class="xb-lk"{b.on("clearF")}>Réinitialiser les filtres</button></div>'
            f'{grp("Genre", gen)}<div class="xb-pop2">{grp("Type", typ)}{grp("Décennie", dec)}</div></div>')


def list_chips():
    out = "".join(b.when(f"fg{j}", afchip(lab, f"tg{j}"), j in GS35) for j, lab in enumerate(GENRES))
    out += "".join(b.when(f"fy{j}", afchip(lab, f"tt{j}"), False) for j, lab in enumerate(TYPES))
    out += "".join(b.when(f"fd{j}", afchip(f"{d}s", f"td{j}"), False) for j, d in enumerate(DECADES))
    return b.when("anyF", f'<div class="xb-afs l">{out}</div>', bool(GS35))


def list_empties():
    return (b.when("fEmpty", f'<div class="xb-empty m">{xi("search", 26)}<b>Aucun titre ne correspond</b><span>Aucun film ne correspond à ces critères. Élargissez la recherche ou retirez un filtre.</span>'
                             f'<button type="button" class="btn gl sm"{b.on("clearAll")}>Réinitialiser les filtres</button></div>', False))


def screen_35():
    n = sum(1 for k in CV if list_static(k, GS35))
    cells = ""
    for i, k in enumerate(CV):
        hov = i == 0
        over = f'<button type="button" class="mini xb-kb {b.hole("kmC", "")}" aria-label="Plus d’actions pour « {FILMS[k]["t"]} »"{b.on("tk")}>{xi("more", 15)}</button>' if hov else ""
        after = b.when("km", kebab_menu(), False) if hov else ""
        c = card(k, "04-fiche-film", cls=f'{b.hole(f"ro{i}", f"xb-o{i}")}{" hov kopen" if hov else ""}', over=over, meta=meta3(k), after=after)
        cells += b.when(f"r{i}", c, list_static(k, GS35))
    badge = b.when("anyF", f'<b class="xb-bd">{b.hole("fc", "1")}</b>', True)
    rc = b.when("filt", f'<span>{b.hole("rcT", f"{n} films sur {len(CV)}")}</span><button type="button" class="xb-lk"{b.on("clearAll")}>Tout effacer</button>', True)
    toolbar = (f'<div class="xb-ltb">{lfield()}<span class="xb-tools"><button type="button" class="xb-tb {b.hole("foC", "on")}" aria-label="Filtres"{b.on("tFo")}>{ic("sliders", 15)}Filtres{badge}</button>'
               f'{b.when("fo", list_pop(), True)}</span><span class="xb-vsep"></span><div class="xb-sort l"><span>Trier par</span>{sort_chips(["Pertinence", "Titre", "Année"])}</div>'
               f'<div class="xb-rc">{rc}</div></div>')
    return f'''<div class="S desk frame">{b.hdr(0, solid=True)}
<div class="xb-pg">
<a class="back"{b.href("01-explorer")}>{ic("left", 16)}Explorer</a>
<div class="xb-head s"><h1 class="disp">Résultats pour «&nbsp;{Q35}&nbsp;»</h1><p class="xb-st">Films correspondant à votre recherche</p></div>
{toolbar}{list_chips()}
<div class="xb-grid g6">{cells}</div>{list_empties()}
</div></div>'''


LIST_SEARCH_JS = r"""
const F = __F__;
const G = __G__;
const D = ['2020', '2010', '2000', '1990', '1980'];
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const q = st.q !== undefined ? st.q : __Q0__;
const qt = q.trim();
o.q = q;
o.hasQ = q.length > 0;
o.onQ = (e) => this.setState({ q: e.target.value });
o.clearQ = () => this.setState({ q: '' });
o.hasQuery = qt !== '';
o.noQuery = !o.hasQuery;
o.ttl = qt ? 'Résultats pour « ' + qt + ' »' : 'Résultats de recherche';
const qa = norm(qt);
const base = F.map((f) => qa !== '' && (norm(f.t).indexOf(qa) >= 0 || norm(f.d).indexOf(qa) >= 0));
const total = base.filter((x) => x).length;
o.noRes = o.hasQuery && total === 0;
o.hasRes = total > 0;
const lq = st.lq !== undefined ? st.lq : '';
o.lq = lq;
o.onLq = (e) => this.setState({ lq: e.target.value });
const la = norm(lq.trim());
const gs = st.gs || __GS0__;
const ts = st.ts || [];
const dc = st.dc !== undefined ? st.dc : -1;
let n = 0;
F.forEach((f, i) => {
  const m = base[i] && (!la || norm(f.t).indexOf(la) >= 0)
    && (gs.length === 0 || gs.some((g) => f.g.indexOf(G[g]) >= 0))
    && (ts.length === 0 || ts.indexOf(f.tv ? 1 : 0) >= 0)
    && (dc < 0 || String(f.y).slice(0, 3) === D[dc].slice(0, 3));
  o['r' + i] = m;
  if (m) n += 1;
});
const nf = gs.length + ts.length + (dc >= 0 ? 1 : 0);
o.anyF = nf > 0;
o.fc = String(nf);
o.filt = nf > 0 || la !== '';
o.rcT = n + ' films sur ' + total;
o.fEmpty = o.hasRes && n === 0;
o.clearF = () => this.setState({ gs: [], ts: [], dc: -1 });
o.clearAll = () => this.setState({ lq: '', gs: [], ts: [], dc: -1 });
G.forEach((g, j) => {
  const on = gs.indexOf(j) >= 0;
  o['g' + j] = on ? 'on' : '';
  o['fg' + j] = on;
  o['tg' + j] = () => this.setState({ gs: on ? gs.filter((x) => x !== j) : gs.concat([j]) });
});
[0, 1].forEach((j) => {
  const on = ts.indexOf(j) >= 0;
  o['ty' + j] = on ? 'on' : '';
  o['fy' + j] = on;
  o['tt' + j] = () => this.setState({ ts: on ? ts.filter((x) => x !== j) : ts.concat([j]) });
});
D.forEach((d, j) => {
  o['d' + j] = dc === j ? 'on' : '';
  o['fd' + j] = dc === j;
  o['td' + j] = () => this.setState({ dc: dc === j ? -1 : j });
});
const DEF = ['desc', 'asc', 'desc'];
const so = st.so || 0;
const dir = st.dir || DEF[so];
const sgn = so === 0 ? (dir === 'desc' ? 1 : -1) : (dir === 'asc' ? 1 : -1);
const cmp = so === 1 ? (x, y) => F[x].t.localeCompare(F[y].t, 'fr') : (so === 2 ? (x, y) => F[x].y - F[y].y : (x, y) => x - y);
F.map((f, i) => i).sort((x, y) => cmp(x, y) * sgn).forEach((i, p) => {
  o['ro' + i] = 'xb-o' + p;
});
[0, 1, 2].forEach((j) => {
  o['oc' + j] = so === j ? 'on' : '';
  o['od' + j] = so === j && dir === 'desc';
  o['ou' + j] = so === j && dir === 'asc';
  o['os' + j] = () => this.setState(so === j ? { dir: dir === 'asc' ? 'desc' : 'asc' } : { so: j, dir: DEF[j] });
});
const fo = st.fo !== undefined ? st.fo : __FO0__;
o.fo = fo;
o.foC = fo || nf > 0 ? 'on' : '';
o.tFo = () => this.setState({ fo: !fo, km: false });
const km = !!st.km;
o.km = km;
o.kmC = km ? 'on' : '';
o.tk = () => this.setState({ km: !km, fo: false });
"""


def list_search_js(q0, gs0, fo0):
    rows = [dict(t=FILMS[k]["t"], d=X[k]["dir"], g=X[k]["gen"], y=int(FILMS[k]["y"]), tv=False) for k in CV]
    body = (LIST_SEARCH_JS.replace("__F__", js(rows)).replace("__G__", js(GENRES)).replace("__Q0__", js(q0))
            .replace("__GS0__", js(gs0)).replace("__FO0__", "true" if fo0 else "false"))
    return b.component(body)


ADDK = CV + ["kyoto", "marseille", "brume", "projo"]
AD0 = {k: k in ("orbite", "phare") for k in ADDK}
H91 = ["Clara Venn", "Kyoto", "Orbite basse", "phare"]


def add_static(k, q, av):
    qa = norm(q)
    if len(qa) < 2:
        return False
    return (qa in norm(FILMS[k]["t"]) or qa in norm(X[k]["dir"])) and (av < 0 or AVAIL[av][0] in X[k]["av"])


def adv_panel(av0, mob=False):
    gen = grp("Genre", "".join(chip(f"g{j}", False, f"tg{j}", lab) for j, lab in enumerate(GENRES)))
    dec = grp("Année de sortie", "".join(chip(f"d{j}", False, f"td{j}", f"{d}s") for j, d in enumerate(DECADES)))
    vot = grp("Note min.", "".join(chip(f"v{j}", False, f"tv{j}", f"{v}+") for j, v in enumerate(VOTES)))
    lng = grp("Langue VO", "".join(chip(f"l{j}", False, f"tl{j}", f'<b class="xb-lc">{c.upper()}</b>{lab}') for j, (c, lab) in enumerate(LANGS)))
    avl = grp("Disponibilité", "".join(chip(f"a{j}", j == av0, f"ta{j}", lab) for j, (_, lab) in enumerate(AVAIL)))
    dur = grp("Durée", slider(False), "xb-slw")
    if mob:
        return f'<div class="xb-adv m">{gen}{dec}{vot}{lng}{avl}{dur}</div>'
    return f'<div class="xb-adv"><div>{gen}{lng}</div><div>{dec}{vot}</div><div>{avl}{dur}</div></div>'


def add_row(k, i, mob=False):
    f, x = FILMS[k], X[k]
    meta = f'{f["y"]}, {", ".join(x["gen"][:2])}, {f["d"]}'
    btn = (b.when(f"na{i}", f'<button type="button" class="btn gl sm" aria-label="Ajouter « {f["t"]} »"{b.on(f"add{i}")}>{ic("plus", 15)}Ajouter</button>', not AD0[k])
           + b.when(f"ad{i}", f'<span class="btn gl sm xb-done" title="Déjà dans la liste">{ic("check", 15)}Déjà dans la liste</span>', AD0[k]))
    if mob:
        return f'<li class="xb-arow m"><span class="xb-ap2">{b.poster(k)}</span><span class="xb-ai"><b>{f["t"]}</b><span>{meta}</span><span class="xb-aa">{btn}</span></span></li>'
    return f'<li class="xb-arow"><span class="xb-ap2">{b.poster(k)}</span><span class="xb-ai"><b>{f["t"]}</b><span>{meta}</span></span><span class="xb-aa">{btn}</span></li>'


def add_form(q0, av0, mob=False):
    rows = "".join(b.when(f"r{i}", add_row(k, i, mob), add_static(k, q0, av0)) for i, k in enumerate(ADDK))
    has = any(add_static(k, q0, av0) for k in ADDK)
    res = (b.when("hasRes", f'<ul class="xb-ares{" m" if mob else ""}" aria-label="Résultats de la recherche">{rows}</ul><p class="xb-attr a">Données fournies par TMDB</p>', has)
           + b.when("noRes", f'<p class="xb-nores">{b.hole("noResT", "")}</p>', False)
           + b.when("noAv", '<p class="xb-nores">Aucun film disponible avec ce mode de visionnage parmi les résultats.</p>', False))
    badge = b.when("anyF", f'<b class="xb-bd">{b.hole("fc", "1")}</b>', av0 >= 0)
    if mob:
        fbtn = f'<button type="button" class="xb-fbtn {b.hole("faC", "")}" aria-label="Filtres avancés"{b.on("tFa")}>{xi("lfilter", 18)}{badge}</button>'
    else:
        fbtn = f'<button type="button" class="xb-tb a {b.hole("faC", "")}"{b.on("tFa")}>{xi("lfilter", 16)}Filtres avancés{badge}</button>'
    field = sfield("Rechercher un film à ajouter…", q0, aria="Rechercher un film à ajouter à ma liste")
    hint = b.when("short", '<p class="xb-hint">Tapez au moins 2 caractères pour lancer une recherche.</p>', False)
    hist_html = b.when("hist", hist(H91, mob), not q0)
    return (f'<div class="xb-sf a"><div class="xb-asr">{field}{fbtn}</div>{"" if mob else hist_html}</div>{afs(av0, False)}{hint}{hist_html if mob else ""}'
            f'{b.when("fo", adv_panel(av0, mob), False)}{res}')


def tb06():
    sorts = "".join(f'<span class="xb-ch{" on" if j == 0 else ""}">{xi("adown", 13) if j == 0 else ""}{lab}</span>' for j, lab in enumerate(["Ajout", "Titre", "Note", "Durée", "Sortie", "Dispo"]))
    cards = "".join(card(k, "04-fiche-film", meta=meta3(k), badge='<span class="badge">Série</span>' if k == "sable" else "") for k in ["orbite", "phare", "volets", "sable", "brume", "kyoto"])
    return (f'<div class="xb-ltb w"><span class="xb-fld s">{xi("search", 16)}<span class="xb-in xb-ph">Rechercher dans ma liste…</span></span><span class="xb-tb">{ic("sliders", 15)}Filtres</span>'
            f'<span class="xb-vsep"></span><div class="xb-sort l"><span>Trier par</span>{sorts}</div>'
            f'<div class="seg xb-vw"><span aria-label="Affichage liste">{ic("list", 15)}</span><span class="on" aria-label="Affichage grille">{ic("grid", 15)}</span></div></div>'
            f'<div class="xb-grid g6 xb-wg">{cards}</div>')


def screen_91():
    catch = b.when("hist", f'<button type="button" class="xb-catch" aria-label="Fermer les recherches récentes"{b.on("closeH")}></button>', False) if b.DC else ""
    return f'''<div class="S desk frame">{b.hdr(3, solid=True)}
<div class="xb-pg scr">
<div class="xb-wh"><div><h1 class="disp">Ma liste</h1><span class="xb-c">48 titres à voir</span></div><div class="xb-wha"><a class="btn gh sm"{b.href("40-import-letterboxd")}>{xi("import", 16)}Importer depuis Letterboxd</a><a class="btn gl sm"{b.href("41-au-hasard")}>{xi("dice", 16)}Piocher un film</a><button type="button" class="btn sm" aria-expanded="true">{ic("plus", 16)}Ajouter un film</button></div></div>
<section class="xb-ap" aria-label="Ajouter un film à ma liste"><div class="xb-aph"><h2 class="disp">Ajouter un film à ma liste</h2>{close_btn("06-ma-liste")}</div>
{add_form(Q35, 0)}</section>
{tb06()}{catch}
</div></div>'''


def screen_92():
    sheet = (f'<div class="sheet xb-ash" role="dialog" aria-label="Ajouter un film à ma liste"><span class="grab"></span>'
             f'<div class="xb-shh"><h2 class="disp">Ajouter un film à ma liste</h2>{close_btn("44-m-ma-liste")}</div>'
             f'<div class="xb-ashb">{add_form("", -1, True)}</div></div>')
    return f'<div class="S mob frame"><div class="under xb-und">{parent(m_list)}</div><div class="veil"></div>{sheet}</div>'


ADD_JS = r"""
const F = __F__;
const G = __G__;
const A = ['flatrate', 'rent', 'buy'];
const D = ['2020', '2010', '2000', '1990', '1980'];
const VV = [6, 7, 8];
const L = ['fr', 'en', 'ja', 'ko', 'es', 'de', 'it', 'zh'];
const H0 = __H__;
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const q = st.q !== undefined ? st.q : __Q0__;
const qt = q.trim();
const hr = st.hr || [];
const left = H0.filter((x, i) => hr.indexOf(i) < 0);
o.hist = qt === '' && !st.hc && left.length > 0;
H0.forEach((h, i) => {
  o['h' + i] = hr.indexOf(i) < 0;
  o['pickH' + i] = () => this.setState({ q: h, hc: true });
  o['rmH' + i] = () => this.setState({ hr: hr.concat([i]) });
});
o.clearH = () => this.setState({ hr: H0.map((x, i) => i) });
o.closeH = () => this.setState({ hc: true });
o.q = q;
o.hasQ = q.length > 0;
o.onQ = (e) => this.setState({ q: e.target.value, hc: false });
o.clearQ = () => this.setState({ q: '', hc: false });
o.short = qt.length === 1;
const qa = qt.length >= 2 ? norm(qt) : '';
const gs = st.gs || [];
const av = st.av !== undefined ? st.av : __AV0__;
const dm = st.dm !== undefined ? st.dm : false;
const vm = st.vm !== undefined ? st.vm : -1;
const dc = st.dc !== undefined ? st.dc : -1;
const lg = st.lg !== undefined ? st.lg : -1;
const api = gs.length > 0 || dm || vm >= 0 || dc >= 0 || lg >= 0;
const searched = qa !== '' || api;
let nRaw = 0;
let nDisp = 0;
F.forEach((f, i) => {
  const raw = searched && (!qa || norm(f.t).indexOf(qa) >= 0 || norm(f.d).indexOf(qa) >= 0)
    && (gs.length === 0 || gs.some((g) => f.g.indexOf(G[g]) >= 0))
    && (!dm || f.r <= 150)
    && (vm < 0 || f.v >= VV[vm])
    && (dc < 0 || String(f.y).slice(0, 3) === D[dc].slice(0, 3))
    && (lg < 0 || f.l === L[lg]);
  const disp = raw && (av < 0 || f.a.indexOf(A[av]) >= 0);
  o['r' + i] = disp;
  if (raw) nRaw += 1;
  if (disp) nDisp += 1;
});
o.hasRes = nDisp > 0;
o.noRes = searched && nRaw === 0;
o.noResT = qa ? 'Aucun film ne correspond à « ' + qt + ' ».' : 'Aucun film ne correspond aux filtres sélectionnés.';
o.noAv = searched && nRaw > 0 && nDisp === 0;
G.forEach((g, j) => {
  const on = gs.indexOf(j) >= 0;
  o['g' + j] = on ? 'on' : '';
  o['fg' + j] = on;
  o['tg' + j] = () => this.setState({ gs: on ? gs.filter((x) => x !== j) : gs.concat([j]) });
});
const one = (key, cur, list, c, f, t) => list.forEach((x, j) => {
  o[c + j] = cur === j ? 'on' : '';
  o[f + j] = cur === j;
  o[t + j] = () => this.setState({ [key]: cur === j ? -1 : j });
});
one('av', av, A, 'a', 'fa', 'ta');
one('vm', vm, VV, 'v', 'fv', 'tv');
one('dc', dc, D, 'd', 'fd', 'td');
one('lg', lg, L, 'l', 'fl', 'tl');
o.dmC = dm ? '' : 'full';
o.dmL = dm ? '2h30 ou moins' : 'Aucun maximum';
o.fdm = dm;
o.tdm = () => this.setState({ dm: !dm });
const nf = gs.length + (av >= 0 ? 1 : 0) + (dm ? 1 : 0) + (vm >= 0 ? 1 : 0) + (dc >= 0 ? 1 : 0) + (lg >= 0 ? 1 : 0);
o.anyF = nf > 0;
o.fc = String(nf);
o.clearF = () => this.setState({ gs: [], av: -1, dm: false, vm: -1, dc: -1, lg: -1 });
const fo = !!st.fo;
o.fo = fo;
o.faC = fo || nf > 0 ? 'on' : '';
o.tFa = () => this.setState({ fo: !fo, hc: true });
const ad = st.ad || __AD0__;
F.forEach((f, i) => {
  o['ad' + i] = !!ad[i];
  o['na' + i] = !ad[i];
  o['add' + i] = () => {
    const x = ad.slice();
    x[i] = true;
    this.setState({ ad: x });
  };
});
"""


def add_js(q0, av0):
    rows = [dict(t=FILMS[k]["t"], d=X[k]["dir"], g=X[k]["gen"], a=X[k]["av"], r=X[k]["rt"], y=int(FILMS[k]["y"]), v=vote(k), l=X[k]["lang"]) for k in ADDK]
    body = (ADD_JS.replace("__F__", js(rows)).replace("__G__", js(GENRES)).replace("__H__", js(H91)).replace("__Q0__", js(q0))
            .replace("__AV0__", str(av0)).replace("__AD0__", js([AD0[k] for k in ADDK])))
    return b.component(body)


TABS = ["Tendances", "Au cinéma", "Les plus proposés", "En streaming", "Par thème", "Films similaires"]
VT = ["Tendances de la semaine", "Actuellement au cinéma", "Les plus proposés", "Netflix", "Frissons d’automne", "Parce que vous avez aimé"]
VS = ["Les films dont tout le monde parle", "Encore en salles en France", "Classement sur les soirées créées", "Disponible sur votre abonnement",
      "Une sélection prête à lancer", "Orbite basse"]
TG = ["Tous", "Action", "Comédie", "Thriller", "Drame", "Horreur", "Animation"]
PV = ["Netflix", "Prime Video", "Disney+", "Canal+", "Apple TV+"]
TH = ["Frissons d’automne", "Comédies françaises", "Années 80", "Films de braquage", "Pépites A24", "Années 90", "Années 2000",
      "Moins de 90 minutes", "Les indétrônables", "En famille"]
GRIDS = [
    ["orbite", "sable", "kyoto", "verre", "marseille", "brume", "phare", "volets", "km", "projo"],
    ["km", "brume", "orbite", "sable", "volets"],
    ["projo", "orbite", "kyoto", "marseille", "km", "brume", "phare", "volets"],
    ["kyoto", "orbite", "volets", "phare", "marseille", "sable", "verre"],
    ["brume", "verre", "marseille", "projo", "orbite", "kyoto"],
    ["verre", "sable", "phare", "km", "kyoto", "projo"],
]
def kebab_menu():
    return (f'<div class="xb-menu" role="menu"><a class="xb-mi" role="menuitem"{b.href("04-fiche-film")}>{ic("info", 16)}Voir les détails</a>'
            f'<button type="button" class="xb-mi" role="menuitem"{b.on("tk")}>{ic("bookmark", 16)}Ajouter à ma liste</button>'
            f'<a class="xb-mi" role="menuitem"{b.href("02-soiree")}>{xi("listplus", 16)}Proposer dans une soirée</a><i class="xb-msep"></i>'
            f'<span class="xb-mi" role="menuitem">{xi("ext", 16)}Ouvrir sur Letterboxd</span></div>')


def showcase_grids(slug, mob=False):
    out = ""
    for j, keys in enumerate(GRIDS):
        cells = ""
        for i, k in enumerate(keys):
            badge, meta, cls, over, after = "", meta3(k), "", "", ""
            if j == 2:
                badge = f'<span class="xb-rk" aria-label="Rang {i + 1}">{i + 1}</span>'
            if j == 0 and i == 1 and not mob:
                cls = "kopen"
                over = f'<button type="button" class="mini xb-kb {b.hole("kmC", "on")}" aria-label="Plus d’actions pour « Sable noir »"{b.on("tk")}>{xi("more", 15)}</button>'
                after = b.when("km", kebab_menu())
            c = card(k, slug, cls=cls, badge=badge, over=over, meta=meta, after=after)
            if j == 0:
                c = b.when(f"t{i}", c)
            cells += c
        out += b.when(f"v{j}", f'<div class="xb-grid {"m2" if mob else "g6"}">{cells}</div>', j == 0)
    out += b.when("tEmpty", f'<div class="xb-empty">{ic("film", 26)}<b>Aucun film dans cette sélection pour le moment.</b>'
                            '<span>Revenez plus tard, la sélection est mise à jour plusieurs fois par jour.</span></div>', False)
    return out


def variant_chips():
    tg = b.when("c0", '<div class="xb-chi">' + "".join(chip(f"tgc{j}", j == 0, f"stg{j}", lab) for j, lab in enumerate(TG)) + "</div>")
    pv = b.when("c3", '<div class="xb-chi">' + "".join(chip(f"pvc{j}", j == 0, f"spv{j}", lab) for j, lab in enumerate(PV)) + "</div>", False)
    th = b.when("c4", '<div class="xb-chi fade">' + "".join(chip(f"thc{j}", j == 0, f"sth{j}", lab) for j, lab in enumerate(TH)) + "</div>", False)
    return tg + pv + th


def tabs_html(collections=True):
    t = "".join(f'<button type="button" class="xb-tab {b.hole(f"vt{j}", "on" if j == 0 else "")}"{b.on(f"sv{j}")}>{lab}</button>' for j, lab in enumerate(TABS))
    if collections:
        t += f'<a class="xb-tab"{b.href("37-collections")}>{xi("layers", 15)}Sagas et collections</a>'
    return t


def filters_pop(cls=""):
    gen = "".join(f'<button type="button" class="xb-ch">{g}</button>' for g in GENRES)
    typ = '<button type="button" class="xb-ch">Films</button><button type="button" class="xb-ch">Séries</button>'
    dec = "".join(f'<button type="button" class="xb-ch">{d}s</button>' for d in DECADES)
    return (f'<div class="xb-pop{cls}" role="dialog" aria-label="Filtres"><div class="xb-poph"><b>Filtres</b><button type="button" class="xb-lk"{b.on("tFo")}>Réinitialiser les filtres</button></div>'
            f'{grp("Genre", gen)}<div class="xb-pop2">{grp("Type", typ)}{grp("Décennie", dec)}</div></div>')


def screen_36():
    tools = (f'<span class="xb-mfld">{xi("search", 15)}Filtrer dans cette liste</span>'
             f'<button type="button" class="xb-tb {b.hole("foC", "")}"{b.on("tFo")}>{ic("sliders", 15)}Filtres</button>'
             f'<span class="xb-dd"><em>Trier par</em>Pertinence{ic("chevd", 15)}</span>{b.when("fo", filters_pop(), False)}')
    return f'''<div class="S desk frame">{b.hdr(0, solid=True)}
<div class="xb-pg">
<div class="xb-subnav"><a class="back"{b.href("01-explorer")}>{ic("left", 16)}Explorer</a><span class="xb-vsep"></span><div class="xb-tabs" role="tablist">{tabs_html()}</div></div>
<div class="xb-head"><h1 class="disp">{b.hole("ttl", VT[0])}</h1><p class="xb-st">{b.hole("sub", VS[0])}</p></div>
<div class="xb-bar2"><div class="xb-chs">{variant_chips()}</div><div class="xb-tools">{tools}</div></div>
{showcase_grids("04-fiche-film")}
</div></div>'''


SHOWCASE_JS = r"""
const VT = __VT__;
const VS = __VS__;
const TG = __TG__;
const PV = __PV__;
const TH = __TH__;
const GM = __GM__;
const v = st.v || 0;
const tg = st.tg || 0;
const pv = st.pv || 0;
const th = st.th || 0;
VT.forEach((x, j) => {
  o['v' + j] = v === j;
  o['vt' + j] = v === j ? 'on' : '';
  o['sv' + j] = () => this.setState({ v: j, km: false, fo: false });
});
o.ttl = v === 3 ? PV[pv] : (v === 4 ? TH[th] : VT[v]);
o.sub = v === 0 && tg > 0 ? TG[tg] : VS[v];
o.c0 = v === 0;
o.c3 = v === 3;
o.c4 = v === 4;
TG.forEach((x, j) => {
  o['tgc' + j] = tg === j ? 'on' : '';
  o['stg' + j] = () => this.setState({ tg: j });
});
PV.forEach((x, j) => {
  o['pvc' + j] = pv === j ? 'on' : '';
  o['spv' + j] = () => this.setState({ pv: j });
});
TH.forEach((x, j) => {
  o['thc' + j] = th === j ? 'on' : '';
  o['sth' + j] = () => this.setState({ th: j });
});
let n = 0;
GM.forEach((gl, i) => {
  const m = tg === 0 || gl.indexOf(TG[tg]) >= 0;
  o['t' + i] = m;
  if (m) n += 1;
});
o.tEmpty = v === 0 && n === 0;
const km = st.km !== undefined ? st.km : __KM0__;
o.km = km;
o.kmC = km ? 'on' : '';
o.tk = () => this.setState({ km: !km, fo: false });
const fo = !!st.fo;
o.fo = fo;
o.foC = fo ? 'on' : '';
o.tFo = () => this.setState({ fo: !fo, km: false });
"""


def showcase_js(km0):
    gm = [X[k]["gen"] for k in GRIDS[0]]
    body = (SHOWCASE_JS.replace("__VT__", js(VT)).replace("__VS__", js(VS)).replace("__TG__", js(TG)).replace("__PV__", js(PV))
            .replace("__TH__", js(TH)).replace("__GM__", js(gm)).replace("__KM0__", "true" if km0 else "false"))
    return b.component(body)


COLS = [
    ("La Trilogie de la nuit", ["kyoto", "marseille", "brume"], 3),
    ("Orbite basse", ["orbite"], 3),
    ("Les Enfants du phare", ["phare"], 4),
    ("Sable noir", ["sable"], 2),
    ("Tempête de verre", ["verre"], 3),
    ("La Maison aux volets bleus", ["volets"], 3),
    ("Kilomètre zéro", ["km"], 2),
    ("Le Dernier Projectionniste", ["projo"], 2),
    ("Les Gardiens du lac", [], 5),
    ("Chroniques d’hiver", [], 4),
]


def pile(keys):
    if len(keys) >= 3:
        return "".join(f'<span class="xb-f{j}">{b.poster(k)}</span>' for j, k in enumerate(keys[:3]))
    front = f'<span class="xb-p0">{b.poster(keys[0])}</span>' if keys else f'<span class="xb-p0 none">{xi("layers", 26)}</span>'
    return f'<i class="xb-g1"></i><i class="xb-g2"></i>{front}'


def screen_37():
    cards = "".join(b.when(f"k{i}", f'<a class="xb-col {b.hole(f"ro{i}", f"xb-o{i}")}"{b.href("38-une-collection")}><span class="xb-pile">{pile(keys)}</span>'
                                     f'<span class="xb-cn disp">{name}</span><span class="xb-cc">{n} films</span></a>')
                    for i, (name, keys, n) in enumerate(COLS))
    if b.DC:
        inp = f'<input class="xb-in" value="{b.hx("q")}" onChange="{b.hx("onQ")}" placeholder="Nom de saga" aria-label="Filtrer les sagas">'
    else:
        inp = '<span class="xb-in xb-ph">Nom de saga</span>'
    rc = (b.when("filt", f'<span>{b.hole("rcT", "")}</span><button type="button" class="xb-lk"{b.on("clearC")}>Tout effacer</button>', False)
          + b.when("nf", f'<span>{len(COLS)} sagas</span>'))
    empty = b.when("cNone", f'<div class="xb-empty">{ic("film", 26)}<b>Aucune saga ne correspond</b><span>Essayez un autre nom, ou effacez le filtre.</span></div>', False)
    return f'''<div class="S desk frame">{b.hdr(0, solid=True)}
<div class="xb-pg">
<a class="back"{b.href("01-explorer")}>{ic("left", 16)}Explorer</a>
<div class="xb-head s"><h1 class="disp">Sagas et collections</h1><p class="xb-st">Toute une franchise en une liste</p></div>
<div class="xb-tbar"><label class="xb-fld s">{xi("search", 16)}{inp}</label><span class="xb-vsep"></span><div class="xb-sort l"><span>Trier par</span>{sort_chips(["Popularité", "Nom", "Nombre de films"], 0, "asc")}</div><div class="xb-rc">{rc}</div></div>
<div class="xb-cgrid">{cards}</div>{empty}
</div></div>'''


COLL_JS = r"""
const C = __C__;
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const q = st.q !== undefined ? st.q : '';
const qa = norm(q.trim());
o.q = q;
o.onQ = (e) => this.setState({ q: e.target.value });
let n = 0;
C.forEach((c, i) => {
  const m = !qa || norm(c.n).indexOf(qa) >= 0;
  o['k' + i] = m;
  if (m) n += 1;
});
o.filt = qa !== '';
o.nf = !o.filt;
o.rcT = n + ' sagas sur ' + C.length;
o.cNone = n === 0;
o.clearC = () => this.setState({ q: '', so: 0, dir: 'asc' });
const DEF = ['asc', 'asc', 'desc'];
const so = st.so || 0;
const dir = st.dir || DEF[so];
const sgn = dir === 'asc' ? 1 : -1;
const cmp = so === 1 ? (x, y) => C[x].n.localeCompare(C[y].n, 'fr') : (so === 2 ? (x, y) => C[x].c - C[y].c : (x, y) => x - y);
C.map((c, i) => i).sort((x, y) => cmp(x, y) * sgn || x - y).forEach((i, p) => {
  o['ro' + i] = 'xb-o' + p;
});
[0, 1, 2].forEach((j) => {
  o['oc' + j] = so === j ? 'on' : '';
  o['od' + j] = so === j && dir === 'desc';
  o['ou' + j] = so === j && dir === 'asc';
  o['os' + j] = () => this.setState(so === j ? { dir: dir === 'asc' ? 'desc' : 'asc' } : { so: j, dir: DEF[j] });
});
"""

TRI = ["marseille", "kyoto", "brume"]
SYN = {
    "marseille": "Un chauffeur de taxi de nuit accepte une dernière course. Au matin, il ne reconnaît plus la ville.",
    "kyoto": "Deux inconnus ratent le dernier train et marchent jusqu’à l’aube dans une ville qui ne dort jamais vraiment.",
    "brume": "Un village de montagne disparaît dans le brouillard. Ceux qui en reviennent ne racontent pas la même histoire.",
}


def screen_38():
    bd = "".join(f'<div>{b.poster(k)}</div>' for k in TRI)
    rows = ""
    for i, k in enumerate(TRI):
        f, x = FILMS[k], X[k]
        rows += (f'<div class="xb-lr {b.hole(f"ro{i}", f"xb-o{i}")}"><span class="xb-n disp" aria-label="Film {i + 1} de la saga">{i + 1}</span>'
                 f'<a class="xb-lp"{b.href("04-fiche-film")}>{b.poster(k)}</a>'
                 f'<div class="xb-li"><a class="xb-lt"{b.href("04-fiche-film")}>{f["t"]}</a><div class="xb-lm"><span>{f["y"]}</span>{b.tmdb(f["r"])}<span>{f["d"]}</span><span>{", ".join(x["gen"][:2])}</span></div><p>{SYN[k]}</p></div>'
                 f'<div class="xb-la"><a class="btn gl sm"{b.href("02-soiree")}>{ic("plus", 15)}Proposer</a>'
                 f'<button type="button" class="ib xb-bk {b.hole(f"bk{i}", "on" if i == 1 else "")}" aria-label="Ma liste"{b.on(f"tb{i}")}>{ic("bookmark", 17)}</button>'
                 f'<a class="ib" aria-label="Voir la fiche de {f["t"]}"{b.href("04-fiche-film")}>{ic("info", 17)}</a></div></div>')
    return f'''<div class="S desk frame"><div class="xb-cbd" aria-hidden="true">{bd}</div>{b.hdr(0)}
<div class="xb-pg">
<a class="back"{b.href("37-collections")}>{ic("left", 16)}Sagas et collections</a>
<div class="ov xb-ov38">Saga, 3 films</div><h1 class="disp xb-h38">La Trilogie de la nuit</h1><p class="xb-st">Toute une franchise en une liste, de 2019 à 2023</p>
<div class="xb-tbar"><span class="xb-mfld">{xi("search", 15)}Filtrer dans cette liste</span><span class="xb-tools"><button type="button" class="xb-tb {b.hole("foC", "")}"{b.on("tFo")}>{ic("sliders", 15)}Filtres</button>{b.when("fo", filters_pop(" l"), False)}</span><span class="xb-vsep"></span>
<div class="xb-sort l"><span>Trier par</span>{sort_chips(["Pertinence", "Titre", "Année"], 0, "asc")}</div></div>
<div class="xb-lst">{rows}</div>
</div></div>'''


TRI_JS = r"""
const R = __R__;
const DEF = ['asc', 'asc', 'asc'];
const so = st.so || 0;
const dir = st.dir || DEF[so];
const sgn = dir === 'asc' ? 1 : -1;
const cmp = so === 1 ? (x, y) => R[x].t.localeCompare(R[y].t, 'fr') : (so === 2 ? (x, y) => R[x].y - R[y].y : (x, y) => x - y);
R.map((r, i) => i).sort((x, y) => cmp(x, y) * sgn).forEach((i, p) => {
  o['ro' + i] = 'xb-o' + p;
});
[0, 1, 2].forEach((j) => {
  o['oc' + j] = so === j ? 'on' : '';
  o['od' + j] = so === j && dir === 'desc';
  o['ou' + j] = so === j && dir === 'asc';
  o['os' + j] = () => this.setState(so === j ? { dir: dir === 'asc' ? 'desc' : 'asc' } : { so: j, dir: DEF[j] });
});
const fo = !!st.fo;
o.fo = fo;
o.foC = fo ? 'on' : '';
o.tFo = () => this.setState({ fo: !fo });
const bk = st.bk || [false, true, false];
R.forEach((r, i) => {
  o['bk' + i] = bk[i] ? 'on' : '';
  o['tb' + i] = () => {
    const x = bk.slice();
    x[i] = !x[i];
    this.setState({ bk: x });
  };
});
"""


def screen_39():
    return f'''<div class="S desk frame"><div class="xb-under lit">{parent(b.d_movie)}</div>
<div class="xb-tmod" role="dialog" aria-label="Bande-annonce de Orbite basse">
<div class="xb-tmh"><div><div class="ov">Bande-annonce</div><h2 class="disp">Orbite basse</h2></div><a class="ib" aria-label="Fermer"{b.href("04-fiche-film")}>{ic("x", 18)}</a></div>
<div class="xb-vid {b.hole("vc", "")}" role="button" aria-label="Lire ou mettre en pause"{b.on("tPlay")}>{b.hero_bd()}<span class="xb-shade"></span>
<span class="xb-big">{ic("play", 30)}</span>
<div class="xb-ctl"><span class="xb-cp">{b.when("ns", ic("play", 16))}{b.when("pl", xi("pause", 16), False)}</span><span>0:42 / 2:18</span><span class="xb-prog"><i class="xb-fill"></i></span>{xi("volume", 17)}{xi("max", 17)}</div>
</div></div></div>'''


PLAY_JS = """
const pl = !!st.pl;
o.pl = pl;
o.ns = !pl;
o.vc = pl ? 'on' : '';
o.tPlay = () => this.setState({ pl: !pl });
"""

HELP = ('<div class="xb-bub" role="note"><b>Comment ça marche</b>'
        '<p>Votre watchlist Letterboxd publique est recopiée ici, au plus une fois par jour à l’ouverture de l’application. Rien n’est écrit sur Letterboxd : ajouter, retirer ou proposer un film depuis Movie Picker ne modifie jamais votre liste là-bas.</p>'
        '<p>Les films reconnus avec certitude sont ajoutés directement, les titres ambigus vous sont soumis pour arbitrage. Si vous marquez un film comme vu, noté ou commenté sur Letterboxd, il est retiré de votre liste ici, mais les films ajoutés à la main dans Movie Picker ne sont jamais retirés.</p>'
        '<p>Votre pseudo est la fin de l’URL letterboxd.com/…, et votre profil doit être public pour que la synchronisation fonctionne.</p></div>')

CHOICES = [
    dict(t="Brume", y="2023", c=[("brume", "Brume", "2023, Thriller, Horreur, 1h39"), (None, "Brume", "1998, Drame, 1h31")]),
    dict(t="Kyoto", y="2021", c=[("kyoto", "Minuit à Kyoto", "2021, Romance, Drame, 1h47"), (None, "Kyoto, dernier train", "2009, Drame, 1h38")]),
]


def close_btn(slug, size="s"):
    return f'<a class="ib {size} xb-x" aria-label="Fermer"{b.href(slug)}>{ic("x", 16)}</a>'


def choose(s):
    c = CHOICES[s]
    dots = "".join(f'<i class="{"cur" if j == s else ("done" if j < s else "")}"></i>' for j in range(2))
    cards = ""
    for j, (k, t, d) in enumerate(c["c"]):
        thumb = f'<span class="xb-thm">{b.poster(k)}</span>' if k else f'<span class="xb-thm none">{ic("film", 18)}</span>'
        cards += (f'<button type="button" class="xb-cho {b.hole(f"c{s}{j}", "")}"{b.on(f"pk{s}{j}")}><span class="xb-rad"></span>{thumb}'
                  f'<span class="xb-cht"><b>{t}</b><span>{d}</span></span></button>')
    cards += f'<button type="button" class="xb-cho dash {b.hole(f"c{s}x", "")}"{b.on(f"pk{s}x")}><span class="xb-rad"></span>Aucun de ces films, ignorer ce titre</button>'
    nxt = "Confirmer et suivant" if s == 0 else "Confirmer et terminer"
    return (f'<div class="xb-mhd"><h2 class="disp">2 titres à confirmer</h2><span class="xb-dots" aria-hidden="true">{dots}</span>{close_btn("06-ma-liste")}</div>'
            f'<p class="xb-intro">Titre {s + 1} sur 2. Lequel de ces films correspond à votre entrée Letterboxd&nbsp;?</p>'
            f'<p class="xb-ask"><b>{c["t"]}</b><span>Letterboxd, {c["y"]}</span></p>'
            f'<div class="xb-chl" aria-label="Correspondances possibles pour {c["t"]}">{cards}</div>'
            f'<div class="xb-mft"><button type="button" class="xb-lk"{b.on("later")}>Décider plus tard</button><button type="button" class="btn gh"{b.on(f"skip{s}")}>Passer</button>'
            f'<button type="button" class="btn {b.hole(f"nx{s}", "dis")}"{b.on(f"next{s}")}>{nxt}</button></div>')


def screen_40():
    if b.DC:
        inp = f'<input class="in" value="{b.hx("u")}" onChange="{b.hx("onU")}" placeholder="Votre pseudo Letterboxd" maxlength="40">'
    else:
        inp = '<span class="in focus">adrien_films<i class="caret"></i></span>'
    steps = ('<div class="xb-steps"><span class="xb-step"><b>1</b>Votre watchlist publique est lue, une fois par jour au maximum.</span>'
             '<span class="xb-step"><b>2</b>Les films reconnus avec certitude sont ajoutés directement.</span>'
             '<span class="xb-step"><b>3</b>Les titres ambigus vous sont soumis pour arbitrage.</span></div>')
    prog = ('<div class="xb-prg" role="status"><span class="xb-bar3" aria-label="Synchronisation en cours"><i></i></span>'
            '<p>Lecture de votre watchlist Letterboxd… cela peut prendre jusqu’à une minute selon sa taille.</p></div>')
    form = (f'<div class="xb-mhd"><h2 class="disp">Importer depuis Letterboxd</h2><button type="button" class="xb-ibt {b.hole("hlC", "")}" aria-label="Comment ça marche"{b.on("tHelp")}>{ic("info", 16)}</button>'
            f'{close_btn("06-ma-liste")}</div>{b.when("help", HELP, False)}'
            '<p class="xb-intro">Votre watchlist Letterboxd est recopiée dans Movie Picker. Rien n’est écrit sur Letterboxd, et les films ajoutés à la main ici ne sont jamais touchés.</p>'
            f'<label class="fld xb-f"><span class="fl">Pseudo Letterboxd</span>{inp}</label>{b.when("sF", steps)}{b.when("sS", prog, False)}'
            f'<div class="xb-mft"><a class="btn gh"{b.href("06-ma-liste")}>Annuler</a>'
            f'<button type="button" class="btn {b.hole("cnC", "")}"{b.on("connect")}>{xi("import", 16)}{b.hole("cnL", "Connecter et importer")}</button></div>')
    unm = '<ul class="xb-ul"><li>Le Silence des marées (1987)</li><li>Nuit blanche à Lisbonne (2004)</li></ul>'
    done = (f'<div class="xb-mhd"><h2 class="disp">Import terminé</h2>{close_btn("06-ma-liste")}</div>'
            f'<div class="xb-rep"><div class="xb-rrow ok">{ic("check", 16)}<span>37 titres ajoutés à votre liste</span></div>'
            f'{b.when("dC", f"""<div class="xb-rrow ok">{ic("check", 16)}<span>{b.hole("dCT", "")}</span></div>""", False)}'
            f'<div class="xb-rrow">{xi("warn", 16)}<span>2 titres introuvables sur TMDB</span></div>'
            f'<button type="button" class="xb-lk xb-unm"{b.on("tUnm")}>Voir les titres à chercher à la main</button>{b.when("unm", unm, False)}'
            f'{b.when("dU", f"""<div class="xb-rrow">{ic("clock", 16)}<span>{b.hole("dUT", "")}</span></div>""", False)}</div>'
            f'<p class="xb-intro">Votre watchlist Letterboxd sera relue automatiquement, au maximum une fois par jour. Vous pouvez la resynchroniser à la main depuis '
            f'<a class="xb-lk"{b.href("28-reglages-integrations")}>les réglages</a>.</p>'
            f'<div class="xb-mft"><a class="btn"{b.href("06-ma-liste")}>{ic("eye", 16)}Voir ma liste</a></div>')
    modal = (f'<div class="xb-mod {b.hole("mw", "")}" role="dialog" aria-label="Importer depuis Letterboxd">{b.when("stF", form)}'
             f'{b.when("st1", choose(0), False)}{b.when("st2", choose(1), False)}{b.when("stD", done, False)}</div>')
    return f'<div class="S desk frame"><div class="xb-under">{parent(b.d_watchlist)}</div>{modal}</div>'


LB_JS = r"""
const step = st.step || 'form';
const u = st.u !== undefined ? st.u : 'adrien_films';
o.u = u;
o.onU = (e) => this.setState({ u: e.target.value });
o.stF = step === 'form' || step === 'sync';
o.sF = step === 'form';
o.sS = step === 'sync';
o.st1 = step === 'c1';
o.st2 = step === 'c2';
o.stD = step === 'done';
o.mw = step === 'c1' || step === 'c2' ? 'w6' : '';
const can = u.trim().length > 0 && step === 'form';
o.cnC = can ? '' : 'dis';
o.cnL = step === 'sync' ? 'Connexion…' : 'Connecter et importer';
o.connect = () => {
  if (!can) return;
  this.setState({ step: 'sync', help: false });
  clearTimeout(this.tm);
  this.tm = setTimeout(() => this.setState({ step: 'c1' }), 1800);
};
const hp = !!st.help;
o.help = hp && step === 'form';
o.hlC = hp ? 'on' : '';
o.tHelp = () => this.setState({ help: !hp });
const ans = st.ans || [null, null];
[0, 1].forEach((s) => {
  ['0', '1', 'x'].forEach((j) => {
    o['c' + s + j] = ans[s] === j ? 'on' : '';
    o['pk' + s + j] = () => {
      const a = ans.slice();
      a[s] = j;
      this.setState({ ans: a });
    };
  });
  o['nx' + s] = ans[s] === null ? 'dis' : '';
  o['skip' + s] = () => {
    const a = ans.slice();
    a[s] = 'x';
    this.setState({ ans: a, step: s === 0 ? 'c2' : 'done' });
  };
  o['next' + s] = () => {
    if (ans[s] === null) return;
    this.setState({ step: s === 0 ? 'c2' : 'done' });
  };
});
o.later = () => this.setState({ step: 'done' });
const conf = ans.filter((a) => a === '0' || a === '1').length;
const und = 2 - conf;
o.dC = conf > 0;
o.dCT = conf === 1 ? '1 titre confirmé à la main' : conf + ' titres confirmés à la main';
o.dU = und > 0;
o.dUT = und === 1 ? '1 titre laissé en attente, à décider à la prochaine synchronisation' : und + ' titres laissés en attente, à décider à la prochaine synchronisation';
o.unm = !!st.unm;
o.tUnm = () => this.setState({ unm: !st.unm });
"""

POOL = ["kyoto", "phare", "orbite", "volets", "sable", "marseille"]
FLICK = ["orbite", "sable", "volets", "phare"]


def pick_slot(mob=False):
    posters = "".join(b.when(f"p{j}", f'<div class="xb-pin">{b.poster(k)}</div>', j == 0) for j, k in enumerate(POOL))
    flick = b.when("sh", '<div class="xb-flk">' + "".join(f'<div>{b.poster(k)}</div>' for k in FLICK) + '</div>', False)
    return f'<div class="xb-slot{" m" if mob else ""}" aria-hidden="true">{posters}{flick}</div>'


def pick_facts(slug, mob=False):
    f = FILMS[POOL[0]]
    facts = (f'<h3 class="disp xb-rt">{b.hole("ttl", f["t"])}</h3><div class="xb-rm"><span>{b.hole("yr", f["y"])}</span>{b.tmdb(b.hole("vt", f["r"]))}'
             f'<span>{ic("clock", 14)}{b.hole("du", f["d"])}</span></div><a class="xb-det"{b.href(slug)}>{ic("info", 15)}Voir les détails</a>')
    skel = '<span class="xb-sk"></span><span class="xb-sk s"></span>'
    return b.when("ns", facts) + b.when("sh", skel, False)


def pick_actions(slug, full=False):
    w = " full" if full else ""
    return (f'<button type="button" class="btn gl{w} {b.hole("agC", "")}"{b.on("again")}>{xi("dice", 17)}Piocher un autre</button>'
            f'<a class="btn{w}"{b.href(slug)}>{xi("calplus", 17)}Proposer dans une soirée</a>')


def screen_41():
    modal = (f'<div class="xb-mod w64" role="dialog" aria-label="Piocher un titre"><div class="xb-mhd"><h2 class="disp">Piocher un titre</h2>{close_btn("06-ma-liste")}</div>'
             f'<div class="xb-rp">{pick_slot()}<div class="xb-rpf"><p class="xb-pool">Au hasard parmi les 48 titres de votre liste.</p>'
             f'{pick_facts("04-fiche-film")}<div class="xb-rpa">{pick_actions("02-soiree")}</div></div></div></div>')
    return f'<div class="S desk frame"><div class="xb-under">{parent(b.d_watchlist)}</div>{modal}</div>'


PICK_JS = r"""
const P = __P__;
const i = st.i || 0;
const sh = !!st.sh;
P.forEach((p, j) => {
  o['p' + j] = !sh && i === j;
});
o.sh = sh;
o.ns = !sh;
o.ttl = P[i].t;
o.yr = P[i].y;
o.vt = P[i].r;
o.du = P[i].d;
o.agC = sh ? 'dis' : '';
o.again = () => {
  if (sh) return;
  this.setState({ sh: true });
  clearTimeout(this.tm);
  this.tm = setTimeout(() => this.setState({ sh: false, i: (i + 1) % P.length }), 700);
};
"""

UNMOUNT = "componentWillUnmount() {\nclearTimeout(this.tm);\n}\n"


def pick_js():
    return b.component(PICK_JS.replace("__P__", js([dict(t=FILMS[k]["t"], y=FILMS[k]["y"], r=FILMS[k]["r"], d=FILMS[k]["d"]) for k in POOL])), UNMOUNT)


def screen_42():
    cells = "".join(b.when(f"r{i}", card(k, "17-m-fiche-film", cls=b.hole(f"ro{i}", f"xb-o{i}"), meta=meta3(k)), list_static(k)) for i, k in enumerate(CV))
    badge = b.when("anyF", f'<b class="xb-bd">{b.hole("fc", "")}</b>', False)
    rc = b.when("filt", f'<div class="xb-wrc"><span>{b.hole("rcT", "")}</span><button type="button" class="xb-lk"{b.on("clearAll")}>Tout effacer</button></div>', False)
    toolbar = (f'<div class="xb-wtb">{lfield()}<div class="xb-wtr"><a class="xb-tb"{b.href("46-m-filtres")}>{ic("sliders", 15)}Filtres{badge}</a><span class="xb-vsep"></span>'
               f'<span class="xb-dd" aria-label="Trier par">Pertinence{xi("adown", 14)}</span></div>{rc}</div>')
    res = f'{toolbar}<div class="xb-grid m2 xb-g42">{cells}</div>{list_empties()}'
    noq = b.when("noQuery", f'<div class="xb-empty m">{ic("film", 26)}<b>Entrez un titre pour lancer la recherche.</b><span>Cherchez un film ou parcourez les sélections.</span></div>', False)
    nores = b.when("noRes", f'<div class="xb-empty m">{ic("film", 26)}<b>Aucun film dans cette sélection pour le moment.</b><span>Revenez plus tard, la sélection est mise à jour plusieurs fois par jour.</span></div>', False)
    body = (f'{b.m_top("Explorer", "11-m-explorer", ())}<div class="xb-mpad">{sfield("Titre, réalisateur, acteur", Q35)}'
            f'<h1 class="disp xb-mt3">{b.hole("ttl", f"Résultats pour «&nbsp;{Q35}&nbsp;»")}</h1><p class="xb-st m">Films correspondant à votre recherche</p>'
            f'{noq}{nores}{b.when("hasRes", res)}</div>')
    return f'<div class="S mob frame">{b.sbar()}<div class="xb-mpg">{body}</div>{b.mnav(0)}</div>'


def screen_43():
    tools = (f'<a class="xb-tb"{b.href("46-m-filtres")}>{ic("sliders", 15)}Filtres</a><span class="xb-dd"><em>Trier par</em>Pertinence{ic("chevd", 15)}</span>')
    body = (f'{b.m_top("Explorer", "11-m-explorer", (("search", "42-m-recherche", "Rechercher un film"),))}'
            f'<div class="xb-mpad"><h1 class="disp xb-mt2">{b.hole("ttl", VT[0])}</h1><p class="xb-st m">{b.hole("sub", VS[0])}</p></div>'
            f'<div class="xb-mrow"><div class="xb-tabs m" role="tablist">{tabs_html(False)}</div></div>'
            f'<div class="xb-mrow">{variant_chips()}</div>'
            f'<div class="xb-mtb">{tools}</div><div class="xb-mpad xb-mg">{showcase_grids("17-m-fiche-film", True)}</div>')
    return f'<div class="S mob frame">{b.sbar()}<div class="xb-mpg">{body}</div>{b.mnav(0)}</div>'


WL44 = ["orbite", "phare", "volets", "sable", "brume", "kyoto", "verre", "marseille", "km", "projo"]
WL44_TV = {"sable"}


def m_list():
    cells = ""
    for i, k in enumerate(WL44):
        f = FILMS[k]
        badge = '<span class="badge">Série</span>' if k in WL44_TV else ""
        meta = f'<span>{f["y"]}</span>{b.tmdb(f["r"])}<span>{f["d"]}</span>'
        cells += b.when(f"c{i}", card(k, "17-m-fiche-film", badge=badge, meta=meta))
    if b.DC:
        inp = f'<input class="xb-in" value="{b.hx("q")}" onChange="{b.hx("onQ")}" placeholder="Rechercher dans ma liste…" aria-label="Rechercher dans ma liste">'
    else:
        inp = '<span class="xb-in xb-ph">Rechercher dans ma liste…</span>'
    rc = b.when("filt", f'<div class="xb-wrc"><span>{b.hole("rcT", "")}</span><button type="button" class="xb-lk"{b.on("clearQ")}>Tout effacer</button></div>', False)
    empty = b.when("none", f'<div class="xb-empty m">{xi("search", 24)}<b>Aucun titre ne correspond</b><span>Aucun film de votre liste ne coche ces critères. Élargissez la recherche ou retirez un filtre.</span></div>', False)
    return f'''<div class="S mob frame">{b.sbar()}<div class="xb-mpg">
<div class="xb-lh"><h1 class="disp">Ma liste</h1><span class="xb-c">48 titres à voir</span></div>
<div class="xb-lact"><button type="button" class="ib" aria-label="Importer depuis Letterboxd">{xi("import", 18)}</button><a class="btn gl sm"{b.href("45-m-au-hasard")}>{xi("dice", 17)}Piocher</a><a class="btn sm"{b.href("92-m-ajouter-a-ma-liste")}>{ic("plus", 17)}Ajouter</a></div>
<div class="xb-wtb"><label class="xb-fld s">{xi("search", 16)}{inp}</label>
<div class="xb-wtr"><a class="xb-tb"{b.href("46-m-filtres")}>{ic("sliders", 15)}Filtres</a><span class="xb-vsep"></span><span class="xb-dd" aria-label="Trier par">Ajout{xi("adown", 14)}</span>
<div class="seg xb-vw" role="toolbar" aria-label="Mode d’affichage"><span aria-label="Affichage liste">{ic("list", 15)}</span><span class="on" aria-label="Affichage grille">{ic("grid", 15)}</span></div></div>{rc}</div>
<div class="xb-mpad xb-mg"><div class="xb-grid m2">{cells}</div>{empty}</div></div>
{b.mnav(3)}</div>'''


LIST_JS = r"""
const T = __T__;
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const q = st.q !== undefined ? st.q : '';
const qa = norm(q.trim());
o.q = q;
o.onQ = (e) => this.setState({ q: e.target.value });
o.clearQ = () => this.setState({ q: '' });
let n = 0;
T.forEach((t, i) => {
  const m = !qa || norm(t).indexOf(qa) >= 0;
  o['c' + i] = m;
  if (m) n += 1;
});
o.filt = qa !== '';
o.rcT = n + ' sur 48';
o.none = n === 0;
"""


def list_js():
    return b.component(LIST_JS.replace("__T__", js([FILMS[k]["t"] for k in WL44])))


def screen_44():
    return m_list()


def screen_45():
    sheet = (f'<div class="sheet xb-rsh" role="dialog" aria-label="Piocher un titre"><span class="grab"></span>'
             f'<div class="xb-shh"><h2 class="disp">Piocher un titre</h2>{close_btn("44-m-ma-liste")}</div>'
             f'<p class="xb-pool c">Au hasard parmi les 48 titres de votre liste.</p>{pick_slot(True)}'
             f'<div class="xb-rpf c">{pick_facts("17-m-fiche-film", True)}</div><div class="xb-rsa">{pick_actions("12-m-soiree", True)}</div></div>')
    return f'<div class="S mob frame"><div class="under xb-und">{parent(m_list)}</div><div class="veil"></div>{sheet}</div>'


rnd = random.Random(46)
POOL_G = ["Drame"] * 6 + ["Comédie"] * 5 + ["Thriller"] * 4 + ["Science-fiction"] * 4 + ["Action"] * 3 + ["Aventure"] * 3 + ["Romance"] * 2 + GENRES
WL48 = []
for n in range(48):
    gs = sorted(set(rnd.sample(POOL_G, 2)))
    WL48.append(dict(g=gs, t="tv" if n % 7 == 3 else "movie", d=rnd.choice(["2020"] * 4 + ["2010"] * 3 + ["2000"] * 2 + ["1990", "1980"]), v=round(rnd.uniform(5.2, 8.7), 1)))
LIST_VM = [5, 6, 7, 8]
GS46 = [4, 5]
DC46 = 0


def count46(gs, ts, dc, vm):
    return sum(1 for w in WL48 if (not gs or any(GENRES[g] in w["g"] for g in gs)) and (not ts or w["t"] in ts)
               and (dc < 0 or w["d"] == DECADES[dc]) and (vm < 0 or w["v"] >= LIST_VM[vm]))


def screen_46():
    gen = "".join(chip(f"g{j}", j in GS46, f"tg{j}", lab) for j, lab in enumerate(GENRES))
    typ = "".join(chip(f"ty{j}", False, f"tt{j}", lab) for j, lab in enumerate(["Films", "Séries"]))
    dec = "".join(chip(f"d{j}", j == DC46, f"td{j}", f"{d}s") for j, d in enumerate(DECADES))
    vot = "".join(chip(f"v{j}", False, f"tv{j}", f"{v}+") for j, v in enumerate(LIST_VM))
    dur = ('<div class="xb-sl full"><span class="xb-tr"><i class="xb-rg"></i><b class="xb-k0"></b><b class="xb-k1"></b></span>'
           '<span class="xb-sll"><span>Aucun minimum</span><span>Aucun maximum</span></span></div>')
    n = count46(GS46, [], DC46, -1)
    body = grp("Genre", gen) + grp("Type", typ) + grp("Décennie", dec) + grp("Note minimum", vot) + grp("Durée", dur, "xb-slw")
    sheet = (f'<div class="sheet xb-fsh" role="dialog" aria-label="Filtrer ma liste"><span class="grab"></span>'
             f'<div class="xb-shh"><h2 class="disp">Filtrer ma liste</h2>{close_btn("44-m-ma-liste")}</div>'
             f'<div class="xb-shb">{body}</div>'
             f'<div class="xb-shf"><button type="button" class="xb-lk"{b.on("reset")}>Réinitialiser</button><a class="btn"{b.href("44-m-ma-liste")}>{b.hole("apply", f"Voir {n} titres")}</a></div></div>')
    return f'<div class="S mob frame"><div class="under xb-und">{parent(m_list)}</div><div class="veil"></div>{sheet}</div>'


FILT_JS = r"""
const W = __W__;
const G = __G__;
const D = ['2020', '2010', '2000', '1990', '1980'];
const VM = [5, 6, 7, 8];
const T = ['movie', 'tv'];
const gs = st.gs || __GS0__;
const ts = st.ts || [];
const dc = st.dc !== undefined ? st.dc : __DC0__;
const vm = st.vm !== undefined ? st.vm : -1;
G.forEach((g, j) => {
  const on = gs.indexOf(j) >= 0;
  o['g' + j] = on ? 'on' : '';
  o['tg' + j] = () => this.setState({ gs: on ? gs.filter((x) => x !== j) : gs.concat([j]) });
});
T.forEach((t, j) => {
  const on = ts.indexOf(t) >= 0;
  o['ty' + j] = on ? 'on' : '';
  o['tt' + j] = () => this.setState({ ts: on ? ts.filter((x) => x !== t) : ts.concat([t]) });
});
D.forEach((d, j) => {
  o['d' + j] = dc === j ? 'on' : '';
  o['td' + j] = () => this.setState({ dc: dc === j ? -1 : j });
});
VM.forEach((v, j) => {
  o['v' + j] = vm === j ? 'on' : '';
  o['tv' + j] = () => this.setState({ vm: vm === j ? -1 : j });
});
const n = W.filter((w) => (gs.length === 0 || gs.some((g) => w.g.indexOf(G[g]) >= 0))
  && (ts.length === 0 || ts.indexOf(w.t) >= 0)
  && (dc < 0 || w.d === D[dc])
  && (vm < 0 || w.v >= VM[vm])).length;
o.apply = n === 1 ? 'Voir 1 titre' : 'Voir ' + n + ' titres';
o.reset = () => this.setState({ gs: [], ts: [], dc: -1, vm: -1 });
"""


def filt_js():
    return b.component(FILT_JS.replace("__W__", js(WL48)).replace("__G__", js(GENRES)).replace("__GS0__", js(GS46)).replace("__DC0__", str(DC46)))


CSS = r"""
.S .xb-pg{position:absolute;left:0;right:0;top:68px;bottom:0;padding:22px 40px 0;overflow:hidden;z-index:2}
.S .xb-attr{font-size:12px;color:var(--tx3);font-weight:500}
.S .xb-grp+.xb-grp{margin-top:20px}
.S .xb-lab{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--tx3);margin-bottom:10px}
.S .xb-cr{display:flex;flex-wrap:wrap;gap:6px}
.S .xb-ch{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:999px;font-size:12.5px;font-weight:600;color:var(--tx2);box-shadow:inset 0 0 0 1px var(--line2);white-space:nowrap;flex:none}
.S .xb-ch.on{background:var(--acc-soft);box-shadow:inset 0 0 0 1px var(--acc);color:var(--acc-tx)}
.S .xb-lc{display:inline-flex;align-items:center;height:16px;padding:0 4px;border-radius:4px;box-shadow:inset 0 0 0 1px currentColor;font-size:11px;font-weight:800;letter-spacing:.04em;opacity:.75}
.S .xb-slw{padding:0 2px}
.S .xb-sl{display:block;width:100%;padding-top:9px;text-align:left}
.S .xb-tr{position:relative;display:block;height:4px;margin:0 9px;border-radius:999px;background:var(--s3)}
.S .xb-rg{position:absolute;left:0;right:16.6667%;top:0;bottom:0;border-radius:999px;background:var(--acc)}
.S .xb-k0,.S .xb-k1{position:absolute;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:var(--tx);box-shadow:0 0 0 3px var(--bg),0 2px 8px rgba(0,0,0,.6)}
.S .xb-k0{left:0}
.S .xb-k1{left:83.3333%}
.S .xb-sl.full .xb-rg{right:0}
.S .xb-sl.full .xb-k1{left:100%}
.S .xb-sll{display:flex;justify-content:space-between;margin-top:14px;font-size:12.5px;font-weight:600;color:var(--tx2)}
.S .xb-sf{position:relative;z-index:7}
.S .xb-fld{display:flex;align-items:center;gap:12px;height:52px;padding:0 10px 0 16px;border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line2);color:var(--tx3)}
.S .xb-fld.f{box-shadow:inset 0 0 0 1.5px var(--acc),0 0 0 4px var(--acc-soft)}
.S .xb-fld.s{height:40px;width:300px;padding:0 12px;gap:10px}
.S .xb-in{flex:1;min-width:0;height:100%;display:flex;align-items:center;border:0;outline:0;background:transparent;font:500 15px Inter,sans-serif;color:var(--tx);white-space:nowrap;overflow:hidden}
.S .xb-fld.s .xb-in{font-size:13.5px}
.S .xb-in.xb-ph{color:var(--tx3)}
.S .xb-in .caret{margin:0 2px 0 0}
.S .xb-in .caret:last-child{margin:0 0 0 2px}
.S input.xb-in::placeholder{color:var(--tx3);opacity:1}
.S .xb-clr{width:32px;height:32px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex:none;color:var(--tx2);background:rgba(255,255,255,.07)}
.S .xb-hist{position:absolute;left:0;top:60px;width:440px;padding:6px;border-radius:12px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line2),0 28px 70px -14px rgba(0,0,0,.9)}
.S .xb-hist.m{position:static;width:auto;margin-top:16px;padding:0;background:transparent;box-shadow:none}
.S .xb-hh{display:flex;align-items:center;justify-content:space-between;height:34px;padding:0 10px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--tx3)}
.S .xb-hist.m .xb-hh{padding:0}
.S .xb-hh .xb-lk{letter-spacing:0;text-transform:none}
.S .xb-hr{display:flex;align-items:center;border-radius:9px}
.S .xb-hist:not(.m) .xb-hr:nth-child(2){background:rgba(255,255,255,.05)}
.S .xb-hist.m .xb-hr{border-radius:0;border-bottom:1px solid var(--line)}
.S .xb-hb{flex:1;min-width:0;display:flex;align-items:center;gap:12px;height:40px;padding:0 10px;font-size:14px;color:var(--tx)}
.S .xb-hist.m .xb-hb{height:46px;padding:0 4px}
.S .xb-hb .ic{color:var(--tx3)}
.S .xb-hb span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.S .xb-hx{width:32px;height:32px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:var(--tx3);flex:none}
.S .xb-lk{font-size:13px;font-weight:600;color:var(--tx2);text-decoration:underline;text-decoration-color:var(--line2);text-underline-offset:3px;white-space:nowrap}
.S .xb-catch{position:absolute;inset:0;z-index:6;cursor:default}
.S .xb-hint{font-size:12.5px;color:var(--tx3);margin-top:10px}
.S .xb-afs{display:flex;align-items:center;flex-wrap:wrap;gap:6px}
.S .xb-af{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 9px 0 12px;border-radius:999px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line2);font-size:12.5px;font-weight:600;color:var(--tx);white-space:nowrap}
.S .xb-af .ic{color:var(--tx3)}
.S .xb-sort{margin-left:auto;display:flex;align-items:center;gap:6px}
.S .xb-sort.l{margin-left:0}
.S .xb-sort>span{font-size:12.5px;font-weight:600;color:var(--tx3);margin-right:2px;white-space:nowrap}
.S .xb-grid{display:grid;gap:20px 16px}
.S .xb-pw .badge.seen{display:inline-flex}
.S .xb-cd{position:relative;min-width:0}
.S .xb-pw{position:relative;border-radius:6px;overflow:hidden}
.S .xb-pl{display:block}
.S .xb-t{font-size:13px;font-weight:600;margin-top:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.S .xb-m{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--tx3);margin-top:4px;white-space:nowrap}
.S .xb-cd.hov .xb-pw{box-shadow:0 0 0 2px var(--tx),0 20px 40px -12px rgba(0,0,0,.8)}
.S .xb-kb{position:absolute;right:7px;top:7px;z-index:4;background:rgba(0,0,0,.55)}
.S .xb-kb.on{background:var(--tx);color:var(--bg)}
.S .xb-cd.kopen{z-index:5}
.S .xb-menu{position:absolute;left:calc(100% - 38px);top:40px;width:236px;padding:6px;border-radius:12px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line2),0 28px 70px -14px #000;z-index:6}
.S .xb-mi{display:flex;align-items:center;gap:10px;width:100%;height:38px;padding:0 10px;border-radius:8px;font-size:13px;font-weight:600;color:var(--tx);white-space:nowrap}
.S .xb-mi .ic{color:var(--tx3)}
.S .xb-mi:first-child{background:rgba(255,255,255,.06)}
.S .xb-msep{display:block;height:1px;margin:5px 4px;background:var(--line)}
.S .xb-rk{position:absolute;left:8px;top:2px;z-index:3;font-family:Archivo,sans-serif;font-stretch:70%;font-variation-settings:'wdth' 70;font-weight:800;font-size:46px;line-height:1;color:transparent;-webkit-text-stroke:1.5px rgba(255,255,255,.9)}
.S .xb-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:44px 24px;border-radius:18px;box-shadow:inset 0 0 0 1.5px var(--line);color:var(--tx3);text-align:center}
.S .xb-empty b{font-size:15px;color:var(--tx)}
.S .xb-empty span{font-size:13px}
.S .xb-empty .btn{margin-top:8px}
.S .xb-empty.m{margin-top:12px;padding:32px 18px}
.S .xb-o0{order:0}.S .xb-o1{order:1}.S .xb-o2{order:2}.S .xb-o3{order:3}.S .xb-o4{order:4}.S .xb-o5{order:5}
.S .xb-o6{order:6}.S .xb-o7{order:7}.S .xb-o8{order:8}.S .xb-o9{order:9}.S .xb-o10{order:10}.S .xb-o11{order:11}

.S .xb-subnav{display:flex;align-items:center;gap:14px}
.S .xb-vsep{width:1px;height:22px;background:var(--line2);flex:none}
.S .xb-tabs{display:flex;gap:4px}
.S .xb-tab{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 14px;border-radius:999px;font-size:13px;font-weight:600;color:var(--tx2);white-space:nowrap;flex:none}
.S .xb-tab.on{background:var(--s3);color:var(--tx)}
.S .xb-head{margin-top:24px}
.S .xb-head h1{font-size:60px}
.S .xb-head.s{margin-top:8px}
.S .xb-head.s h1{font-size:52px}
.S .xb-head.s .xb-st{margin-top:8px}
.S .xb-st{font-size:15px;color:var(--tx2);margin-top:10px}
.S .xb-bar2{position:relative;z-index:4;display:flex;align-items:center;gap:16px;margin:22px 0 18px}
.S .xb-chs{flex:1;min-width:0;display:flex;overflow:hidden}
.S .xb-chi{display:flex;gap:6px;min-width:0}
.S .xb-chi.fade{-webkit-mask-image:linear-gradient(90deg,#000 88%,transparent);mask-image:linear-gradient(90deg,#000 88%,transparent);-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
.S .xb-tools{position:relative;display:flex;align-items:center;gap:8px;flex:none}
.S .xb-mfld{display:inline-flex;align-items:center;gap:8px;width:210px;height:36px;padding:0 12px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--line2);font-size:13px;color:var(--tx3);white-space:nowrap}
.S .xb-tb{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--line2);font-size:13px;font-weight:600;color:var(--tx);white-space:nowrap}
.S .xb-tb.on{background:var(--acc-soft);box-shadow:inset 0 0 0 1px var(--acc);color:var(--acc-tx)}
.S .xb-dd{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 12px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--line2);font-size:13px;font-weight:600;color:var(--tx);white-space:nowrap}
.S .xb-dd em{font-style:normal;font-weight:500;color:var(--tx3)}
.S .xb-dd .ic{color:var(--tx3)}
.S .xb-pop.l{left:0;right:auto}
.S .xb-pop{position:absolute;right:0;top:46px;width:580px;padding:16px 18px 18px;border-radius:18px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line2),0 30px 80px -14px #000;z-index:6}
.S .xb-pop .xb-ch{height:28px;padding:0 10px}
.S .xb-poph{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.S .xb-poph b{font-size:14px;font-weight:700}
.S .xb-pop2{display:grid;grid-template-columns:auto 1fr;gap:28px;margin-top:18px}
.S .xb-pop2 .xb-grp+.xb-grp{margin-top:0}
.S .xb-bd{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:var(--tx);color:var(--bg);font-size:12px;font-weight:800}

.S .xb-tbar{display:flex;align-items:center;gap:14px;margin:16px 0 14px}
.S .xb-rc{margin-left:auto;display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;color:var(--tx2);white-space:nowrap}
.S .xb-cgrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}
.S .xb-col{display:flex;flex-direction:column;align-items:center;padding:12px 12px 12px;border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line);text-align:center}
.S .xb-pile{position:relative;display:block;width:100%;height:104px}
.S .xb-p0,.S .xb-f0,.S .xb-f1,.S .xb-f2{position:absolute;left:50%;border-radius:6px;overflow:hidden;box-shadow:0 12px 26px -8px rgba(0,0,0,.85),0 0 0 1px rgba(255,255,255,.1)}
.S .xb-p0{top:6px;width:62px;margin-left:-31px;z-index:3}
.S .xb-p0.none{height:93px;display:flex;align-items:center;justify-content:center;background:var(--s2);color:var(--tx3)}
.S .xb-g1,.S .xb-g2{position:absolute;left:50%;top:10px;width:56px;height:84px;margin-left:-28px;border-radius:6px;background:var(--s3);box-shadow:inset 0 0 0 1px var(--line2)}
.S .xb-g1{transform:translateX(-20px) rotate(-8deg);z-index:1}
.S .xb-g2{transform:translateX(20px) rotate(8deg);z-index:2}
.S .xb-f0,.S .xb-f2{top:12px;width:54px;margin-left:-27px}
.S .xb-f0{transform:translateX(-30px) rotate(-9deg);z-index:1}
.S .xb-f1{top:6px;width:62px;margin-left:-31px;z-index:3}
.S .xb-f2{transform:translateX(30px) rotate(9deg);z-index:2}
.S .xb-cn{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-top:10px;font-size:18px;line-height:.95;min-height:34px}
.S .xb-cc{font-size:12.5px;color:var(--tx3);margin-top:4px}

.S .xb-cbd{position:absolute;left:0;right:0;top:0;height:400px;display:flex;overflow:hidden}
.S .xb-cbd>div{flex:1;filter:blur(30px) saturate(1.2) brightness(.55);transform:scale(1.25)}
.S .xb-cbd::after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,var(--bg) 6%,rgba(10,15,28,.55) 55%,rgba(10,15,28,.3))}
.S .xb-ov38{margin-top:16px}
.S .xb-h38{font-size:72px;margin-top:10px}
.S .xb-lst{display:flex;flex-direction:column}
.S .xb-lr{display:grid;grid-template-columns:34px 62px minmax(0,1fr) auto;gap:18px;align-items:center;padding:10px 0;border-top:1px solid var(--line)}
.S .xb-n{font-size:40px;text-align:center;color:transparent;-webkit-text-stroke:1.2px var(--tx2)}
.S .xb-lp{display:block;border-radius:6px;overflow:hidden}
.S .xb-lt{font-size:17px;font-weight:700;color:var(--tx)}
.S .xb-lm{display:flex;align-items:center;gap:12px;margin-top:6px;font-size:13px;color:var(--tx2)}
.S .xb-li p{font-size:13.5px;line-height:1.5;color:var(--tx2);margin-top:8px;max-width:560px}
.S .xb-la{display:flex;align-items:center;gap:8px}
.S .xb-bk.on{background:var(--acc-soft);box-shadow:inset 0 0 0 1px var(--acc);color:var(--acc-tx)}

.S .xb-under{position:absolute;inset:0;overflow:hidden;filter:blur(5px) brightness(.36);pointer-events:none}
.S .xb-under.lit{filter:blur(4px) brightness(.55)}
.S .xb-tmod{position:absolute;left:50%;top:50%;width:880px;transform:translate(-50%,-50%);border-radius:18px;background:var(--bg);overflow:hidden;box-shadow:inset 0 0 0 1px var(--line),0 40px 120px -20px #000;z-index:3}
.S .xb-tmh{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 16px 26px}
.S .xb-tmh h2{font-size:34px;margin-top:6px}
.S .xb-vid{position:relative;display:block;aspect-ratio:16/9;overflow:hidden;cursor:pointer}
.S .xb-vid .bd .planet{right:150px;top:40px}
.S .xb-shade{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,transparent 40%,rgba(0,0,0,.5))}
.S .xb-big{position:absolute;left:50%;top:50%;width:84px;height:84px;margin:-42px 0 0 -42px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.14);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.4),0 20px 50px -10px rgba(0,0,0,.8);color:var(--tx);transition:opacity .2s}
.S .xb-big .ic{margin-left:4px;fill:currentColor}
.S .xb-vid.on .xb-big{opacity:0}
.S .xb-ctl{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;gap:16px;padding:34px 20px 16px;background:linear-gradient(0deg,rgba(0,0,0,.85),transparent);font-size:12.5px;font-weight:600;color:var(--tx)}
.S .xb-cp{display:inline-flex}
.S .xb-cp .ic{fill:currentColor}
.S .xb-prog{position:relative;flex:1;height:4px;border-radius:999px;background:rgba(255,255,255,.22);overflow:hidden}
.S .xb-fill{position:absolute;left:0;top:0;bottom:0;width:30%;border-radius:999px;background:var(--tx)}
.S .xb-vid.on .xb-fill{animation:xbprog 40s linear forwards}
@keyframes xbprog{from{width:30%}to{width:100%}}

.S .xb-mod{position:absolute;left:50%;top:50%;width:540px;transform:translate(-50%,-50%);padding:26px 28px 24px;border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line),0 40px 100px -20px #000;z-index:3}
.S .xb-mod.w6{width:600px}
.S .xb-mod.w64{width:720px}
.S .xb-mhd{display:flex;align-items:center;gap:10px}
.S .xb-mhd h2{font-size:30px;line-height:.95}
.S .xb-x{margin-left:auto}
.S .xb-ibt{width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:var(--tx3);box-shadow:inset 0 0 0 1px var(--line2);flex:none}
.S .xb-ibt.on{color:var(--tx);background:var(--s3)}
.S .xb-intro{font-size:14px;line-height:1.55;color:var(--tx2);margin-top:12px}
.S .xb-intro .xb-lk{font-size:inherit}
.S .xb-f{margin:18px 0 14px}
.S .xb-steps{display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:12px;background:var(--s2)}
.S .xb-step{display:flex;align-items:center;gap:12px;font-size:13.5px;line-height:1.4;color:var(--tx)}
.S .xb-step b{width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex:none;background:var(--s3);font-size:12px;font-weight:800}
.S .xb-prg{padding:16px;border-radius:12px;background:var(--s2)}
.S .xb-bar3{position:relative;display:block;height:6px;border-radius:999px;background:var(--s3);overflow:hidden}
.S .xb-bar3 i{position:absolute;top:0;bottom:0;width:40%;border-radius:999px;background:var(--tx);animation:xbind 1.2s ease-in-out infinite}
@keyframes xbind{from{left:-40%}to{left:100%}}
.S .xb-prg p{font-size:13px;line-height:1.5;color:var(--tx2);margin-top:12px}
.S .xb-mft{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:22px}
.S .xb-mft .xb-lk{margin-right:auto}
.S .xb-mft .btn{height:44px;padding:0 18px}
.S .xb-bub{position:absolute;left:28px;right:28px;top:72px;padding:16px 18px;border-radius:12px;background:var(--s3);box-shadow:inset 0 0 0 1px var(--line2),0 24px 60px -10px #000;z-index:4;font-size:13px;line-height:1.5}
.S .xb-bub b{display:block;margin-bottom:8px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--tx2)}
.S .xb-bub p+p{margin-top:8px}
.S .xb-dots{display:inline-flex;gap:6px;margin-left:6px}
.S .xb-dots i{width:8px;height:8px;border-radius:50%;background:var(--s3)}
.S .xb-dots i.done{background:var(--tx3)}
.S .xb-dots i.cur{background:var(--tx)}
.S .xb-ask{display:flex;align-items:baseline;gap:10px;margin:14px 0 12px;font-size:13px;color:var(--tx3)}
.S .xb-ask b{font-size:18px;font-weight:700;color:var(--tx)}
.S .xb-chl{display:flex;flex-direction:column;gap:8px}
.S .xb-cho{display:flex;align-items:center;gap:14px;width:100%;min-height:52px;padding:10px 14px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--line2);font-size:13.5px;font-weight:600;color:var(--tx2)}
.S .xb-cho.on{background:var(--acc-soft);box-shadow:inset 0 0 0 1.5px var(--acc)}
.S .xb-cho.dash{box-shadow:none;outline:1.5px dashed var(--line2);outline-offset:-1.5px}
.S .xb-cho.dash.on{outline-color:var(--acc);background:var(--acc-soft)}
.S .xb-rad{position:relative;width:20px;height:20px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--line2);flex:none}
.S .xb-cho.on .xb-rad{box-shadow:inset 0 0 0 1.5px var(--acc)}
.S .xb-cho.on .xb-rad::after{content:'';position:absolute;inset:5px;border-radius:50%;background:var(--acc)}
.S .xb-thm{width:40px;border-radius:6px;overflow:hidden;flex:none}
.S .xb-thm.none{height:60px;display:flex;align-items:center;justify-content:center;background:var(--s3);color:var(--tx3)}
.S .xb-cht b{display:block;font-size:14px;font-weight:700;color:var(--tx)}
.S .xb-cht span{display:block;font-size:12.5px;font-weight:500;color:var(--tx3);margin-top:3px}
.S .xb-rep{display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:12px;background:var(--s2);margin-top:16px}
.S .xb-rrow{display:flex;align-items:flex-start;gap:10px;font-size:13.5px;line-height:1.45;color:var(--tx)}
.S .xb-rrow .ic{flex:none;margin-top:1px;color:var(--tx3)}
.S .xb-rrow.ok .ic{color:var(--tx)}
.S .xb-unm{align-self:flex-start;margin-left:26px}
.S .xb-ul{margin:0 0 0 44px;font-size:13px;line-height:1.6;color:var(--tx2)}

.S .xb-rp{display:grid;grid-template-columns:200px minmax(0,1fr);gap:30px;margin-top:20px}
.S .xb-slot{position:relative;aspect-ratio:2/3;border-radius:6px;overflow:hidden;background:var(--s2);box-shadow:0 30px 70px -14px var(--glow),0 0 0 1px rgba(255,255,255,.12)}
.S .xb-slot.m{width:150px;margin:16px auto 0}
.S .xb-pin{animation:xbland .5s cubic-bezier(.2,.9,.3,1.25)}
@keyframes xbland{from{transform:scale(.86);opacity:.2}to{transform:none;opacity:1}}
.S .xb-flk{position:absolute;inset:0}
.S .xb-flk>div{position:absolute;inset:0;opacity:0;animation:xbfl .6s steps(1) infinite}
.S .xb-flk>div:nth-child(2){animation-delay:.15s}
.S .xb-flk>div:nth-child(3){animation-delay:.3s}
.S .xb-flk>div:nth-child(4){animation-delay:.45s}
@keyframes xbfl{0%{opacity:1}25%{opacity:0}100%{opacity:0}}
.S .xb-rpf{display:flex;flex-direction:column;min-width:0}
.S .xb-rpf.c{align-items:center;text-align:center;margin-top:14px}
.S .xb-pool{font-size:13.5px;color:var(--tx2)}
.S .xb-pool.c{text-align:center;margin-top:6px}
.S .xb-rt{font-size:48px;margin-top:16px}
.S .xb-rpf.c .xb-rt{font-size:38px;margin-top:0}
.S .xb-rm{display:flex;align-items:center;gap:14px;margin-top:12px;font-size:13.5px;color:var(--tx2)}
.S .xb-rm>span{display:inline-flex;align-items:center;gap:5px}
.S .xb-det{display:inline-flex;align-items:center;gap:7px;margin-top:16px;font-size:13.5px;font-weight:600;color:var(--tx)}
.S .xb-det .ic{color:var(--tx3)}
.S .xb-sk{display:block;width:70%;height:40px;margin-top:16px;border-radius:8px;background:linear-gradient(90deg,var(--s2),var(--s3),var(--s2));background-size:200% 100%;animation:xbsk 1s linear infinite}
.S .xb-sk.s{width:45%;height:16px;margin-top:14px}
@keyframes xbsk{from{background-position:100% 0}to{background-position:-100% 0}}
.S .xb-rpa{display:flex;gap:10px;margin-top:auto}
.S .xb-rpa .btn{height:46px;padding:0 18px}

.S .xb-mpg{position:absolute;left:0;right:0;top:46px;bottom:76px;overflow:hidden}
.S .xb-mpad{padding:0 16px}
.S .xb-mt2{font-size:42px;margin-top:10px}
.S .xb-st.m{font-size:13.5px;margin-top:8px}
.S .xb-fbtn{position:relative;width:52px;height:52px;flex:none;display:inline-flex;align-items:center;justify-content:center;border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line2);color:var(--tx)}
.S .xb-fbtn .xb-bd{position:absolute;top:-6px;right:-6px;box-shadow:0 0 0 2px var(--bg)}
.S .xb-mrow{display:flex;gap:6px;padding:0 16px;margin-top:14px;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,#000 86%,transparent);mask-image:linear-gradient(90deg,#000 86%,transparent)}
.S .xb-tabs.m{gap:4px}
.S .xb-mtb{display:flex;align-items:center;gap:8px;padding:0 16px;margin-top:14px}
.S .xb-mg{margin-top:16px;padding-bottom:110px}
.S .xb-lh{padding:10px 16px 0}
.S .xb-lh h1{font-size:46px}
.S .xb-lact{display:flex;align-items:center;gap:8px;padding:14px 16px 0}
.S .xb-wtb{margin:14px 16px 0;padding:12px;border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line)}
.S .xb-wtb .xb-fld.s{width:100%;height:44px;background:var(--bg)}
.S .xb-wtr{display:flex;align-items:center;gap:8px;margin-top:10px}
.S .xb-wtr .xb-vsep{height:28px}
.S .xb-wrc{display:flex;align-items:center;gap:10px;margin-top:10px;font-size:12.5px;font-weight:600;color:var(--tx2)}
.S .xb-grid.m2{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 14px}
.S .xb-grid.m2 .xb-m{gap:8px}
.S .xb-c{display:block;margin-top:6px;font-size:13px;color:var(--tx2);font-weight:600}
.S .xb-mseg{padding:14px 16px 0}
.S .xb-mseg .seg{width:100%}
.S .xb-mseg .seg>*{flex:1}
.S .xb-tgr{display:flex;gap:6px;padding:12px 16px 0}
.S .xb-tgr .chip.tg{height:38px;padding:0 11px;font-size:12.5px;gap:7px}
.S .xb-vw{margin-left:auto;flex:none}
.S .xb-vw>*{height:32px}
.S .mcta .btn{gap:10px}
.S .xb-und{z-index:0;overflow:hidden}
.S .xb-rsh{height:660px;display:flex;flex-direction:column;padding:0 20px}
.S .xb-shh{display:flex;align-items:center;justify-content:space-between;padding:30px 0 0}
.S .xb-shh h2{font-size:32px}
.S .xb-rsa{display:flex;flex-direction:column;gap:10px;margin-top:auto;padding-bottom:28px}
.S .xb-rsa .btn{height:50px}
.S .xb-fsh{height:690px;display:flex;flex-direction:column}
.S .xb-fsh .xb-shh{padding:30px 20px 0}
.S .xb-shb{flex:1;min-height:0;overflow-y:auto;scrollbar-width:none;padding:18px 20px 24px}
.S .xb-shb::-webkit-scrollbar{display:none}
.S .xb-shf{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 20px 26px;border-top:1px solid var(--line)}
.S .xb-shf .btn{height:50px;flex:1;max-width:200px}
.S.mob .xb-ch{position:relative;height:34px}
.S.mob .xb-ch::after,.S.mob .xb-af::after,.S.mob .xb-tab::after{content:'';position:absolute;left:0;right:0;top:-5px;bottom:-5px}
.S.mob .xb-af,.S.mob .xb-tab{position:relative;height:34px}
.S.mob .xb-tb,.S.mob .xb-dd{height:44px}
.S.mob .xb-lk,.S.mob .xb-hx,.S.mob .xb-det{position:relative}
.S.mob .xb-lk::after,.S.mob .xb-det::after{content:'';position:absolute;left:-6px;right:-6px;top:-13px;bottom:-13px}
.S.mob .xb-hx{width:44px;height:44px}
.S.mob .xb-vw>*{height:38px}
.S .xb-grid.g6{grid-template-columns:repeat(6,minmax(0,1fr))}
.S .xb-m .tm{gap:4px}
.S .xb-m .tm b{padding:0 3px;letter-spacing:.02em}
.S .xb-ltb{position:relative;z-index:4;display:flex;align-items:center;gap:12px;margin-top:18px;padding:10px 12px;border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line)}
.S .xb-ltb .xb-fld.s{width:340px;flex:none}
.S .xb-ltb.w{margin-top:20px;z-index:auto}
.S .xb-ltb .xb-vw{margin-left:auto}
.S .xb-afs{display:flex;align-items:center;flex-wrap:wrap;gap:6px}
.S .xb-afs.l{margin-top:12px}
.S .xb-afs.a{margin-top:12px}
.S .xb-tb .xb-bd{margin-left:2px}
.S .xb-g42{margin-top:16px}
.S .xb-mpad>.xb-fld{margin-top:6px}
.S .xb-mpad .xb-wtb{margin:14px 0 0}
.S .xb-mt3{font-size:27px;margin-top:16px;line-height:1}
.S .xb-pg.scr{overflow-y:auto;scrollbar-width:none;padding-bottom:30px}
.S .xb-pg.scr::-webkit-scrollbar{display:none}
.S .xb-wh{display:flex;align-items:flex-end;justify-content:space-between;gap:20px}
.S .xb-wh h1{font-size:48px}
.S .xb-wh .xb-c{margin-top:6px}
.S .xb-wha{display:flex;align-items:center;gap:10px}
.S .xb-ap{position:relative;margin-top:16px;padding:16px 18px 18px;border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line2),0 24px 60px -24px #000}
.S .xb-aph{display:flex;align-items:center;justify-content:space-between}
.S .xb-aph h2{font-size:24px}
.S .xb-sf.a{margin-top:12px}
.S .xb-asr{display:flex;gap:10px;max-width:640px}
.S .xb-asr .xb-fld{flex:1;min-width:0}
.S .xb-tb.a{height:52px;padding:0 16px}
.S .xb-hint{font-size:12.5px;color:var(--tx3);margin-top:10px}
.S .xb-adv{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:20px 28px;margin-top:12px;padding:16px 18px;border-radius:12px;background:var(--s2)}
.S .xb-adv.m{display:block;padding:16px}
.S .xb-adv .xb-ch{height:28px;padding:0 10px}
.S .xb-ares{display:flex;flex-direction:column;margin-top:12px;max-height:300px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--line2) transparent;border-radius:12px;box-shadow:inset 0 0 0 1px var(--line)}
.S .xb-ares.m{max-height:none;overflow:visible}
.S .xb-arow{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:14px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--line)}
.S .xb-arow:last-child{border-bottom:0}
.S .xb-arow.m{grid-template-columns:44px minmax(0,1fr);align-items:start;padding:10px 12px}
.S .xb-ap2{display:block;border-radius:6px;overflow:hidden}
.S .xb-ai{display:flex;flex-direction:column;gap:4px;min-width:0}
.S .xb-ai>b{font-size:14.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.S .xb-ai>span{font-size:12.5px;color:var(--tx3)}
.S .xb-aa{display:flex}
.S .xb-ai .xb-aa{margin-top:6px}
.S .xb-done{opacity:.55;cursor:default}
.S .xb-attr.a{display:block;margin-top:10px}
.S .xb-nores{font-size:13.5px;color:var(--tx2);margin-top:14px}
.S .xb-wg{margin-top:18px}
.S .xb-fbtn.on{background:var(--acc-soft);box-shadow:inset 0 0 0 1px var(--acc);color:var(--acc-tx)}
.S .xb-ash{height:720px;display:flex;flex-direction:column;padding:0 18px}
.S .xb-ash .xb-shh h2{font-size:28px;line-height:.95}
.S .xb-ashb{flex:1;min-height:0;overflow-y:auto;scrollbar-width:none;padding-bottom:28px}
.S .xb-ashb::-webkit-scrollbar{display:none}
.S .xb-ashb .xb-sf.a{margin-top:16px}
.S .xb-ashb .xb-asr{max-width:none}
.S .xb-ashb .xb-in{font-size:14px}
"""

SCREENS = {
    "35": screen_35, "36": screen_36, "37": screen_37, "38": screen_38, "39": screen_39, "40": screen_40,
    "41": screen_41, "42": screen_42, "43": screen_43, "44": screen_44, "45": screen_45, "46": screen_46,
    "91": screen_91, "92": screen_92,
}

LOGIC = {
    "35": list_search_js(Q35, GS35, True),
    "36": showcase_js(True),
    "37": b.component(COLL_JS.replace("__C__", js([dict(n=n, c=c) for n, _, c in COLS]))),
    "38": b.component(TRI_JS.replace("__R__", js([dict(t=FILMS[k]["t"], y=int(FILMS[k]["y"])) for k in TRI]))),
    "39": b.component(PLAY_JS),
    "40": b.component(LB_JS, UNMOUNT),
    "41": pick_js(),
    "42": list_search_js(Q35, [], False),
    "43": showcase_js(False),
    "44": list_js(),
    "45": pick_js(),
    "46": filt_js(),
    "91": add_js(Q35, 0),
    "92": add_js("", -1),
}
