import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import foundation

OUT = pathlib.Path(__file__).parent / "build"
STATIC_DIR = OUT / "screens"

foundation.ICONS.update({
    "x": '<path d="M18 6 6 18M6 6l12 12"/>',
    "pointer": '<path d="M14 4.1 12 6"/><path d="m5.1 8-2.9-.8"/><path d="m6 12-1.9 2"/><path d="M7.2 2.2 8 5.1"/><path d="M9.04 9.69a.5.5 0 0 1 .65-.65l11 4.5a.5.5 0 0 1-.07.95l-4.35 1.04a1 1 0 0 0-.74.74l-1.04 4.35a.5.5 0 0 1-.95.07z"/>',
    "chevd": '<path d="m6 9 6 6 6-6"/>',
    "sliders": '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
    "users": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    "film": '<rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"/>',
    "trophy": '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    "flame": '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    "pencil": '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    "link": '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    "tv": '<rect x="2" y="7" width="20" height="15" rx="2"/><path d="m17 2-5 5-5-5"/>',
    "eye": '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    "trash": '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    "alert": '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    "dice": '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.1"/><circle cx="15.5" cy="8.5" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="8.5" cy="15.5" r="1.1"/><circle cx="15.5" cy="15.5" r="1.1"/>',
    "kebab": '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
    "import": '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
})
ic = foundation.ic
av = foundation.av
stack = foundation.stack
poster = foundation.poster
FILMS = foundation.FILMS
PEOPLE = foundation.PEOPLE
PROGRAM = foundation.PROGRAM
sbar = foundation.sbar
score_txt = foundation.score_txt


def star(size=16, filled=True):
    fill = "currentColor" if filled else "none"
    return (f'<svg class="ic" width="{size}" height="{size}" viewBox="0 0 24 24" fill="{fill}" stroke="currentColor" stroke-width="1.6" '
            f'stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>')


def on5(r):
    s = str(r)
    if "{{" in s:
        return s
    t = f"{float(s.replace(',', '.')) / 2:.1f}"
    return (t[:-2] if t.endswith(".0") else t).replace(".", ",")


def rating(r, size=12):
    return f'<span class="tm">{on5(r)}{star(size)}</span>'


def meta(fid):
    f = FILMS[fid]
    return f'<span>{f["y"]}</span><span>{f["d"]}</span>{rating(f["r"])}'


def poster(fid, cls=""):
    return foundation.poster(fid, cls).replace('<div class="poster', f'<div role="img" aria-label="Affiche du film {FILMS[fid]["t"]}" class="poster', 1)


DC = False
EMBED = False


def hx(name):
    return "{{" + name + "}}"


def hole(name, static):
    return hx(name) if DC else str(static)


def on(name):
    return f' onClick="{hx(name)}"' if DC else ""


def when(name, inner, static=True):
    if DC:
        hint = "true" if static else "false"
        return f'<sc-if value="{hx(name)}" hint-placeholder-val="{{{{ {hint} }}}}">{inner}</sc-if>'
    return inner if static else ""


def href(slug):
    return "" if (EMBED or not slug) else f' href="{slug}.html"'


def embedded(fn):
    global EMBED
    EMBED = True
    try:
        return fn()
    finally:
        EMBED = False


def mnav(active):
    items = [("Explorer", "compass", "11-m-explorer"), ("Soirées", "cal", "16-m-mes-soirees"), ("Créer", "plus", "19-m-creer"),
             ("Ma liste", "bookmark", "44-m-ma-liste"), ("Profil", "user", "18-m-profil")]
    out = '<nav class="mnav">'
    for i, (lab, icon, t) in enumerate(items):
        out += f'<a class="{"on" if i == active else ""}"{href(t)}>{ic(icon, 20)}<span>{lab}</span></a>'
    return out + "</nav>"


def hdr(active, solid=False):
    items = [("Explorer", "01-explorer"), ("Mes soirées", "05-mes-soirees"), ("Nouvelle soirée", "08-creer"), ("Ma liste", "06-ma-liste")]
    nav = "".join(f'<a class="{"on" if i == active else ""}"{href(t)}>{x}</a>' for i, (x, t) in enumerate(items))
    return f'''<header class="hdr{" solid" if solid else ""}"><a class="logo"{href("01-explorer")}>Movie Picker<i></i></a><nav>{nav}</nav>
<div class="hr"><a class="bell" aria-label="Notifications"{href("62-notifications")}>{ic("bell", 20)}<b></b></a><a class="me" aria-label="Menu du compte"{href("63-menu-compte")}>{av("adrien", 32)}</a></div></header>'''


GUEST_NAV = [("Comment ça marche", "09-accueil-public"), ("Mes soirées", "21-connexion"), ("Nouvelle soirée", "21-connexion"), ("Ma liste", "21-connexion")]


def guest_hdr(solid=True, actions=True):
    nav = "".join(f'<a{href(t)}>{x}</a>' for x, t in GUEST_NAV)
    acts = (f'<div class="hr"><a class="btn gl sm"{href("21-connexion")}>Se connecter</a><a class="btn sm"{href("22-inscription")}>Créer un compte</a></div>'
            if actions else "")
    return f'<header class="hdr{" solid" if solid else ""}"><a class="logo"{href("09-accueil-public")}>Movie Picker<i></i></a><nav>{nav}</nav>{acts}</header>'


def crowd(keys, size, shown=4):
    extra = len(keys) - shown
    more = f'<span class="avmore">+{extra}</span>' if extra > 0 else ""
    return stack(keys[:shown], size) + more


def event_actions(pick='', propose_on=False):
    pick = pick or f'<a class="ib" aria-label="Choisir moi-même"{href("88-actions-tirage")}>{ic("pointer", 18)}</a>'
    return (pick + f'<a class="btn gl{" on" if propose_on else ""}"{href("02-soiree" if propose_on else "47-proposer-un-film")}>{ic("plus", 18)}Proposer</a>'
            f'<a class="btn"{href("03-roue")}>{ic("wheel", 18)}Lancer la roue</a>')


def event_icons():
    return (f'<div class="ibs"><a class="ib" aria-label="Partager"{href("48-partager-soiree")}>{ic("share", 17)}</a>'
            f'<span class="ib" aria-label="Ajouter au calendrier">{ic("cal", 17)}</span>'
            f'<a class="ib" aria-label="Paramètres de la soirée"{href("49-reglages-soiree")}>{ic("gear", 17)}</a></div>')


def event_bar(actions):
    return f'<div class="evtop"><a class="back"{href("05-mes-soirees")}>{ic("left", 16)}Mes soirées</a><div class="evbar">{event_icons()}<span class="evsep"></span>{actions}</div></div>'

def vote(up, down, mine, idx=None):
    if DC and idx is not None:
        return (f'<button type="button" class="vb {hx(f"uc{idx}")}" aria-label="Voter pour"{on(f"vu{idx}")}>{ic("up", 13)}{hx(f"u{idx}")}</button>'
                f'<button type="button" class="vb {hx(f"dc{idx}")}" aria-label="Voter contre"{on(f"vd{idx}")}>{ic("down", 13)}{hx(f"d{idx}")}</button>')
    return (f'<button type="button" class="vb {"on" if mine == "up" else ""}" aria-label="Voter pour">{ic("up", 13)}{up}</button>'
            f'<button type="button" class="vb {"on" if mine == "down" else ""}" aria-label="Voter contre">{ic("down", 13)}{down}</button>')


def score(sc, idx, cls):
    return f'<span class="{cls} {hole(f"scc{idx}", foundation.score_cls(sc))}">{hole(f"sc{idx}", score_txt(sc))}</span>'


def save_btn(cls, size=16, label=True):
    off = ic("bookmark", size) + ("Ma liste" if label else "")
    aria = "" if label else ' aria-label="Ma liste"'
    if not DC:
        return f'<button type="button" class="{cls}"{aria}>{off}</button>'
    onv = ic("check", size) + ("Dans ma liste" if label else "")
    return f'<button type="button" class="{cls} {hx("svCls")}"{aria}{on("toggleSave")}>' + when("saved", onv, False) + when("notSaved", off) + "</button>"


def seg2(a, b):
    return (f'<div class="seg big"><button type="button" class="{hole("tA", "on")}"{on("showA")}>{a}</button>'
            f'<button type="button" class="{hole("tB", "")}"{on("showB")}>{b}</button></div>')


WHEEL = [("projo", "Le Dernier Projectionniste", "#2563eb", 28), ("orbite", "Orbite basse", "#c2410c", 24), ("kyoto", "Minuit à Kyoto", "#0f766e", 18),
         ("marseille", "Les Nuits de Marseille", "#be185d", 14), ("km", "Kilomètre zéro", "#b45309", 9), ("brume", "Brume", "#0369a1", 7)]
WHEEL_REST = 216
WHEEL_END = WHEEL_REST + 5 * 360
POINTER = ('<svg class="ptr" viewBox="0 0 26 30" aria-hidden="true"><path d="M3 3h20L13 27z" fill="#ef4444" stroke="#fff" '
           'stroke-width="2.5" stroke-linejoin="round"/></svg>')


def wheel_slices():
    out, acc = [], 0
    for fid, lab, col, pct in WHEEL:
        out.append((fid, lab, col, acc * 3.6, (acc + pct) * 3.6))
        acc += pct
    return out


def wheel_face(rot, final_rot):
    sl = wheel_slices()
    stops = ",".join(f"{c} {a0:g}deg {a1:g}deg" for _, _, c, a0, a1 in sl)
    lines = ",".join(f"rgba(255,255,255,.18) {a0:g}deg {a0 + .6:g}deg,transparent {a0 + .6:g}deg {a1:g}deg" for *_, a0, a1 in sl)
    labels = ""
    for _, lab, _, a0, a1 in sl:
        a = (a0 + a1) / 2 - 90
        flip = " flip" if 90 < (a + final_rot) % 360 < 270 else ""
        labels += f'<span class="{flip}" style="transform:rotate({a:g}deg)"><b>{lab}</b></span>'
    return f'style="transform:rotate({rot}deg);background:conic-gradient({lines}),conic-gradient({stops})"><div class="wl">{labels}</div>'


def wheel(size, rot=0, spin=False):
    sz = "big" if size >= 400 else "sml"
    cls = hx("whCls") if DC else f'wh {sz}{" spin" if spin else ""}'
    go = f" go{' m' if sz == 'sml' else ''}" if DC else ""
    face = wheel_face(rot, WHEEL_END if DC else rot)
    return f'<div class="{cls}" style="width:{size}px;height:{size}px"><div class="wb{go}" {face}</div><span class="hub"></span>{POINTER}</div>'


def component(body="", methods=""):
    return ("class Component extends DCLogic {\n" + methods + "renderVals() {\nconst st = this.state || {};\nconst o = {};\n"
            + body.strip() + "\nreturn o;\n}\n}")


def hero_bd(cls="bd"):
    return f'<div class="{cls}"><span class="stars"></span><span class="planet"></span></div>'


def d_explorer(light=False):
    rail = ""
    for k in ["phare", "volets", "sable", "brume", "kyoto", "verre", "marseille", "km"]:
        if k == "brume":
            rail += (f'<div class="pc hov">{poster(k)}<div class="ovl"><b>{FILMS[k]["t"]}</b><div class="om">{meta(k)}</div><div class="oa">'
                     f'<a class="mini" aria-label="Proposer à une soirée"{href("02-soiree")}>{ic("plus", 14)}</a><span class="mini">{ic("bookmark", 14)}</span>'
                     f'<a class="mini" aria-label="Voir la fiche"{href("04-fiche-film")}>{ic("info", 14)}</a></div></div></div>')
        else:
            rail += f'<a class="pc"{href("04-fiche-film")}>{poster(k)}</a>'
    cls = "S light desk frame scroll" if light else "S desk frame scroll"
    trend = "".join(f'<a class="pc"{href("04-fiche-film")}>{poster(k)}</a>' for k in ["orbite", "km", "verre", "projo", "sable", "kyoto", "phare", "brume"])
    sagas = "".join(f'<a class="pc"{href("38-une-collection")}>{poster(k)}</a>' for k in ["kyoto", "orbite", "phare", "sable", "verre", "volets", "km", "projo"])
    hero_cls = "hero boxed" if light else "hero"
    return f'''<div class="{cls}">{hdr(0, solid=light)}
<div class="{hero_cls}">{hero_bd()}
<div class="hc"><div class="ov">En tête du vote, soirée chez Léa</div><h1 class="disp">Orbite basse</h1>
<div class="hm">{rating("7,8")}<span>2024</span><span>2h12</span><span>Science-fiction</span></div>
<p class="hs">Une astronaute coincée en orbite capte chaque nuit la voix d’un enfant qui n’existe pas.</p>
<div class="hb"><a class="btn"{href("02-soiree")}>{ic("plus", 16)}Proposer à une soirée</a>{save_btn("btn gl")}</div></div>
<a class="cd"{href("02-soiree")}><div><div class="cdl">Soirée chez Léa</div><div class="cds">Commence dans</div></div><div class="v">4 J 06 H</div>{stack(["lea", "nico", "ines"], 24)}</a>
</div>
<div class="srow"><div class="slab">Chercher un film</div><a class="sfield"{href("35-recherche")}>{ic("search", 18)}<span>Titre, réalisateur, acteur</span></a></div>
<div class="row"><div class="rh"><h2 class="disp">Dans votre liste</h2><a class="more"{href("06-ma-liste")}>Tout voir {ic("right", 15)}</a></div><div class="rail">{rail}</div></div>
<div class="row"><div class="rh"><h2 class="disp">Tendances de la semaine</h2><span class="rsub">Les films dont tout le monde parle</span><a class="more"{href("36-tendances")}>Tout voir {ic("right", 15)}</a></div><div class="rail">{trend}</div></div>
<div class="row rlast"><div class="rh"><h2 class="disp">Sagas et collections</h2><span class="rsub">Toute une franchise en une liste</span><a class="more"{href("37-collections")}>Tout voir {ic("right", 15)}</a></div><div class="rail">{sagas}</div></div>
</div>'''


EV_PROV = {"projo": ["Arte"], "orbite": ["Netflix", "Canal+", "Prime Video"], "kyoto": ["Prime Video"], "marseille": ["Canal+", "Netflix"], "km": [], "brume": ["Disney+"]}
EV_SEEN = {"kyoto": "Vu par Sam", "brume": "Vu par Léa et Inès"}


