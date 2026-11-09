import json
import random

import base_screens as b

ic = b.ic
av = b.av
stack = b.stack
poster = b.poster
FILMS = b.FILMS
PEOPLE = b.PEOPLE
href = b.href
on = b.on
hole = b.hole
when = b.when
hx = b.hx

ICX = {
    "download": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    "moon": '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    "lock": '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    "repeat": '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    "crown": '<path d="M11.56 3.27a.5.5 0 0 1 .88 0l2.95 5.6a1 1 0 0 0 1.52.3l4.27-3.67a.5.5 0 0 1 .8.52l-2.83 10.25a1 1 0 0 1-.96.73H5.81a1 1 0 0 1-.96-.73L2.02 6.02a.5.5 0 0 1 .8-.52l4.27 3.67a1 1 0 0 0 1.52-.3z"/><path d="M5 21h14"/>',
    "dots": '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',
    "minus": '<path d="M5 12h14"/>',
    "sparkles": '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0l1.58 6.14a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96l-6.14 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/>',
    "image": '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
    "reset": '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    "filter": '<path d="M3 6h18M7 12h10M10 18h4"/>',
    "clapper": '<path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="m6.2 5.3 3.1 3.9M12.4 3.4l3.1 4"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    "calx": '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M10 14l4 4M14 14l-4 4"/>',
    "calplus": '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M12 14v5M9.5 16.5h5"/>',
    "sort": '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>',
    "history": '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    "warn": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
    "userplus": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    "ext": '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    "chevu": '<path d="m18 15-6-6-6 6"/>',
}


def icx(name, size=18, stroke=2):
    path = ICX_MORE.get(name) or ICX.get(name)
    if path is None:
        return ic(name, size, stroke)
    return (f'<svg class="ic" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{stroke}" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{path}</svg>')


def inner(html):
    return html[html.index(">") + 1: html.rindex("</div>")]


def static(fn):
    dc, emb = b.DC, b.EMBED
    b.DC, b.EMBED = False, True
    try:
        return inner(fn())
    finally:
        b.DC, b.EMBED = dc, emb


def desk_bg(fn):
    return f'<div class="dim xc-dim">{static(fn)}</div>'


def mob_bg(fn):
    return f'<div class="under xc-under">{static(fn)}</div><div class="veil"></div>'


def pub_hdr():
    return b.guest_hdr(False)


def name_of(k):
    return PEOPLE[k][0]


LISTED = {fid for fid, *_ in b.PROGRAM}
SEARCH = ["projo", "phare", "marseille", "volets", "sable", "orbite", "kyoto", "verre", "brume", "km"]
PROV = {"phare": ["Netflix"], "volets": ["Canal+", "Location 2"], "sable": ["Prime Video"], "verre": ["Location 3"],
        "orbite": ["Netflix", "Canal+"], "brume": ["Canal+"], "projo": ["Arte"], "kyoto": ["Mubi"], "marseille": ["Canal+"], "km": ["Netflix"]}
RECENT = ["kyoto", "phare", "sable"]


def search_input(ph):
    if b.DC:
        inp = f'<input class="in" value="{hx("q")}" onChange="{hx("onQ")}" placeholder="{ph}" aria-label="Proposer un film">'
    else:
        inp = f'<span class="in focus">{DEFAULT_Q}<i class="caret"></i></span>'
    return f'<label class="xc-q">{icx("search", 17)}{inp}</label>'


def search_rows():
    out = ""
    for i, fid in enumerate(SEARCH):
        f = FILMS[fid]
        meta = f'{f["y"]}, {f["g"]}, {f["d"]}'
        chips = "".join(f'<span class="xc-pv">{p}</span>' for p in PROV[fid])
        if fid in LISTED:
            row = (f'<div class="xc-sr dis"><span class="xc-sp">{poster(fid)}</span><span class="xc-sb"><b>{f["t"]}</b><span class="xc-sm">{meta}</span>'
                   f'<span class="xc-dh">Déjà proposé dans cette soirée.</span></span><span class="btn gl sm xc-add off" title="Ce film est déjà dans la liste de la soirée">Déjà listé</span></div>')
        else:
            act = (when(f"add{i}", f'<button type="button" class="btn gl sm xc-add" aria-label="Ajouter « {f["t"]} »"{on(f"p{i}")}>Ajouter</button>')
                   + when(f"done{i}", f'<span class="btn sm xc-add ok">{ic("check", 14, 2.5)}Proposé</span>', False))
            row = (f'<div class="xc-sr {hole(f"rc{i}", "")}"><span class="xc-sp">{poster(fid)}</span><span class="xc-sb"><b>{f["t"]}</b><span class="xc-sm">{meta}</span>'
                   f'<span class="xc-pvs">{chips}</span></span>{act}</div>')
        out += when(f"r{i}", row, DEFAULT_Q in norm(f["t"]))
    return out


def recent_row():
    chips = "".join(f'<button type="button" class="chip xc-rc"{on(f"h{j}")}>{icx("history", 13)}{x}</button>' for j, x in enumerate(RECENT))
    return when("empty", f'<div class="xc-rec"><span class="xc-lab">Recherches récentes</span>{chips}<button type="button" class="xc-clr"{on("hClear")}>Effacer tout</button></div>', False)


PRESETS = ["Horreur", "Comédie", "Animation", "Sci-fi", "Romance"]


def fcs(items):
    return "".join(f'<span class="xc-fc">{x}</span>' for x in items)


def search_filters():
    star = b.star(11)
    groups = [("Genre", fcs(["Action", "Aventure", "Animation", "Comédie", "Drame", "Science-fiction", "Thriller"])),
              ("Année de sortie", fcs(["2020s", "2010s", "2000s", "1990s", "1980s"])),
              ("Note min.", "".join(f'<span class="xc-fc">{n}{star}</span>' for n in ("3", "3,5", "4"))),
              ("Langue VO", "".join(f'<span class="xc-fc"><em>{c}</em>{n}</span>' for c, n in [("FR", "Français"), ("EN", "Anglais"), ("JA", "Japonais"), ("KO", "Coréen")])),
              ("Disponibilité", fcs(["Streaming", "Location", "Achat"]))]
    out = "".join(f'<div class="xc-fg"><span class="xc-fl">{lab}</span><div class="xc-fcs">{chips}</div></div>' for lab, chips in groups)
    dur = ('<div class="xc-fg"><span class="xc-fl">Durée <em>1h30 à 2h30</em></span><div class="xc-rng"><i class="xc-g1"></i><i class="xc-g2"></i>'
           '<b class="xc-k1"></b><b class="xc-k2"></b></div></div>')
    return f'<div class="xc-fpan">{out}{dur}</div>'


def screen_47():
    acts = b.event_actions(propose_on=True)
    return f'''<div class="S desk frame">{b.hdr(1)}{ev_head(acts)}
<section class="xc-addp"><div class="xc-addh"><h3>Proposer un film</h3><a class="ib s" aria-label="Fermer"{href("02-soiree")}>{ic("x", 16)}</a></div>
<div class="xc-srow">{search_input("Ajouter un film à la soirée…")}<button type="button" class="btn gl sm xc-fb {hole("fCls", "")}"{on("tF")}>{icx("filter", 16)}Filtres avancés</button></div>
{recent_row()}{when("fOpen", search_filters(), False)}<div class="xc-list">{search_results()}</div></section></div>'''


def screen_56():
    return f'''<div class="S mob frame">{mob_bg(b.m_event)}
<div class="sheet xc-sheet xc-s56"><span class="grab"></span><div class="xc-shh"><h2 class="disp">Proposer un film</h2><a class="ib s" aria-label="Fermer"{href("12-m-soiree")}>{ic("x", 16)}</a></div>
<div class="xc-srow m">{search_input("Ajouter un film à la soirée…")}<button type="button" class="ib xc-fbm {hole("fCls", "")}" aria-label="Filtres avancés"{on("tF")}>{icx("filter", 17)}</button></div>
{recent_row()}{when("fOpen", search_filters(), False)}<div class="xc-list m">{search_results()}</div></div></div>'''


def search_js():
    films = [{"t": FILMS[k]["t"]} for k in SEARCH]
    return b.component(r"""
const F = __F__;
const H = __H__;
const q = st.q !== undefined ? st.q : '__Q__';
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const nq = norm(q.trim());
const live = nq.length >= 2;
const ad = st.ad || {};
let n = 0;
F.forEach((f, i) => {
const show = live && norm(f.t).indexOf(nq) >= 0;
if (show) n += 1;
o['r' + i] = show;
o['rc' + i] = ad[i] ? 'on' : '';
o['add' + i] = !ad[i];
o['done' + i] = !!ad[i];
o['p' + i] = () => this.setState({ ad: Object.assign({}, ad, { [i]: true }) });
});
o.q = q;
o.onQ = (e) => this.setState({ q: e.target.value });
o.live = n > 0;
o.empty = nq.length === 0 && !st.hc;
o.short = nq.length === 1;
o.none = live && n === 0;
o.noneTxt = 'Aucun film ne correspond à « ' + q.trim() + ' ».';
H.forEach((h, j) => {
o['h' + j] = () => this.setState({ q: h });
});
o.hClear = () => this.setState({ hc: true });
const fo = !!st.fo;
o.fOpen = fo;
o.fCls = fo ? 'on' : '';
o.tF = () => this.setState({ fo: !fo });
""".replace("__F__", json.dumps(films, ensure_ascii=False)).replace("__H__", json.dumps(RECENT)).replace("__Q__", DEFAULT_Q))


def qr(size):
    n = 25
    rnd = random.Random(11)
    m = [[None] * n for _ in range(n)]

    def put(r, c, v):
        if 0 <= r < n and 0 <= c < n:
            m[r][c] = v
    for r0, c0 in [(0, 0), (0, n - 7), (n - 7, 0)]:
        for r in range(-1, 8):
            for c in range(-1, 8):
                put(r0 + r, c0 + c, 0 <= r <= 6 and 0 <= c <= 6 and (r in (0, 6) or c in (0, 6) or (2 <= r <= 4 and 2 <= c <= 4)))
    for i in range(8, n - 8):
        m[6][i] = i % 2 == 0
        m[i][6] = i % 2 == 0
    for r in range(5):
        for c in range(5):
            put(n - 9 + r, n - 9 + c, r in (0, 4) or c in (0, 4) or (r == 2 and c == 2))
    for r in range(10, 15):
        for c in range(10, 15):
            m[r][c] = False
    for r in range(n):
        for c in range(n):
            if m[r][c] is None:
                m[r][c] = rnd.random() < .5
    d = ""
    for r in range(n):
        c = 0
        while c < n:
            if m[r][c]:
                s = c
                while c < n and m[r][c]:
                    c += 1
                d += f"M{s} {r}h{c - s}v1h-{c - s}z"
            else:
                c += 1
    return (f'<svg class="xc-qr" width="{size}" height="{size}" viewBox="-2 -2 {n + 4} {n + 4}" shape-rendering="crispEdges" role="img" aria-label="QR code de la soirée">'
            f'<rect class="xc-qb" x="-2" y="-2" width="{n + 4}" height="{n + 4}"/><path class="xc-qm" d="{d}"/>'
            f'<rect class="xc-qm" x="10.6" y="10.6" width="3.8" height="3.8" rx="1"/><circle class="xc-qd" cx="12.5" cy="12.5" r="1"/></svg>')


FRIENDS = [("lea", "lea", "part"), ("nico", "nico", "part"), ("ines", "ines.r", "invited"), ("sam", "sam.v", "can"), ("hugo", "hugo", "can")]


def share_tabs():
    return (f'<div class="seg big xc-tabs"><button type="button" class="{hole("tL", "on")}"{on("sL")}>{ic("link", 15)}Lien et QR</button>'
            f'<button type="button" class="{hole("tF", "")}"{on("sF")}>{ic("users", 15)}Amis</button></div>')


def copy_btn(cls):
    return (f'<button type="button" class="{cls}"{on("copy")}>' + when("notCopied", f'{ic("link", 16)}Copier le lien')
            + when("copied", f'{ic("check", 16)}Lien copié !', False) + '</button>')


def share_preview():
    return (f'<div class="xc-prev"><span class="xc-pi">{ic("film", 22)}</span><span class="xc-pt"><b>Soirée chez Léa</b>'
            f'<span>Vendredi 14 novembre à 21 h</span><span>6 participants</span></span></div>')


def share_url(target="50-invitation"):
    return f'<a class="xc-url"{href(target)}><code>movie-picker.fr/e/soiree-chez-lea-7k2</code>{icx("ext", 15)}</a>'


def friends_panel():
    if b.DC:
        inp = f'<input class="in" value="{hx("fq")}" onChange="{hx("onFq")}" placeholder="Rechercher un ami" aria-label="Rechercher un ami">'
    else:
        inp = '<span class="in xc-ph">Rechercher un ami</span>'
    rows = ""
    for i, (k, handle, state) in enumerate(FRIENDS):
        if state == "part":
            act = '<span class="xc-tag">Déjà participant</span>'
        elif state == "invited":
            act = f'<span class="xc-tag ok">{ic("check", 13, 2.5)}Invité</span>'
        else:
            act = (when(f"can{i}", f'<button type="button" class="btn gl sm xc-inv" aria-label="Inviter {name_of(k)}"{on(f"i{i}")}>{icx("userplus", 15)}Inviter</button>')
                   + when(f"inv{i}", f'<span class="xc-tag ok">{ic("check", 13, 2.5)}Invité</span>', False))
        row = (f'<div class="xc-fr {"dis" if state == "part" else ""}">{av(k, 36)}<span class="xc-fn"><b>{name_of(k)}</b><span>@{handle}</span></span>{act}</div>')
        rows += when(f"fr{i}", row)
    empty = when("frNone", f'<p class="xc-note">{hole("frNoneTxt", "")}</p>', False)
    return f'<div class="xc-friends"><label class="xc-q">{icx("search", 17)}{inp}</label><div class="xc-frl">{rows}{empty}</div></div>'


def screen_48():
    link = f'''<div class="xc-lp"><div class="xc-qrc"><div class="xc-qrw">{qr(196)}</div><p>Ouvrez l’appareil photo pour rejoindre la soirée sur mobile.</p></div>
<div class="xc-lr">{share_preview()}<span class="xc-lab">Lien de la soirée</span>{share_url()}
<div class="xc-acts">{copy_btn("btn xc-cp")}<button type="button" class="btn gl">{icx("download", 16)}Télécharger le QR</button></div>
</div></div>'''
    return f'''<div class="S desk frame">{desk_bg(b.d_event)}
<div class="xc-modal xc-m48"><div class="xc-mh"><div><div class="ov">Vendredi 14 novembre, 21 h</div><h2 class="disp">Partager la soirée</h2></div><a class="ib" aria-label="Fermer"{href("02-soiree")}>{ic("x", 18)}</a></div>
{share_tabs()}<div class="xc-tbody">{when("isL", link)}{when("isF", friends_panel(), False)}</div></div></div>'''


def screen_57():
    link = f'''<div class="xc-lpm">{share_preview()}<div class="xc-qrw m">{qr(156)}</div><p class="xc-qh">Ouvrez l’appareil photo pour rejoindre la soirée sur mobile.</p>{share_url("20-m-invitation")}
<button type="button" class="btn full xc-nat">{ic("share", 16)}Partager</button><div class="xc-acts m">{copy_btn("btn gl")}<button type="button" class="btn gl">{icx("download", 16)}Enregistrer le QR</button></div></div>'''
    return f'''<div class="S mob frame">{mob_bg(b.m_event)}
<div class="sheet xc-sheet xc-s57"><span class="grab"></span><div class="xc-shh"><h2 class="disp">Partager la soirée</h2><a class="ib s" aria-label="Fermer"{href("12-m-soiree")}>{ic("x", 16)}</a></div>
{share_tabs()}<div class="xc-tbody m">{when("isL", link)}{when("isF", friends_panel(), False)}</div></div></div>'''


def share_js():
    names = [name_of(k) for k, *_ in FRIENDS]
    return b.component(r"""
const tab = st.tab || 'l';
o.isL = tab === 'l';
o.isF = tab === 'f';
o.tL = o.isL ? 'on' : '';
o.tF = o.isF ? 'on' : '';
o.sL = () => this.setState({ tab: 'l' });
o.sF = () => this.setState({ tab: 'f' });
const c = !!st.copied;
o.copied = c;
o.notCopied = !c;
o.copy = () => this.setState({ copied: true });
const inv = st.inv || {};
const N = __N__;
const fq = st.fq !== undefined ? st.fq : '';
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
let n = 0;
N.forEach((x, i) => {
const ok = norm(x).indexOf(norm(fq.trim())) >= 0;
if (ok) n += 1;
o['fr' + i] = ok;
o['inv' + i] = !!inv[i];
o['can' + i] = !inv[i];
o['i' + i] = () => this.setState({ inv: Object.assign({}, inv, { [i]: true }) });
});
o.fq = fq;
o.onFq = (e) => this.setState({ fq: e.target.value });
o.frNone = n === 0;
o.frNoneTxt = 'Aucun ami ne correspond à « ' + fq.trim() + ' ».';
""".replace("__N__", json.dumps(names, ensure_ascii=False)))


def sw(key, state):
    return f'<span class="xc-sw {hole(key + "C", "on" if state else "")}"><i></i></span>'


def trow(key, title, desc, state, extra=""):
    btn = f'<button type="button" class="xc-trb" role="switch"{on("t" + key)}><span class="xc-trt"><b>{title}</b><span>{desc}</span></span>{sw(key, state)}</button>'
    return f'<div class="xc-tr">{btn}{when(key, extra, state) if extra else ""}</div>'