def view_toggle():
    return (f'<div class="seg"><button type="button" class="{hole("vg", "on")}" aria-label="Affichage grille"{on("sv0")}>{ic("grid", 15)}</button>'
            f'<button type="button" class="{hole("vl", "")}" aria-label="Affichage liste"{on("sv1")}>{ic("list", 15)}</button></div>')


def ev_grid():
    cards = ""
    for i, (fid, by, up, down, sc, mine) in enumerate(PROGRAM, 1):
        cards += (f'<div class="gc {"lead" if i == 1 else ""}"><a class="pw"{href("04-fiche-film")}>{poster(fid)}<span class="rk">{i}</span></a>'
                  f'<div class="gv">{av(by, 20)}{vote(up, down, mine, i - 1)}{score(sc, i - 1, "sc")}</div></div>')
    return f'<div class="gr">{cards}</div>'


def ev_list():
    head = ('<div class="elh"><span></span><span class="elsort">Ajout' + ic("chevd", 13) + '</span><span class="end">Note</span><span class="end">Durée</span>'
            '<span class="end">Sortie</span><span>Dispo</span><span class="mid">Déjà vu</span><span class="mid">Votes</span><span class="end">Score</span></div>')
    rows = ""
    for i, (fid, by, up, down, sc, mine) in enumerate(PROGRAM, 1):
        f = FILMS[fid]
        prov = EV_PROV[fid]
        chips = "".join(f'<span class="pv">{x}</span>' for x in prov[:2]) + (f'<span class="wplus">+{len(prov) - 2}</span>' if len(prov) > 2 else "")
        chips = chips or '<span class="elnone">Non disponible</span>'
        seen = EV_SEEN.get(fid, "")
        seen_cell = (f'<button type="button" class="elseen{" on" if fid == "kyoto" else ""}" aria-label="Déjà vu" aria-pressed="{"true" if fid == "kyoto" else "false"}">{ic("eye", 16)}</button>'
                     + (f'<small>{seen}</small>' if seen else ""))
        rows += (f'<div class="elr{" lead" if i == 1 else ""}"><span class="elrk">{i}</span>'
                 f'<div class="eltt"><a class="elpo"{href("04-fiche-film")}>{poster(fid)}</a><div><a class="elt"{href("04-fiche-film")}>{f["t"]}</a>'
                 f'<span class="elby">{av(by, 16)}{PEOPLE[by][0]}</span></div></div>'
                 f'<span class="end">{rating(f["r"])}</span><span class="end">{f["d"]}</span><span class="end">{f["y"]}</span>'
                 f'<span class="wprov">{chips}</span><div class="elsc">{seen_cell}</div>'
                 f'<div class="elv">{vote(up, down, mine, i - 1)}</div><span class="end">{score(sc, i - 1, "sc")}</span></div>')
    return f'<div class="elist">{head}{rows}</div>'


def d_event(view="grid"):
    grid = view == "grid"
    return f'''<div class="S desk frame scroll">{hdr(1)}
<div class="evh"><div class="bd2"></div>
<div class="evc">{event_bar(event_actions())}
<div class="ov" style="margin-top:22px">Vendredi 14 novembre, 21 h</div>
<h1 class="disp">Soirée chez Léa</h1>
<div class="em"><a class="ppl"{href("87-participants")}>{crowd(["lea", "nico", "ines", "sam", "hugo", "adrien"], 26)}<span>6 participants</span></a><span class="chip">Nuits blanches</span><span>6 films</span><span>3 votants sur 6</span><span class="cdn">{ic("clock", 15)}Commence dans 4 j 06 h</span></div></div></div>
<div class="sec"><div class="sh"><h2 class="disp">Les films en lice</h2>{view_toggle()}</div>
{when("isGrid", ev_grid(), grid)}{when("isList", ev_list(), not grid)}</div>
</div>'''


def d_wheel():
    rows = "".join(
        f'<div class="chn"><span class="t"><i class="sw" style="background:{c}"></i><span class="tn">{FILMS[k]["t"]}</span></span><span class="bar"><i style="width:{p * 3}%;background:{c}"></i></span><span class="p">{p} %</span></div>'
        for k, _, c, p in WHEEL
    )
    res = when("done", f'<a class="btn wres"{href("51-film-tire")}>{ic("info", 16)}Voir le film tiré</a>', False)
    return f'''<div class="S desk frame">{hdr(1)}<div class="spot"></div>
<div class="wpage"><div class="evtop"><a class="back"{href("02-soiree")}>{ic("left", 16)}Soirée chez Léa</a><span class="live"><i></i>En direct</span></div>
<div class="wgrid"><div class="wtxt"><div class="ov">{hole("ov", "Léa a lancé la roue")}</div><h1 class="disp">{hole("ttl", "Ça tourne")}</h1>
<p>Six films en lice. Plus un film a de votes, plus sa part de roue est grande.</p>
<div class="chances">{rows}</div>
<div class="watch">{stack(["lea", "nico", "ines", "sam"], 26)}<span>Léa, Nico, Inès et Sam regardent</span></div>{res}</div>
<div class="wcol">{wheel(470, 17, True)}</div></div></div>
</div>'''


def d_movie():
    f = FILMS["orbite"]
    cast = [("Maya Roux", "#3A4A7A"), ("Tom Ellery", "#5A3A6E"), ("Inge Halvorsen", "#2F5D57"), ("Karim Bessa", "#6B4A2A"), ("Ana Lio", "#4A2F3A")]
    cast_html = "".join(f'<div class="cm"><span class="av" style="width:44px;height:44px;background:{c};font-size:15px">{n.split()[0][0]}{n.split()[1][0]}</span><b>{n}</b><span>{r}</span></div>'
                        for (n, c), r in zip(cast, ["Elin", "Le pilote", "La voix", "Ingénieur", "Dr Sato"]))
    return f'''<div class="S desk frame"><div class="dim">{hero_bd()}</div>
<div class="modal"><div class="mband">{hero_bd()}<a class="ib close" aria-label="Fermer"{href("01-explorer")}>{ic("x", 18)}</a></div>
<div class="mbody"><div class="mposter">{poster("orbite")}</div>
<div class="minfo"><div class="ov">Science-fiction, 2024</div><h1 class="disp">{f["t"]}</h1>
<div class="hm">{rating("7,8")}<span>2h12</span><span>Réalisé par Clara Venn</span><span class="chip">Tous publics</span></div>
<p class="syn">Une astronaute coincée en orbite capte chaque nuit la voix d’un enfant qui n’existe pas. Au sol, personne ne la croit, et le carburant baisse.</p>
<div class="mact"><a class="btn"{href("02-soiree")}>{ic("plus", 16)}Proposer à une soirée</a>{save_btn("btn gl")}<a class="btn gl"{href("39-bande-annonce")}>{ic("play", 15)}Bande-annonce</a></div>
<div class="mlab">Où le voir</div><div class="prov"><span class="pv">Netflix</span><span class="pv">Canal+</span><span class="pv">Prime Video <em>location</em></span></div>
<div class="mlab">Distribution</div><div class="cast">{cast_html}</div></div></div></div>
</div>'''


def event_card(day, dnum, mon, title, theme, people, n_films, status, status_cls, posters, tint):
    pst = "".join(f'<div class="fan f{i}">{poster(p)}</div>' for i, p in enumerate(posters))
    return f'''<a class="ecard"{href("02-soiree")} style="--tint:{tint}"><div class="edate"><span>{day}</span><b class="disp">{dnum}</b><span>{mon}</span></div>
<div class="emid"><div class="disp et">{title}</div><div class="eth">{theme}</div><div class="eppl">{stack(people, 22)}<span>{len(people)} participants, {n_films} films</span></div><div class="est {status_cls}">{status}</div></div>
<div class="efan">{pst}</div></a>'''


HIST = [("8 nov.", "Soirée pizza", "volets", "8,4", ["lea", "nico", "sam"]), ("31 oct.", "Halloween chez Sam", "brume", "7,2", ["sam", "hugo", "ines", "adrien"]),
        ("24 oct.", "Ciné-club du mercredi", "kyoto", "9,2", ["adrien", "sam", "hugo"])]
HIST_MORE = [("17 oct.", "Soirée chez Inès", "marseille", "7,8", ["ines", "lea", "nico"]), ("10 oct.", "Ciné-club du mercredi", "phare", "8,6", ["adrien", "sam", "hugo"]),
             ("3 oct.", "Dimanche pluvieux", "sable", "6,4", ["adrien", "lea"])]


def d_events():
    cards = event_card("Ven.", "14", "Nov.", "Soirée chez Léa", "Nuits blanches", ["lea", "nico", "ines", "sam", "hugo", "adrien"], 6,
                       f'<i class="dot"></i>Vote ouvert, 3 votants sur 6', "vote", ["projo", "orbite", "kyoto"], "rgba(56,189,248,.35)")
    cards += event_card("Mer.", "19", "Nov.", "Ciné-club du mercredi", "Années 80", ["adrien", "sam", "hugo"], 3,
                        f'{ic("clock", 14)}Commence dans 9 j', "soon", ["verre", "phare", "sable"], "rgba(59,130,246,.35)")
    cards += event_card("Sam.", "29", "Nov.", "Marathon du samedi", "Trilogies", ["adrien", "lea"], 0,
                        f'{ic("plus", 14)}Personne n’a encore proposé', "empty", [], "rgba(255,255,255,.08)")
    rows = "".join(f'''<a class="hrow"{href("53-recap")}><span class="hd">{d}</span><span class="ht">{t}</span><span class="hw"><span class="hp">{poster(w)}</span>{FILMS[w]["t"]}</span><span class="hr2">{on5(r)}{star(13)}</span>{stack(ppl, 22)}</a>'''
                   for d, t, w, r, ppl in HIST + HIST_MORE)
    return f'''<div class="S desk frame scroll">{hdr(1, solid=True)}
<div class="page evp"><h1 class="vh">Mes soirées</h1>
<div class="sh"><h2 class="disp">À venir<em>3</em></h2></div>
<div class="egrid">{cards}</div>
<div class="sh hsh"><h2 class="disp">Historique<em>36</em></h2><a class="btn gl sm"{href("55-mes-soirees-suite")}>{ic("search", 15)}Rechercher et filtrer</a></div>
<div class="hist">{rows}</div>
<a class="btn gl sm hall"{href("55-mes-soirees-suite")}>Voir les 30 autres soirées</a></div></div>'''


WL_ITEMS = ["orbite", "phare", "volets", "sable", "brume", "kyoto", "verre", "marseille", "km", "projo", "orbite", "phare", "sable", "volets"]
WL_SERIE = {3}
WL_MENU = 4
WL_PROV = [["Netflix", "Canal+", "Prime Video"], ["Disney+"], ["Canal+", "Netflix"], ["Prime Video"], ["Netflix", "Max", "Canal+", "Arte"], ["Arte"], ["Canal+"]]
WL_SORTS = ["Ajout", "Titre", "Note", "Durée", "Sortie", "Dispo"]
WL_GENRES = ["Action", "Comédie", "Thriller", "Horreur", "Science-fiction", "Drame", "Aventure", "Fantastique", "Romance", "Crime", "Animation",
             "Familial", "Documentaire", "Mystère", "Histoire", "Musique", "Guerre", "Western"]


def d_watchlist():
    cells = ""
    rows = ""
    for i, k in enumerate(WL_ITEMS):
        f = FILMS[k]
        badge = '<span class="badge">Série</span>' if i in WL_SERIE else ""
        menu = ""
        hov = ""
        if i == WL_MENU:
            hov = " hov"
            menu = (f'<button type="button" class="wkeb" aria-label="Plus d’actions"{on("tMenu")}>{ic("kebab", 16)}</button>'
                    + when("menu", f'<div class="wmenu"><a{href("04-fiche-film")}>{ic("info", 15)}Voir les détails</a><button type="button">{ic("trash", 15)}Retirer de ma liste</button>'
                                   f'<a{href("02-soiree")}>{ic("plus", 15)}Proposer dans une soirée</a><i class="sep"></i><a>{ic("link", 15)}Ouvrir sur Letterboxd</a></div>'))
        cell = (f'<div class="wlc{hov}"><a class="pw"{href("04-fiche-film")}>{poster(k)}{badge}</a>{menu}'
                f'<div class="m"><span>{f["y"]}</span>{rating(f["r"])}<span>{f["d"]}</span></div></div>')
        cells += when(f"c{i}", cell)
        prov = WL_PROV[i % len(WL_PROV)]
        chips = "".join(f'<span class="pv">{x}</span>' for x in prov[:2]) + (f'<span class="wplus">+{len(prov) - 2}</span>' if len(prov) > 2 else "")
        rows += when(f"c{i}", f'<a class="wlr"{href("04-fiche-film")}><span class="wlt"><span class="hp">{poster(k)}</span><span><b>{f["t"]}</b><small>{"Série" if i in WL_SERIE else "Film"}</small></span></span>{rating(f["r"])}<span>{f["d"]}</span><span>{f["y"]}</span><span class="wprov">{chips}</span></a>')
    sorts = "".join(f'<button type="button" class="wso {hole(f"so{j}", "on" if j == 0 else "")}"{on(f"ss{j}")}>{lab}'
                    + when(f"soa{j}", f'<span class="sarr {hole("sdir", "")}">{ic("chevd", 13)}</span>', j == 0) + '</button>' for j, lab in enumerate(WL_SORTS))
    types = "".join(f'<button type="button" class="chip {hole(f"ty{j}", "")}"{on(f"sty{j}")}>{lab}</button>' for j, lab in [(1, "Films"), (2, "Séries")])
    genres = "".join(f'<span class="chip">{x}</span>' for x in WL_GENRES)
    decades = "".join(f'<span class="chip">{x}</span>' for x in ["2020s", "2010s", "2000s", "1990s", "1980s"])
    notes = "".join(f'<span class="chip">{n}{star(12)}</span>' for n in ["2,5", "3", "3,5", "4"])
    panel = when("fo", f'''<div class="wfp"><div class="wfr"><span class="wfl">Genre</span><div class="wfc">{genres}</div></div>
<div class="wfr"><span class="wfl">Type</span><div class="wfc">{types}</div></div>
<div class="wfr"><span class="wfl">Décennie</span><div class="wfc">{decades}</div></div>
<div class="wfr"><span class="wfl">Note minimum</span><div class="wfc">{notes}</div></div>
<div class="wfr"><span class="wfl">Durée</span><div class="wdur"><div class="wtrack"><i></i><b></b><b></b></div><div class="wdl"><span>Aucun minimum</span><span>Aucun maximum</span></div></div></div>
<button type="button" class="wreset"{on("clear")}>Réinitialiser les filtres</button></div>''', False)
    count = when("filtering", f'<span class="wcnt">{hole("cnt", "14")} sur 48</span><button type="button" class="wclr"{on("clear")}>Tout effacer</button>', False)
    nf = when("hasNf", '<em class="wnf">1</em>', False)
    search = (f'<label class="wsrch">{ic("search", 15)}<input value="{hx("q")}" onChange="{hx("onQ")}" placeholder="Rechercher dans ma liste…" aria-label="Rechercher dans ma liste"></label>'
              if DC else f'<label class="wsrch">{ic("search", 15)}<span>Rechercher dans ma liste…</span></label>')
    return f'''<div class="S desk frame scroll">{hdr(3, solid=True)}
<div class="page"><div class="ph"><h1 class="vh">Ma liste</h1><span class="cnt">48 titres à voir</span><div class="phx"><a class="btn gh sm"{href("40-import-letterboxd")}>{ic("import", 15)}Importer depuis Letterboxd</a><a class="btn gl sm"{href("41-au-hasard")}>{ic("dice", 15)}Piocher un film</a><a class="btn sm"{href("91-ajouter-a-ma-liste")}>{ic("plus", 15)}Ajouter un film</a></div></div>
<div class="wtb">{search}<button type="button" class="wfb {hole("foCls", "")}"{on("tFo")}>{ic("sliders", 15)}Filtres{nf}</button>{when("isGrid", f'<i class="wsep"></i><span class="wtl">Trier par</span><div class="wsorts">{sorts}</div>')}
<div class="wend">{count}<div class="seg"><button type="button" class="{hole("vl", "")}" aria-label="Affichage liste"{on("sv1")}>{ic("list", 15)}</button><button type="button" class="{hole("vg", "on")}" aria-label="Affichage grille"{on("sv0")}>{ic("grid", 15)}</button></div></div></div>
{panel}{when("isGrid", f'<div class="wgr">{cells}</div>')}{when("isList", f'<div class="wlist"><div class="wlh"><span>Titre</span><span>Note</span><span>Durée</span><span>Sortie</span><span>Dispo</span></div>{rows}</div>', False)}</div></div>'''