def stepper(key, val, label, hint):
    return (f'<div class="xc-stf"><span class="xc-trt"><b>{label}</b><span>{hint}</span></span><div class="xc-step">'
            f'<button type="button" aria-label="Diminuer"{on(key + "D")}>{icx("minus", 15)}</button><b>{hole(key, val)}</b>'
            f'<button type="button" aria-label="Augmenter"{on(key + "I")}>{ic("plus", 15)}</button></div></div>')


def wheel_mode():
    cards = [("A", "Pondéré par les votes", "Plus un film a de votes, plus il a de chances de sortir.", True),
             ("B", "Aléatoire strict", "Tous les films ont exactement la même chance, les votes ne comptent pas.", False)]
    out = "".join(f'<button type="button" class="xc-ch {hole("wm" + k, "on" if sel else "")}"{on("setW" + k)}><span class="xc-rdo"></span>'
                  f'<span class="xc-trt"><b>{t}</b><span>{d}</span></span></button>' for k, t, d, sel in cards)
    return f'<div class="xc-wm"><span class="xc-fl2">Mode de la roue</span>{out}</div>'


def sec(title, body, cls=""):
    return f'<section class="xc-sec {cls}"><h3 class="xc-st">{title}</h3>{body}</section>'


def participants_block(host):
    hint = "5 personnes inscrites. 300 au maximum." if host else "300 au maximum."
    return (trow("pl", "Limiter le nombre de participants", "Sinon, jusqu’à 300 personnes peuvent rejoindre la soirée.", False,
                 stepper("mp", 8, "Participants max", hint))
            + trow("pp", "Limiter les films proposés par personne", "Sinon, chacun peut proposer jusqu’à 15 films.", True,
                   stepper("mx", 3, "Films max par personne", "15 au maximum."))
            + trow("se", "Autoriser les séries TV", "Les séries apparaîtront dans la recherche et pourront être proposées.", False))


def votes_row(votes_on):
    return trow("vl", "Limiter les votes par participant", "Chaque participant ne peut voter que pour un nombre fixe de films.", votes_on,
                stepper("mv", 2, "Votes par participant", ""))


def winners_row():
    return stepper("wc", 1, "Films gagnants", "10 au maximum.")


def draw_block(votes_on):
    return votes_row(votes_on) + wheel_mode() + winners_row()


def after_block():
    seg = (f'<div class="xc-rr"><div class="seg">' + "".join(
        f'<button type="button" class="{hole("rr" + k, "on" if k == "w" else "")}"{on("setR" + k)}>{lab}</button>'
        for k, lab in [("w", "Semaine"), ("b", "2 semaines"), ("m", "Mois")])
        + '</div><p class="xc-hint">Les participants ne sont pas réinscrits : à vous de repartager le lien.</p></div>')
    return trow("rc", "Répéter cette soirée", "À la clôture, la suivante est créée avec les mêmes réglages.", True, seg)


TPL = [("Ciné-club du mercredi", "3 films par personne, 2 votes par personne", {"pl": False, "pp": True, "mx": 3, "se": False, "vl": True, "mv": 2, "wm": "A", "wc": 1}),
       ("Soirée horreur", "2 films par personne, 6 participants max, aléatoire strict", {"pl": True, "mp": 6, "pp": True, "mx": 2, "se": False, "vl": False, "wm": "B", "wc": 1}),
       ("Marathon du samedi", "3 films gagnants, séries autorisées", {"pl": False, "pp": False, "se": True, "vl": False, "wm": "A", "wc": 3})]


def templates_card(applied, variant):
    chips = "".join(f'<button type="button" class="chip xc-tc {hole(f"tp{j}", "on" if j == applied else "")}"{on(f"ap{j}")}>'
                    + when(f"tpOn{j}", ic("check", 13, 2.5), j == applied) + f'{name}</button>' for j, (name, _, _) in enumerate(TPL))
    applied_txt = f"Configuration appliquée : {TPL[applied][1]}." if applied >= 0 else ""
    hint = when("tpAny", f'<p class="xc-tpa">{ic("check", 14, 2.5)}{hole("tpHint", applied_txt)}</p>', applied >= 0)
    idle = "Réutiliser cette configuration plus tard" if variant == "create" else "Cette configuration marche bien ?"
    if b.DC:
        name_in = f'<input class="in" value="{hx("tn")}" onChange="{hx("onTn")}" aria-label="Nom du template" placeholder="Soirée horreur">'
    else:
        name_in = '<span class="in">Nuits blanches</span>'
    editor = (f'<div class="xc-ned">{name_in}<button type="button" class="ib xc-ok" aria-label="Valider"{on("okN")}>{ic("check", 16, 2.5)}</button>'
              f'<button type="button" class="ib" aria-label="Annuler"{on("noN")}>{ic("x", 16)}</button></div>')
    bar = (f'<div class="xc-sbar">' + when("notSaved", f'<span class="xc-hint">{hole("sbHint", idle)}</span>')
           + when("saved", f'<span class="xc-tpa">{ic("check", 14, 2.5)}{hole("savedTxt", "")}</span>', False)
           + when("idle", f'<button type="button" class="btn gl sm"{on("startN")}>{icx("sparkles", 15)}Enregistrer en template</button>')
           + when("naming", editor, False) + '</div>')
    return (f'<div class="xc-tpl"><div class="xc-tph">{icx("sparkles", 15)}<b>Mes templates</b><button type="button" class="btn gh sm">Gérer</button></div>'
            f'<div class="xc-tcs">{chips}</div>{hint}{bar}</div>')


def danger(mob):
    return (f'<section class="xc-dz"><h3 class="xc-st">Zone de danger</h3><p>Ces actions sont irréversibles. Elles n’affectent que cette soirée.</p>'
            f'<div class="xc-dzb"><button type="button" class="btn gl sm xc-dg"{on("dzOpen")}>{ic("trash", 15)}Supprimer la soirée</button></div></section>')


def name_field(val):
    if b.DC:
        inp = f'<input class="in" value="{hx("evn")}" onChange="{hx("onEvn")}" aria-label="Nom de la soirée">'
    else:
        inp = f'<span class="in">{val}</span>'
    return f'<label class="fld xc-fld"><span class="fl">Nom de la soirée</span>{inp}</label>'


def date_field():
    return (f'<label class="fld xc-fld"><span class="fl">Date et heure de la soirée</span><span class="in">14/11/2026 21:00<em>{ic("cal", 16)}</em></span>'
            f'<span class="xc-hint">Soirée prévue dans 4 jours. Les participants seront prévenus si vous modifiez la date.</span></label>')


def theme_card():
    exp = (f'<div class="xc-thx"><div class="xc-thr"><span class="xc-emo" aria-label="Choisir un emoji">{icx("moon", 18)}{ic("chevd", 14)}</span><span class="in">Nuits blanches</span>'
           f'<button type="button" class="chip">{ic("x", 12)}Effacer</button></div><span class="xc-fl2">Thèmes suggérés</span>'
           f'<div class="xc-fcs">{fcs(PRESETS)}<span class="xc-fc more">13 de plus</span></div></div>')
    return (f'<div class="xc-thc {hole("thC", "")}"><button type="button" class="xc-tht"{on("tTh")}><span class="xc-thb">{icx("moon", 20)}</span>'
            f'<span class="xc-trt"><b>Nuits blanches</b><span>Thème / ambiance</span></span><span class="xc-chev">{ic("chevd", 18)}</span></button>{when("thOpen", exp, False)}</div>')


def save_chip():
    return f'<span class="xc-save"><i></i>{hole("svs", "Enregistré")}</span>'


def screen_49():
    col1 = name_field("Soirée chez Léa") + date_field() + theme_card() + templates_card(-1, "event")
    col2 = sec("Participants et films", participants_block(True)) + sec("Vote et tirage", votes_row(False) + winners_row())
    col3 = wheel_mode() + sec("Après la soirée", after_block()) + danger(False)
    return f'''<div class="S desk frame">{desk_bg(b.d_event)}
<div class="xc-modal xc-m49"><div class="xc-mh row">{ic("gear", 22)}<h2 class="disp">Paramètres de la soirée</h2>{save_chip()}<a class="ib" aria-label="Fermer"{href("02-soiree")}>{ic("x", 18)}</a></div>
<div class="xc-g49"><div class="xc-col">{col1}</div><div class="xc-col">{col2}</div><div class="xc-col">{col3}</div></div></div>{delete_confirm(False)}</div>'''


def screen_58():
    body = (name_field("Soirée chez Léa") + date_field() + theme_card() + sec("Participants et films", participants_block(True))
            + sec("Vote et tirage", draw_block(False)) + sec("Après la soirée", after_block()) + templates_card(-1, "event") + danger(True))
    return f'''<div class="S mob frame">{mob_bg(b.m_event)}
<div class="sheet xc-sheet xc-s58"><span class="grab"></span><div class="xc-shh"><h2 class="disp">Paramètres de la soirée</h2><a class="ib s" aria-label="Fermer"{href("12-m-soiree")}>{ic("x", 16)}</a></div><div class="xc-svr">{save_chip()}</div>
<div class="xc-scroll">{body}</div></div>{delete_confirm(True)}</div>'''


def settings_js(defaults, applied, variant):
    idle = "Réutiliser cette configuration plus tard" if variant == "create" else "Cette configuration marche bien ?"
    D = {"t": {k: v for k, v in defaults.items() if isinstance(v, bool)},
         "n": {"mp": [defaults.get("mp", 8), 1, 300], "mx": [defaults.get("mx", 3), 1, 15], "mv": [defaults.get("mv", 2), 1, 99], "wc": [defaults.get("wc", 1), 1, 10]},
         "wm": defaults.get("wm", "A")}
    T = [{"n": n, "s": s, "c": c} for n, s, c in TPL]
    return b.component(r"""
const g = (k, d) => (st[k] !== undefined ? st[k] : d);
const D = __D__;
const T = __T__;
const cur = {};
const edit = (patch) => this.setState(Object.assign({ dirty: true }, patch));
Object.keys(D.t).forEach((k) => {
const v = g(k, D.t[k]);
cur[k] = v;
o[k] = v;
o[k + 'C'] = v ? 'on' : '';
o['t' + k] = () => edit({ [k]: !v });
});
Object.keys(D.n).forEach((k) => {
const lo = D.n[k][1];
const hi = D.n[k][2];
const v = g(k, D.n[k][0]);
cur[k] = v;
o[k] = v;
o[k + 'D'] = () => edit({ [k]: Math.max(lo, v - 1) });
o[k + 'I'] = () => edit({ [k]: Math.min(hi, v + 1) });
});
const wm = g('wm', D.wm);
cur.wm = wm;
o.wmA = wm === 'A' ? 'on' : '';
o.wmB = wm === 'B' ? 'on' : '';
o.setWA = () => edit({ wm: 'A' });
o.setWB = () => edit({ wm: 'B' });
const rr = g('rr', 'w');
['w', 'b', 'm'].forEach((k) => {
o['rr' + k] = rr === k ? 'on' : '';
o['setR' + k] = () => edit({ rr: k });
});
const th = !!st.th;
o.thOpen = th;
o.thC = th ? 'on' : '';
o.tTh = () => this.setState({ th: !th });
const ap = g('ap', __AP__);
const same = (j) => Object.keys(T[j].c).every((k) => cur[k] === T[j].c[k]);
const match = ap >= 0 && same(ap);
T.forEach((x, j) => {
const isOn = ap === j && match;
o['tp' + j] = isOn ? 'on' : '';
o['tpOn' + j] = isOn;
o['ap' + j] = () => this.setState(Object.assign({ ap: j, nm: 0, dirty: true }, x.c));
});
o.tpAny = match;
o.tpHint = match ? 'Configuration appliquée : ' + T[ap].s + '.' : '';
const nm = g('nm', 0);
const tn = g('tn', 'Nuits blanches');
o.idle = nm === 0;
o.naming = nm === 1;
o.saved = nm === 2;
o.notSaved = nm !== 2;
o.tn = tn;
o.onTn = (e) => this.setState({ tn: e.target.value });
o.startN = () => this.setState({ nm: 1 });
o.okN = () => this.setState({ nm: tn.trim() ? 2 : 1 });
o.noN = () => this.setState({ nm: 0 });
o.savedTxt = 'Enregistré comme « ' + tn.trim() + ' ».';
o.sbHint = ap >= 0 && !match ? 'Vous avez modifié la configuration de ' + T[ap].n + '.' : (match ? 'Identique au template « ' + T[ap].n + ' ».' : '__IDLE__');
o.svs = 'Enregistré';
const evn = g('evn', 'Soirée chez Léa');
o.evn = evn;
o.onEvn = (e) => this.setState({ evn: e.target.value });
const dz = !!st.dz;
o.dz = dz;
o.dzOpen = () => this.setState({ dz: true });
o.dzNo = () => this.setState({ dz: false });
""".replace("__D__", json.dumps(D)).replace("__T__", json.dumps(T, ensure_ascii=False)).replace("__AP__", str(applied)).replace("__IDLE__", idle))


SET_DEFAULTS = {"pl": False, "pp": True, "se": False, "vl": False, "rc": True, "mp": 8, "mx": 3, "mv": 2, "wc": 1, "wm": "A"}
CREATE_DEFAULTS = {"pl": False, "pp": True, "se": False, "vl": True, "rc": False, "mp": 8, "mx": 3, "mv": 2, "wc": 1, "wm": "A"}


def screen_54():
    if b.DC:
        title = f'<input class="in" value="{hx("evn")}" onChange="{hx("onEvn")}" aria-label="Titre">'
    else:
        title = '<span class="in">Soirée chez Léa</span>'
    left = f'''<h1 class="vh">Créer une soirée</h1>
<label class="fld xc-fld"><span class="fl">Titre</span>{title}</label>
<div class="frow"><label class="fld xc-fld"><span class="fl">Date</span><span class="in">14/11/2026<em>{ic("cal", 16)}</em></span></label><label class="fld xc-fld"><span class="fl">Heure</span><span class="in">21:00<em>{ic("clock", 16)}</em></span></label></div>
{templates_card(0, "create")}<a class="btn full"{href("02-soiree")}>Créer la soirée</a>'''
    theme = (f'<div class="xc-thr"><span class="xc-emo" aria-label="Choisir un emoji">{icx("moon", 18)}{ic("chevd", 14)}</span><span class="in">Nuits blanches</span></div>'
             f'<span class="xc-fl2">Thèmes suggérés</span><div class="xc-fcs">{fcs(PRESETS)}<span class="xc-fc more">13 de plus</span></div>')
    colA = sec("Ambiance", f'<span class="xc-fl2">Thème</span>{theme}') + sec("Participants et films", participants_block(False))
    colB = sec("Vote et tirage", draw_block(True)) + f'<button type="button" class="btn gh sm xc-reset">{icx("reset", 15)}Réinitialiser les options</button>'
    right = f'''<div class="xc-adv"><a class="xc-advh"{href("08-creer")}>{ic("sliders", 17)}<b>Options avancées</b><span class="xc-chev">{icx("chevu", 17)}</span></a>
<div class="xc-advb"><div class="xc-col">{colA}</div><div class="xc-col">{colB}</div></div></div>'''
    return f'''<div class="S desk frame">{b.hdr(2, solid=True)}<div class="spot soft"></div>
<div class="xc-g54"><div class="xc-c54">{left}</div>{right}</div></div>'''


HISTORY = [
    (1, "8 nov.", "Soirée pizza", "volets", "8,4", "j", "Vous 4"),
    (1, "4 nov.", "Soirée raclette", None, None, "h", None),
    (0, "31 oct.", "Halloween chez Sam", "brume", "7,2", "j", "rate"),
    (0, "24 oct.", "Ciné-club du mercredi", "kyoto", "9,2", "h", "Vous 4,5"),
    (0, "17 oct.", "Soirée chez Inès", "marseille", "7,8", "j", "Vous 3,5"),
    (0, "10 oct.", "Ciné-club du mercredi", "phare", "8,6", "h", "Vous 4,5"),
    (0, "3 oct.", "Dimanche pluvieux", "sable", "6,4", "h", "Vous 3"),
]


def hist_row(i, item):
    month, date, title, win, rating, role, mine = item
    host = role == "h"
    crown = f'<span class="xc-crown" title="Vous organisez cette soirée">{icx("crown", 14)}</span>' if host else ""
    if win:
        thumb = f'<span class="xc-hp">{poster(win)}</span>'
        head, night, target = FILMS[win]["t"], title, "53-recap"
    else:
        thumb = f'<span class="xc-hp none">{ic("film", 18)}</span>'
        head, night, target = title, "Terminée sans film choisi", "59-m-soiree-sans-film"
    rate = ""
    if rating:
        rate = f'<span class="hr2">{b.on5(rating)}{b.star(13)}</span>'
    if mine == "rate":
        rate += f'<a class="chip xc-tor"{href("52-noter")}>À noter</a>'
    elif mine:
        rate += f'<span class="xc-mine">{mine}</span>'
    items = f'<a class="xc-mi"{href("54-creer-options")}>{icx("reset", 15)}Refaire cette soirée</a>'
    if host:
        items += f'<button type="button" class="xc-mi err"{on(f"tm{i}")}>{ic("trash", 15)}Supprimer la soirée</button>'
    menu = when(f"mn{i}", f'<div class="xc-menu">{items}</div>', False)
    row = (f'<div class="xc-hrow"><a class="xc-hl"{href(target)}>{thumb}<span class="xc-hb"><span class="xc-ht"><b>{head}</b><span>{date}</span></span>'
           f'<span class="xc-hn">{night}{crown}</span></span></a><span class="xc-hx">{rate}</span>'
           f'<button type="button" class="ib xc-dots" aria-label="Options pour {title}"{on(f"tm{i}")}>{icx("dots", 17)}</button>{menu}</div>')
    return when(f"h{i}", row, host)