def heat():
    import random
    rnd = random.Random(7)
    cells = "".join(f'<i class="h{rnd.choice([0, 0, 1, 1, 1, 2, 3])}"></i>' for _ in range(26))
    legend = '<span class="lg">Moins<i class="h0"></i><i class="h1"></i><i class="h2"></i><i class="h3"></i>Plus</span>'
    return f'<div class="heat">{cells}</div><div class="hleg"><span>Une case par semaine</span>{legend}</div>'


def d_profile():
    favs = "".join(f'<a class="fv"{href("04-fiche-film")}>{poster(k)}</a>' for k in ["phare", "kyoto", "orbite"])
    seen = "".join(f'<a class="sn"{href("04-fiche-film")}><div class="pw">{poster(k)}<span class="rt">{on5(r)}{star(11)}</span></div></a>' for k, r in [("volets", "8"), ("brume", "6"), ("kyoto", "9"), ("sable", "7"), ("marseille", "8"), ("verre", "5")])
    return f'''<div class="S desk frame">{hdr(-1, solid=False)}
<div class="pban"><div class="bd3"></div></div>
<div class="pmain"><div class="pid"><span class="pav">{av("adrien", 112)}</span><div><div class="ov">@adrien, membre depuis juin 2026</div><h1 class="disp">Adrien</h1><p>Orga des soirées ciné du vendredi. Faible pour la SF lente et les films de phare.</p><div class="pfl"><a{href("65-abonnes")}><b>12</b> abonnés</a><a{href("65-abonnes")}><b>9</b> abonnements</a></div></div>
<div class="pact"><a class="btn gl sm"{href("25-reglages-profil")}>{ic("pencil", 15)}Modifier</a><a class="btn gl sm">{ic("share", 15)}Partager</a></div></div>
<div class="stats"><div><b class="disp">30</b><span>soirées créées</span></div><div><b class="disp">96</b><span>films proposés</span></div><div><b class="disp">15</b><span>films gagnants</span></div><div><b class="disp">{ic("flame", 26)}4</b><span>semaines de suite</span></div></div>
<div class="pcols"><div><div class="sh"><h2 class="disp">Vos trois favoris</h2></div><div class="favs">{favs}</div></div>
<div><div class="sh"><h2 class="disp">Activité</h2><span class="more">6 derniers mois</span></div>{heat()}<div class="sh" style="margin-top:20px"><h2 class="disp">Derniers films vus</h2><a class="more"{href("66-films-vus")}>Tout voir {ic("right", 15)}</a></div><div class="seen">{seen}</div></div></div></div>
</div>'''


SUGG = ["Comédies françaises", "Années 80", "Films de braquage", "Moins de 90 min"]


def invite_card(small=False):
    chip = when("hasTheme", f'<span class="chip">{hole("theme", "Nuits blanches")}</span>')
    return f'''<div class="inv{" sm" if small else ""}"><div class="ibd"></div><div class="ic2"><div class="ov">Vendredi 14 novembre, 21 h</div><div class="disp it">{hole("titleOr", "Soirée chez Léa")}</div>
<div class="iby">{av("lea", 26)}<span>Léa vous invite</span></div><div class="ith">{chip}</div><span class="btn gl">{ic("users", 16)}Rejoindre la soirée</span></div></div>'''


def field(label, static_html, name, small=""):
    if DC:
        inp = f'<input class="in" value="{hx(name)}" onChange="{hx("on" + name.capitalize())}">'
    else:
        inp = static_html
    return f'<label class="fld"><span class="fl">{label}{small}</span>{inp}</label>'


def d_create():
    sugg = "".join(f'<button type="button" class="chip"{on(f"sg{j}")}>{x}</button>' for j, x in enumerate(SUGG))
    return f'''<div class="S desk frame">{hdr(2, solid=True)}<div class="spot soft"></div>
<div class="cgrid"><div class="cform"><h1 class="vh">Créer une soirée</h1>
{field("Titre", '<span class="in focus">Soirée chez Léa<i class="caret"></i></span>', "title")}
<div class="frow"><label class="fld"><span class="fl">Date</span><span class="in">14/11/2026<em>{ic("cal", 16)}</em></span></label><label class="fld"><span class="fl">Heure</span><span class="in">21:00<em>{ic("clock", 16)}</em></span></label></div>
{field("Thème", '<span class="in">Nuits blanches</span>', "theme", " <small>facultatif</small>")}
<div class="sugg">{sugg}</div>
<a class="adv"{href("54-creer-options")}>{ic("sliders", 16)}<span>Options avancées</span><small>Limite de participants, films par personne, vote</small>{ic("chevd", 16)}</a>
<a class="btn full"{href("02-soiree")}>Créer la soirée</a></div>
<div class="cprev"><div class="clab">{ic("eye", 15)}Ce que verront vos invités</div>{invite_card()}</div></div></div>'''


def d_landing():
    phone = embedded(m_win)
    return f'''<div class="S desk frame land"><header class="hdr"><div class="logo">Movie Picker<i></i></div><nav><a>Comment ça marche</a><a>La roue</a><a>Fonctionnalités</a><a>Questions</a></nav>
<div class="hr"><a class="btn gl sm"{href("21-connexion")}>Se connecter</a><a class="btn sm"{href("22-inscription")}>Créer un compte</a></div></header>
<div class="spot"></div><div class="lgrid"><div class="ltxt"><div class="ov">Soirée ciné à plusieurs</div>
<h1 class="disp">Choisissez le film de la soirée, <span>sans y passer la soirée.</span></h1>
<p>Créez la soirée, partagez le lien, chacun propose ses films et vote. Toujours pas d’accord&nbsp;? La roue tranche.</p>
<div class="hb"><a class="btn"{href("22-inscription")}>Créer un compte</a><a class="btn gl">{ic("play", 15)}Voir comment ça marche</a></div><div class="free">Gratuit, sans publicité.</div></div>
<div class="lphone"><div class="scale" aria-hidden="true" inert>{phone}</div><div class="toast">{av("sam", 28)}<div><b>Sam a proposé Brume</b><span>Soirée chez Léa, à l’instant</span></div></div></div></div>
<div class="steps"><div><b class="disp">1</b><span>Créez la soirée</span></div><div><b class="disp">2</b><span>Partagez le lien</span></div><div><b class="disp">3</b><span>Proposez et votez</span></div><div><b class="disp">4</b><span>La roue tranche</span></div></div></div>'''


def m_top(back, target, icons=("share",)):
    ib = "".join(f'<a class="ib s" aria-label="{i[2]}"{href(i[1])}>{ic(i[0], 16)}</a>' if isinstance(i, tuple) else f'<span class="ib s">{ic(i, 16)}</span>' for i in icons)
    return f'<div class="mtop"><a class="back"{href(target)}>{ic("left", 16)}{back}</a><div class="ibs">{ib}</div></div>'


def m_explorer():
    rail = "".join(f'<a class="pc"{href("17-m-fiche-film")}>{poster(k)}</a>' for k in ["phare", "volets", "sable", "brume"])
    trend = "".join(f'<a class="pc"{href("17-m-fiche-film")}>{poster(k)}</a>' for k in ["orbite", "km", "verre", "projo"])
    return f'''<div class="S mob frame scroll"><div class="mhero">{hero_bd()}{sbar()}
<div class="mhd2"><div class="logo">Movie Picker<i></i></div><div class="hr"><a class="bell" aria-label="Notifications"{href("68-m-notifications")}>{ic("bell", 19)}<b></b></a><a class="me" aria-label="Mon profil"{href("18-m-profil")}>{av("adrien", 30)}</a></div></div>
<div class="mhc2"><div class="ov">En tête du vote, chez Léa</div><h1 class="disp">Orbite basse</h1><div class="hm">{rating("7,8")}<span>2024</span><span>2h12</span></div>
<div class="hb"><a class="btn sm"{href("12-m-soiree")}>{ic("plus", 15)}Proposer</a>{save_btn("btn gl sm", 15)}</div></div></div>
<a class="mcd"{href("12-m-soiree")}><div><div class="cdl">Soirée chez Léa</div><div class="cds">Commence dans <b>4 j 06 h</b></div></div>{stack(["lea", "nico", "ines"], 22)}{ic("right", 16)}</a>
<div class="msrow"><a class="sfield"{href("42-m-recherche")}>{ic("search", 17)}<span>Titre, réalisateur, acteur</span></a></div>
<div class="mrow2"><div class="rh"><h2 class="disp">Dans votre liste</h2><a class="more"{href("44-m-ma-liste")}>Tout voir</a></div><div class="rail sm">{rail}</div></div>
<div class="mrow2 rlast"><div class="rh"><h2 class="disp">Tendances</h2><a class="more"{href("43-m-tendances")}>Tout voir</a></div><div class="rail sm">{trend}</div></div>
{mnav(0)}</div>'''


def m_event():
    rows = ""
    for i, (fid, by, up, down, sc, mine) in enumerate(PROGRAM[:5], 1):
        f = FILMS[fid]
        rows += (f'<div class="mr"><span class="rk">{i}</span><a class="pw"{href("17-m-fiche-film")}>{poster(fid)}</a><div class="mi"><div class="t">{f["t"]}</div>'
                 f'<div class="m">{av(by, 14)}<span>{PEOPLE[by][0]}</span>{score(sc, i - 1, "g")}</div></div><div class="vt">{vote(up, down, mine, i - 1)}</div></div>')
    return f'''<div class="S mob frame"><div class="mhd"><div class="bd2"></div>{sbar()}
{m_top("Mes soirées", "16-m-mes-soirees", (("plus", "56-m-proposer", "Proposer un film"), ("share", "57-m-partager", "Partager"), ("gear", "58-m-reglages-soiree", "Réglages de la soirée")))}
<div class="mhc"><div class="ov">Ven. 14 nov., 21 h</div><h1 class="disp">Soirée chez Léa</h1><div class="em">{crowd(["lea", "nico", "ines", "sam", "hugo", "adrien"], 20)}<span>6 films</span><span>3 votants sur 6</span><span class="cdn">{ic("clock", 13)}4 j 06 h</span></div></div></div>
<div class="ml">{rows}</div>
<div class="mcta"><a class="btn"{href("13-m-roue")}>{ic("wheel", 18)}Lancer la roue</a></div>
{mnav(1)}</div>'''


def m_wheel():
    hint = when("spinning", '<p class="hint">Le film tiré s’affichera chez tout le monde en même temps.</p>')
    res = when("done", f'<a class="btn wres"{href("14-m-film-tire")}>{ic("info", 16)}Voir le film tiré</a>', False)
    return f'''<div class="S mob frame"><div class="spot"></div>{sbar()}{m_top("Soirée chez Léa", "12-m-soiree", ())}
<div class="mwc"><div class="ov">{hole("ov", "Léa a lancé la roue")}</div><h1 class="disp">{hole("ttl", "Ça tourne")}</h1>
<div class="mwh">{wheel(318, 34, True)}</div>
<div class="watch">{stack(["lea", "nico", "ines", "sam"], 24)}<span>4 personnes regardent</span></div>
{hint}{res}</div>
{mnav(1)}</div>'''


def m_win():
    f = FILMS["orbite"]
    return f'''<div class="S mob frame"><div class="wbg"></div>{sbar()}{m_top("Soirée chez Léa", "12-m-soiree", (("cal", None, "Ajouter au calendrier"), ("share", "57-m-partager", "Partager")))}
<div class="wc"><div class="ov">Ce soir, vous regardez</div><div class="pw">{poster("orbite")}</div>
<h1 class="disp">{f["t"]}</h1><div class="wm">{rating(f["r"])}<span>{f["y"]}</span><span>{f["d"]}</span></div>
<div class="wby">{av("hugo", 20)}Proposé par Hugo, 3 votes pour</div></div>
<div class="wbtns one"><a class="btn gl"{href("17-m-fiche-film")}>{ic("info", 17)}Voir la fiche du film</a></div>
{mnav(1)}</div>'''


RATE_LABELS = ["1 sur 5, raté", "2 sur 5, bof", "3 sur 5, pas mal", "4 sur 5, très bien", "5 sur 5, coup de cœur"]


def m_rate():
    scale = ""
    for k, v, row in [("hugo", 3, 0), ("ines", 3.5, 0), ("sam", 3.5, 1), ("lea", 4, 0), ("nico", 4.5, 0)]:
        scale += f'<span class="sp" style="left:{(v - 1) / 4 * 100}%;bottom:{32 + row * 28}px">{av(k, 24)}</span>'
    ticks = "".join(f'<i style="left:{(n - 1) / 4 * 100}%"><b>{n}</b></i>' for n in range(1, 6))
    stars = "".join(f'<button type="button" class="st {hole(f"s{n}", "on" if n <= 4 else "")}" aria-label="{n} sur 5"{on(f"r{n}")}>{star(38)}</button>' for n in range(1, 6))
    return f'''<div class="S mob frame"><div class="wbg dim"></div>{sbar()}{m_top("Soirée chez Léa", "12-m-soiree", ())}
<div class="rc"><div class="rhd"><div class="rp">{poster("orbite")}</div><div><div class="ov">Hier soir</div><h1 class="disp rt">Orbite basse</h1><div class="rq">Alors, c’était comment&nbsp;?</div></div></div>
<div class="stars5">{stars}</div><div class="rlab">{hole("rlab", RATE_LABELS[3])}</div>
<div class="grp"><div class="gh"><span>Les notes du groupe</span><b>3,7{star(13)}</b></div><div class="scale"><div class="line">{ticks}</div>{scale}</div></div>
<a class="btn full"{href("16-m-mes-soirees")}>Valider ma note</a><a class="skip"{href("16-m-mes-soirees")}>Je ne l’ai pas vu</a></div>
{mnav(1)}</div>'''


def m_events():
    def mc(day, dnum, mon, title, sub, status, cls, tint, posters):
        pst = "".join(f'<div class="mf f{i}">{poster(p)}</div>' for i, p in enumerate(posters))
        return f'''<a class="mec"{href("12-m-soiree")} style="--tint:{tint}"><div class="edate"><span>{day}</span><b class="disp">{dnum}</b><span>{mon}</span></div><div class="emid"><div class="disp et">{title}</div><div class="eth">{sub}</div><div class="est {cls}">{status}</div></div><div class="mfan">{pst}</div></a>'''
    cards = mc("Ven.", "14", "Nov.", "Soirée chez Léa", "6 participants, 6 films", '<i class="dot"></i>Vote ouvert', "vote", "rgba(56,189,248,.35)", ["projo", "orbite"])
    cards += mc("Mer.", "19", "Nov.", "Ciné-club du mercredi", "3 participants, 3 films", f'{ic("clock", 13)}Commence dans 9 j', "soon", "rgba(59,130,246,.35)", ["verre", "phare"])
    cards += mc("Sam.", "29", "Nov.", "Marathon du samedi", "2 participants", f'{ic("plus", 13)}À remplir', "empty", "rgba(255,255,255,.08)", [])
    rows = "".join(f'<a class="mh"{href("60-m-recap")}><span class="hp">{poster(w)}</span><div><b>{t}</b><span>{d}, {FILMS[w]["t"]}</span></div><span class="hr2">{on5(r)}{star(12)}</span></a>'
                   for d, t, w, r, _ in HIST + HIST_MORE)
    return f'''<div class="S mob frame scroll">{sbar()}<h1 class="vh">Mes soirées</h1>
<div class="mlist"><div class="sh"><h2 class="disp">À venir<em>3</em></h2></div>{cards}<div class="sh"><h2 class="disp">Historique<em>36</em></h2></div>{rows}</div>
{mnav(1)}</div>'''


def m_movie():
    f = FILMS["orbite"]
    return f'''<div class="S mob frame"><div class="under">{m_explorer_inner()}</div><div class="veil"></div>
<div class="sheet"><span class="grab"></span><div class="sband">{hero_bd()}<a class="ib s close" aria-label="Fermer"{href("11-m-explorer")}>{ic("x", 16)}</a></div>
<div class="sbody"><div class="shd"><div class="sp2">{poster("orbite")}</div><div><div class="ov">Science-fiction, 2024</div><h1 class="disp">{f["t"]}</h1><div class="hm">{rating("7,8")}<span>2h12</span><span>Clara Venn</span></div></div></div>
<p class="syn">Une astronaute coincée en orbite capte chaque nuit la voix d’un enfant qui n’existe pas.</p>
<div class="mlab">Où le voir</div><div class="prov"><span class="pv">Netflix</span><span class="pv">Canal+</span><span class="pv">Prime Video <em>location</em></span></div>
<div class="sact"><a class="btn"{href("12-m-soiree")}>{ic("plus", 16)}Proposer à une soirée</a>{save_btn("btn gl sq", 17, False)}</div></div></div></div>'''


def m_explorer_inner():
    return f'''<div class="mhero">{hero_bd()}{sbar()}<div class="mhd2"><div class="logo">Movie Picker<i></i></div></div></div>'''


def m_profile():
    favs = "".join(f'<a class="fv"{href("17-m-fiche-film")}>{poster(k)}</a>' for k in ["phare", "kyoto", "orbite"])
    return f'''<div class="S mob frame"><div class="mpban"><div class="bd3"></div>{sbar()}<div class="mtop"><span></span><div class="ibs"><span class="ib s">{ic("share", 16)}</span><a class="ib s" aria-label="Réglages"{href("33-m-reglages")}>{ic("gear", 16)}</a></div></div></div>
<div class="mpid"><span class="pav">{av("adrien", 84)}</span><div class="ov">@adrien</div><h1 class="disp">Adrien</h1><p>Orga des soirées ciné du vendredi.</p></div>
<div class="mstats"><div><b class="disp">30</b><span>soirées</span></div><div><b class="disp">96</b><span>proposés</span></div><div><b class="disp">15</b><span>gagnants</span></div><div><b class="disp">{ic("flame", 18)}4</b><span>semaines</span></div></div>
<div class="mpsec"><div class="sh"><h2 class="disp">Vos trois favoris</h2></div><div class="favs">{favs}</div>
<div class="sh" style="margin-top:16px"><h2 class="disp">Activité</h2><span class="more">6 mois</span></div>{heat()}</div>
{mnav(4)}</div>'''


THEME_LONG = "Nuits blanches et autres insomnies du cinéma, de minuit jusqu’à l’aube"


def m_create():
    if DC:
        theme = f'<input class="in {hx("thErr")}" value="{hx("theme")}" onChange="{hx("onTheme")}">'
    else:
        theme = f'<span class="in err">{THEME_LONG}</span>'
    msg = when("tooLong", f'<span class="msg">{ic("alert", 13)}60 caractères au plus</span>')
    return f'''<div class="S mob frame"><div class="spot soft"></div>{sbar()}{m_top("Mes soirées", "16-m-mes-soirees", ())}
<div class="mcf"><h1 class="vh">Créer une soirée</h1>
{field("Titre", '<span class="in focus">Soirée chez Léa<i class="caret"></i></span>', "title")}
<div class="frow"><label class="fld"><span class="fl">Date</span><span class="in">14/11/2026</span></label><label class="fld"><span class="fl">Heure</span><span class="in">21:00</span></label></div>
<label class="fld"><span class="fl">Thème <small>facultatif</small></span>{theme}{msg}</label>
<div class="adv">{ic("sliders", 16)}<span>Options avancées</span>{ic("chevd", 16)}</div></div>
<div class="mcta"><a class="btn"{href("12-m-soiree")}>Créer la soirée</a></div>
{mnav(2)}</div>'''


def m_invite():
    return f'''<div class="S mob frame"><div class="ibd big"></div>{sbar()}
<div class="minv"><div class="logo">Movie Picker<i></i></div>
<div class="ov" style="margin-top:96px">Vendredi 14 novembre, 21 h</div><h1 class="disp">Soirée chez Léa</h1>
<div class="iby">{av("lea", 30)}<span><b>Léa</b> vous invite à choisir le film de la soirée</span></div>
<div class="ifacts"><div><b class="disp">6</b><span>participants</span></div><div><b class="disp">6</b><span>films proposés</span></div><div><b class="disp hi">4 J</b><span>avant la séance</span></div></div>
<div class="ifilms">{"".join(f'<div class="if">{poster(k)}</div>' for k in ["projo", "orbite", "kyoto", "marseille"])}<span class="more2">+2</span></div>
<a class="btn full"{href("12-m-soiree")}>{ic("users", 17)}Rejoindre la soirée</a><a class="btn gl full"{href("31-m-connexion")}>J’ai déjà un compte</a>
<p class="legal">Gratuit, sans publicité.</p></div></div>'''


def tile():
    sw = lambda c, n, h, extra="": f'<div class="s"><i style="background:{c}{extra}"></i><b>{n}</b><span>{h}</span></div>'
    ring = ";box-shadow:inset 0 0 0 1px #334155"
    dark = sw("#0A0F1C", "Fond", "#0A0F1C", ring) + sw("#131A2B", "Surface", "#131A2B", ring) + sw("#E2E8F0", "Texte", "#E2E8F0") \
        + sw("#3B82F6", "Bleu", "#3B82F6") + sw("#60A5FA", "Bleu texte", "#60A5FA") + sw("#22D3EE", "Cyan", "#22D3EE")
    lring = ";box-shadow:inset 0 0 0 1px #CBD5E1"
    light = sw("#F4F6FA", "Fond", "#F4F6FA", lring) + sw("#FFFFFF", "Surface", "#FFFFFF", lring) + sw("#0F172A", "Texte", "#0F172A") + sw("#2563EB", "Bleu", "#2563EB")
    return f'''<div class="S tile">
<div class="tcol"><div class="tl">Couleurs, sombre</div><div class="sw">{dark}</div><div class="tl" style="margin-top:18px">Clair</div><div class="sw k4">{light}</div>
<div class="tl" style="margin-top:18px">Statuts</div><div class="crow sts"><span class="est vote"><i class="dot"></i>Vote ouvert</span><span class="est soon">{ic("clock", 13)}À venir</span><span class="est wait">{ic("clock", 13)}En suspens</span><span class="est">Terminée</span><span class="est st-host">Hôte</span><span class="live"><i></i>En direct</span></div><div class="note">Couleurs et arrondis sont ceux de l’application actuelle. Le cyan, couleur secondaire de l’application, marque les surtitres et le compte à rebours.</div></div>
<div class="tcol"><div class="tl">Typographie et formes</div><div class="aa disp">Aa</div>
<div class="tsp"><b class="disp" style="font-size:40px">Soirée chez Léa</b><span>Archivo étroite en capitales, titres seulement</span></div>
<div class="tsp"><b style="font-size:16px;font-weight:600">Inter, tout le reste</b><span>Neutre, très lisible sur fond sombre</span></div>
<div class="tsp"><b class="ov" style="font-size:12px">En tête du vote</b><span>Surtitres en cyan, espacés</span></div>
<div class="tsp"><b style="font-size:16px;font-weight:600">Arrondis de l’application</b><span>6 px affiches, 12 px boutons et champs, 18 px cartes, ronds pour puces et avatars</span></div></div>
<div class="tcol"><div class="tl">Composants et états</div>
<div class="crow"><a class="btn">Lancer la roue</a><a class="btn hover">Survol</a><a class="btn dis">Inactif</a></div>
<div class="crow"><a class="btn gl">Proposer</a><a class="btn gh">Annuler</a><span class="ib">{ic("share", 17)}</span></div>
<div class="crow">{vote(4, 0, "up")}<span class="chip">Nuits blanches</span></div>
<label class="fld"><span class="in focus">Soirée chez Léa<i class="caret"></i></span></label>
<label class="fld"><span class="in err">Nuits blanches et autres insomnies</span><span class="msg">{ic("alert", 13)}60 caractères au plus</span></label>
<div class="crow"><span class="stars-s">{star(18)}{star(18)}{star(18)}{star(18)}{star(18, False)}</span>{rating("7,8")}</div><div class="crow"><div class="cd st"><div><div class="cdl">Soirée chez Léa</div><div class="cds">Commence dans</div></div><div class="v">4 J 06 H</div></div></div>
<div class="note">Le bleu n’est que sur l’action principale et les états choisis, dont les étoiles de sa propre note. Les notes sont sur 5 et suivies d’une étoile. Les boutons n’ont pas de halo.</div></div>
</div>'''