def screen_55():
    months = {1: "Novembre 2026", 0: "Octobre 2026"}
    static_counts = {m: sum(1 for it in HISTORY if it[0] == m and it[5] == "h") for m in months}
    lst = ""
    for m in (1, 0):
        n = static_counts[m]
        lst += when(f"m{m}", f'<div class="xc-mh2"><h3 class="disp">{months[m]}</h3><i></i><span>{hole(f"mc{m}", f"{n} soirée" + ("s" if n > 1 else ""))}</span></div>', n > 0)
        lst += "".join(hist_row(i, it) for i, it in enumerate(HISTORY) if it[0] == m)
    lst += when("hNone", '<p class="xc-note">Aucune soirée ne correspond à ce filtre.</p>', False)
    lst += '<button type="button" class="btn gl sm xc-more2">Charger 29 soirées de plus</button>'
    chips = (f'<div class="xc-fg"><span class="xc-fl">Rôle</span><div class="xc-fcs"><button type="button" class="chip tg xc-ft {hole("roh", "on")}"{on("troh")}>Organisées par moi</button>'
             f'<button type="button" class="chip tg xc-ft {hole("roj", "")}"{on("troj")}>Rejointes</button></div></div>'
             f'<div class="xc-fg"><span class="xc-fl">Résultat</span><div class="xc-fcs"><button type="button" class="chip tg xc-ft {hole("ouw", "")}"{on("touw")}>Avec film choisi</button>'
             f'<button type="button" class="chip tg xc-ft {hole("oun", "")}"{on("toun")}>Sans film choisi</button></div></div>')
    if b.DC:
        sinp = f'<input class="in" value="{hx("hq")}" onChange="{hx("onHq")}" placeholder="Rechercher une soirée ou un film" aria-label="Rechercher une soirée ou un film">'
    else:
        sinp = '<span class="in xc-ph">Rechercher une soirée ou un film</span>'
    toolbar = (f'<div class="xc-tb"><label class="xc-q">{icx("search", 17)}{sinp}</label>'
               f'<button type="button" class="btn gl sm xc-fb {hole("foC", "on")}"{on("tFo")}>{icx("filter", 16)}Filtres' + when("hasF", f'<span class="xc-badge">{hole("fCount", "1")}</span>') + '</button>'
               f'<span class="xc-dd">{icx("sort", 15)}Date{ic("chevd", 15)}</span></div>')
    fpanel = when("fo", f'<div class="xc-fp">{chips}<div class="xc-fres"><span>{hole("cnt", "4 sur 7")}</span><button type="button" class="xc-clr"{on("clearF")}>Tout effacer</button></div></div>')
    recap = (f'<div class="xc-recap"><div><b class="disp">36</b><span>soirées terminées</span></div><div><b class="disp">29</b><span>films regardés</span></div>'
             f'<div><b class="disp">{ic("flame", 22)}4</b><span>semaines d’affilée</span></div></div>')
    pend = f'''<article class="xc-pc"><div class="xc-pch"><span class="xc-pill st-wait">{ic("clock", 13)}En suspens</span><span>Clôture automatique dans 6 jours</span></div>
<div class="xc-pcr"><div class="xc-dchip"><span>Dim.</span><b class="disp">9</b><span>Nov.</span></div><div><b class="disp xc-pct">Dimanche cocooning</b><span class="xc-pth">Comédies du dimanche</span></div></div>
<p>L’heure de la soirée est passée et aucun film n’a été choisi.</p><div class="xc-pcs">{icx("users", 14)}4 participants<span>{ic("film", 14)}5 films proposés</span></div>
<div class="xc-iva"><a class="btn sm"{href("02-soiree")}>Choisir le film</a><button type="button" class="btn gl sm"{on("cwOpen")}>Clôturer sans film</button></div></article>'''
    side = f'<aside class="xc-side"><section><h2 class="xc-st">{icx("warn", 14)}À traiter</h2>{pend}</section></aside>'
    ok = f'<a class="btn xc-dbtn"{href("59-m-soiree-sans-film")}>Clôturer sans film</a>'
    dialog = confirm("cw", "Clôturer sans choisir de film&nbsp;?", "La soirée « Dimanche cocooning » sera clôturée sans film. Cette action est définitive.", ok, "cwNo")
    return f'''<div class="S desk frame">{b.hdr(1, solid=True)}
<div class="xc-p55"><h1 class="vh">Mes soirées</h1><div class="sh xc-sh55"><h2 class="disp">Historique<em>36</em></h2><a class="more"{href("05-mes-soirees")}>{ic("left", 15)}Soirées à venir</a></div>
<div class="xc-g55"><div class="xc-main">{recap}{toolbar}{fpanel}<div class="xc-hist">{lst}</div></div>{side}</div></div>{dialog}</div>'''


def myevents_js():
    H = [{"r": it[5], "w": it[3] is not None, "m": it[0], "s": f"{it[2]} {FILMS[it[3]]['t'] if it[3] else ''}"} for it in HISTORY]
    return b.component(r"""
const H = __H__;
const ro = st.ro || { h: true };
const ou = st.ou || {};
const fo = st.fo !== false;
const hq = st.hq !== undefined ? st.hq : '';
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const nq = norm(hq.trim());
const nR = Object.keys(ro).filter((k) => ro[k]).length;
const nO = Object.keys(ou).filter((k) => ou[k]).length;
let n = 0;
const mc = [0, 0];
H.forEach((h, i) => {
const ok = (nR === 0 || ro[h.r]) && (nO === 0 || ou[h.w ? 'w' : 'n']) && (nq.length < 2 || norm(h.s).indexOf(nq) >= 0);
o['h' + i] = !!ok;
if (ok) {
n += 1;
mc[h.m] += 1;
}
});
[0, 1].forEach((m) => {
o['m' + m] = mc[m] > 0;
o['mc' + m] = mc[m] + (mc[m] > 1 ? ' soirées' : ' soirée');
});
o.hNone = n === 0;
o.cnt = n + ' sur ' + H.length;
['h', 'j'].forEach((k) => {
o['ro' + k] = ro[k] ? 'on' : '';
o['tro' + k] = () => this.setState({ ro: Object.assign({}, ro, { [k]: !ro[k] }) });
});
['w', 'n'].forEach((k) => {
o['ou' + k] = ou[k] ? 'on' : '';
o['tou' + k] = () => this.setState({ ou: Object.assign({}, ou, { [k]: !ou[k] }) });
});
o.fCount = nR + nO;
o.hasF = nR + nO > 0;
o.clearF = () => this.setState({ ro: {}, ou: {} });
o.fo = fo;
o.foC = fo ? 'on' : '';
o.tFo = () => this.setState({ fo: !fo });
o.hq = hq;
o.onHq = (e) => this.setState({ hq: e.target.value });
const mn = st.mn !== undefined ? st.mn : -1;
H.forEach((h, i) => {
o['mn' + i] = mn === i;
o['tm' + i] = () => this.setState({ mn: mn === i ? -1 : i });
});
const cw = !!st.cw;
o.cw = cw;
o.cwOpen = () => this.setState({ cw: true });
o.cwNo = () => this.setState({ cw: false });
""".replace("__H__", json.dumps(H, ensure_ascii=False)))


def screen_50():
    films = "".join(f'''<div class="xc-fc50"><div class="pw">{poster(fid)}<span class="rk">{i}</span></div>
<div class="xc-fm">{av(by, 18)}<span>{name_of(by)}</span><b class="{b.foundation.score_cls(sc)}">{b.score_txt(sc)}</b></div></div>''' for i, (fid, by, up, down, sc, mine) in enumerate(b.PROGRAM, 1))
    return f'''<div class="S desk frame">{pub_hdr()}
<div class="xc-evh xc-e50"><div class="bd2"></div><div class="xc-evc"><div class="ov">Vendredi 14 novembre, 21 h</div><h1 class="disp">Soirée chez Léa</h1>
<div class="em"><span class="xc-ptog">{stack(["adrien", "lea", "nico", "ines"], 24)}<span class="xc-plus">+2</span><span>6 participants</span></span><span class="chip">Nuits blanches</span><span>6 films</span><span>3 votants sur 6</span></div>
<div class="em xc-em2"><span class="cdn">{ic("clock", 15)}Commence dans 4 j 06 h</span></div></div></div>
<section class="xc-join"><h2>{icx("userplus", 20)}<span>Rejoindre la soirée</span></h2><p>Connectez-vous ou créez un compte pour rejoindre la soirée.</p>
<div class="xc-jb"><a class="btn"{href("21-connexion")}>Se connecter</a><a class="btn gl"{href("22-inscription")}>Créer un compte</a></div></section>
<div class="xc-s50"><div class="sh"><h2 class="disp">Les films en lice</h2></div><div class="xc-g50">{films}</div></div></div>'''


def screen_51():
    strip = ""
    for i, (fid, by, up, down, sc, mine) in enumerate(b.PROGRAM, 1):
        win = fid == "orbite"
        strip += (f'<a class="xc-mini {"win" if win else ""}"{href("04-fiche-film")}><span class="pw">{poster(fid)}</span>'
                  f'<span class="xc-mt"><b>{FILMS[fid]["t"]}</b><span>{"Gagnant" if win else av(by, 14) + name_of(by)}</span></span></a>')
    cal = when("cal", f'''<div class="xc-menu xc-calm"><span class="xc-mlab">Choisir un calendrier</span><button type="button" class="xc-mi"{on("tCal")}>{ic("cal", 15)}Google Calendar</button>
<button type="button" class="xc-mi"{on("tCal")}>{ic("cal", 15)}Outlook</button><button type="button" class="xc-mi"{on("tCal")}>{icx("download", 15)}Apple Calendar (.ics)</button></div>''', False)
    more = when("more", f'''<div class="xc-menu xc-morem"><button type="button" class="xc-mi"{on("tMore")}>{icx("circleminus", 15)}Retirer un gagnant</button>
<button type="button" class="xc-mi err"{on("rsOpen")}>{icx("reset", 15)}Repartir de zéro</button></div>''', False)
    ok = f'<a class="btn xc-dbtn"{href("02-soiree")}>Repartir de zéro</a>'
    dialog = confirm("rs", "Repartir de zéro&nbsp;?", "Tous les films gagnants seront oubliés. Les propositions et les votes restent en place.", ok, "rsNo")
    return f'''<div class="S desk frame">{b.hdr(1)}<div class="wbg xc-wbg51"></div>
<div class="xc-p51"><div class="evtop"><a class="back"{href("02-soiree")}>{ic("left", 16)}Soirée chez Léa</a><div class="ibs xc-wact"><span class="xc-done">{ic("trophy", 15)}Film gagnant désigné</span>
<span class="xc-mw"><button type="button" class="ib {hole("moreC", "")}" aria-label="Autres actions sur le tirage"{on("tMore")}>{icx("dotsh", 17)}</button>{more}</span>
<a class="ib" aria-label="Partager"{href("48-partager-soiree")}>{ic("share", 17)}</a><span class="xc-mw"><button type="button" class="ib {hole("calC", "")}" aria-label="Ajouter au calendrier"{on("tCal")}>{ic("cal", 17)}</button>{cal}</span>
<a class="ib" aria-label="Paramètres de la soirée"{href("49-reglages-soiree")}>{ic("gear", 17)}</a></div></div>
<div class="xc-g51"><div class="xc-wp">{poster("orbite")}</div>
<div class="xc-wi"><div class="ov">Ce soir, vous regardez</div><h1 class="disp">Orbite basse</h1>
<div class="hm"><span>2024</span><span>2h12</span><span class="cdn">{ic("clock", 15)}Commence dans 2 h 56</span></div>
<div class="xc-by">{av("hugo", 22)}<span>Proposé par Hugo</span></div>
<div class="xc-wa"><a class="btn gl"{href("04-fiche-film")}>{ic("info", 17)}Voir la fiche du film</a></div></div></div>
<div class="xc-strip"><span class="xc-st">Les films en lice</span><div class="xc-mins">{strip}</div></div></div>{dialog}</div>'''


def menus_js():
    return b.component(r"""
const c = !!st.cal;
const m = !!st.more;
o.cal = c;
o.calC = c ? 'on' : '';
o.tCal = () => this.setState({ cal: !c, more: false });
o.more = m;
o.moreC = m ? 'on' : '';
o.tMore = () => this.setState({ more: !m, cal: false });
o.rs = !!st.rs;
o.rsOpen = () => this.setState({ rs: true, more: false });
o.rsNo = () => this.setState({ rs: false });
""")


def screen_52():
    acts = (when("hasDraft", f'<button type="button" class="btn gh"{on("clr")}>Effacer</button><a class="btn"{href("53-recap")}>Voir les notes</a>')
            + when("noDraft", f'<a class="btn gh"{href("51-film-tire")}>Plus tard</a>', False))
    return f'''<div class="S desk frame">{desk_bg(screen_51)}
<div class="xc-modal xc-m52"><a class="ib xc-x" aria-label="Fermer"{href("51-film-tire")}>{ic("x", 18)}</a><div class="xc-stage"><div class="xc-pbg">{poster("orbite")}</div><div class="xc-stc"><div class="xc-rp">{poster("orbite")}</div>
<div class="disp xc-rt">Orbite basse</div><div class="xc-rf"><span>2024</span><span>2h12</span></div></div></div>
<div class="xc-rpan">{rating_panel()}<div class="xc-ra">{acts}</div></div></div></div>'''


def rate_js():
    return b.component(r"""
const r = st.r !== undefined ? st.r : 4;
for (let n = 1; n <= 5; n++) {
o['s' + n] = n <= r ? 'on' : '';
o['r' + n] = () => this.setState({ r: n });
}
o.val = r + ' sur 5';
o.hasDraft = r > 0;
o.noDraft = r === 0;
o.clr = () => this.setState({ r: 0 });
""")


def screen_53():
    return f'''<div class="S desk frame">{pub_hdr()}<div class="xc-rbg"></div>
<div class="xc-p53"><div class="evtop"><a class="back"{href("05-mes-soirees")}>{ic("left", 16)}Retour</a><a class="ib" aria-label="Partager le recap"{href("61-m-story")}>{ic("share", 17)}</a></div>
<div class="ov xc-eye">{icx("clapper", 15)}Le recap de la soirée</div><h1 class="disp xc-h53">Soirée chez Léa</h1>
<div class="em xc-meta"><span>Vendredi 14 novembre à 21 h</span>{stack(["adrien", "lea", "nico", "ines"], 24)}<span>6 participants</span><span>6 films proposés</span><span class="chip">Nuits blanches</span></div>
<div class="xc-g53"><div><div class="xc-wcard"><div class="xc-wcp">{poster("orbite")}</div><div class="xc-wci"><div class="ov">Le film de la soirée</div><div class="disp xc-wt">Orbite basse</div>
<div class="xc-rf"><span>2024</span><span>2h12</span></div><div class="xc-by">{av("hugo", 20)}<span>Proposé par Hugo</span></div>
<div class="xc-srow2"><div class="xc-score"><b class="disp">3,8</b>{b.star(26)}<span>6 notes</span></div><a class="btn gl sm"{href("04-fiche-film")}>{ic("info", 16)}Voir la fiche du film</a></div></div></div>
<div class="xc-cta"><div><div class="disp">Et la prochaine&nbsp;?</div><p>Sur Movie Picker, chacun propose ses films, tout le monde vote et la roue tranche. Gratuit, rien à installer.</p></div>
<a class="btn"{href("22-inscription")}>Organisez la vôtre</a><a class="btn gl"{href("02-soiree")}>Voir la soirée{ic("right", 15)}</a></div></div>{rating_notes(RATED)}</div></div></div>'''


def screen_59():
    rows = ""
    for fid, by, up, down, sc, mine in b.PROGRAM:
        rows += (f'<a class="xc-pr"{href("17-m-fiche-film")}><span class="pw">{poster(fid)}</span><span class="xc-prb"><b>{FILMS[fid]["t"]}</b>'
                 f'<span>{av(by, 14)}{name_of(by)}</span></span><span class="xc-prs {b.foundation.score_cls(sc)}">{b.score_txt(sc)}</span></a>')
    return f'''<div class="S mob frame"><div class="mhd xc-mhd59"><div class="bd2 xc-gray"></div>{b.sbar()}{b.m_top("Mes soirées", "16-m-mes-soirees", ())}
<div class="mhc"><div class="ov">Ven. 14 nov., 21 h</div><h1 class="disp">Soirée chez Léa</h1><div class="em">{stack(["adrien", "lea", "nico", "ines"], 20)}<span class="xc-pill st-done">Terminée</span><span>6 films</span></div></div></div>
<div class="xc-closed"><span class="xc-ci">{ic("film", 24)}</span><h2 class="disp">Aucun film n’a été choisi</h2><p>La soirée est clôturée. Vous pouvez en créer une nouvelle quand vous voulez.</p></div>
<div class="xc-pl59 xc-scroll"><div class="sh"><h2 class="disp">Les films proposés</h2><span class="more">6 films</span></div>{rows}</div>
{b.mnav(1)}</div>'''


def screen_60():
    return f'''<div class="S mob frame"><div class="xc-rbg m"></div>{b.sbar()}{b.m_top("Retour", "16-m-mes-soirees", (("share", "61-m-story", "Partager le recap"),))}
<div class="xc-scroll xc-r60"><div class="ov xc-eye">{icx("clapper", 14)}Le recap de la soirée</div><h1 class="disp xc-h60">Soirée chez Léa</h1>
<div class="xc-meta m"><span>Vendredi 14 novembre à 21 h</span><span class="xc-mrow">{stack(["adrien", "lea", "nico", "ines"], 20)}<span>6 participants, 6 films proposés</span></span></div>
<div class="xc-wcard m"><div class="xc-wcp">{poster("orbite")}</div><div class="xc-wci"><div class="ov">Le film de la soirée</div><div class="disp xc-wt">Orbite basse</div>
<div class="xc-rf"><span>2024</span><span>2h12</span></div><div class="xc-by">{av("hugo", 18)}<span>Proposé par Hugo</span></div><div class="xc-score"><b class="disp">3,8</b>{b.star(20)}<span>6 notes</span></div></div></div>
<a class="btn gl full xc-fiche"{href("17-m-fiche-film")}>{ic("info", 16)}Voir la fiche du film</a>
{rating_notes(RATED, me="adrien")}
<div class="xc-cta m"><div class="disp">Et la prochaine&nbsp;?</div><p>Sur Movie Picker, chacun propose ses films, tout le monde vote et la roue tranche. Gratuit, rien à installer.</p>
<a class="btn full"{href("19-m-creer")}>Organisez la vôtre</a><a class="btn gl full"{href("12-m-soiree")}>Voir la soirée</a></div></div>
{b.mnav(1)}</div>'''


def story_film():
    return f'''<div class="xc-story"><div class="xc-sbg"></div><div class="xc-sc"><div class="xc-slogo">Movie Picker<i></i></div><div class="xc-stit disp">Soirée chez Léa</div>
<div class="xc-sdate">Vendredi 14 novembre</div><span class="xc-sth">Nuits blanches</span><div class="xc-spo">{poster("orbite")}</div><div class="disp xc-sft">Orbite basse</div>
<div class="xc-sscore"><b>3,8</b>{b.star(14)}<span>6 notes</span></div><div class="xc-sppl">{stack(["adrien", "lea", "nico", "ines"], 18)}<span>et 2 autres participants</span></div>
<div class="xc-sfoot">Le recap et les notes de chacun</div></div></div>'''


def story_notes():
    rows = "".join(f'<div class="xc-snr">{av(k, 20)}<span>{name_of(k)}</span><i><u style="width:{v * 10}%"></u></i><b>{b.on5(v)}</b></div>' for k, v in RATED)
    return f'''<div class="xc-story"><div class="xc-sbg n"></div><div class="xc-sc"><div class="xc-slogo">Movie Picker<i></i></div><div class="xc-stit disp">Soirée chez Léa</div>
<div class="xc-sdate">Vendredi 14 novembre</div><div class="xc-snh"><span class="xc-spm">{poster("orbite")}</span><span><b class="disp">Orbite basse</b><span class="xc-sscore"><b>3,8</b>{b.star(13)}</span></span></div>
<div class="xc-snl">{rows}</div><div class="xc-sfoot">Le recap et les notes de chacun</div></div></div>'''


def screen_61():
    fam = (f'<div class="seg xc-fam"><button type="button" class="{hole("fA", "on")}"{on("sA")}>{ic("film", 14)}Le film</button>'
           f'<button type="button" class="{hole("fB", "")}"{on("sB")}>{b.star(14, False)}Les notes</button></div>')
    story = f'''{fam}<div class="xc-car">{when("isFilm", story_film())}{when("isNotes", story_notes(), False)}</div>
<p class="xc-cap">Orbite basse (2024)</p><p class="xc-shint">{hole("hint", "Au format story, pour Instagram, Snapchat ou WhatsApp.")}</p>
<div class="xc-acts m"><button type="button" class="btn"{on("share")}>{ic("share", 16)}Partager</button><button type="button" class="btn gl">{icx("download", 16)}Télécharger l’image</button></div>'''
    link = f'''<div class="xc-tbody m"><div class="xc-lpm"><div class="xc-prev"><span class="xc-pi">{icx("clapper", 22)}</span><span class="xc-pt"><b>Soirée chez Léa</b><span>Orbite basse</span><span>Moyenne 3,8 sur 5, 6 notes</span></span></div>
<div class="xc-qrw m">{qr(150)}</div><p class="xc-qh">Ouvrez l’appareil photo pour ouvrir le recap sur mobile.</p><a class="xc-url"{href("60-m-recap")}><code>movie-picker.fr/r/soiree-chez-lea-7k2</code>{icx("ext", 15)}</a>
<button type="button" class="btn full xc-nat">{ic("share", 16)}Partager</button><div class="xc-acts m">{copy_btn("btn gl")}<button type="button" class="btn gl">{icx("download", 16)}Enregistrer le QR</button></div></div></div>'''
    return f'''<div class="S mob frame">{mob_bg(screen_60)}
<div class="sheet xc-sheet xc-s61"><span class="grab"></span><div class="xc-shh"><h2 class="disp">Partager le recap</h2><a class="ib s" aria-label="Fermer"{href("60-m-recap")}>{ic("x", 16)}</a></div>
<div class="seg big xc-tabs"><button type="button" class="{hole("tL", "")}"{on("sL")}>{ic("link", 15)}Lien et QR</button><button type="button" class="{hole("tS", "on")}"{on("sS")}>{icx("image", 15)}Story</button></div>
{when("isS", story)}{when("isL", link, False)}</div></div>'''


def story_js():
    return b.component(r"""
const tab = st.tab || 's';
o.isS = tab === 's';
o.isL = tab === 'l';
o.tS = o.isS ? 'on' : '';
o.tL = o.isL ? 'on' : '';
o.sS = () => this.setState({ tab: 's' });
o.sL = () => this.setState({ tab: 'l' });
const f = st.f || 'film';
o.isFilm = f === 'film';
o.isNotes = f === 'notes';
o.fA = o.isFilm ? 'on' : '';
o.fB = o.isNotes ? 'on' : '';
o.sA = () => this.setState({ f: 'film' });
o.sB = () => this.setState({ f: 'notes' });
o.hint = st.shared ? 'Lien du recap copié. Collez-le dans un sticker Lien de votre story.' : 'Au format story, pour Instagram, Snapchat ou WhatsApp.';
o.share = () => this.setState({ shared: true });
const c = !!st.copied;
o.copied = c;
o.notCopied = !c;
o.copy = () => this.setState({ copied: true });
""")


ICX_MORE = {
    "pointer": '<path d="M14 4.1 12 6"/><path d="m5.1 8-2.9-.8"/><path d="m6 12-1.9 2"/><path d="M7.2 2.2 8 5.1"/><path d="M9.04 9.69a.5.5 0 0 1 .65-.65l11 4.5a.5.5 0 0 1-.07.95l-4.35 1.04a1 1 0 0 0-.74.74l-1.04 4.35a.5.5 0 0 1-.95.07z"/>',
    "dotsh": '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    "settings2": '<path d="M20 7h-9M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
    "circleminus": '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>',
}


def norm(s):
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")


DEFAULT_Q = "le"


def confirm(flag, title, msg, ok_html, cancel, mob=False):
    return when(flag, f'''<div class="xc-cfv"></div><div class="xc-cfd{" m" if mob else ""}" role="alertdialog"><h3 class="disp">{title}</h3><p>{msg}</p>
<div class="xc-cfa"><button type="button" class="btn gh"{on(cancel)}>Annuler</button>{ok_html}</div></div>''', False)


def search_results():
    return (when("live", '<p class="xc-region">Disponibilités indicatives pour la région FR</p>')
            + when("short", '<p class="xc-note">Tapez au moins 2 caractères pour lancer une recherche.</p>', False)
            + when("none", f'<p class="xc-note">{hole("noneTxt", "")}</p>', False)
            + search_rows()
            + when("live", '<p class="xc-tmdbp">Données fournies par <b>TMDB</b></p>'))


def ev_head(actions, ptog_open=False, ptog_dc=False):
    cls = hole("ptC", "on" if ptog_open else "") if ptog_dc else ("on" if ptog_open else "")
    ptog = (f'<button type="button" class="xc-ptog {cls}"{on("tPt") if ptog_dc else ""}>{stack(["adrien", "lea", "nico", "ines"], 24)}<span class="xc-plus">+2</span>'
            f'<span>6 participants</span>{ic("chevd", 15)}</button>')
    return f'''<div class="xc-evh"><div class="bd2"></div><div class="xc-evc">
{b.event_bar(actions)}
<div class="ov">Vendredi 14 novembre, 21 h</div><h1 class="disp">Soirée chez Léa</h1>
<div class="em">{ptog}<span class="chip">Nuits blanches</span><span>6 films</span><span>3 votants sur 6</span><span class="cdn">{ic("clock", 15)}Commence dans 4 j 06 h</span></div></div></div>'''


def default_actions():
    return b.event_actions()


def delete_confirm(mob):
    ok = f'<a class="btn xc-dbtn"{href("16-m-mes-soirees" if mob else "05-mes-soirees")}>Supprimer définitivement</a>'
    return confirm("dz", "Supprimer la soirée&nbsp;?", "« Soirée chez Léa » sera supprimée définitivement. Tous les participants, films, votes et marques « déjà vu » seront également supprimés. Cette action est irréversible.", ok, "dzNo", mob)


def rating_panel(prefix=""):
    stars = "".join(f'<button type="button" class="st {hole(f"s{n}", "on" if n <= 4 else "")}" aria-label="Noter {n} étoile{"s" if n > 1 else ""}"{on(f"r{n}")}>{b.star(40)}</button>' for n in range(1, 6))
    value = (when("hasDraft", f'<b>{hole("val", "4 sur 5")}</b><span class="xc-ok2">{ic("check", 14, 2.5)}Enregistré</span>')
             + when("noDraft", '<span class="xc-pick2">Choisissez une étoile</span>', False))
    return f'<div class="ov">Votre note</div><div class="stars5 xc-stars">{stars}</div><div class="xc-rv">{value}</div><p class="xc-hint">La moitié gauche d’une étoile vaut une demi-étoile.</p>'


RATED = [("adrien", 8), ("lea", 8), ("nico", 9), ("ines", 7), ("sam", 7), ("hugo", 6)]


HOST = "adrien"


def fmt(v):
    return f"{v:.1f}".replace(".", ",")


def axis(rows):
    vals = [v for _, v in rows if v is not None]
    avg = sum(vals) / len(vals) if vals else 0
    groups = {}
    for k, v in rows:
        if v is not None:
            groups.setdefault(v, []).append(k)
    marks = "".join(f'<span class="xc-mk" style="left:{v * 10}%">{"".join(av(k, 20) for k in ks[:3])}</span>' for v, ks in sorted(groups.items()))
    ticks = "".join(f'<i style="left:{t * 20}%"><b>{t}</b></i>' for t in range(0, 6))
    return (f'<div class="xc-axis" role="img" aria-label="Échelle des notes de 0 à 5"><span class="xc-mln" style="left:{avg * 10}%"></span>'
            f'<span class="xc-avl" style="left:{avg * 10}%">Moyenne {fmt(avg / 2)}</span><div class="xc-al">{ticks}</div>{marks}</div>')


def rating_notes(rows, me=None, me_html=None):
    lis = ""
    for k, v in rows:
        name = "Vous" if k == me else name_of(k)
        crown = f'<span class="xc-crown" role="img" aria-label="hôte" title="hôte">{icx("crown", 13)}</span>' if k == HOST else ""
        if k == me and me_html is not None:
            val = me_html
        else:
            val = f'<b class="xc-n5">{b.on5(v)}{b.star(12)}</b>' if v is not None else '<span class="xc-pend2">Pas encore noté</span>'
        lis += f'<li>{av(k, 28)}<span class="xc-nn">{name}{crown}</span>{val}</li>'
    return f'<section class="xc-notes"><h3 class="xc-st">Les notes de la soirée</h3>{axis(rows)}<ul class="xc-nl">{lis}</ul></section>'


def film_row(rank, fid, by, up, down, sc, mine, tail="", cls="", extra=""):
    f = FILMS[fid]
    return (f'<div class="xc-lrow {cls}"><span class="xc-rk">{rank}</span><a class="xc-lpo"{href("04-fiche-film")}>{poster(fid)}</a>'
            f'<div class="xc-lm"><b>{f["t"]}</b><span>{av(by, 16)}{name_of(by)}<em>{f["y"]}, {f["d"]}</em></span></div>'
            f'<div class="xc-lv">{b.vote(up, down, mine)}</div><span class="xc-ls {b.foundation.score_cls(sc)}">{b.score_txt(sc)}</span>{tail}{extra}</div>')


PARTS = [("adrien", True, True), ("lea", False, False), ("nico", False, False), ("ines", False, False), ("sam", False, False), ("hugo", False, False)]


def screen_87():
    chips = ""
    for i, (k, creator, me) in enumerate(PARTS):
        name = name_of(k)
        crown = f'<span class="xc-hostb" role="img" aria-label="hôte" title="hôte">{icx("crown", 12)}</span>' if creator else ""
        rm = "" if (creator or me) else when("mg", f'<button type="button" class="xc-rmx" aria-label="Retirer {name} de la soirée" title="Retirer"{on(f"rm{i}")}>{ic("x", 13, 2.5)}</button>')
        chips += when(f"pp{i}", f'<li class="xc-pchip{" me" if me else ""}"><a class="xc-pid" aria-label="Voir le profil de {name}"{href("07-profil" if me else "64-profil-ami")}>{av(k, 24)}<span>{name}</span></a>{crown}{rm}</li>')
    manage = (f'<button type="button" class="btn gl sm xc-mgb {hole("mgC", "on")}" aria-pressed="true"{on("tMg")}>' + when("notMg", f'{icx("settings2", 15)}Gérer', False)
              + when("mg", f'{ic("check", 15, 2.5)}Terminer') + '</button>')
    panel = when("ptOpen", f'''<section class="xc-ppan"><div class="xc-pph"><h2>{ic("users", 19)}<span>Participants</span><em>({hole("pc", "6")})</em></h2>{manage}</div>
<ul class="xc-pchips">{chips}<li><a class="chip xc-invc" aria-label="Inviter des amis"{href("48-partager-soiree")}>{icx("userplus", 14)}Inviter</a></li></ul></section>''')
    rows = "".join(film_row(i, *p) for i, p in enumerate(b.PROGRAM, 1))
    ok = f'<button type="button" class="btn xc-dbtn"{on("cfOk")}>Retirer</button>'
    dialog = confirm("cf", "Retirer un participant", f'Retirer {hole("cfName", "Sam")} de la soirée&nbsp;? Ses films, votes et marques seront supprimés.', ok, "cfNo")
    return f'''<div class="S desk frame">{b.hdr(1)}{ev_head(default_actions(), True, True)}
<div class="xc-body8 cut">{panel}<div class="xc-films"><div class="xc-lhd"><span class="xc-st">Les films en lice</span></div>{rows}</div></div>{dialog}</div>'''


def js_87():
    names = [name_of(k) for k, *_ in PARTS]
    return b.component(r"""
const N = __N__;
const pt = st.pt !== false;
o.ptOpen = pt;
o.ptC = pt ? 'on' : '';
o.tPt = () => this.setState({ pt: !pt });
const mg = st.mg !== false;
o.mg = mg;
o.notMg = !mg;
o.mgC = mg ? 'on' : '';
o.tMg = () => this.setState({ mg: !mg });
const gone = st.gone || {};
let c = 0;
N.forEach((x, i) => {
o['pp' + i] = !gone[i];
if (!gone[i]) c += 1;
o['rm' + i] = () => this.setState({ cf: i });
});
o.pc = c;
const cf = st.cf !== undefined ? st.cf : -1;
o.cf = cf >= 0;
o.cfName = cf >= 0 ? N[cf] : '';
o.cfNo = () => this.setState({ cf: -1 });
o.cfOk = () => this.setState({ gone: Object.assign({}, gone, { [cf]: true }), cf: -1 });
""".replace("__N__", json.dumps(names, ensure_ascii=False)))


def row88(i, fid, by, up, down, sc, mine, excluded):
    f = FILMS[fid]
    static_rank = {0: 1, 1: 2, 2: 3, 3: 4, 5: 5}.get(i, "")
    rank = "" if excluded else hole(f"rk{i}", static_rank)
    open_static = i == 1 and not excluded
    item_x = f'{icx("reset", 15)}Réintégrer au tirage' if excluded else f'{ic("wheel", 15)}Exclure du tirage'
    menu = when(f"km{i}", f'''<div class="xc-menu xc-kmenu"><a class="xc-mi"{href("04-fiche-film")}>{ic("info", 15)}Voir les détails</a>
<button type="button" class="xc-mi"{on(f"k{i}")}>{ic("bookmark", 15)}Ajouter à ma liste</button><button type="button" class="xc-mi"{on(f"x{i}")}>{item_x}</button><i class="xc-msep"></i>
<span class="xc-mi">{icx("ext", 15)}Ouvrir sur Letterboxd</span><i class="xc-msep"></i><button type="button" class="xc-mi err"{on(f"rmv{i}")}>{ic("trash", 15)}Retirer</button></div>''', open_static)
    keb = (f'<button type="button" class="ib xc-keb {hole(f"kc{i}", "on" if open_static else "")}" aria-label="Plus d’actions pour « {f["t"]} »"{on(f"k{i}")}>{icx("dots", 17)}</button>')
    pick = "" if excluded else when("man", f'<a class="xc-pick" aria-label="{f["t"]} : désigner ce film comme gagnant"{href("51-film-tire")}></a>', False)
    return film_row(rank, fid, by, up, down, sc, mine, keb + menu, "exc" if excluded else "", pick)