CSS = r"""
.S{--bg:#0a0f1c;--s1:#131a2b;--s2:#1a2338;--s3:#243049;--line:#243049;--line2:#334155;--field:#5f6f8c;--tx:#e2e8f0;--tx2:#94a3b8;--tx3:#818fa6;--acc:#3b82f6;--acc-h:#60a5fa;--acc-c:#0a0f1c;--acc-tx:#60a5fa;--acc-soft:rgba(59,130,246,.14);--glow:rgba(0,0,0,.6);--hi:#22d3ee;--st-live:#4ade80;--st-wait:#fb923c;--st-host:#a5b4fc;--st-air:#f87171;--ok:#4ade80;--err:#f87171;--hdr:rgba(10,15,28,.8);background:var(--bg);color:var(--tx);font-family:Inter,sans-serif}
.S.light{--bg:#f4f6fa;--s1:#ffffff;--s2:#f1f5f9;--s3:#e2e8f0;--line:#e2e8f0;--line2:#cbd5e1;--field:#82909f;--tx:#0f172a;--tx2:#475569;--tx3:#5d6b80;--acc:#2563eb;--acc-h:#1d4ed8;--acc-c:#ffffff;--acc-tx:#1d4ed8;--acc-soft:rgba(37,99,235,.12);--glow:rgba(15,23,42,.25);--hi:#0e7490;--st-live:#166534;--st-wait:#9a3412;--st-host:#3730a3;--st-air:#b91c1c;--hdr:#f4f6fa}
.S .disp{font-family:Archivo,sans-serif;font-stretch:70%;font-variation-settings:'wdth' 70;font-weight:800;text-transform:uppercase;letter-spacing:.005em;line-height:.92}
.S .ov{font:700 11px/1.2 Inter,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--hi)}
.S .hi{color:var(--hi)}
.S .hdr{position:absolute;top:0;left:0;right:0;height:68px;display:flex;align-items:center;gap:40px;padding:0 40px;z-index:6;background:linear-gradient(180deg,var(--hdr),rgba(10,15,28,0))}
.S .hdr.solid{background:var(--bg);box-shadow:0 1px 0 var(--line)}
.S .logo{font-family:Archivo,sans-serif;font-stretch:70%;font-variation-settings:'wdth' 70;font-weight:800;font-size:23px;letter-spacing:.02em;text-transform:uppercase;display:flex;align-items:center;gap:7px;color:var(--tx)}
.S .logo i{width:8px;height:8px;border-radius:50%;background:var(--acc)}
.S nav{display:flex;gap:28px}
.S nav a{font:500 14px/1 Inter,sans-serif;color:var(--tx2);position:relative;padding:6px 0}
.S nav a.on{color:var(--tx);font-weight:600}
.S nav a.on::after{content:'';position:absolute;left:50%;bottom:-8px;width:5px;height:5px;border-radius:50%;background:var(--acc);transform:translateX(-50%)}
.S .hr{margin-left:auto;display:flex;align-items:center;gap:18px}
.S .bell{position:relative;display:inline-flex}
.S .bell b{position:absolute;top:-1px;right:0;width:8px;height:8px;border-radius:50%;background:var(--acc);box-shadow:0 0 0 2px var(--bg)}
.S .sbox{display:flex;align-items:center;gap:10px;height:38px;padding:0 14px;border-radius:12px;background:rgba(255,255,255,.08);color:var(--tx2);font-size:13px;width:230px;box-shadow:inset 0 0 0 1px var(--line)}
.S.light .sbox{background:var(--s1)}
.S .btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;height:48px;padding:0 24px;border-radius:12px;font:700 14px/1 Inter,sans-serif;background:var(--acc);color:var(--acc-c);white-space:nowrap}
.S .btn.hover{background:var(--acc-h)}
.S .btn.dis{opacity:.42;box-shadow:none}
.S .btn.wh{background:#e2e8f0;color:#0a0f1c;box-shadow:none}
.S .btn.gl{background:rgba(255,255,255,.1);color:var(--tx);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)}
.S.light .btn.gl{background:var(--s1);box-shadow:inset 0 0 0 1px var(--line2)}
.S .btn.gh{background:transparent;color:var(--tx2);box-shadow:none;padding:0 14px}
.S .btn.sm{height:40px;padding:0 18px;font-size:13px}
.S .btn.full{width:100%}
.S .btn.sq{width:52px;padding:0;flex:none}
.S .ib{width:40px;height:40px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px var(--line);color:var(--tx);flex:none}
.S .ib.s{width:36px;height:36px}
.S .chip{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border-radius:999px;background:rgba(255,255,255,.08);font-size:12px;font-weight:600;color:var(--tx);box-shadow:inset 0 0 0 1px var(--line);white-space:nowrap}
.S .vb{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 9px;border-radius:999px;background:rgba(255,255,255,.12);font-size:12px;font-weight:700;color:var(--tx)}
.S .vb.on{background:var(--acc);color:var(--acc-c)}
.S .seg{display:flex;padding:3px;border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line)}
.S .seg>*{min-width:34px;height:28px;display:flex;align-items:center;justify-content:center;gap:6px;border-radius:9px;color:var(--tx3);padding:0 6px}
.S .seg.big>*{height:34px;padding:0 14px;font-size:13px;font-weight:600}
.S .seg em{font-style:normal;font-size:12px;color:var(--tx3);font-weight:700}
.S .seg>.on{background:var(--s3);color:var(--tx)}
.S .seg>.on em{color:var(--tx2)}
.S .back{display:inline-flex;align-items:center;gap:6px;color:var(--tx2);font-size:13px;font-weight:600}
.S .evtop,.S .mtop{display:flex;justify-content:space-between;align-items:center}
.S .mtop{position:relative;z-index:5;padding:2px 16px}
.S .ibs{display:flex;gap:8px}
.S .r{display:inline-flex;align-items:center;gap:4px;color:var(--tx);font-weight:700}
.S .tm{display:inline-flex;align-items:center;gap:4px;color:var(--tx2);font-weight:600;white-space:nowrap}
.S .tm .ic{position:relative;top:-.5px}
.S .hero.boxed .tm{color:#cbd5e1}
.S .ovl .tm{color:#94a3b8}
.S .sh{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.S .sh h2{font-size:24px}
.S .more{color:var(--tx2);font-size:13px;display:inline-flex;align-items:center;gap:4px}
.S .cd{position:absolute;right:40px;bottom:44px;z-index:2;display:flex;align-items:center;gap:16px;padding:12px 16px;border-radius:12px;background:rgba(19,26,43,.72);box-shadow:inset 0 0 0 1px var(--line)}
.S .cd.st{position:static}
.S .cdl{font-weight:700;font-size:13px}
.S .cds{font-size:12px;color:var(--tx2);margin-top:3px}
.S .cds b{color:var(--hi)}
.S .cd .v{font-family:Archivo,sans-serif;font-stretch:70%;font-variation-settings:'wdth' 70;font-weight:800;font-size:30px;color:var(--hi);line-height:1}
.S .mini{width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,.16);color:#fff}
.S .est{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:999px;font-size:12.5px;font-weight:600;color:var(--tx2);background:rgba(255,255,255,.06);white-space:nowrap}
.S .est.vote{color:var(--st-live);background:color-mix(in srgb,var(--st-live) 14%,transparent)}
.S .est.soon{color:var(--hi);background:color-mix(in srgb,var(--hi) 12%,transparent)}
.S .est.wait{color:var(--st-wait);background:color-mix(in srgb,var(--st-wait) 14%,transparent)}
.S .est .dot{width:7px;height:7px;background:currentColor;box-shadow:none}
.S .dot{width:7px;height:7px;border-radius:50%;background:var(--tx);box-shadow:0 0 0 4px rgba(255,255,255,.14)}

.S .bd,.S .dim .bd{position:absolute;inset:0;background:radial-gradient(900px 520px at 78% 32%,#173a80 0%,#0a1a3d 34%,#05060d 72%)}
.S .bd .planet{position:absolute;right:110px;top:56px;width:310px;height:310px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#eef4ff,#5d8ae6 42%,#0d1f4a 76%);box-shadow:0 0 140px rgba(90,150,255,.5)}
.S .bd .stars{position:absolute;inset:0;background-image:radial-gradient(1.2px 1.2px at 52% 18%,#fff,transparent),radial-gradient(1px 1px at 61% 70%,#fffc,transparent),radial-gradient(1px 1px at 92% 14%,#fff,transparent),radial-gradient(1.4px 1.4px at 88% 76%,#fff,transparent),radial-gradient(1px 1px at 44% 40%,#fff9,transparent),radial-gradient(1px 1px at 70% 8%,#fffb,transparent),radial-gradient(1px 1px at 97% 46%,#fff,transparent),radial-gradient(1px 1px at 20% 12%,#fff8,transparent)}
.S .hero{position:relative;height:410px;overflow:hidden}
.S .hero .bd::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#0a0f1c 0%,rgba(10,15,28,.88) 28%,rgba(10,15,28,0) 62%),linear-gradient(0deg,#0a0f1c 0%,rgba(10,15,28,0) 38%)}
.S .hero.boxed{margin:84px 40px 0;height:330px;border-radius:18px}
.S .hero.boxed .bd::after{background:linear-gradient(90deg,#05080f 0%,rgba(5,8,15,.85) 30%,rgba(5,8,15,0) 64%)}
.S .hero.boxed .bd .planet{width:240px;height:240px;top:44px;right:90px}
.S .hero.boxed .hc{left:36px;bottom:32px;color:#e2e8f0}
.S .hero.boxed .hc h1{font-size:76px}
.S .hero.boxed .hs{display:none}
.S .hero.boxed .hs+.hb{margin-top:18px}
.S .hero.boxed .ov{color:#22d3ee}
.S .hero.boxed .hm{color:#cbd5e1}
.S .hero.boxed .r{color:#e2e8f0}
.S .hero.boxed .btn.gl{background:rgba(255,255,255,.12);color:#e2e8f0;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
.S .hero.boxed .cd{right:28px;bottom:32px;color:#e2e8f0}
.S .hero.boxed .cd .v{color:#22d3ee}
.S .hero.boxed .cds{color:#cbd5e1}
.S .hc{position:absolute;left:40px;bottom:40px;width:600px;z-index:2}
.S .hc h1{font-size:96px;margin:14px 0 12px;white-space:nowrap}
.S .hm{display:flex;align-items:center;gap:14px;font-size:14px;color:var(--tx2)}
.S .hs{font-size:15px;line-height:1.5;color:#cbd5e1;margin:12px 0 22px;max-width:460px}
.S .hb{display:flex;gap:12px;margin-top:20px}
.S .hs+.hb{margin-top:0}
.S .row{padding:4px 0 0 40px}
.S .rh{display:flex;align-items:baseline;gap:14px;padding-right:40px;margin-bottom:16px}
.S .rh h2{font-size:26px}
.S .rh .more{margin-left:auto}
.S .rail{display:flex;gap:12px;align-items:center;height:236px}
.S .light .rail,.S.light .rail{height:230px}
.S .rail .pc{width:136px;flex:none;border-radius:6px;overflow:hidden;position:relative}
.S .rail .pc.hov{width:156px;z-index:3;box-shadow:0 24px 50px -12px rgba(0,0,0,.8),0 0 0 2px var(--tx)}
.S.light .row{padding-top:26px}
.S .ovl{position:absolute;left:0;right:0;bottom:0;padding:44px 12px 12px;background:linear-gradient(0deg,rgba(0,0,0,.95) 30%,transparent);font-size:13px;z-index:3;color:#e2e8f0}
.S .ovl .om{display:flex;align-items:center;gap:8px;font-size:12px;color:#94a3b8;margin-top:4px}
.S .ovl .oa{display:flex;gap:6px;margin-top:10px}

.S .evh{position:relative;height:318px;overflow:hidden}
.S .bd2{position:absolute;inset:0;background:radial-gradient(520px 300px at 74% 26%,rgba(56,189,248,.55),transparent 70%),conic-gradient(from 110deg at 96% -10%,transparent 0deg,rgba(186,230,253,.22) 12deg,transparent 30deg),linear-gradient(160deg,#0b1a3a,#0a0f1c 70%)}
.S .evh::after,.S .mhd::after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,#0a0f1c 0%,rgba(10,15,28,0) 55%);pointer-events:none}
.S .evc{position:absolute;left:40px;right:40px;top:82px;z-index:2}
.S .tr{display:flex;align-items:center;justify-content:space-between;gap:24px}
.S .evc h1{font-size:76px;margin:10px 0 14px}
.S .evact{display:flex;gap:12px}
.S .em{display:flex;align-items:center;gap:16px;color:var(--tx2);font-size:14px;position:relative;z-index:2}
.S .cdn{display:inline-flex;align-items:center;gap:6px;color:var(--hi);font-weight:700}
.S .sec{padding:0 40px;position:relative;z-index:2}
.S .gr{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px}
.S .gc .pw{display:block;position:relative;border-radius:6px;overflow:hidden}
.S .gc .rk{position:absolute;left:9px;top:4px;z-index:3;font-family:Archivo,sans-serif;font-stretch:70%;font-variation-settings:'wdth' 70;font-weight:800;font-size:52px;color:transparent;-webkit-text-stroke:1.5px rgba(255,255,255,.9);line-height:1}
.S .gc .gv{display:flex;align-items:center;gap:5px;margin-top:8px}
.S .gc .sc{margin-left:auto;font-family:Archivo,sans-serif;font-stretch:70%;font-variation-settings:'wdth' 70;font-weight:800;font-size:18px;color:var(--tx)}
.S .gc .sc.zero,.S .gc .sc.neg{color:var(--tx3)}
.S .gc .t{font-size:13px;font-weight:600;margin-top:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.S .gc.lead .pw{box-shadow:0 0 0 2px var(--acc)}

.S .spot{position:absolute;inset:0;background:radial-gradient(ellipse 380px 700px at 64% -12%,rgba(220,232,255,.16),transparent 70%),radial-gradient(600px 420px at 64% 60%,rgba(59,130,246,.18),transparent 70%);pointer-events:none}
.S .spot.soft{background:radial-gradient(ellipse 500px 600px at 30% -20%,rgba(220,232,255,.09),transparent 70%)}
.S .wpage{position:relative;z-index:2;padding:86px 40px 0}
.S .live{display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 12px;border-radius:999px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px var(--line);color:var(--tx);font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.S .live i{width:7px;height:7px;border-radius:50%;background:var(--st-air);box-shadow:0 0 0 3px color-mix(in srgb,var(--st-air) 30%,transparent)}
.S .wgrid{display:grid;grid-template-columns:1fr 520px;gap:40px;align-items:center;margin-top:8px}
.S .wtxt h1{font-size:104px;margin:12px 0 14px}
.S .wtxt p{font-size:15px;color:var(--tx2);max-width:420px;line-height:1.5}
.S .chances{margin-top:22px;display:flex;flex-direction:column;gap:9px;max-width:440px}
.S .chn{display:grid;grid-template-columns:170px 1fr 40px;gap:12px;align-items:center;font-size:13px}
.S .chn .t{display:flex;align-items:center;gap:8px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.S .chn .sw{width:10px;height:10px;border-radius:3px;flex:none}
.S .chn .tn{min-width:0;overflow:hidden;text-overflow:ellipsis}
.S .chn .bar{height:6px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}
.S .chn .bar i{display:block;height:100%;border-radius:999px;background:rgba(226,232,240,.72)}
.S .chn .p{color:var(--tx2);text-align:right;font-variant-numeric:tabular-nums}
.S .watch{display:flex;align-items:center;gap:10px;margin-top:22px;font-size:13px;color:var(--tx2)}
.S .wcol{display:flex;justify-content:center;padding-top:18px}
.S .wh{position:relative;border-radius:50%;flex:none}
.S .wb{position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 5px #131a2b,0 0 0 6px rgba(255,255,255,.12),0 24px 60px -24px rgba(0,0,0,.8)}
.S .wl{position:absolute;inset:0}
.S .wl span{position:absolute;left:50%;top:50%;width:50%;height:1.3em;line-height:1.3em;margin-top:-.65em;transform-origin:0 50%;display:flex;justify-content:flex-end;padding:0 6% 0 14%}
.S .wl b{display:block;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;font-family:Inter,sans-serif;font-weight:700;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.85);white-space:nowrap}
.S .wl span.flip{justify-content:flex-start;padding:0 14% 0 6%}
.S .wl span.flip b{transform:rotate(180deg)}
.S .wh.spin .wl{filter:blur(.6px)}
.S .hub{position:absolute;left:50%;top:50%;width:7%;height:7%;transform:translate(-50%,-50%);border-radius:50%;background:#f8fafc;box-shadow:0 0 0 2px rgba(0,0,0,.12),0 1px 6px rgba(0,0,0,.3);z-index:3}
.S .ptr{position:absolute;left:50%;top:-4.5%;width:6.4%;height:auto;transform:translateX(-50%);filter:drop-shadow(0 1px 3px rgba(0,0,0,.5));z-index:4;overflow:visible}

.S .dim{position:absolute;inset:0;filter:blur(6px) brightness(.35)}
.S .modal{position:absolute;left:50%;top:40px;width:900px;height:640px;transform:translateX(-50%);border-radius:18px;background:var(--s1);overflow:hidden;box-shadow:0 40px 100px -20px #000,inset 0 0 0 1px var(--line);z-index:2}
.S .mband{position:relative;height:200px;overflow:hidden}
.S .mband .bd{filter:saturate(1.1)}
.S .mband .bd .planet{right:60px;top:-60px;width:300px;height:300px}
.S .mband::after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,var(--s1) 0%,rgba(19,26,43,0) 70%)}
.S .close{position:absolute;right:18px;top:18px;z-index:3;background:rgba(0,0,0,.45)}
.S .mbody{display:grid;grid-template-columns:200px 1fr;gap:32px;padding:0 36px;margin-top:-130px;position:relative;z-index:2}
.S .mposter{border-radius:6px;overflow:hidden;box-shadow:0 24px 60px -14px rgba(0,0,0,.9),0 0 0 1px rgba(255,255,255,.12);align-self:start}
.S .minfo{padding-top:62px}
.S .minfo h1{font-size:72px;margin:10px 0 12px}
.S .syn{font-size:14.5px;line-height:1.55;color:#cbd5e1;margin:14px 0 18px;max-width:560px}
.S .mact{display:flex;gap:10px}
.S .mact .btn{height:44px;padding:0 18px;font-size:13.5px}
.S .mlab{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--tx3);margin:20px 0 10px}
.S .prov{display:flex;gap:8px;flex-wrap:wrap}
.S .pv{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;border-radius:4px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line);font-size:13px;font-weight:600}
.S .pv em{font-style:normal;color:var(--tx3);font-weight:500;font-size:12px}
.S .cast{display:flex;gap:18px}
.S .cm{display:flex;flex-direction:column;align-items:center;gap:3px;width:84px;text-align:center}
.S .cm b{font-size:12px;font-weight:600;margin-top:4px;white-space:nowrap}
.S .cm span:last-child{font-size:12px;color:var(--tx3)}

.S .page{padding:100px 40px 0}
.S .ph{display:flex;align-items:center;gap:22px;margin-bottom:24px}
.S .ph h1{font-size:64px}
.S .ph .btn{margin-left:auto}
.S .ph .cnt{font-size:15px;color:var(--tx2);font-weight:600}
.S .egrid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.S .ecard{position:relative;display:grid;grid-template-columns:76px 1fr auto;gap:18px;align-items:center;height:160px;padding:0 22px 0 18px;border-radius:18px;background:radial-gradient(420px 200px at 100% 0%,var(--tint),transparent 70%),var(--s1);box-shadow:inset 0 0 0 1px var(--line);overflow:hidden}
.S .ecard.add{display:flex;justify-content:center;gap:10px;color:var(--tx2);font-weight:600;font-size:14px;background:transparent;box-shadow:inset 0 0 0 1.5px var(--line2);border-radius:18px}
.S .edate{display:flex;flex-direction:column;align-items:center;justify-content:center;height:96px;border-right:1px solid var(--line);padding-right:16px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--tx2)}
.S .edate b{font-size:48px;color:var(--tx);margin:2px 0}
.S .et{font-size:28px;line-height:1.05;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.S .eth{font-size:13px;color:var(--tx2);margin-top:5px}
.S .eppl{display:flex;align-items:center;gap:9px;font-size:12.5px;color:var(--tx3);margin-top:10px}
.S .emid .est{margin-top:9px}
.S .emid{min-width:0}
.S .efan{position:relative;width:120px;height:120px}
.S .fan{position:absolute;top:8px;width:66px;border-radius:6px;overflow:hidden;box-shadow:0 10px 24px -6px rgba(0,0,0,.8),0 0 0 1px rgba(255,255,255,.1)}
.S .fan.f0{left:0;transform:rotate(-9deg);z-index:1}
.S .fan.f1{left:26px;top:2px;z-index:3}
.S .fan.f2{left:52px;transform:rotate(9deg);z-index:2}
.S .hist{display:flex;flex-direction:column}
.S .hrow{display:grid;grid-template-columns:80px 1fr 1.3fr 70px auto;gap:18px;align-items:center;padding:10px 0;border-top:1px solid var(--line);font-size:13.5px}
.S .hd{color:var(--tx3);font-weight:600}
.S .ht{font-weight:600}
.S .hw{display:flex;align-items:center;gap:10px;color:var(--tx2)}
.S .hp{width:26px;border-radius:4px;overflow:hidden;flex:none}
.S .hr2{display:inline-flex;align-items:center;gap:4px;color:var(--tx);font-weight:700}

.S .tool{display:flex;align-items:center;gap:10px;margin-bottom:22px}
.S .chip.tg{height:40px;padding:0 14px;font-size:13px;background:transparent;box-shadow:inset 0 0 0 1px var(--line2)}
.S .chip .sw{width:26px;height:16px;border-radius:999px;background:var(--acc);position:relative}
.S .chip .sw::after{content:'';position:absolute;right:2px;top:2px;width:12px;height:12px;border-radius:50%;background:#fff}
.S .dd{margin-left:auto;display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 14px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--line2);font-size:13px;font-weight:600}
.S .wgr{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:22px 16px}
.S .wlc .pw{display:block;position:relative;border-radius:6px;overflow:hidden}
.S .wlc .t{font-size:13px;font-weight:600;margin-top:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.S .wlc .m{display:flex;gap:10px;font-size:12px;color:var(--tx3);margin-top:8px}
.S .wlc.hov .pw{box-shadow:0 0 0 2px var(--tx),0 20px 40px -12px rgba(0,0,0,.8);transform:translateY(-4px)}
.S .ovl2{position:absolute;inset:0;z-index:3;background:linear-gradient(0deg,rgba(0,0,0,.9) 0%,rgba(0,0,0,.2) 60%);display:flex;align-items:flex-end;justify-content:space-between;padding:10px;gap:6px}
.S .ovl2 .btn{height:32px;padding:0 12px;font-size:12px;gap:6px}
.S .badge{position:absolute;left:8px;top:8px;z-index:3;display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 8px;border-radius:999px;background:rgba(0,0,0,.7);font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#e2e8f0}
.S .badge.seen{background:rgba(0,0,0,.7);color:var(--ok)}

.S .pban{position:relative;height:230px;overflow:hidden}
.S .bd3{position:absolute;inset:0;background:conic-gradient(from 248deg at 66% 46%,transparent 0deg,rgba(255,232,150,.32) 9deg,transparent 22deg),radial-gradient(700px 300px at 66% 40%,#1c3d6e,#0d1b3a 60%,#0a0f1c)}
.S .pban::after,.S .mpban::after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,#0a0f1c 0%,rgba(10,15,28,0) 70%)}
.S .pmain{position:relative;z-index:2;padding:0 40px;margin-top:-92px}
.S .pid{display:flex;align-items:flex-end;gap:24px}
.S .pav .av{box-shadow:0 0 0 4px var(--bg),0 0 0 6px var(--acc);font-size:44px!important}
.S .pid h1{font-size:64px;margin:6px 0 6px}
.S .pid p{font-size:14px;color:var(--tx2)}
.S .pact{margin-left:auto;display:flex;gap:10px;padding-bottom:6px}
.S .stats{display:grid;grid-template-columns:repeat(4,1fr);margin:22px 0 22px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.S .stats div{padding:14px 0 14px 20px;border-left:1px solid var(--line)}
.S .stats div:first-child{border-left:0;padding-left:0}
.S .stats b{display:flex;align-items:center;gap:6px;font-size:46px;line-height:1}
.S .stats span{display:block;font-size:12.5px;color:var(--tx2);margin-top:4px}
.S .pcols{display:grid;grid-template-columns:1fr 1fr;gap:40px}
.S .favs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;max-width:75%}
.S .fv{display:block;border-radius:6px;overflow:hidden}
.S .heat{display:grid;grid-template-columns:repeat(26,minmax(0,1fr));gap:3px}
.S .heat i{height:28px;border-radius:4px}
.S .heat i,.S .hleg i{background:rgba(255,255,255,.07)}
.S .heat i.h1,.S .hleg i.h1{background:rgba(255,255,255,.24)}
.S .heat i.h2,.S .hleg i.h2{background:rgba(255,255,255,.5)}
.S .heat i.h3,.S .hleg i.h3{background:var(--tx)}
.S .hleg{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;font-size:12px;color:var(--tx3)}
.S .hleg .lg{display:inline-flex;align-items:center;gap:4px}
.S .hleg i{display:block;width:12px;height:12px;border-radius:3px}
.S .hleg .lg i:first-of-type{margin-left:4px}
.S .hleg .lg i:last-of-type{margin-right:4px}
.S .seen{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}
.S .sn .pw{position:relative;border-radius:6px;overflow:hidden}
.S .rt{position:absolute;left:4px;top:4px;z-index:3;display:inline-flex;align-items:center;gap:2px;height:20px;padding:0 6px;border-radius:999px;background:rgba(0,0,0,.75);color:#fff;font-size:12px;font-weight:700}

.S .cgrid{position:relative;z-index:2;display:grid;grid-template-columns:1fr 400px;gap:56px;padding:100px 80px 0}
.S .cform h1{font-size:60px;margin:10px 0 20px}
.S .fld{display:flex;flex-direction:column;gap:7px;margin-bottom:14px;flex:1}
.S .fl{font-size:12.5px;font-weight:600;color:var(--tx2)}
.S .fl small{font-weight:500;color:var(--tx3);margin-left:6px;font-size:12px}
.S .in{display:flex;align-items:center;justify-content:space-between;height:48px;padding:0 16px;border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--field);font-size:15px;color:var(--tx);white-space:nowrap;overflow:hidden}
.S .in em{color:var(--tx3);display:inline-flex}
.S .in.focus{box-shadow:inset 0 0 0 1.5px var(--acc),0 0 0 4px var(--acc-soft);justify-content:flex-start}
.S .caret{display:inline-block;width:1.5px;height:20px;background:var(--acc-tx);margin-left:2px}
.S .in.err{box-shadow:inset 0 0 0 1.5px var(--err)}
.S .msg{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--err);font-weight:600}
.S .frow{display:flex;gap:14px}
.S .sugg{display:flex;gap:8px;flex-wrap:wrap;margin:-2px 0 16px}
.S .adv{display:flex;align-items:center;gap:10px;height:52px;padding:0 16px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--line);font-size:14px;font-weight:600;margin-bottom:18px;color:var(--tx)}
.S .adv small{font-size:13px;color:var(--tx3);font-weight:500;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.S .adv .ic:last-child{margin-left:auto;color:var(--tx3)}
.S .clab{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--tx3);margin:64px 0 12px}
.S .inv{position:relative;border-radius:18px;overflow:hidden;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line),0 30px 80px -20px rgba(0,0,0,.8);height:420px}
.S .ibd{position:absolute;inset:0;background:radial-gradient(420px 300px at 70% 10%,rgba(56,189,248,.5),transparent 70%),conic-gradient(from 110deg at 96% -10%,transparent 0deg,rgba(186,230,253,.25) 12deg,transparent 30deg),linear-gradient(170deg,#0b1a3a,#0a0f1c 72%)}
.S .ic2{position:absolute;left:28px;right:28px;bottom:28px}
.S .it{font-size:58px;margin:10px 0 16px}
.S .iby{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--tx2)}
.S .iby b{color:var(--tx)}
.S .ith{margin:14px 0 20px}
.S .ic2 .btn{width:100%}

.S.land .hdr{background:transparent}
.S .lgrid{position:relative;z-index:2;display:grid;grid-template-columns:1fr 340px;gap:60px;padding:118px 60px 0 60px}
.S .ltxt h1{font-size:64px;margin:16px 0 18px;line-height:.92}
.S .ltxt h1 span{color:var(--tx2);display:block}
.S .ltxt p{font-size:17px;line-height:1.55;color:var(--tx2);max-width:520px}
.S .ltxt .hb{margin-top:26px}
.S .free{font-size:13px;color:var(--tx3);margin-top:14px}
.S .lphone{position:relative;height:520px}
.S .lphone .scale{transform:scale(.6);transform-origin:top center;position:absolute;left:50%;margin-left:-197px;top:-8px}
.S .toast{position:absolute;left:-30px;top:34px;display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:12px;background:rgba(26,35,56,.92);box-shadow:inset 0 0 0 1px var(--line2),0 20px 40px -10px #000;font-size:13px;z-index:3}
.S .toast b{display:block;font-size:13px}
.S .toast span{color:var(--tx2)}
.S .steps{position:absolute;left:60px;right:40px;bottom:34px;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);z-index:2}
.S .steps div{display:flex;align-items:center;gap:14px;padding-top:18px;font-size:14px;font-weight:600;color:var(--tx2)}
.S .steps b{font-size:44px;color:transparent;-webkit-text-stroke:1.2px var(--tx2)}

.S .mhd{position:relative;height:312px;overflow:hidden}
.S .mhd .sbar{position:relative;z-index:3}
.S .mhc{position:absolute;left:18px;right:18px;bottom:14px;z-index:3}
.S .mhc h1{font-size:54px;margin:10px 0 12px}
.S .mhc .em{gap:12px;font-size:13px}
.S .ml{padding:0 16px 150px}
.S .mr{display:grid;grid-template-columns:16px 46px 1fr auto;gap:12px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)}
.S .mr .rk{font-family:Archivo,sans-serif;font-stretch:70%;font-variation-settings:'wdth' 70;font-weight:800;font-size:22px;color:var(--tx3)}
.S .mr .pw{display:block;border-radius:6px;overflow:hidden}
.S .mr .t{font-weight:600;font-size:14.5px;line-height:1.2}
.S .mr .m{font-size:12px;color:var(--tx3);margin-top:5px;display:flex;align-items:center;gap:7px}
.S .mr .m .g{color:var(--tx);font-weight:700}
.S .mr .m .g.zero,.S .mr .m .g.neg{color:var(--tx3)}
.S .mr .vt{display:flex;gap:5px}
.S .mcta{position:absolute;left:16px;right:16px;bottom:88px;z-index:4}
.S .mcta .btn{width:100%;height:54px;font-size:15px}
.S .mcta::before{content:'';position:absolute;left:-16px;right:-16px;top:-12px;bottom:-12px;background:var(--bg);box-shadow:0 -1px 0 var(--line);z-index:-1}
.S .mnav{height:76px;background:#0a0f1c;border-top:1px solid var(--line);padding-bottom:14px}
.S .mnav a{font-size:12px;font-weight:600;color:var(--tx3);position:relative;justify-self:stretch;align-self:stretch}
.S .mnav a.on{color:var(--tx)}
.S .mnav a.on::after{content:'';position:absolute;bottom:-5px;width:4px;height:4px;border-radius:50%;background:var(--acc)}
.S .wbg{position:absolute;inset:0;background:radial-gradient(ellipse 210px 460px at 50% -6%,rgba(225,235,255,.26),transparent 72%),radial-gradient(460px 420px at 50% 44%,rgba(59,130,246,.45),transparent 70%),#05080f}
.S .wbg.dim{background:radial-gradient(420px 360px at 50% 20%,rgba(59,130,246,.22),transparent 70%),#0a0f1c}
.S .wc{position:relative;z-index:2;text-align:center;padding:30px 24px 0}
.S .wc .pw{width:128px;margin:18px auto 0;border-radius:6px;overflow:hidden;box-shadow:0 34px 90px -12px var(--glow),0 0 0 1px rgba(255,255,255,.12)}
.S .wc h1,.S .wc h2{font-size:58px;margin-top:18px}
.S .wm{display:flex;justify-content:center;gap:12px;color:var(--tx2);font-size:13px;margin-top:12px}
.S .wby{display:flex;justify-content:center;align-items:center;gap:8px;font-size:13px;color:var(--tx2);margin-top:10px}
.S .wbtns{position:absolute;left:18px;right:18px;bottom:94px;display:grid;grid-template-columns:1fr auto;gap:10px;z-index:3}
.S .wbtns .btn{height:48px;padding:0 18px}
.S .wprov{font-size:12.5px;color:var(--tx3);margin-top:8px}

.S .mhero{position:relative;height:410px;overflow:hidden}
.S .mhero .bd .planet{right:-40px;top:70px;width:260px;height:260px}
.S .mhero .bd::after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,#0a0f1c 0%,rgba(10,15,28,.6) 38%,rgba(10,15,28,0) 64%),linear-gradient(180deg,rgba(10,15,28,.7) 0%,rgba(10,15,28,0) 22%)}
.S .mhd2{position:relative;z-index:3;display:flex;align-items:center;justify-content:space-between;padding:4px 16px}
.S .mhd2 .logo{font-size:20px}
.S .mhd2 .hr{gap:12px}
.S .mhc2{position:absolute;left:18px;right:18px;bottom:16px;z-index:3}
.S .mhc2 h1{font-size:62px;margin:10px 0 10px}
.S .mhc2 .hm{font-size:13px}
.S .mhc2 .hb{margin-top:16px;gap:10px}
.S .mcd{display:flex;align-items:center;gap:12px;margin:10px 16px 0;padding:12px 14px;border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line)}
.S .mcd>div:first-child{flex:1}
.S .mcd>.ic{color:var(--tx3)}
.S .mrow2{padding:18px 0 0 16px}
.S.scroll{overflow-y:auto;overflow-x:hidden;scrollbar-width:none}
.S.scroll::-webkit-scrollbar{display:none}
.S.scroll>.hdr{position:sticky;top:0;margin-bottom:-68px}
.S.scroll>.hdr:not(.solid){animation:hdr-solid linear both;animation-timeline:scroll(nearest);animation-range:0 160px}
@keyframes hdr-solid{from{background-color:rgba(10,15,28,0)}to{background-color:rgba(10,15,28,.94)}}
.S.scroll>.mnav{position:sticky;bottom:0;z-index:5}
.S .row.rlast{padding-bottom:48px}
.S .mrow2.rlast{padding-bottom:22px}
.S .rh .rsub{color:var(--tx2);font-size:14px}
.S .mrow2 .rh{padding-right:16px;margin-bottom:12px}
.S .mrow2 .rh h2{font-size:22px}
.S .rail.sm{height:auto;gap:10px}
.S .rail.sm .pc{width:112px}

.S .mwc{position:relative;z-index:2;text-align:center;padding:18px 20px 0}
.S .mwc h1{font-size:64px;margin:10px 0 0}
.S .mwh{display:flex;justify-content:center;margin-top:34px}
.S .mwc .watch{justify-content:center;margin-top:36px}
.S .hint{font-size:12.5px;color:var(--tx3);margin-top:10px}

.S .rc{position:relative;z-index:2;padding:16px 20px 0}
.S .rhd{display:flex;align-items:center;gap:16px}
.S .rp{width:76px;border-radius:6px;overflow:hidden;flex:none;box-shadow:0 12px 30px -8px var(--glow)}
.S .rt.disp,.S .rhd .rt{position:static;background:none;height:auto;padding:0;font-size:38px;color:var(--tx);margin:6px 0 6px;border-radius:0}
.S .rq{font-size:15px;color:var(--tx2)}
.S .stars5{display:flex;justify-content:center;gap:4px;margin-top:26px;color:rgba(255,255,255,.22)}
.S .stars5 .on{color:var(--acc)}
.S .rlab{text-align:center;font-size:14px;font-weight:600;color:var(--tx);margin-top:12px}
.S .grp{margin-top:26px;padding:16px 16px 18px;border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line)}
.S .gh{display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:600;color:var(--tx2)}
.S .gh b{display:inline-flex;align-items:center;gap:4px;color:var(--tx);font-size:15px}
.S .scale{position:relative;height:108px;margin:6px 10px 0}
.S .scale .line{position:absolute;left:0;right:0;bottom:22px;height:2px;background:rgba(255,255,255,.14)}
.S .scale .line i{position:absolute;top:-4px;width:2px;height:10px;background:rgba(255,255,255,.22);margin-left:-1px}
.S .scale .line b{position:absolute;top:14px;left:50%;transform:translateX(-50%);font-size:12px;font-weight:600;color:var(--tx3)}
.S .sp{position:absolute;margin-left:-12px}
.S .sp .av{box-shadow:0 0 0 2px var(--s1)}
.S .rc .btn.full{margin-top:22px;height:52px}
.S .skip{display:block;text-align:center;font-size:13px;color:var(--tx2);margin-top:14px;font-weight:600}

.S .mph{display:flex;align-items:center;justify-content:space-between;padding:12px 18px 0}
.S .mph h1{font-size:44px}
.S .mseg{padding:14px 18px 4px}
.S .mseg .seg{display:inline-flex}
.S .mlist{padding:8px 16px 0;display:flex;flex-direction:column;gap:10px}
.S .mec{position:relative;display:grid;grid-template-columns:58px 1fr 64px;gap:12px;align-items:center;height:112px;padding:0 12px 0 10px;border-radius:18px;background:radial-gradient(260px 140px at 100% 0%,var(--tint),transparent 70%),var(--s1);box-shadow:inset 0 0 0 1px var(--line);overflow:hidden}
.S .mec .edate{height:72px;padding-right:10px;font-size:11px}
.S .mec .edate b{font-size:36px}
.S .mec .et{font-size:22px}
.S .mec .eth{font-size:12px;margin-top:3px}
.S .mec .est{font-size:12px;margin-top:6px}
.S .mfan{position:relative;width:64px;height:90px}
.S .mf{position:absolute;width:44px;border-radius:6px;overflow:hidden;box-shadow:0 8px 18px -4px rgba(0,0,0,.8)}
.S .mf.f0{left:0;top:10px;transform:rotate(-8deg)}
.S .mf.f1{left:18px;top:4px;z-index:2}
.S .mlist .sh{margin:12px 0 0}
.S .mlist .sh h2{font-size:20px}
.S .mh{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px}
.S .mh .hp{width:30px}
.S .mh div{flex:1;display:flex;flex-direction:column;gap:2px}
.S .mh div span{font-size:13px;color:var(--tx3)}

.S .under{position:absolute;inset:0}
.S .veil{position:absolute;inset:0;background:rgba(0,0,0,.62);z-index:4}
.S .sheet{position:absolute;left:0;right:0;bottom:0;height:610px;border-radius:18px 18px 0 0;background:var(--s1);z-index:5;overflow:hidden;box-shadow:0 -20px 60px -10px #000,inset 0 1px 0 rgba(255,255,255,.1)}
.S .grab{position:absolute;left:50%;top:8px;width:40px;height:5px;margin-left:-20px;border-radius:999px;background:rgba(255,255,255,.3);z-index:4}
.S .sband{position:relative;height:150px;overflow:hidden}
.S .sband .bd .planet{right:-30px;top:-40px;width:220px;height:220px}
.S .sband::after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,var(--s1) 0%,rgba(19,26,43,0) 80%)}
.S .sband .close{top:16px;right:14px}
.S .sbody{position:relative;z-index:2;padding:0 18px;margin-top:-72px}
.S .shd{display:flex;align-items:flex-end;gap:14px}
.S .sp2{width:96px;border-radius:6px;overflow:hidden;flex:none;box-shadow:0 18px 40px -10px #000,0 0 0 1px rgba(255,255,255,.12)}
.S .shd h1,.S .shd h2{font-size:42px;margin:6px 0 8px}
.S .shd .hm{font-size:12.5px;gap:10px}
.S .sbody .syn{font-size:14px;margin:14px 0 4px}
.S .sbody .mlab{margin-top:14px}
.S .sact{display:flex;gap:10px;margin-top:20px}
.S .sact .btn:first-child{flex:1}

.S .mpban{position:relative;height:190px;overflow:hidden}
.S .mpban .sbar,.S .mpban .mtop{position:relative;z-index:3}
.S .mpid{position:relative;z-index:2;margin-top:-58px;padding:0 18px;text-align:center}
.S .mpid .pav{display:inline-block}
.S .mpid .pav .av{font-size:34px!important}
.S .mpid .ov{margin-top:16px}
.S .mpid h1{font-size:48px;margin:6px 0 4px}
.S .mpid p{font-size:13px;color:var(--tx2)}
.S .mstats{display:grid;grid-template-columns:repeat(4,1fr);margin:16px 16px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.S .mstats div{padding:10px 0;text-align:center;border-left:1px solid var(--line)}
.S .mstats div:first-child{border-left:0}
.S .mstats b{display:flex;align-items:center;justify-content:center;gap:2px;font-size:30px;line-height:1}
.S .mstats span{display:block;font-size:12px;color:var(--tx2);margin-top:3px}
.S .mpsec{padding:16px 16px 0}
.S .mpsec .sh h2{font-size:20px}
.S .mpsec .sh{margin-bottom:10px}
.S .mpsec .favs{gap:8px}
.S .mpsec .heat{grid-template-columns:repeat(13,minmax(0,1fr));gap:4px}
.S .mpsec .heat i{height:20px}

.S .mcf{position:relative;z-index:2;padding:14px 18px 0}
.S .mcf h1{font-size:50px;margin:8px 0 18px}
.S .mcf .frow{gap:10px}
.S .mcf .in{font-size:14.5px}

.S .ibd.big{position:absolute;inset:0;background:radial-gradient(340px 300px at 70% 18%,rgba(56,189,248,.55),transparent 70%),conic-gradient(from 110deg at 100% -6%,transparent 0deg,rgba(186,230,253,.25) 12deg,transparent 30deg),linear-gradient(170deg,#0b1a3a,#0a0f1c 62%)}
.S .minv{position:relative;z-index:2;padding:10px 20px 0}
.S .minv .logo{font-size:19px;justify-content:center}
.S .minv h1{font-size:62px;margin:10px 0 14px}
.S .minv .iby{font-size:13.5px}
.S .ifacts{display:grid;grid-template-columns:repeat(3,1fr);margin:20px 0 16px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.S .ifacts div{padding:10px 0 10px 12px;border-left:1px solid var(--line)}
.S .ifacts div:first-child{border-left:0;padding-left:0}
.S .ifacts b{font-size:30px;display:block;line-height:1}
.S .ifacts span{font-size:12px;color:var(--tx2)}
.S .ifilms{display:flex;align-items:center;gap:8px;margin-bottom:22px}
.S .if{width:56px;border-radius:6px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.1)}
.S .more2{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.08);font-size:13px;font-weight:700;color:var(--tx2)}
.S .minv .btn.full{height:52px;margin-bottom:10px}
.S .legal{text-align:center;font-size:12px;color:var(--tx3);margin-top:4px}

.S.tile .crow .fld{margin:0}
.S.tile .fld{margin-bottom:12px}
.S .stars-s{display:inline-flex;gap:2px;color:var(--acc)}
.S.tile .s span{font-size:12px}
.S.tile .sts{gap:8px}
.S.mob .vb{height:36px;padding:0 11px;position:relative}
.S.mob .ib:not(.close),.S.mob .back,.S.mob .more,.S.mob .skip{position:relative}
.S.mob .vb::after,.S.mob .ib::after,.S.mob .back::after,.S.mob .more::after,.S.mob .skip::after{content:'';position:absolute;left:-4px;right:-4px;top:-4px;bottom:-4px}
.S.mob .vb::after{left:0;right:0}
.S.mob .back::after,.S.mob .more::after,.S.mob .skip::after{top:-12px;bottom:-12px}
.S.mob .btn.sm{height:44px}
.S.mob .seg.big>*{height:44px}
.S button{font:inherit;color:inherit;border:0;background:none;padding:0;margin:0;text-align:inherit}
.S a[href],.S button{cursor:pointer}
.S a.pw,.S a.fv,.S a.sn{display:block}
.S .me{display:inline-flex;border-radius:50%}
.S .btn.gl.on{box-shadow:inset 0 0 0 1.5px var(--acc);color:var(--acc-tx)}
.S .chip.tg.on{background:var(--acc-soft);box-shadow:inset 0 0 0 1px var(--acc);color:var(--acc-tx)}
.S .chip .sw.off{background:var(--s3)}
.S .chip .sw.off::after{right:auto;left:2px}
.S input.in{width:100%;min-width:0;border:0;outline:0;font:inherit;font-size:15px;color:var(--tx);background:var(--s1)}
.S input.in:focus{box-shadow:inset 0 0 0 1.5px var(--acc),0 0 0 4px var(--acc-soft)}
.S input.in.err{box-shadow:inset 0 0 0 1.5px var(--err)}
.S .stars5 .st{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px}
.S .stars5 .st:not(.on) svg{fill:none}
.S .wh.big .wl span{font-size:15px}
.S .wh.sml .wl span{font-size:11.5px}
.S .wb.go{animation:wspinD 4.6s cubic-bezier(.15,.65,.12,1) both}
.S .wb.go.m{animation-name:wspinM}
@keyframes wspinD{from{transform:rotate(17deg)}to{transform:rotate(2016deg)}}
@keyframes wspinM{from{transform:rotate(34deg)}to{transform:rotate(2016deg)}}
.S .wres{margin-top:22px}
.S .mwc .wres{margin-top:12px}
.S .phx{margin-left:auto;display:flex;gap:10px}
.S .wbtns.one{grid-template-columns:1fr}
.S .ppl{display:inline-flex;align-items:center;gap:16px;color:inherit}
.S .phx .btn{margin-left:0}
.S .pfl{display:flex;gap:16px;margin-top:8px;font-size:13px;color:var(--tx2)}
.S .pfl b{color:var(--tx);font-weight:700}
.S .badge.seen{display:inline-flex;gap:4px}
.S .wtb{display:flex;align-items:center;gap:10px;height:56px;padding:0 10px 0 9px;margin-bottom:16px;border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line)}
.S .wsrch{display:flex;align-items:center;gap:8px;width:250px;height:38px;padding:0 12px;border-radius:12px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--field);color:var(--tx3);font-size:13px;flex:none}
.S .wsrch input{flex:1;min-width:0;border:0;outline:0;background:none;font:inherit;font-size:13px;color:var(--tx)}
.S .wsrch input::placeholder{color:var(--tx3)}
.S .wfb{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 12px;border-radius:12px;font-size:13px;font-weight:600;color:var(--tx);box-shadow:inset 0 0 0 1px var(--line2);flex:none}
.S .wfb.on{box-shadow:inset 0 0 0 1.5px var(--acc);color:var(--acc-tx)}
.S .wnf{font-style:normal;display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;border-radius:999px;background:var(--acc);color:var(--acc-c);font-size:11px;font-weight:800}
.S .wsep{width:1px;height:24px;background:var(--line2);flex:none}
.S .wtl{font-size:12px;color:var(--tx3);font-weight:600;flex:none}
.S .wsorts{display:flex;gap:2px}
.S .wso{display:inline-flex;align-items:center;gap:3px;height:30px;padding:0 9px;border-radius:999px;font-size:12px;font-weight:600;color:var(--tx2)}
.S .wso.on{background:var(--acc-soft);color:var(--acc-tx)}
.S .sarr{display:inline-flex}
.S .sarr.up{transform:rotate(180deg)}
.S .wend{margin-left:auto;display:flex;align-items:center;gap:10px}
.S .wcnt{font-size:12px;color:var(--tx2);font-weight:600;white-space:nowrap}
.S .wclr,.S .wreset{font-size:12px;font-weight:600;color:var(--tx);text-decoration:underline;text-underline-offset:3px;white-space:nowrap}
.S .wfp{display:flex;flex-direction:column;gap:10px;margin:-4px 0 16px;padding:14px 18px;border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line2)}
.S .wfr{display:grid;grid-template-columns:110px 1fr;gap:12px;align-items:start}
.S .wfl{font-size:12px;font-weight:700;color:var(--tx2);padding-top:7px}
.S .wfc{display:flex;flex-wrap:wrap;gap:6px}
.S .wfc .chip.on{background:var(--acc-soft);box-shadow:inset 0 0 0 1px var(--acc);color:var(--acc-tx)}
.S .wdur{display:flex;flex-direction:column;gap:8px;padding-top:12px;max-width:420px}
.S .wtrack{position:relative;height:4px;border-radius:999px;background:var(--acc)}
.S .wtrack b{position:absolute;top:-6px;width:16px;height:16px;border-radius:50%;background:var(--tx);box-shadow:0 0 0 3px var(--s1)}
.S .wtrack b:first-of-type{left:-2px}
.S .wtrack b:last-of-type{right:-2px}
.S .wdl{display:flex;justify-content:space-between;font-size:12px;color:var(--tx3)}
.S .wreset{align-self:flex-start}
.S .wlc{position:relative}
.S .wlc .m{justify-content:space-between}
.S .wkeb{position:absolute;right:6px;top:6px;z-index:4;width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:rgba(0,0,0,.62);color:#fff}
.S .wmenu{position:absolute;right:6px;top:42px;z-index:7;width:230px;padding:6px;border-radius:12px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line2),0 20px 44px -12px #000;display:flex;flex-direction:column}
.S .wmenu a,.S .wmenu button{display:flex;align-items:center;gap:10px;height:36px;padding:0 10px;border-radius:9px;font-size:13px;font-weight:600;color:var(--tx);width:100%}
.S .wmenu a:first-child{background:var(--s3)}
.S .wmenu .sep{display:block;height:1px;margin:4px 6px;background:var(--line2)}
.S .wlist{display:flex;flex-direction:column}
.S .wlh,.S .wlr{display:grid;grid-template-columns:minmax(0,1fr) 100px 80px 80px 240px;gap:14px;align-items:center}
.S .wlh{padding:0 6px 8px;font-size:12px;font-weight:700;color:var(--tx3);border-bottom:1px solid var(--line)}
.S .wlr{padding:7px 6px;border-bottom:1px solid var(--line);font-size:13px;color:var(--tx2)}
.S .wlt{display:flex;align-items:center;gap:12px;min-width:0}
.S .wlt .hp{width:28px}
.S .wlt b{display:block;color:var(--tx);font-weight:600}
.S .wlt small{font-size:12px;color:var(--tx3)}
.S .wprov{display:flex;gap:6px;align-items:center}
.S .wprov .pv{height:26px;padding:0 8px;font-size:12px}
.S .wplus{font-size:12px;color:var(--tx3);font-weight:600}
.S .avmore{position:relative;display:inline-flex;align-items:center;justify-content:center;height:24px;min-width:24px;padding:0 5px;margin-left:-8px;border-radius:999px;background:var(--s3);box-shadow:0 0 0 2px var(--bg);font-size:11px;font-weight:700;color:var(--tx)}
.S .evbar{display:flex;align-items:center;gap:8px}
.S .evsep{width:1px;height:24px;margin:0 6px;background:var(--line2)}
.S .evbar .btn{height:40px}
.S .em>*{white-space:nowrap}
.S .mhc .em{flex-wrap:wrap;row-gap:8px}
.S .srow{padding:28px 40px 4px}
.S .slab{margin-bottom:8px;font-size:13px;font-weight:600;color:var(--tx2)}
.S .sfield{display:flex;align-items:center;gap:12px;height:52px;max-width:640px;padding:0 18px;border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--field);color:var(--tx3);font-size:15px}
.S .msrow{padding:14px 16px 0}
.S .msrow .sfield{height:48px;font-size:14px}
.S .srow+.row{padding-top:36px}
.S nav.mnav{display:grid;grid-template-columns:repeat(5,1fr);gap:0}
.S.mob .mhd2 .bell,.S.mob .mhd2 .me{position:relative}
.S.mob .mhd2 .bell::after{content:'';position:absolute;inset:-13px}
.S.mob .mhd2 .me::after{content:'';position:absolute;inset:-7px}
.S :is(span,div,b,a).st-live{color:var(--st-live);background:color-mix(in srgb,var(--st-live) 14%,transparent)}
.S :is(span,div,b,a).st-soon{color:var(--hi);background:color-mix(in srgb,var(--hi) 12%,transparent)}
.S :is(span,div,b,a).st-wait{color:var(--st-wait);background:color-mix(in srgb,var(--st-wait) 14%,transparent)}
.S :is(span,div,b,a).st-done{color:var(--tx2);background:rgba(148,163,184,.14)}
.S :is(span,div,b,a).st-host{color:var(--st-host);background:color-mix(in srgb,var(--st-host) 14%,transparent)}
.S .vh{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.S .elist{display:flex;flex-direction:column;padding-bottom:40px}
.S .elh,.S .elr{display:grid;grid-template-columns:22px minmax(0,1fr) 62px 54px 54px 170px 92px 118px 40px;gap:14px;align-items:center}
.S .elh{padding:0 8px 8px;font-size:12px;font-weight:700;color:var(--tx3);border-bottom:1px solid var(--line)}
.S .elsort{display:inline-flex;align-items:center;gap:3px;color:var(--tx2)}
.S .elh .end,.S .elr .end{text-align:right;justify-self:end}
.S .elh .mid{text-align:center}
.S .elr{padding:8px;border-bottom:1px solid var(--line);font-size:13px;color:var(--tx2)}
.S .elr.lead{box-shadow:inset 3px 0 0 var(--acc);background:var(--acc-soft);border-radius:0 6px 6px 0}
.S .elrk{font-family:Archivo,sans-serif;font-stretch:70%;font-variation-settings:'wdth' 70;font-weight:800;font-size:22px;color:var(--tx3);text-align:center}
.S .elr.lead .elrk{color:var(--tx)}
.S .eltt{display:flex;align-items:center;gap:12px;min-width:0}
.S .eltt>div{display:flex;flex-direction:column;gap:4px;min-width:0}
.S .elpo{width:36px;flex:none;border-radius:4px;overflow:hidden;display:block}
.S .elt{font-size:14px;font-weight:600;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.S .elby{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--tx3)}
.S .elnone{font-size:12px;color:var(--tx3)}
.S .elsc{display:flex;flex-direction:column;align-items:center;gap:2px;text-align:center}
.S .elsc small{font-size:11px;color:var(--tx3);line-height:1.2}
.S .elseen{width:32px;height:28px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;color:var(--tx3);box-shadow:inset 0 0 0 1px var(--line2)}
.S .elseen.on{color:var(--acc-c);background:var(--acc);box-shadow:none}
.S .elv{display:flex;gap:5px;justify-content:center}
.S .elr .sc{font-family:Archivo,sans-serif;font-stretch:70%;font-variation-settings:'wdth' 70;font-weight:800;font-size:18px;color:var(--tx)}
.S .elr .sc.zero,.S .elr .sc.neg{color:var(--tx3)}
.S .gr{padding-bottom:40px}
.S .seg button{color:inherit}
.S .sh h2 em{font-style:normal;font-size:.72em;color:var(--tx3);margin-left:10px;letter-spacing:0}
.S .evp{padding-top:92px;padding-bottom:40px}
.S .hsh{margin-top:40px}
.S .hall{margin-top:18px}
.S .mlist{padding-bottom:24px}
.S h1.disp.util{font-size:44px}
.S.mob h1.disp.util{font-size:38px}
"""