def screen_88():
    ins = ""
    exs = ""
    for i, p in enumerate(b.PROGRAM):
        ins += when(f"in{i}", row88(i, *p, False), i != 4)
        exs += when(f"ex{i}", row88(i, *p, True), i == 4)
    pick = f'<button type="button" class="ib" aria-label="Choisir moi-même" title="Choisir moi-même"{on("tMan")}>{icx("pointer", 18)}</button>'
    acts = (when("notMan", b.event_actions(pick))
            + when("man", f'<output class="xc-selbar">{icx("pointer", 17)}<span>Choisissez le film à désigner gagnant.</span><button type="button" class="btn gl sm"{on("tMan")}>Annuler</button></output>' + f'<a class="btn gl"{href("47-proposer-un-film")}>{ic("plus", 18)}Proposer</a>', False))
    divider = when("hasEx", '<div class="xc-wdiv"><i></i><span>Hors tirage</span><i></i></div>')
    ok = f'<button type="button" class="btn xc-dbtn"{on("cfOk")}>Retirer le film</button>'
    dialog = confirm("cf", "Retirer ce film de la soirée&nbsp;?", hole("cfMsg", ""), ok, "cfNo")
    return f'''<div class="S desk frame">{b.hdr(1)}{ev_head(acts)}
<div class="xc-body8"><div class="xc-films {hole("manC", "")}"><div class="xc-lhd"><span class="xc-st">Les films en lice</span><div class="seg"><span>{ic("grid", 15)}</span><span class="on">{ic("list", 15)}</span></div></div>{ins}{divider}{exs}</div></div>{dialog}</div>'''


def js_88():
    P = [{"t": FILMS[fid]["t"], "v": up + down} for fid, by, up, down, sc, mine in b.PROGRAM]
    return b.component(r"""
const P = __P__;
const ex = st.ex || { 4: true };
const gone = st.gone || {};
const km = st.km !== undefined ? st.km : 1;
const man = !!st.man;
let r = 0;
let anyEx = false;
P.forEach((p, i) => {
const isIn = !ex[i] && !gone[i];
const isEx = !!ex[i] && !gone[i];
if (isEx) anyEx = true;
o['in' + i] = isIn;
o['ex' + i] = isEx;
if (isIn) r += 1;
o['rk' + i] = isIn ? r : '';
o['km' + i] = km === i && !man;
o['kc' + i] = km === i && !man ? 'on' : '';
o['k' + i] = () => this.setState({ km: km === i ? -1 : i });
o['x' + i] = () => this.setState({ ex: Object.assign({}, ex, { [i]: !ex[i] }), km: -1 });
o['rmv' + i] = () => this.setState({ rm: i, km: -1 });
});
o.hasEx = anyEx;
o.man = man;
o.notMan = !man;
o.manC = man ? 'pick' : '';
o.tMan = () => this.setState({ man: !man, km: -1 });
const rm = st.rm !== undefined ? st.rm : -1;
o.cf = rm >= 0;
o.cfMsg = rm >= 0 ? '« ' + P[rm].t + ' » sera retiré des films proposés. ' + (P[rm].v === 1 ? 'Son vote et les marques « déjà vu » seront supprimés.' : 'Ses ' + P[rm].v + ' votes et les marques « déjà vu » seront supprimés.') + ' Cette action est irréversible.' : '';
o.cfNo = () => this.setState({ rm: -1 });
o.cfOk = () => this.setState({ gone: Object.assign({}, gone, { [rm]: true }), rm: -1 });
""".replace("__P__", json.dumps(P, ensure_ascii=False)))


WIN2 = [("orbite", "hugo", [("adrien", None), ("lea", 8), ("nico", 9), ("ines", 7), ("sam", 7), ("hugo", 6)]),
        ("projo", "nico", [("adrien", None), ("lea", 9), ("nico", 8), ("ines", 7), ("sam", 8), ("hugo", 7)])]


def screen_89():
    tiles = ""
    for j, (fid, by, rows) in enumerate(WIN2):
        tiles += (f'<li class="xc-tile"><button type="button" class="xc-tbtn {hole(f"t{j}", "on" if j == 0 else "")}" aria-pressed="{"true" if j == 0 else "false"}" aria-label="{FILMS[fid]["t"]}"{on(f"sel{j}")}>{poster(fid)}</button>'
                  + when(f"toR{j}", f'<button type="button" class="btn gl sm xc-tor2" aria-label="Noter {FILMS[fid]["t"]}"{on(f"rate{j}")}>À noter</button>')
                  + when(f"rd{j}", f'<span class="xc-tsc">{hole(f"avg{j}", "")}{b.star(13)}</span>', False) + '</li>')
    bodies = ""
    for j, (fid, by, rows) in enumerate(WIN2):
        f = FILMS[fid]
        vals = [v for _, v in rows if v is not None]
        avg = fmt(sum(vals) / len(vals) / 2)
        me_html = f'<span class="xc-pend2">{hole(f"me{j}", "Pas encore noté")}</span>'
        body = f'''<div class="xc-wb"><div class="ov">Les 2 films de la soirée</div><h2 class="disp">{f["t"]}</h2><div class="xc-rf"><span>{f["y"]}</span><span>{f["d"]}</span></div>
<div class="xc-by">{av(by, 18)}<span>Proposé par {name_of(by)}</span></div><div class="xc-score"><b class="disp">{avg}</b>{b.star(20)}<span>{len(vals)} notes</span></div>
{when(f"toR{j}", f'<button type="button" class="btn full xc-rate"{on(f"rate{j}")}>{b.star(16)}Noter ce film</button>')}
<div class="xc-wbb"><a class="btn gl"{href("17-m-fiche-film")}>{ic("info", 16)}Voir la fiche du film</a><a class="btn gh"{href("60-m-recap")}>Voir le recap{ic("right", 15)}</a></div></div>{rating_notes(rows, me="adrien", me_html=me_html)}'''
        bodies += when(f"w{j}", body, j == 0)
    stage = ""
    for j, (fid, by, rows) in enumerate(WIN2):
        f = FILMS[fid]
        stage += when(f"d{j}", f'<div class="xc-pbg">{poster(fid)}</div><div class="xc-dfilm"><span class="xc-dpo">{poster(fid)}</span><div><h2 class="disp">{f["t"]}</h2><div class="xc-rf"><span>{f["y"]}</span><span>{f["d"]}</span></div></div></div>', False)
    acts = (when("noDraft", f'<button type="button" class="btn gh xc-wide"{on("next")}>{hole("skipL", "Passer ce film")}</button>')
            + when("hasDraft", f'<button type="button" class="btn gh"{on("clr")}>Effacer</button><button type="button" class="btn xc-wide"{on("next")}>{hole("nextL", "Film suivant")}</button>', False))
    dlg = when("dlg", f'''<div class="xc-rdlg"><div class="xc-rdst"><button type="button" class="ib s close xc-rdx" aria-label="Fermer"{on("close")}>{ic("x", 16)}</button>
<div class="xc-rdpos"><span class="xc-posl">{hole("pos", "Film 1 sur 2")}</span>{when("hasPrev", f'<span class="xc-prevs">{hole("prev", "")}</span>', False)}</div>{stage}</div>
<div class="xc-rdpan">{rating_panel()}<div class="xc-ra">{acts}</div></div></div>''', False)
    return f'''<div class="S mob frame"><div class="xc-bgclip"><div class="xc-pbg m">{poster("orbite")}</div></div>{b.sbar()}{b.m_top("Mes soirées", "16-m-mes-soirees", (("share", "61-m-story", "Partager le recap"),))}
<div class="xc-89h"><div class="ov">Ven. 14 nov., 21 h</div><div class="xc-89t"><h1 class="disp">Soirée chez Léa</h1><span class="xc-pill st-done">Terminée</span></div></div>
<div class="xc-scroll xc-89s"><ol class="xc-tiles">{tiles}</ol>{bodies}</div>{dlg}{b.mnav(1)}</div>'''


def js_89():
    avgs = []
    for fid, by, rows in WIN2:
        others = [v for k, v in rows if v is not None]
        avgs.append(others)
    return b.component(r"""
const O = __O__;
const fmt = (x) => x.toFixed(1).replace('.', ',');
const sel = st.sel || 0;
const R = st.R || [0, 0];
const dlg = st.dlg !== undefined ? st.dlg : -1;
[0, 1].forEach((j) => {
o['w' + j] = sel === j;
o['t' + j] = sel === j ? 'on' : '';
o['sel' + j] = () => this.setState({ sel: j });
o['rate' + j] = () => this.setState({ dlg: j, sel: j });
o['toR' + j] = !R[j];
o['rd' + j] = !!R[j];
const all = R[j] ? O[j].concat([R[j] * 2]) : O[j];
o['avg' + j] = fmt(all.reduce((a, b) => a + b, 0) / all.length / 2);
o['me' + j] = R[j] ? R[j] + ' sur 5' : 'Pas encore noté';
o['d' + j] = dlg === j;
});
o.dlg = dlg >= 0;
const cur = dlg >= 0 ? R[dlg] : 0;
for (let n = 1; n <= 5; n++) {
o['s' + n] = n <= cur ? 'on' : '';
o['r' + n] = () => {
const R2 = R.slice();
R2[dlg] = n;
this.setState({ R: R2 });
};
}
o.val = cur + ' sur 5';
o.hasDraft = cur > 0;
o.noDraft = cur === 0;
o.pos = 'Film ' + (dlg + 1) + ' sur 2';
o.hasPrev = dlg === 1 && R[0] > 0;
o.prev = 'Orbite basse : ' + R[0] + ' sur 5 enregistré';
o.skipL = dlg === 0 ? 'Passer ce film' : 'Plus tard';
o.nextL = dlg === 0 ? 'Film suivant' : 'Voir les notes';
o.next = () => this.setState(dlg === 0 ? { dlg: 1, sel: 1 } : { dlg: -1 });
o.clr = () => {
const R2 = R.slice();
R2[dlg] = 0;
this.setState({ R: R2 });
};
o.close = () => this.setState({ dlg: -1 });
""".replace("__O__", json.dumps(avgs)))


def screen_90():
    rows = ""
    for i, (fid, by, up, down, sc, mine) in enumerate(b.PROGRAM, 1):
        f = FILMS[fid]
        rows += (f'<div class="mr"><span class="rk">{i}</span><a class="pw"{href("17-m-fiche-film")}>{poster(fid)}</a><div class="mi"><div class="t">{f["t"]}</div>'
                 f'<div class="m">{av(by, 14)}<span>{name_of(by)}</span><span class="g {b.foundation.score_cls(sc)}">{b.score_txt(sc)}</span></div></div><div class="vt">{b.vote(up, down, mine)}</div></div>')
    banner = f'''<section class="xc-pend"><div class="xc-pendh"><span class="xc-pico st-wait">{ic("clock", 17)}</span><span class="xc-kick">En suspens</span></div>
<p class="xc-ptx">L’heure de la soirée est passée et aucun film n’a été choisi.</p><p class="xc-pmeta">Sans action de votre part, la soirée se clôture automatiquement dans 7 jours.</p>
<div class="xc-pa"><a class="btn sm"{href("13-m-roue")}>{ic("wheel", 15)}Lancer la roue</a><a class="btn gl sm"{href("58-m-reglages-soiree")}>Reprogrammer</a><button type="button" class="btn gh sm"{on("cwOpen")}>Clôturer sans film</button></div></section>'''
    ok = f'<a class="btn xc-dbtn"{href("59-m-soiree-sans-film")}>Clôturer sans film</a>'
    dialog = confirm("cw", "Clôturer sans choisir de film&nbsp;?", "La soirée « Soirée chez Léa » sera clôturée sans film. Cette action est définitive.", ok, "cwNo", True)
    return f'''<div class="S mob frame"><div class="mhd xc-mhd90"><div class="bd2"></div>{b.sbar()}{b.m_top("Mes soirées", "16-m-mes-soirees", (("plus", "56-m-proposer", "Proposer un film"), ("share", "57-m-partager", "Partager"), ("gear", "58-m-reglages-soiree", "Paramètres de la soirée")))}
<div class="mhc"><div class="ov">Ven. 14 nov., 21 h</div><h1 class="disp">Soirée chez Léa</h1><div class="em">{stack(["adrien", "lea", "nico", "ines"], 20)}<span>6 films</span><span>3 votants sur 6</span></div></div></div>
<div class="xc-scroll xc-90s">{banner}<div class="xc-ml90">{rows}</div></div>{dialog}{b.mnav(1)}</div>'''


def js_90():
    return b.component(r"""
const cw = !!st.cw;
o.cw = cw;
o.cwOpen = () => this.setState({ cw: true });
o.cwNo = () => this.setState({ cw: false });
""")