COMMON_CSS = foundation.CSS

DESK = [
    ("01", "explorer", "Explorer", d_explorer),
    ("02", "soiree", "Une soirée", d_event),
    ("93", "soiree-liste", "Une soirée, les films en liste", lambda: d_event("list")),
    ("03", "roue", "La roue qui tourne", d_wheel),
    ("04", "fiche-film", "La fiche d’un film", d_movie),
    ("05", "mes-soirees", "Mes soirées", d_events),
    ("06", "ma-liste", "Ma liste", d_watchlist),
    ("07", "profil", "Le profil", d_profile),
    ("08", "creer", "Créer une soirée", d_create),
    ("09", "accueil-public", "La page d’accueil publique", d_landing),
    ("10", "explorer-clair", "Explorer en thème clair", lambda: d_explorer(light=True)),
]
MOB = [
    ("11", "m-explorer", "Explorer", m_explorer),
    ("12", "m-soiree", "Une soirée", m_event),
    ("13", "m-roue", "La roue qui tourne", m_wheel),
    ("14", "m-film-tire", "Le film tiré", m_win),
    ("15", "m-noter", "Noter le film le lendemain", m_rate),
    ("16", "m-mes-soirees", "Mes soirées", m_events),
    ("17", "m-fiche-film", "La fiche d’un film", m_movie),
    ("18", "m-profil", "Le profil", m_profile),
    ("19", "m-creer", "Créer une soirée, avec une erreur", m_create),
    ("20", "m-invitation", "L’invitation reçue par un ami", m_invite),
]


def page(title, body, extra_css=""):
    return f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>{foundation.FONTS}<style>{COMMON_CSS}{CSS}{extra_css}</style></head><body>{body}</body></html>'''


def render(dc=False):
    global DC
    DC = dc
    try:
        return [(n, s, l, f()) for n, s, l, f in DESK + MOB], tile()
    finally:
        DC = False


def build():
    STATIC_DIR.mkdir(parents=True, exist_ok=True)
    screens, style_board = render()
    for num, slug, label, html in screens:
        body = f'<div style="padding:40px;display:flex;justify-content:center">{html}</div>'
        (STATIC_DIR / f"{num}-{slug}.html").write_text(page(f"Salle obscure, {label}", body), encoding="utf-8")
    (STATIC_DIR / "00-style-board.html").write_text(page("Salle obscure, planche", f'<div style="padding:40px;display:flex;justify-content:center">{style_board}</div>'), encoding="utf-8")



if __name__ == "__main__":
    build()
    print(f"static screens written to {STATIC_DIR}")