CSS = r"""
.S .xc-dim{overflow:hidden;z-index:1}
.S .xc-under{overflow:hidden}
.S .xc-modal{position:absolute;left:50%;transform:translateX(-50%);border-radius:18px;background:var(--s1);box-shadow:0 40px 100px -20px #000,inset 0 0 0 1px var(--line);z-index:7;overflow:hidden;display:flex;flex-direction:column}
.S .xc-mh{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:22px 26px 0}
.S .xc-mh h2{font-size:36px;margin-top:6px}
.S .xc-mh.row{justify-content:flex-start;padding-bottom:4px}
.S .xc-mh.row h2{font-size:30px;margin-top:0}
.S .xc-mh.row>.ic{color:var(--tx2)}
.S .xc-mh.row .ib{margin-left:auto}
.S .xc-st{display:flex;align-items:center;gap:7px;font:700 11px/1.2 Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--tx3);margin:0 0 4px}
.S .xc-st em{font-style:normal;color:var(--tx2);letter-spacing:0}
.S .xc-lab,.S .xc-fl2{font-size:12px;font-weight:600;color:var(--tx2)}
.S .xc-fl2{display:block;margin:12px 0 8px}
.S .xc-hint{display:block;font-size:12px;line-height:1.4;color:var(--tx3)}
.S .xc-note{font-size:13px;color:var(--tx3);padding:10px 0}
.S .xc-ph{color:var(--tx3)}
.S .xc-clr{font-size:12.5px;font-weight:600;color:var(--tx2);text-decoration:underline;text-underline-offset:3px}
.S .xc-q{position:relative;display:flex;align-items:center;flex:1;min-width:0}
.S .xc-q>.ic{position:absolute;left:14px;color:var(--tx3);z-index:1;pointer-events:none}
.S .xc-q .in{width:100%;padding-left:42px;height:44px;font-size:14px}
.S .xc-srow{display:flex;align-items:center;gap:10px;padding:16px 26px 0}
.S .xc-srow.m{padding:12px 16px 0}
.S .xc-fb{height:44px;gap:8px}
.S .xc-fb.on{box-shadow:inset 0 0 0 1.5px var(--acc);color:var(--acc-tx)}
.S .xc-fbm{width:44px;height:44px}
.S .xc-rec{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:12px 26px 0}
.S .xc-rec .xc-lab{margin-right:4px}
.S .xc-rc{height:30px;gap:6px;color:var(--tx2)}
.S .xc-rec .xc-clr{margin-left:auto}
.S .xc-lh{display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--tx3);padding:4px 0 8px}
.S .xc-lhc{letter-spacing:0;text-transform:none;font-weight:600}
.S .xc-pb{display:grid;grid-template-columns:minmax(0,1fr);gap:22px;flex:1;min-height:0;padding:14px 26px 0}
.S .xc-pb.on{grid-template-columns:minmax(0,1fr) 250px}
.S .xc-pl{display:flex;flex-direction:column;min-height:0}
.S .xc-list{flex:1;min-height:0;overflow-y:auto;scrollbar-width:none;display:flex;flex-direction:column;gap:6px;padding:2px}
.S .xc-sr{display:flex;align-items:center;gap:14px;width:100%;padding:8px 14px 8px 8px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--line);text-align:left;flex:none}
.S .xc-sr.on{box-shadow:inset 0 0 0 1.5px var(--acc);background:var(--acc-soft)}
.S .xc-sr.dis{opacity:.62}
.S .xc-sp{width:40px;flex:none;border-radius:6px;overflow:hidden}
.S .xc-sb{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}
.S .xc-sb b{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.S .xc-sm{font-size:12px;color:var(--tx3)}
.S .xc-dh{font-size:12px;color:var(--tx2)}
.S .xc-pvs{display:flex;gap:6px;margin-top:2px}
.S .xc-pv{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:4px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line);font-size:12px;font-weight:600;color:var(--tx2)}
.S .xc-dl{font-size:12px;font-weight:600;color:var(--tx3);flex:none}
.S .xc-rd{width:22px;height:22px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--line2);display:inline-flex;align-items:center;justify-content:center;color:transparent;flex:none}
.S .xc-sr.on .xc-rd{background:var(--acc);box-shadow:none;color:var(--acc-c)}
.S .xc-fpan{display:flex;flex-direction:column;gap:12px;padding:4px 0 0 22px;border-left:1px solid var(--line);overflow-y:auto;scrollbar-width:none;min-height:0}
.S .xc-fg{display:flex;flex-direction:column;gap:8px}
.S .xc-fl{font-size:12px;font-weight:700;color:var(--tx2)}
.S .xc-fl em{font-style:normal;font-weight:600;color:var(--tx3);margin-left:6px}
.S .xc-fcs{display:flex;flex-wrap:wrap;gap:6px}
.S .xc-fc{display:inline-flex;align-items:center;height:26px;padding:0 11px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--line2);font-size:12px;font-weight:600;color:var(--tx2)}
.S .xc-fc.more{box-shadow:none;color:var(--tx3);text-decoration:underline;text-underline-offset:3px}
.S .xc-rng{position:relative;height:22px;margin:0 8px}
.S .xc-rng i{position:absolute;top:10px;height:3px;border-radius:999px}
.S .xc-g1{left:0;right:0;background:var(--s3)}
.S .xc-g2{left:22%;right:30%;background:var(--tx2)}
.S .xc-rng b{position:absolute;top:3px;width:16px;height:16px;margin-left:-8px;border-radius:50%;background:var(--tx);box-shadow:0 2px 6px rgba(0,0,0,.5)}
.S .xc-k1{left:22%}
.S .xc-k2{left:70%}
.S .xc-mf{display:flex;align-items:center;gap:12px;padding:16px 26px;margin-top:14px;border-top:1px solid var(--line)}
.S .xc-src{display:flex;flex-direction:column;gap:2px;font-size:12px;color:var(--tx3);margin-right:auto}
.S .xc-src b{color:var(--tx2)}
.S .xc-selt{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--tx2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.S .xc-selt .ic{color:var(--acc-tx)}
.S .xc-m47{top:34px;width:900px;height:632px}

.S .xc-sheet{display:flex;flex-direction:column}
.S .xc-shh{display:flex;align-items:center;gap:10px;padding:22px 16px 0}
.S .xc-shh h2{font-size:30px;margin-right:auto}
.S .xc-shh>.ic{color:var(--tx2)}
.S .xc-s56{height:722px}
.S .xc-s56 .xc-rec{padding:10px 16px 2px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}
.S .xc-s56 .xc-rec>*{flex:none}
.S .xc-s56 .xc-rec .xc-clr{margin-left:0}
.S .xc-s56 .xc-lh,.S .xc-s56>.xc-note{padding-left:16px;padding-right:16px}
.S .xc-s56 .xc-lh{padding-top:12px}
.S .xc-list.m{padding:2px 16px 4px}
.S .xc-list.m .xc-sr{gap:12px}
.S .xc-list.m .xc-sp{width:38px}
.S .xc-shf{display:flex;flex-direction:column;gap:8px;padding:12px 16px 18px;border-top:1px solid var(--line)}
.S .xc-shf .btn{height:52px}

.S .xc-tabs{display:flex;margin:16px 26px 0;align-self:flex-start}
.S .xc-tabs>*{flex:none}
.S .xc-tabs>*{gap:7px}
.S .xc-s57 .xc-tabs,.S .xc-s61 .xc-tabs{margin:14px 16px 0;align-self:stretch}
.S .xc-s57 .xc-tabs>*,.S .xc-s61 .xc-tabs>*{flex:1 1 0;padding:0 8px}
.S .xc-tbody{padding:20px 26px 26px;flex:1;min-height:0}
.S .xc-tbody.m{padding:16px 16px 18px;display:flex;flex-direction:column}
.S .xc-m48{top:76px;width:760px;height:528px}
.S .xc-lp{display:grid;grid-template-columns:236px 1fr;gap:28px}
.S .xc-qrc p{font-size:12.5px;line-height:1.45;color:var(--tx3);margin-top:12px;text-align:center}
.S .xc-qrw{display:flex;align-items:center;justify-content:center;padding:20px;border-radius:18px;background:var(--tx)}
.S .xc-qrw.m{align-self:center;padding:14px;margin-top:14px}
.S .xc-qb{fill:var(--tx)}
.S .xc-qm{fill:var(--bg)}
.S .xc-qd{fill:var(--acc)}
.S .xc-lr{display:flex;flex-direction:column;gap:10px;min-width:0}
.S .xc-prev{display:flex;align-items:center;gap:14px;padding:14px;border-radius:12px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line)}
.S .xc-pi{width:48px;height:48px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;background:var(--s3);color:var(--tx2);flex:none}
.S .xc-pt{display:flex;flex-direction:column;gap:3px;font-size:12.5px;color:var(--tx2)}
.S .xc-pt b{font-size:15px;color:var(--tx)}
.S .xc-lr .xc-lab{margin-top:6px}
.S .xc-url{display:flex;align-items:center;justify-content:space-between;gap:10px;height:46px;padding:0 14px;border-radius:12px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--line2);color:var(--tx2)}
.S .xc-url code{font:500 13px/1 'IBM Plex Mono',monospace;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.S .xc-acts{display:flex;gap:10px;margin-top:4px}
.S .xc-acts .btn{flex:1;height:46px;padding:0 14px;gap:8px}
.S .xc-acts.m .btn{height:46px;font-size:13px}
.S .xc-msg{font-size:12.5px;line-height:1.5;color:var(--tx3);margin-top:6px}
.S .xc-friends{display:flex;flex-direction:column;gap:12px}
.S .xc-frl{display:flex;flex-direction:column}
.S .xc-fr{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--line)}
.S .xc-fr.dis .av{opacity:.6}
.S .xc-fn{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
.S .xc-fn b{font-size:14px;font-weight:600}
.S .xc-fn span{font-size:12.5px;color:var(--tx3)}
.S .xc-tag{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 11px;border-radius:999px;background:rgba(255,255,255,.06);font-size:12px;font-weight:600;color:var(--tx3)}
.S .xc-tag.ok{color:var(--ok)}
.S .xc-inv{height:36px;padding:0 14px;gap:7px}
.S .xc-s57{height:722px}
.S .xc-lpm{display:flex;flex-direction:column;gap:10px}
.S .xc-lpm .xc-prev{padding:10px 12px}
.S .xc-lpm .xc-pi{width:42px;height:42px}
.S .xc-qh{font-size:12.5px;color:var(--tx3);text-align:center;margin-top:2px}
.S .xc-nat{height:50px;margin-top:4px}
.S .xc-acts.m{margin-top:0}

.S .xc-m49{top:14px;width:1060px;height:672px}
.S .xc-save{display:inline-flex;align-items:center;gap:7px;height:28px;padding:0 12px;border-radius:999px;background:rgba(255,255,255,.06);font-size:12px;font-weight:600;color:var(--tx2);margin-left:6px}
.S .xc-save i{width:7px;height:7px;border-radius:50%;background:var(--ok)}
.S .xc-g49{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:minmax(0,1fr);gap:30px;padding:14px 26px 20px;flex:1;min-height:0}
.S .xc-g49 .xc-col>.xc-wm{border-top:0;padding-bottom:0}
.S .xc-g49 .xc-col>.xc-wm .xc-fl2{margin-top:0}
.S .xc-col{display:flex;flex-direction:column;gap:14px;min-width:0;min-height:0;overflow-y:auto;scrollbar-width:none}
.S .xc-col::-webkit-scrollbar{display:none}
.S .xc-col>*{flex:none}
.S .xc-fld{margin:0;flex:none}
.S .frow .xc-fld{flex:1}
.S .xc-fld .in{height:44px;font-size:14px}
.S .xc-fld .xc-hint{margin-top:-1px}
.S .xc-sec{display:flex;flex-direction:column}
.S .xc-sec>.xc-st{margin-bottom:2px}
.S .xc-tr{border-top:1px solid var(--line)}
.S .xc-sec>.xc-st+.xc-tr{border-top:0}
.S .xc-trb{display:flex;align-items:center;gap:14px;width:100%;padding:10px 0;text-align:left}
.S .xc-trt{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}
.S .xc-trt b{font-size:13.5px;font-weight:600;color:var(--tx);line-height:1.3}
.S .xc-trt span{font-size:12px;line-height:1.35;color:var(--tx3)}
.S .xc-sw{position:relative;width:40px;height:24px;border-radius:999px;background:var(--s3);flex:none;transition:background .15s}
.S .xc-sw i{position:absolute;left:3px;top:3px;width:18px;height:18px;border-radius:50%;background:var(--tx3);transition:transform .15s}
.S .xc-sw.on{background:var(--acc)}
.S .xc-sw.on i{transform:translateX(16px);background:var(--tx)}
.S .xc-stf{display:flex;align-items:center;gap:14px;padding:4px 0 12px}
.S .xc-tr .xc-stf{padding:0 0 12px 14px;border-left:2px solid var(--line);margin-left:2px}
.S .xc-step{display:inline-flex;align-items:center;height:40px;border-radius:12px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line2);flex:none}
.S .xc-step button{width:38px;height:40px;display:inline-flex;align-items:center;justify-content:center;color:var(--tx2)}
.S .xc-step b{min-width:30px;text-align:center;font-size:15px;font-weight:700;font-variant-numeric:tabular-nums}
.S .xc-sec>.xc-stf{border-top:1px solid var(--line);padding-top:12px}
.S .xc-wm{display:flex;flex-direction:column;border-top:1px solid var(--line);padding-bottom:12px}
.S .xc-wm .xc-fl2{margin:12px 0 8px}
.S .xc-ch{display:flex;align-items:flex-start;gap:12px;width:100%;padding:11px 13px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--line2);text-align:left}
.S .xc-ch+.xc-ch{margin-top:8px}
.S .xc-ch.on{box-shadow:inset 0 0 0 1.5px var(--acc);background:var(--acc-soft)}
.S .xc-rdo{width:18px;height:18px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--line2);flex:none;margin-top:1px}
.S .xc-ch.on .xc-rdo{box-shadow:inset 0 0 0 5px var(--acc)}
.S .xc-rr{padding:0 0 12px 14px;border-left:2px solid var(--line);margin-left:2px;display:flex;flex-direction:column;gap:8px}
.S .xc-rr .seg{align-self:flex-start}
.S .xc-rr .seg>*{height:30px;padding:0 12px;font-size:12.5px;font-weight:600}
.S .xc-thc{border-radius:12px;box-shadow:inset 0 0 0 1px var(--line2);overflow:hidden}
.S .xc-tht{display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px;text-align:left}
.S .xc-thb{width:40px;height:40px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;background:var(--s3);color:var(--hi);flex:none}
.S .xc-chev{color:var(--tx3);display:inline-flex;transition:transform .15s}
.S .xc-thc.on .xc-chev{transform:rotate(180deg)}
.S .xc-thx{padding:0 12px 12px}
.S .xc-thr{display:flex;align-items:center;gap:8px}
.S .xc-thr .in{flex:1;height:42px;font-size:14px;min-width:0}
.S .xc-thr .chip{flex:none}
.S .xc-emo{display:inline-flex;align-items:center;gap:4px;height:42px;padding:0 10px;border-radius:12px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line2);color:var(--hi);flex:none}
.S .xc-emo .ic:last-child{color:var(--tx3)}
.S .xc-tpl{display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:12px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--line)}
.S .xc-tph{display:flex;align-items:center;gap:8px;color:var(--tx2)}
.S .xc-tph b{font-size:13.5px;color:var(--tx);margin-right:auto}
.S .xc-tph .btn{height:30px;padding:0 6px}
.S .xc-tcs{display:flex;flex-wrap:wrap;gap:6px}
.S .xc-tc{height:32px;gap:5px}
.S .xc-tc.on{background:var(--acc-soft);box-shadow:inset 0 0 0 1px var(--acc);color:var(--acc-tx)}
.S .xc-tpa{display:flex;align-items:center;gap:6px;font-size:12px;line-height:1.35;color:var(--ok)}
.S .xc-tpa .ic{flex:none}
.S .xc-sbar{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding-top:10px;border-top:1px solid var(--line)}
.S .xc-sbar .btn{height:36px}
.S .xc-ned{display:flex;align-items:center;gap:6px;width:100%}
.S .xc-ned .in{flex:1;height:40px;font-size:14px;min-width:0}
.S .xc-ned .ib{width:40px;height:40px;border-radius:12px}
.S .xc-ok{color:var(--ok)}
.S .xc-dz{display:flex;flex-direction:column;gap:5px;padding:12px 14px;border-radius:12px;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--err) 35%,transparent)}
.S .xc-dz .xc-st{color:var(--err)}
.S .xc-dz p{font-size:12px;line-height:1.4;color:var(--tx3)}
.S .xc-dzb{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.S .xc-dg{height:36px;padding:0 12px;gap:7px;color:var(--err);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--err) 40%,transparent)}
.S .xc-s58{height:742px}
.S .xc-s58 .xc-shh h2{font-size:24px;white-space:nowrap}
.S .xc-svr{padding:6px 16px 0}
.S .xc-svr .xc-save{margin-left:0}
.S .xc-scroll>*{flex:none}
.S .xc-scroll{flex:1;min-height:0;overflow-y:auto;scrollbar-width:none}
.S .xc-scroll::-webkit-scrollbar{display:none}
.S .xc-s58 .xc-scroll{display:flex;flex-direction:column;gap:14px;padding:16px 16px 28px}

.S .xc-g54{position:relative;z-index:2;display:grid;grid-template-columns:330px minmax(0,1fr);gap:32px;padding:88px 40px 0}
.S .xc-c54{display:flex;flex-direction:column;gap:12px}
.S .xc-c54 h1{font-size:40px;margin:2px 0 2px;white-space:nowrap}
.S .xc-c54 .frow{gap:12px}
.S .xc-c54 .btn.full{height:50px;margin-top:2px}
.S .xc-adv{border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line);display:flex;flex-direction:column;height:592px;overflow:hidden}
.S .xc-advh{display:flex;align-items:center;gap:10px;padding:0 20px;height:56px;border-bottom:1px solid var(--line);flex:none}
.S .xc-advh b{font-size:14.5px}
.S .xc-advh small{font-size:12px;color:var(--tx3);margin-right:auto}
.S .xc-advb{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:minmax(0,1fr);gap:26px;padding:16px 20px 0;flex:1;min-height:0}
.S .xc-advb .xc-col{padding-bottom:16px}
.S .xc-advb .xc-fl2:first-of-type{margin-top:6px}
.S .xc-advb .xc-thr{margin-bottom:2px}
.S .xc-reset{align-self:flex-start;height:34px;padding:0 6px;gap:7px}

.S .xc-p55{position:relative;padding:92px 40px 0}
.S .xc-sh55{margin-bottom:16px}
.S .xc-sh55 h2{font-size:28px}
.S .xc-g55{display:grid;grid-template-columns:minmax(0,1fr) 326px;grid-template-rows:minmax(0,1fr);gap:32px;height:532px}
.S .xc-main{display:flex;flex-direction:column;gap:10px;min-width:0;min-height:0}
.S .xc-main>*{flex:none}
.S .xc-recap{display:grid;grid-template-columns:repeat(3,1fr);border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line)}
.S .xc-recap div{display:flex;align-items:center;gap:10px;padding:12px 18px;border-left:1px solid var(--line)}
.S .xc-recap div:first-child{border-left:0}
.S .xc-recap b{display:inline-flex;align-items:center;gap:4px;font-size:32px;line-height:1}
.S .xc-recap span{font-size:12.5px;color:var(--tx2);line-height:1.25}
.S .xc-tb{display:flex;align-items:center;gap:10px}
.S .xc-tb .xc-q .in{height:40px}
.S .xc-tb .xc-fb{height:40px}
.S .xc-badge{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:var(--acc);color:var(--acc-c);font-size:12px;font-weight:700}
.S .xc-dd{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 14px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--line2);font-size:13px;font-weight:600;color:var(--tx);flex:none}
.S .xc-dd .ic{color:var(--tx3)}
.S .xc-fp{display:flex;align-items:flex-end;gap:28px;padding:12px 16px;border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line)}
.S .xc-fp .xc-fg{gap:7px}
.S .xc-ft{height:32px;padding:0 12px;font-size:12.5px}
.S .xc-fres{display:flex;flex-direction:column;align-items:flex-end;gap:6px;margin-left:auto;font-size:12.5px;font-weight:600;color:var(--tx2)}
.S .xc-main>.xc-hist{display:flex;flex-direction:column;flex:1;min-height:0;overflow-y:auto;scrollbar-width:none;padding-bottom:60px}
.S .xc-mh2{display:flex;align-items:center;gap:12px;padding:8px 0 4px}
.S .xc-mh2 h3{font-size:19px}
.S .xc-mh2 i{flex:1;height:1px;background:var(--line)}
.S .xc-mh2 span{font-size:12px;font-weight:600;color:var(--tx3)}
.S .xc-hrow{position:relative;display:flex;align-items:center;gap:14px;padding:6px 0;border-bottom:1px solid var(--line)}
.S .xc-hl{display:flex;align-items:center;gap:14px;flex:1;min-width:0}
.S .xc-hp{width:32px;flex:none;border-radius:4px;overflow:hidden}
.S .xc-hp.none{height:48px;display:inline-flex;align-items:center;justify-content:center;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line);color:var(--tx3)}
.S .xc-hb{display:flex;flex-direction:column;gap:3px;min-width:0}
.S .xc-ht{display:flex;align-items:baseline;gap:10px}
.S .xc-ht b{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.S .xc-ht span{font-size:12px;color:var(--tx3);flex:none}
.S .xc-hn{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--tx2)}
.S .xc-crown{display:inline-flex;color:var(--st-host)}
.S .xc-hx{display:flex;align-items:center;gap:10px;flex:none;font-size:13px}
.S .xc-mine{font-size:12.5px;color:var(--tx3);font-weight:600}
.S .xc-tor{height:26px}
.S .xc-dots{width:34px;height:34px;background:transparent;box-shadow:none;color:var(--tx2)}
.S .xc-menu{position:absolute;z-index:8;display:flex;flex-direction:column;min-width:220px;padding:6px;border-radius:12px;background:var(--s2);box-shadow:0 20px 50px -10px #000,inset 0 0 0 1px var(--line2)}
.S .xc-hrow .xc-menu{right:0;top:44px}
.S .xc-mi{display:flex;align-items:center;gap:10px;height:38px;padding:0 10px;border-radius:9px;font-size:13px;font-weight:600;color:var(--tx);text-align:left;white-space:nowrap}
.S .xc-mi .ic{color:var(--tx3)}
.S .xc-mi.err,.S .xc-mi.err .ic{color:var(--err)}
.S .xc-mlab{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--tx3);padding:6px 10px 4px}
.S .xc-side{display:flex;flex-direction:column;gap:14px}
.S .xc-side section{display:flex;flex-direction:column;gap:8px}
.S .xc-side .xc-st em{margin-left:2px}
.S .xc-ivc{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line)}
.S .xc-ivt{display:flex;align-items:center;gap:10px;font-size:13px;line-height:1.35;color:var(--tx2)}
.S .xc-ivt b{color:var(--tx);font-weight:600}
.S .xc-ivb{display:flex;justify-content:flex-end}
.S .xc-ivt>span{display:flex;flex-direction:column;gap:4px}
.S .xc-ivm{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--tx3);white-space:nowrap}
.S .xc-iva{display:flex;gap:4px}
.S .xc-iva .btn{height:34px;padding:0 12px;gap:6px;font-size:12.5px}
.S .xc-pc .xc-iva{gap:6px}
.S .xc-pc{display:flex;flex-direction:column;gap:7px;padding:12px 14px;border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line)}
.S .xc-pch{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;color:var(--tx3);white-space:nowrap}
.S .xc-pill{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;white-space:nowrap;border-radius:999px;background:rgba(255,255,255,.08);font-size:12px;font-weight:700;color:var(--tx)}
.S .xc-pct{font-size:22px;margin-top:2px}
.S .xc-pc p{font-size:12.5px;line-height:1.4;color:var(--tx2)}
.S .xc-pcs{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--tx3)}

.S .xc-ivh{position:relative;height:372px;overflow:hidden}
.S .xc-ivh::after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,var(--bg) 0%,rgba(10,15,28,0) 60%);pointer-events:none}
.S .xc-ivx{position:absolute;left:40px;top:96px;z-index:2;width:600px}
.S .xc-ivx h1{font-size:88px;margin:10px 0 14px;white-space:nowrap}
.S .xc-facts{display:flex;align-items:stretch;margin-top:18px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.S .xc-facts>div{display:flex;flex-direction:column;justify-content:center;padding:9px 22px;border-left:1px solid var(--line)}
.S .xc-facts>div:first-child{border-left:0;padding-left:0}
.S .xc-facts b{font-size:28px;line-height:1}
.S .xc-facts span{font-size:12px;color:var(--tx2);margin-top:2px}
.S .xc-facts .xc-fth{justify-content:center}
.S .xc-join{position:absolute;right:40px;top:96px;z-index:3;width:350px;padding:24px;border-radius:18px;background:color-mix(in srgb,var(--s1) 88%,transparent);box-shadow:inset 0 0 0 1px var(--line),0 30px 80px -20px #000;display:flex;flex-direction:column;gap:10px}
.S .xc-join .disp{font-size:30px}
.S .xc-join p{font-size:13.5px;line-height:1.5;color:var(--tx2);margin-bottom:6px}
.S .xc-join .legal{margin-top:2px}
.S .xc-s50{position:relative;z-index:2;padding:0 40px}
.S .xc-s50 .sh{margin-bottom:12px}
.S .xc-s50 .more{gap:6px}
.S .xc-g50{display:grid;grid-template-columns:repeat(6,150px);justify-content:space-between}
.S .xc-fc50 .pw{position:relative;width:150px;border-radius:6px;overflow:hidden}
.S .xc-fc50 .rk{position:absolute;left:8px;top:3px;z-index:3;font-family:Archivo,sans-serif;font-stretch:70%;font-variation-settings:'wdth' 70;font-weight:800;font-size:38px;color:transparent;-webkit-text-stroke:1.2px rgba(255,255,255,.9);line-height:1}
.S .xc-fc50 .t{font-size:12.5px;font-weight:600;margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.S .xc-fm{display:flex;align-items:center;gap:6px;margin-top:5px;font-size:12px;color:var(--tx3)}
.S .xc-fm b{margin-left:auto;font-family:Archivo,sans-serif;font-stretch:70%;font-variation-settings:'wdth' 70;font-weight:800;font-size:16px;color:var(--tx)}
.S .xc-fm b.zero,.S .xc-fm b.neg{color:var(--tx3)}

.S .xc-wbg51{opacity:.9}
.S .xc-p51{position:relative;z-index:2;padding:90px 40px 0}
.S .xc-mw{position:relative;display:inline-flex}
.S .xc-mw .ib.on,.S .xc-mw .btn.gl.on{box-shadow:inset 0 0 0 1.5px var(--tx2)}


.S .xc-g51{display:grid;grid-template-columns:250px minmax(0,1fr);gap:48px;align-items:center;margin-top:14px}
.S .xc-wp{border-radius:6px;overflow:hidden;box-shadow:0 34px 90px -12px var(--glow),0 0 0 1px rgba(255,255,255,.12)}
.S .xc-wi h1{font-size:104px;margin:12px 0 14px;white-space:nowrap}
.S .xc-by{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--tx2);margin-top:12px}
.S .xc-wi .mlab{margin:18px 0 8px}
.S .xc-wa{display:flex;gap:10px;margin-top:22px}
.S .xc-wa .btn{height:46px;padding:0 18px}
.S .xc-strip{margin-top:40px;display:flex;align-items:center;gap:20px}
.S .xc-strip .xc-st{margin:0;flex:none}
.S .xc-mins{display:flex;gap:10px;flex:1;min-width:0}
.S .xc-mini{display:flex;align-items:center;gap:8px;flex:1;min-width:0;padding:6px;border-radius:12px;background:rgba(19,26,43,.7);box-shadow:inset 0 0 0 1px var(--line)}
.S .xc-mini.win{box-shadow:inset 0 0 0 1.5px var(--acc)}
.S .xc-mini .pw{width:28px;flex:none;border-radius:4px;overflow:hidden}
.S .xc-mt{display:flex;flex-direction:column;gap:2px;min-width:0}
.S .xc-mt b{font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.S .xc-mt span{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--tx3);white-space:nowrap}
.S .xc-mini.win .xc-mt span{color:var(--tx)}


.S .xc-stage{position:relative;width:310px;flex:none;overflow:hidden}
.S .xc-stage .wbg{position:absolute;inset:0}
.S .xc-stc{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;text-align:center;padding:44px 28px 0}
.S .xc-rp{width:168px;border-radius:6px;overflow:hidden;box-shadow:0 24px 60px -12px var(--glow),0 0 0 1px rgba(255,255,255,.12);margin-bottom:22px}
.S .xc-rt{font-size:42px;margin:8px 0 6px}
.S .xc-rf{display:flex;gap:12px;font-size:13px;color:var(--tx2)}
.S .xc-rpan{position:relative;flex:1;min-width:0;padding:34px 36px 28px;display:flex;flex-direction:column}
.S .xc-rpan .xc-x{position:absolute;right:20px;top:20px}
.S .xc-rpan h2{font-size:38px}
.S .xc-rq{font-size:15px;color:var(--tx2);margin-top:6px}
.S .xc-rpan .xc-fl2{margin:20px 0 6px}
.S .xc-stars{justify-content:flex-start;margin-top:0;gap:2px}
.S .xc-stars .st{width:52px;height:52px}
.S .xc-rv{display:flex;align-items:center;gap:12px;margin:8px 0 4px}
.S .xc-rv b{font-size:15px;font-weight:600}
.S .xc-ok2{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:600;color:var(--ok)}
.S .xc-grp{margin-top:16px}
.S .xc-grp .scale{height:96px}
.S .xc-ra{display:flex;gap:10px;margin-top:auto;justify-content:flex-end}
.S .xc-ra .btn{height:46px}
.S .xc-ra .btn:first-child{margin-right:auto;padding:0 8px}

.S .xc-rbg{position:absolute;inset:0;background:radial-gradient(520px 320px at 78% 8%,rgba(56,189,248,.28),transparent 70%),radial-gradient(600px 420px at 30% 60%,rgba(59,130,246,.12),transparent 70%);pointer-events:none}
.S .xc-rbg.m{background:radial-gradient(300px 260px at 80% 0%,rgba(56,189,248,.3),transparent 70%)}
.S .xc-p53{position:relative;z-index:2;padding:80px 40px 0}
.S .xc-eye{display:flex;align-items:center;gap:8px;margin-top:4px}
.S .xc-h53{font-size:58px;margin:8px 0 10px}
.S .xc-meta{gap:14px;font-size:13.5px}
.S .xc-g53{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:24px;margin-top:18px}
.S .xc-g53>div:first-child{display:flex;flex-direction:column;gap:12px;min-width:0}
.S .xc-wcard{display:flex;gap:20px;padding:16px;border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line)}
.S .xc-wcp{width:100px;flex:none;border-radius:6px;overflow:hidden;box-shadow:0 18px 40px -12px var(--glow);align-self:flex-start}
.S .xc-wci{display:flex;flex-direction:column;align-items:flex-start;min-width:0;flex:1}
.S .xc-wt{font-size:42px;margin:6px 0 6px}
.S .xc-srow2{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;margin-top:10px}
.S .xc-srow2 .xc-score{margin:0}
.S .xc-g53 .xc-cta{margin-top:auto}
.S .xc-g53 .xc-cta{padding:14px 18px;gap:10px}
.S .xc-g53 .xc-cta .disp{font-size:24px}
.S .xc-g53 .xc-cta p{font-size:12.5px;line-height:1.4}
.S .xc-g53 .xc-cta .btn{height:44px;padding:0 16px}
.S .xc-wci .xc-by{margin-top:8px}
.S .xc-score{display:flex;align-items:center;gap:8px;color:var(--tx);margin:10px 0 12px}
.S .xc-score b{font-size:34px;line-height:1}
.S .xc-score span{font-size:12.5px;color:var(--tx2);margin-left:4px}
.S .xc-others{display:flex;flex-direction:column;gap:8px;margin-top:14px}
.S .xc-others .xc-st{margin:0}
.S .xc-ofs{display:flex;gap:10px}
.S .xc-of{position:relative;width:48px;flex:none}
.S .xc-of .pw{display:block;border-radius:4px;overflow:hidden}
.S .xc-of .av{position:absolute;right:-6px;bottom:-6px;box-shadow:0 0 0 2px var(--bg)}
.S .xc-notes{display:flex;flex-direction:column;padding:16px 18px;border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line);align-self:start}
.S .xc-nh{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.S .xc-nh .xc-st{margin:0}
.S .xc-nh>span{font-size:12.5px;color:var(--tx2)}
.S .xc-nh>span b{color:var(--tx);font-weight:700}
.S .xc-nr{display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--line)}
.S .xc-nh+.xc-nr{border-top:0}
.S .xc-nn{display:inline-flex;align-items:center;gap:6px;width:76px;font-size:13px;font-weight:600}
.S .xc-nb{flex:1;height:5px;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden}
.S .xc-nb i{display:block;height:100%;border-radius:999px;background:rgba(226,232,240,.6)}
.S .xc-nr>b{width:20px;text-align:right;font-size:14px;font-weight:700;font-variant-numeric:tabular-nums}
.S .xc-cta{display:flex;align-items:center;gap:14px;margin-top:16px;padding:16px 22px;border-radius:18px;background:linear-gradient(90deg,var(--s2),var(--s1));box-shadow:inset 0 0 0 1px var(--line)}
.S .xc-cta>div{flex:1;min-width:0}
.S .xc-cta .disp{font-size:26px}
.S .xc-cta p{font-size:13px;color:var(--tx2);margin-top:4px}
.S .xc-cta .btn{height:46px}

.S .xc-mhd59{height:232px}
.S .xc-gray{filter:grayscale(.75) brightness(.8)}
.S .xc-mhd59 .mhc h1{font-size:42px;margin:8px 0 10px;white-space:nowrap}
.S .xc-closed{position:relative;z-index:3;margin:2px 16px 0;padding:18px;border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line);display:flex;flex-direction:column;align-items:center;text-align:center}
.S .xc-ci{width:48px;height:48px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--s3);color:var(--tx2)}
.S .xc-closed h2{font-size:28px;margin:12px 0 6px}
.S .xc-closed p{font-size:13px;line-height:1.45;color:var(--tx2)}
.S .xc-cb{display:flex;gap:8px;width:100%;margin-top:14px}
.S .xc-cb .btn{height:46px;padding:0 14px;gap:8px}
.S .xc-cb .btn:first-child{flex:1}
.S .xc-pl59{padding:16px 16px 12px;height:276px}
.S .xc-pl59 .sh{margin-bottom:6px}
.S .xc-pl59 .sh h2{font-size:20px}
.S .xc-pr{display:flex;align-items:center;gap:12px;padding:6px 0;border-top:1px solid var(--line)}
.S .xc-pr .pw{width:30px;flex:none;border-radius:4px;overflow:hidden}
.S .xc-prb{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}
.S .xc-prb b{font-size:13.5px;font-weight:600}
.S .xc-prb span{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--tx3)}
.S .xc-prs{font-family:Archivo,sans-serif;font-stretch:70%;font-variation-settings:'wdth' 70;font-weight:800;font-size:18px}
.S .xc-prs.zero,.S .xc-prs.neg{color:var(--tx3)}

.S .xc-r60{position:relative;z-index:2;padding:0 16px 100px;height:calc(100% - 124px)}
.S .xc-h60{font-size:46px;margin:8px 0 8px}
.S .xc-meta.m{display:flex;flex-direction:column;gap:6px;font-size:12.5px;color:var(--tx2)}
.S .xc-mrow{display:flex;align-items:center;gap:8px}
.S .xc-wcard.m{gap:14px;padding:14px;margin-top:14px;border-radius:18px}
.S .xc-wcard.m .xc-wcp{width:84px}
.S .xc-wcard.m .xc-wt{font-size:32px;margin:6px 0 6px}
.S .xc-wcard.m .xc-score{margin:8px 0 0}
.S .xc-wcard.m .xc-score b{font-size:26px}
.S .xc-fiche{margin-top:10px;height:44px}
.S .xc-r60 .xc-notes{margin-top:12px;padding:12px 14px}
.S .xc-r60 .xc-others{margin-top:16px}
.S .xc-r60 .xc-ofs{gap:12px}
.S .xc-cta.m{flex-direction:column;align-items:stretch;gap:8px;margin-top:20px;padding:16px}
.S .xc-cta.m .btn{height:48px}

.S .xc-s61{height:742px}
.S .xc-fam{align-self:center;margin-top:14px}
.S .xc-fam>*{height:32px;padding:0 12px;gap:6px;font-size:12.5px;font-weight:600}
.S .xc-car{display:flex;justify-content:center;margin-top:14px}
.S .xc-story{position:relative;width:212px;height:376px;border-radius:14px;overflow:hidden;box-shadow:0 24px 60px -16px #000,0 0 0 1px rgba(255,255,255,.12)}
.S .xc-sbg{position:absolute;inset:0;background:radial-gradient(180px 200px at 50% 44%,rgba(59,130,246,.55),transparent 70%),radial-gradient(160px 120px at 80% 0%,rgba(56,189,248,.35),transparent 70%),#05080f}
.S .xc-sbg.n{background:radial-gradient(200px 160px at 50% 0%,rgba(56,189,248,.4),transparent 70%),#0a0f1c}
.S .xc-sc{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;text-align:center;height:100%;padding:16px 12px 12px}
.S .xc-sc>*{flex:none}
.S .xc-slogo{display:flex;align-items:center;gap:5px;font-family:Archivo,sans-serif;font-stretch:70%;font-variation-settings:'wdth' 70;font-weight:800;font-size:13px;letter-spacing:.04em;text-transform:uppercase}
.S .xc-slogo i{width:5px;height:5px;border-radius:50%;background:var(--acc)}
.S .xc-stit{font-size:24px;margin-top:10px}
.S .xc-sdate{font-size:12px;color:var(--tx2);margin-top:3px}
.S .xc-sth{display:inline-flex;height:20px;align-items:center;padding:0 8px;border-radius:999px;background:rgba(255,255,255,.1);font-size:12px;font-weight:600;margin-top:6px}
.S .xc-spo{width:80px;margin-top:10px;border-radius:5px;overflow:hidden;box-shadow:0 14px 34px -8px var(--glow)}
.S .xc-sft{font-size:22px;margin-top:10px}
.S .xc-sscore{display:inline-flex;align-items:center;gap:4px;color:var(--tx);font-size:12px;margin-top:4px}
.S .xc-sscore b{font-size:14px}
.S .xc-sscore span{color:var(--tx2);margin-left:3px}
.S .xc-sppl{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--tx2);margin-top:8px;white-space:nowrap}
.S .xc-sfoot{margin-top:auto;font-size:12px;line-height:1.3;color:var(--tx3)}
.S .xc-snh{display:flex;align-items:center;gap:10px;margin-top:12px;text-align:left;width:100%}
.S .xc-snh>span:last-child{display:flex;flex-direction:column;gap:2px}
.S .xc-snh b.disp{font-size:20px}
.S .xc-spm{width:40px;flex:none;border-radius:4px;overflow:hidden}
.S .xc-snl{display:flex;flex-direction:column;gap:7px;width:100%;margin-top:12px}
.S .xc-snr{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600}
.S .xc-snr span{width:44px;text-align:left}
.S .xc-snr i{flex:1;height:4px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
.S .xc-snr u{display:block;height:100%;background:rgba(226,232,240,.7)}
.S .xc-snr b{width:34px;text-align:right}
.S .xc-cap{text-align:center;font-size:13px;font-weight:600;margin-top:12px}
.S .xc-shint{text-align:center;font-size:12.5px;line-height:1.4;color:var(--tx3);margin:4px 24px 0;min-height:36px}
.S .xc-s61 .xc-acts{padding:12px 16px 0}
.S .xc-s61 .xc-acts .btn:first-child{flex:.8}

.S.mob .xc-sr,.S.mob .xc-trb,.S.mob .xc-ch,.S.mob .xc-tht{min-height:44px}
.S.mob .xc-rc,.S.mob .xc-clr,.S.mob .xc-tc,.S.mob .xc-fam>*,.S.mob .xc-tabs>*,.S.mob .xc-step button,.S.mob .xc-rr .seg>*{position:relative}
.S.mob .xc-rc::after,.S.mob .xc-clr::after,.S.mob .xc-tc::after,.S.mob .xc-fam>*::after,.S.mob .xc-step button::after,.S.mob .xc-rr .seg>*::after{content:'';position:absolute;left:0;right:0;top:-7px;bottom:-7px}
.S.mob .xc-tabs>*{height:44px}
.S .xc-cfv{position:absolute;inset:0;background:rgba(0,0,0,.62);z-index:20}
.S .xc-cfd{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:21;width:440px;padding:24px;border-radius:18px;background:var(--s1);box-shadow:0 40px 100px -20px #000,inset 0 0 0 1px var(--line2)}
.S .xc-cfd.m{width:323px;padding:20px}
.S .xc-cfd h3{font-size:28px}
.S .xc-cfd p{font-size:14px;line-height:1.5;color:var(--tx2);margin-top:10px}
.S .xc-cfa{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}
.S .xc-cfa .btn{height:44px;padding:0 18px}
.S .btn.xc-dbtn{background:var(--err);color:var(--bg);box-shadow:none}
.S .xc-evh{position:relative;height:252px;overflow:hidden}
.S .xc-evh::after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,var(--bg) 0%,rgba(10,15,28,0) 60%);pointer-events:none}
.S .xc-evc{position:absolute;left:40px;right:40px;top:80px;z-index:2}
.S .xc-evc>.ov{margin-top:10px}
.S .xc-evc h1{font-size:60px;margin:6px 0 10px;white-space:nowrap}
.S .xc-evc .evbar .btn{height:40px}
.S .xc-ptog{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 10px 0 4px;border-radius:999px;color:var(--tx2);font-size:14px}
.S .xc-ptog.on{background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px var(--line2);color:var(--tx)}
.S .xc-ptog.on>.ic{transform:rotate(180deg)}
.S .xc-plus{display:inline-flex;align-items:center;justify-content:center;height:24px;min-width:24px;padding:0 5px;margin-left:-14px;border-radius:999px;background:var(--s3);box-shadow:0 0 0 2px var(--bg);font-size:11px;font-weight:700;color:var(--tx)}
.S .xc-addp{position:relative;z-index:3;display:flex;flex-direction:column;margin:2px 40px 0;height:432px;padding:16px 20px 0;border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line),0 24px 60px -24px #000}
.S .xc-addh{display:flex;align-items:center;justify-content:space-between}
.S .xc-addh h3{font-size:16px;font-weight:700}
.S .xc-addp .xc-srow,.S .xc-addp .xc-rec{padding-left:0;padding-right:0}
.S .xc-addp .xc-srow{padding-top:12px}
.S .xc-addp .xc-list{margin-top:10px}
.S .xc-region{font-size:12px;color:var(--tx3);padding:2px 2px 4px}
.S .xc-tmdbp{font-size:12px;color:var(--tx3);padding:6px 2px 14px}
.S .xc-tmdbp b{color:var(--tx2)}
.S .xc-add{flex:none;height:36px;padding:0 16px;gap:6px}
.S .xc-add.off{opacity:.55}
.S .btn.xc-add.ok{background:var(--acc-soft);color:var(--acc-tx);box-shadow:inset 0 0 0 1px var(--acc)}
.S .xc-sr{cursor:default}
.S .xc-fpan{flex:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 20px;padding:12px 0 4px;border-left:0;overflow:visible}
.S .xc-fc em{font-style:normal;font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--tx3);margin-right:5px}
.S .xc-fc .ic{color:var(--tx3);margin-right:4px}
.S .xc-s56 .xc-fpan{grid-template-columns:minmax(0,1fr);padding:10px 16px 0;max-height:250px;overflow-y:auto;scrollbar-width:none}
.S .xc-s56 .xc-list.m{padding-top:10px}
.S .xc-fbm.on{box-shadow:inset 0 0 0 1.5px var(--acc);color:var(--acc-tx)}
.S .xc-g53 .xc-notes{gap:0}
.S .xc-notes .xc-st{margin:0 0 6px}
.S .xc-axis{position:relative;height:112px;margin:4px 10px 6px}
.S .xc-al{position:absolute;left:0;right:0;bottom:22px;height:2px;background:rgba(255,255,255,.14)}
.S .xc-al i{position:absolute;top:-4px;width:2px;height:10px;margin-left:-1px;background:rgba(255,255,255,.22)}
.S .xc-al b{position:absolute;top:14px;left:50%;transform:translateX(-50%);font-size:12px;font-weight:600;color:var(--tx3)}
.S .xc-mk{position:absolute;bottom:30px;transform:translateX(-50%);display:flex;flex-direction:column-reverse;gap:3px}
.S .xc-mk .av{box-shadow:0 0 0 2px var(--s1)}
.S .xc-mln{position:absolute;top:18px;bottom:22px;width:0;border-left:1.5px dashed var(--tx2);opacity:.7}
.S .xc-avl{position:absolute;top:0;transform:translateX(-50%);font-size:12px;font-weight:700;color:var(--tx);white-space:nowrap}
.S .xc-nl{list-style:none;margin:0;padding:0}
.S .xc-nl li{display:flex;align-items:center;gap:10px;padding:6px 0;border-top:1px solid var(--line);font-size:13px}
.S .xc-nl li .xc-nn{flex:1;width:auto}
.S .xc-nl li>b{font-size:14px;font-weight:700;font-variant-numeric:tabular-nums}
.S .xc-n5{display:inline-flex;align-items:center;gap:3px}
.S .xc-pend2{font-size:12.5px;color:var(--tx3)}
.S .xc-g53 .xc-notes{padding:14px 16px}
.S .xc-score b.disp{font-size:30px}
.S .xc-r60 .xc-notes .xc-axis{margin:4px 8px 4px}
.S .xc-p55 .xc-more2{align-self:center;margin-top:12px;flex:none}
.S .xc-pcr{display:flex;align-items:center;gap:12px}
.S .xc-dchip{display:flex;flex-direction:column;align-items:center;justify-content:center;width:52px;height:60px;border-radius:12px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--tx2);flex:none}
.S .xc-dchip b{font-size:26px;color:var(--tx);line-height:1}
.S .xc-pth{display:block;font-size:12.5px;color:var(--tx2);margin-top:3px}
.S .xc-pcs{gap:6px}
.S .xc-pcs span{display:inline-flex;align-items:center;gap:6px;margin-left:8px}
.S .xc-pc .xc-iva .btn{flex:1}
.S .xc-e50{height:272px}
.S .xc-e50 .xc-evc{top:92px;right:440px}
.S .xc-e50 .em{flex-wrap:wrap;row-gap:6px}
.S .xc-em2{margin-top:8px}
.S .xc-join{position:absolute;right:40px;top:100px;z-index:3;width:370px;padding:22px;border-radius:18px;background:color-mix(in srgb,var(--s1) 90%,transparent);box-shadow:inset 0 0 0 1px var(--line),0 30px 80px -20px #000;display:flex;flex-direction:column;gap:10px}
.S .xc-join h2{display:flex;align-items:center;gap:10px;font-size:18px;font-weight:700}
.S .xc-join h2 .ic{color:var(--tx2)}
.S .xc-join p{font-size:14px;line-height:1.5;color:var(--tx2)}
.S .xc-jb{display:flex;gap:10px;margin-top:4px}
.S .xc-jb .btn{flex:1;height:46px}
.S .xc-e50+.xc-join+.xc-s50{margin-top:22px}
.S .xc-wact{align-items:center}
.S .xc-done{display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 14px;border-radius:999px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px var(--line);font-size:13px;font-weight:600;color:var(--tx)}
.S .xc-morem{right:0;top:48px;min-width:230px}
.S .xc-calm{right:0;left:auto;bottom:auto;top:48px}
.S .xc-m52{top:96px;width:820px;height:470px;flex-direction:row}
.S .xc-m52>.xc-x{position:absolute;right:18px;top:18px;z-index:4}
.S .xc-pbg{position:absolute;inset:-30px;filter:blur(26px) brightness(.45) saturate(1.2);opacity:.9}
.S .xc-pbg .poster{height:100%;aspect-ratio:auto}
.S .xc-stage{width:330px}
.S .xc-stc{padding:40px 28px 0}
.S .xc-m52 .xc-rp{width:170px;margin-bottom:18px}
.S .xc-m52 .xc-rpan{justify-content:center;padding:40px}
.S .xc-m52 .ov{margin-bottom:12px}
.S .xc-rv b{font-size:18px;font-weight:700}
.S .xc-pick2{font-size:14px;color:var(--tx3);font-weight:600}
.S .xc-m52 .xc-ra{margin-top:32px}
.S .xc-m52 .xc-ra .btn:first-child{margin-right:0}
.S .xc-body8{position:relative;z-index:3;padding:0 40px}
.S .xc-body8.cut{height:448px;overflow:hidden}
.S .xc-bgclip{position:absolute;inset:0;overflow:hidden}
.S .xc-ppan{display:flex;flex-direction:column;gap:12px;padding:14px 18px 16px;margin-bottom:12px;border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line)}
.S .xc-pph{display:flex;align-items:center;justify-content:space-between}
.S .xc-pph h2{display:flex;align-items:center;gap:9px;font-size:15px;font-weight:700}
.S .xc-pph h2 .ic{color:var(--tx2)}
.S .xc-pph em{font-style:normal;font-weight:600;color:var(--tx3)}
.S .xc-mgb{height:36px;gap:7px}
.S .xc-mgb.on{box-shadow:inset 0 0 0 1.5px var(--tx2)}
.S .xc-pchips{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.S .xc-pchip{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 6px 0 6px;border-radius:999px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px var(--line)}
.S .xc-pchip.me{box-shadow:inset 0 0 0 1.5px var(--line2);background:rgba(255,255,255,.1)}
.S .xc-pid{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;padding-right:6px}
.S .xc-hostb{display:inline-flex;color:var(--st-host);margin-right:4px}
.S .xc-rmx{width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,.1);color:var(--tx)}
.S .xc-invc{height:36px;padding:0 14px;gap:7px;background:transparent;box-shadow:inset 0 0 0 1.5px var(--line2);border:0;outline:1px dashed var(--line2);outline-offset:-1px}
.S .xc-films{display:flex;flex-direction:column}
.S .xc-lhd{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.S .xc-lhd .xc-st{margin:0}
.S .xc-lrow{position:relative;display:flex;align-items:center;gap:14px;padding:5px 0;border-top:1px solid var(--line)}
.S .xc-rk{width:22px;flex:none;font-family:Archivo,sans-serif;font-stretch:70%;font-variation-settings:'wdth' 70;font-weight:800;font-size:22px;color:var(--tx3);text-align:center}
.S .xc-lpo{width:30px;flex:none;border-radius:4px;overflow:hidden;display:block}
.S .xc-lm{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}
.S .xc-lm b{font-size:14px;font-weight:600}
.S .xc-lm span{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--tx2)}
.S .xc-lm em{font-style:normal;color:var(--tx3);margin-left:4px}
.S .xc-lv{display:flex;gap:5px}
.S .xc-ls{width:34px;text-align:right;font-family:Archivo,sans-serif;font-stretch:70%;font-variation-settings:'wdth' 70;font-weight:800;font-size:18px}
.S .xc-ls.zero,.S .xc-ls.neg{color:var(--tx3)}
.S .xc-keb{width:34px;height:34px;background:transparent;box-shadow:none;color:var(--tx2)}
.S .xc-keb.on{background:rgba(255,255,255,.1);box-shadow:inset 0 0 0 1px var(--line2);color:var(--tx)}
.S .xc-kmenu{right:0;top:44px;min-width:230px}
.S .xc-msep{display:block;height:1px;margin:4px 6px;background:var(--line2)}
.S .xc-lrow.exc>*:not(.xc-keb):not(.xc-menu){opacity:.45}
.S .xc-wdiv{display:flex;align-items:center;gap:12px;padding:10px 0 6px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--tx3)}
.S .xc-wdiv i{flex:1;height:1px;background:var(--line2)}
.S .xc-wdiv+.xc-lrow{border-top:0}
.S .btn.xc-iconb{width:46px;padding:0}
.S .xc-selbar{display:inline-flex;align-items:center;gap:10px;height:46px;padding:0 6px 0 14px;border-radius:12px;background:var(--acc-soft);box-shadow:inset 0 0 0 1px var(--acc);font-size:13.5px;font-weight:600;color:var(--tx)}
.S .xc-selbar>.ic{color:var(--acc-tx)}
.S .xc-selbar .btn{height:34px}
.S .xc-pick{position:absolute;inset:0;z-index:4;display:flex;align-items:center;justify-content:flex-end;padding-right:56px;border-radius:12px;box-shadow:inset 0 0 0 1.5px var(--acc);background:color-mix(in srgb,var(--acc) 8%,transparent);color:var(--acc-tx)}
.S .xc-films.pick .xc-lrow{border-top-color:transparent;margin-bottom:4px}
.S .xc-pbg.m{position:absolute;left:-40px;right:-40px;top:-40px;height:420px;filter:blur(30px) brightness(.4) saturate(1.2);opacity:.8;overflow:hidden}
.S .xc-pbg.m .poster{width:100%}
.S .xc-89h{position:relative;z-index:3;padding:4px 18px 0}
.S .xc-89t{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px}
.S .xc-89t h1{font-size:34px}
.S .xc-89s{position:relative;z-index:2;height:556px;padding:16px 16px 24px}
.S .xc-tiles{list-style:none;margin:0;padding:0;display:flex;justify-content:center;gap:14px}
.S .xc-tile{display:flex;flex-direction:column;align-items:center;gap:8px;width:104px}
.S .xc-tbtn{display:block;width:100%;border-radius:6px;overflow:hidden;opacity:.7}
.S .xc-tbtn.on{opacity:1;outline:2px solid var(--tx);outline-offset:3px}
.S .xc-tor2{height:32px;padding:0 12px;font-size:12.5px}
.S .xc-tsc{display:inline-flex;align-items:center;gap:4px;height:32px;font-size:13px;font-weight:700;color:var(--tx)}
.S .xc-wb{display:flex;flex-direction:column;align-items:center;text-align:center;margin-top:16px}
.S .xc-wb h2{font-size:40px;margin:8px 0 6px}
.S .xc-wb .xc-score{margin:10px 0 12px}
.S .xc-wb .xc-score b.disp{font-size:26px}
.S .xc-rate{height:50px}
.S .xc-wbb{display:flex;gap:8px;width:100%;margin-top:8px}
.S .xc-wbb .btn{flex:1;height:44px;padding:0 10px;font-size:13px;gap:6px}
.S .xc-89s .xc-notes{margin-top:16px;padding:12px 14px}
.S .xc-rdlg{position:absolute;inset:0;z-index:12;display:flex;flex-direction:column;background:var(--bg)}
.S .xc-rdst{position:relative;flex:1;display:flex;flex-direction:column;justify-content:flex-end;padding:16px 18px 18px;background:radial-gradient(260px 220px at 50% 30%,rgba(59,130,246,.35),transparent 70%),var(--s1)}
.S .xc-rdst .xc-rdx.close{right:14px;top:56px;z-index:4}
.S .xc-rdst{overflow:hidden}
.S .xc-rdpos{z-index:3}
.S .xc-dfilm{position:relative;z-index:2}
.S .xc-rdpos{position:absolute;left:18px;top:62px;display:flex;flex-direction:column;gap:6px}
.S .xc-posl{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--tx2)}
.S .xc-prevs{display:inline-flex;font-size:12.5px;color:var(--ok);font-weight:600}
.S .xc-dfilm{display:flex;align-items:flex-end;gap:14px}
.S .xc-dpo{width:96px;flex:none;border-radius:6px;overflow:hidden;box-shadow:0 18px 40px -10px var(--glow)}
.S .xc-dfilm h2{font-size:28px;margin-bottom:6px}
.S .xc-rdpan{padding:20px 18px 26px}
.S .xc-rdpan .xc-stars .st{width:56px;height:56px}
.S .xc-rdpan .xc-ra{display:flex;gap:10px;margin-top:22px}
.S .xc-rdpan .xc-ra .btn{height:50px}
.S .xc-rdpan .xc-ra .btn:first-child{margin-right:0}
.S .xc-wide{flex:1}
.S .xc-mhd90{height:262px}
.S .xc-mhd90 .mhc h1{font-size:42px;white-space:nowrap}
.S .xc-90s{position:relative;z-index:3;height:446px;padding:4px 16px 20px}
.S .xc-pend{display:flex;flex-direction:column;gap:6px;padding:14px;border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line2)}
.S .xc-pendh{display:flex;align-items:center;gap:8px}
.S .xc-pico{width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--s3);color:var(--tx)}
.S .xc-kick{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--tx2)}
.S .xc-ptx{font-size:14px;font-weight:600;line-height:1.4}
.S .xc-pmeta{font-size:12.5px;line-height:1.4;color:var(--tx3)}
.S .xc-pa{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.S .xc-pa .btn{padding:0 14px;gap:7px}
.S .xc-pa .btn.gh{padding:0 6px}
.S .xc-ml90{margin-top:8px}
.S .xc-trt span,.S .xc-hint,.S .xc-hint *,.S .xc-dh,.S .xc-region,.S .xc-dz p,.S .xc-pch span,.S .xc-sfoot,.S .xc-tpa span{font-size:13px}
.S.mob .xc-tabs.seg.big>*{height:44px}
.S.mob .xc-step button{width:44px}
"""

SCREENS = {"47": screen_47, "48": screen_48, "49": screen_49, "50": screen_50, "51": screen_51, "52": screen_52, "53": screen_53, "54": screen_54,
           "55": screen_55, "56": screen_56, "57": screen_57, "58": screen_58, "59": screen_59, "60": screen_60, "61": screen_61,
           "87": screen_87, "88": screen_88, "89": screen_89, "90": screen_90}

LOGIC = {"47": search_js(), "56": search_js(), "48": share_js(), "57": share_js(),
         "49": settings_js(SET_DEFAULTS, -1, "event"), "58": settings_js(SET_DEFAULTS, -1, "event"), "54": settings_js(CREATE_DEFAULTS, 0, "create"),
         "51": menus_js(), "52": rate_js(), "55": myevents_js(), "61": story_js(), "87": js_87(), "88": js_88(), "89": js_89(), "90": js_90()}
