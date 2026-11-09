ICONS = {
    "search": '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    "bell": '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    "left": '<path d="m15 18-6-6 6-6"/>',
    "right": '<path d="m9 18 6-6-6-6"/>',
    "share": '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/>',
    "cal": '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    "gear": '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    "up": '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
    "down": '<path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>',
    "plus": '<path d="M5 12h14M12 5v14"/>',
    "compass": '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
    "bookmark": '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
    "user": '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
    "wheel": '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v7.5M12 14.5V22M2 12h7.5M14.5 12H22"/>',
    "info": '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    "check": '<path d="M20 6 9 17l-5-5"/>',
    "clock": '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    "grid": '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    "list": '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    "play": '<polygon points="6 3 20 12 6 21 6 3"/>',
}


def ic(name, size=18, stroke=2):
    return (
        f'<svg class="ic" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" '
        f'stroke="currentColor" stroke-width="{stroke}" stroke-linecap="round" stroke-linejoin="round" '
        f'aria-hidden="true">{ICONS[name]}</svg>'
    )


FILMS = {
    "orbite": dict(t="Orbite basse", y="2024", d="2h12", r="7,8", g="Science-fiction", bg="linear-gradient(180deg,#0b1a3a 0%,#05060d 100%)", f="f-arch", tc="#ffffff",
                   m='<i style="left:18%;top:14%;width:64%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 34% 30%,#eef4ff,#5d8ae6 42%,#0d1f4a 76%);box-shadow:0 0 18cqw rgba(110,160,255,.55)"></i><i style="inset:0;background-image:radial-gradient(1px 1px at 12% 20%,#fff,transparent),radial-gradient(1px 1px at 80% 12%,#fff,transparent),radial-gradient(1px 1px at 70% 62%,#fff,transparent),radial-gradient(1px 1px at 22% 70%,#fffa,transparent),radial-gradient(1px 1px at 90% 80%,#fff8,transparent)"></i>'),
    "marseille": dict(t="Les Nuits de Marseille", y="2019", d="1h54", r="7,1", g="Polar", bg="linear-gradient(180deg,#2a0f3d 0%,#c2185b 55%,#ff8a3d 100%)", f="f-fra", tc="#ffe9d6",
                      m='<i style="left:14%;top:22%;width:72%;aspect-ratio:1;border-radius:50%;background:linear-gradient(180deg,#ffe08a,#ff7b3d);-webkit-mask:repeating-linear-gradient(180deg,#000 0 9%,transparent 9% 13%);mask:repeating-linear-gradient(180deg,#000 0 9%,transparent 9% 13%)"></i><i style="left:0;right:0;bottom:0;height:36%;background:#1a0a24"></i>'),
    "projo": dict(t="Le Dernier Projectionniste", y="2016", d="2h01", r="8,2", g="Drame", bg="linear-gradient(160deg,#3a2412,#0e0905)", f="f-fra", tc="#ffe6b0",
                  m='<i style="inset:0;background:conic-gradient(from 105deg at 8% 6%,transparent 0deg,rgba(255,217,138,.6) 10deg,rgba(255,217,138,.15) 26deg,transparent 34deg)"></i><i style="left:4%;top:3%;width:10%;aspect-ratio:1;border-radius:50%;background:#ffe6a8;box-shadow:0 0 8cqw #ffd98a"></i><i style="left:0;right:0;top:58%;height:7%;background:repeating-linear-gradient(90deg,#1a120a 0 6%,#4a331a 6% 9%)"></i>'),
    "sable": dict(t="Sable noir", y="2022", d="2h28", r="6,9", g="Aventure", bg="linear-gradient(180deg,#f0b46a 0%,#b5602d 60%,#3b1d10 100%)", f="f-arch", tc="#fff3d6",
                  m='<i style="left:-30%;bottom:-6%;width:110%;height:48%;border-radius:50%;background:#8a4520"></i><i style="right:-40%;bottom:-20%;width:120%;height:50%;border-radius:50%;background:#2e160b"></i><i style="left:58%;top:14%;width:20%;aspect-ratio:1;border-radius:50%;background:#fff3d6"></i>'),
    "kyoto": dict(t="Minuit à Kyoto", y="2021", d="1h47", r="7,5", g="Romance", bg="#141414", f="f-bri", tc="#f4efe6",
                  m='<i style="left:20%;top:16%;width:60%;aspect-ratio:1;border-radius:50%;background:#e2342b"></i><i style="left:0;right:0;top:41%;height:1.6%;background:#141414"></i><i style="left:0;right:0;top:46%;height:1.6%;background:#141414"></i>'),
    "brume": dict(t="Brume", y="2023", d="1h39", r="6,4", g="Thriller", bg="linear-gradient(180deg,#9fb3ad,#3e4f4a)", f="f-fra", tc="#eef3f1",
                  m='<i style="left:-10%;right:-10%;top:24%;height:16%;background:rgba(255,255,255,.45);filter:blur(4px)"></i><i style="left:-10%;right:-10%;top:48%;height:12%;background:rgba(255,255,255,.3);filter:blur(5px)"></i><i style="left:0;right:0;bottom:0;height:42%;background:#1f2b28;clip-path:polygon(0 40%,8% 10%,14% 38%,22% 0,30% 36%,38% 14%,46% 42%,55% 6%,63% 40%,72% 18%,80% 44%,88% 12%,100% 38%,100% 100%,0 100%)"></i>'),
    "volets": dict(t="La Maison aux volets bleus", y="2018", d="1h52", r="7,3", g="Comédie", bg="linear-gradient(180deg,#f6efe2,#e6d6bd)", f="f-fra", tc="#1d3b6e",
                   m='<i style="left:20%;top:34%;width:60%;height:30%;background:#fffaf0;border:1.5px solid #1d3b6e"></i><i style="left:16%;top:17%;width:68%;height:18%;background:#c9573a;clip-path:polygon(50% 0,100% 100%,0 100%)"></i><i style="left:28%;top:41%;width:9%;height:12%;background:#2f6db5"></i><i style="left:63%;top:41%;width:9%;height:12%;background:#2f6db5"></i><i style="left:45%;top:47%;width:10%;height:17%;background:#1d3b6e"></i>'),
    "km": dict(t="Kilomètre zéro", y="2025", d="1h58", r="7,0", g="Road movie", bg="linear-gradient(180deg,#ffd23f,#f29f05)", f="f-arch", tc="#ffd23f",
               m='<i style="left:30%;top:8%;width:40%;aspect-ratio:1;border-radius:50%;background:#fff6c9;opacity:.85"></i><i style="left:0;right:0;bottom:0;height:60%;background:#262626;clip-path:polygon(46% 0,54% 0,100% 100%,0 100%)"></i><i style="left:48.8%;bottom:30%;width:2.4%;height:30%;background:repeating-linear-gradient(180deg,#ffd23f 0 12%,transparent 12% 24%)"></i>'),
    "verre": dict(t="Tempête de verre", y="2020", d="2h05", r="6,8", g="Catastrophe", bg="linear-gradient(135deg,#0f3d4a,#062027)", f="f-plex", tc="#c9f6ff",
                  m='<i style="inset:0;background:linear-gradient(115deg,transparent 38%,rgba(130,235,255,.4) 38% 45%,transparent 45%),linear-gradient(64deg,transparent 54%,rgba(255,255,255,.28) 54% 57%,transparent 57%),linear-gradient(158deg,transparent 22%,rgba(60,200,220,.32) 22% 31%,transparent 31%),linear-gradient(20deg,transparent 66%,rgba(160,250,255,.25) 66% 74%,transparent 74%)"></i>'),
    "phare": dict(t="Les Enfants du phare", y="2017", d="1h44", r="7,9", g="Famille", bg="linear-gradient(180deg,#0d1b3a,#1c3d6e)", f="f-bri", tc="#fff3c4",
                  m='<i style="inset:0;background:conic-gradient(from 248deg at 50% 40%,transparent 0deg,rgba(255,232,150,.65) 9deg,transparent 22deg)"></i><i style="left:45%;top:40%;width:10%;height:34%;background:repeating-linear-gradient(180deg,#fff 0 20%,#d8342b 20% 40%)"></i><i style="left:43%;top:36%;width:14%;height:5%;background:#ffe896;border-radius:2px"></i><i style="left:0;right:0;bottom:0;height:24%;background:#0a1530"></i>'),
}


def poster(fid, cls=""):
    f = FILMS[fid]
    return f'<div class="poster {cls}" style="background:{f["bg"]}">{f["m"]}<b class="pt {f["f"]}" style="color:{f["tc"]}">{f["t"]}</b></div>'


PEOPLE = {
    "lea": ("Léa", "#B8561C"),
    "nico": ("Nico", "#2667C9"),
    "ines": ("Inès", "#8340C4"),
    "sam": ("Sam", "#1C7D46"),
    "hugo": ("Hugo", "#B83A3A"),
    "adrien": ("Adrien", "#5B2EE0"),
}


def av(key, size=28, cls=""):
    name, color = PEOPLE[key]
    return f'<span class="av {cls}" style="width:{size}px;height:{size}px;background:{color};font-size:{round(size * .42)}px" title="{name}">{name[0]}</span>'


def stack(keys, size=28, cls=""):
    return '<span class="stack">' + "".join(av(k, size, cls) for k in keys) + "</span>"


def meta(fid, sep=""):
    f = FILMS[fid]
    return f'<span>{f["y"]}</span><span>{f["d"]}</span><span>★ {f["r"]}</span>'


def sbar():
    return '<div class="sbar"><span>21:04</span><span class="sig"><b></b><b class="bat"></b></span></div>'


PROGRAM = [
    ("projo", "nico", 4, 0, 4, "up"),
    ("orbite", "hugo", 3, 0, 3, ""),
    ("kyoto", "ines", 2, 1, 1, ""),
    ("marseille", "lea", 1, 1, 0, ""),
    ("km", "adrien", 0, 1, -1, ""),
    ("brume", "sam", 0, 2, -2, "down"),
]


def score_txt(s):
    return f"+{s}" if s > 0 else ("0" if s == 0 else f"−{abs(s)}")


def score_cls(s):
    return "pos" if s > 0 else ("zero" if s == 0 else "neg")


CSS = r"""
:root{--doc-bg:#ECEBE7;--doc-ink:#17171A;--doc-ink2:#54545C;--doc-line:#D5D3CD}
*{box-sizing:border-box;margin:0;padding:0}
a{color:inherit;text-decoration:none;cursor:default}
body{background:var(--doc-bg);color:var(--doc-ink);font:15px/1.55 Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.doc{max-width:1200px;margin:0 auto;padding:64px 40px 140px}
.doc>header h1{font:800 46px/1.08 Inter;letter-spacing:-.025em}
.doc>header .lead{font-size:18px;color:var(--doc-ink2);max-width:780px;margin-top:16px}
.toc{display:flex;gap:10px;margin-top:28px;flex-wrap:wrap}
.toc a{display:inline-flex;align-items:center;height:38px;padding:0 16px;border-radius:999px;background:#fff;font-weight:600;font-size:14px;box-shadow:0 0 0 1px var(--doc-line);cursor:pointer}
section.s{margin-top:104px}
.sh2{display:flex;align-items:baseline;gap:18px;border-top:2px solid var(--doc-ink);padding-top:18px;margin-bottom:26px}
.sh2 .k{font:600 12px/1 'IBM Plex Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--doc-ink2)}
.sh2 h2{font:800 34px/1.15 Inter;letter-spacing:-.02em}
.intro{display:grid;grid-template-columns:1.3fr 1fr;gap:48px;margin-bottom:32px}
.intro p{font-size:17px;line-height:1.6}
.intro .words{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
.intro .words span{height:30px;padding:0 12px;border-radius:999px;background:#fff;display:inline-flex;align-items:center;font-size:13px;font-weight:600;box-shadow:0 0 0 1px var(--doc-line)}
.intro dl{display:grid;grid-template-columns:auto 1fr;gap:10px 18px;font-size:14px}
.intro dt{font-weight:700}
.intro dd{color:var(--doc-ink2)}
figure{margin-top:36px}
figcaption{font:600 13px/1.3 Inter;color:var(--doc-ink2);margin-bottom:10px;letter-spacing:.01em}
.wide{overflow-x:auto;padding:4px 30px 30px 4px;margin:-4px -30px -30px -4px}
.mrow{display:flex;gap:36px;align-items:flex-start;flex-wrap:wrap;margin-top:36px}
.mrow figure{margin-top:0}
.cost{flex:1;min-width:300px;background:#fff;border-radius:16px;padding:26px 26px 22px;box-shadow:0 0 0 1px var(--doc-line)}
.cost h3{font:800 18px/1.2 Inter;margin-bottom:14px}
.cost table{width:100%;border-collapse:collapse;font-size:14px}
.cost td{padding:10px 0;border-top:1px solid var(--doc-line);vertical-align:top}
.cost td:first-child{font-weight:700;width:96px;padding-right:12px}
.cost td .sz{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:22px;padding:0 6px;border-radius:6px;background:#17171A;color:#fff;font:700 11px/1 'IBM Plex Mono';margin-top:4px}
.cost h4{font:700 14px/1.3 Inter;margin:20px 0 8px}
.cost ul{padding-left:18px;font-size:14px;color:var(--doc-ink2)}
.cost li+li{margin-top:6px}
.today{display:grid;grid-template-columns:1.6fr 1fr;gap:28px;align-items:start}
.shot{border-radius:12px;overflow:hidden;box-shadow:0 0 0 1px var(--doc-line),0 10px 30px -10px rgba(0,0,0,.25);background:#000}
.shot img{display:block;width:100%;height:100%;object-fit:cover;object-position:left top}
.shots{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}
.obs{background:#fff;border-radius:16px;padding:24px;box-shadow:0 0 0 1px var(--doc-line)}
.obs h3{font:800 17px/1.3 Inter;margin-bottom:12px}
.obs ol{padding-left:20px;font-size:14.5px}
.obs li+li{margin-top:10px}
.obs li b{font-weight:700}
.common{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}
.common div{background:#fff;border-radius:14px;padding:18px;box-shadow:0 0 0 1px var(--doc-line);font-size:14px}
.common b{display:block;font:800 15px/1.3 Inter;margin-bottom:8px}
.cmp{width:100%;border-collapse:separate;border-spacing:0;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 0 0 1px var(--doc-line);font-size:14.5px}
.cmp th,.cmp td{padding:14px 18px;text-align:left;border-top:1px solid var(--doc-line);vertical-align:top}
.cmp thead th{border-top:0;background:#17171A;color:#fff;font-weight:700}
.cmp tbody th{font-weight:700;width:190px;background:#F7F6F3}
.reco{margin-top:28px;background:#17171A;color:#fff;border-radius:18px;padding:30px 32px}
.reco h3{font:800 22px/1.25 Inter;margin-bottom:12px}
.reco p{font-size:16px;line-height:1.6;color:#D9D8D3;max-width:900px}
.reco p+p{margin-top:12px}

.frame{position:relative;overflow:hidden;border-radius:14px;box-shadow:0 1px 2px rgba(0,0,0,.08),0 22px 60px -18px rgba(0,0,0,.4)}
.desk{width:1120px;height:700px}
.mob{width:375px;height:800px;border-radius:38px;border:9px solid #111;flex:none}
.tile{width:1120px;border-radius:14px;padding:30px 32px;display:grid;grid-template-columns:1.05fr 1fr 1fr;gap:36px;box-shadow:0 0 0 1px rgba(0,0,0,.08)}
.tile .tl{font:700 11px/1 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;opacity:.7;margin-bottom:12px}
.tile .sw{display:grid;grid-template-columns:repeat(3,1fr);gap:12px 10px}
.tile .sw.k4{grid-template-columns:repeat(4,1fr)}
.tile .s i{display:block;height:46px;border-radius:8px;margin-bottom:6px}
.tile .s b{display:block;font-size:12.5px;font-weight:700;line-height:1.2}
.tile .s span{font:400 11px/1.3 'IBM Plex Mono',monospace;opacity:.75}
.tile .aa{font-size:96px;line-height:.9;margin-bottom:14px}
.tile .tsp{display:flex;flex-direction:column;gap:4px;padding:10px 0;border-top:1px solid currentColor;border-top-color:rgba(127,127,127,.25)}
.tile .tsp span{font-size:12px;opacity:.7}
.tile .crow{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.tile .note{font-size:13px;line-height:1.5;opacity:.8;margin-top:4px}

.poster{position:relative;overflow:hidden;aspect-ratio:2/3;container-type:inline-size;width:100%}
.poster i{position:absolute;display:block}
.poster .pt{position:absolute;left:8%;right:8%;bottom:7%;line-height:.95;font-size:12.5cqw;z-index:2}
.pt.f-arch{font-family:Archivo,sans-serif;font-stretch:68%;font-variation-settings:'wdth' 68;font-weight:800;text-transform:uppercase;font-size:15cqw;letter-spacing:.01em}
.pt.f-fra{font-family:Fraunces,serif;font-style:italic;font-weight:600}
.pt.f-bri{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;letter-spacing:-.02em}
.pt.f-plex{font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:9.5cqw;letter-spacing:.06em;text-transform:uppercase}
.av{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-family:Inter,sans-serif;font-weight:700;flex:none;line-height:1}
.stack{display:inline-flex;align-items:center}
.stack .av+.av{margin-left:-7px}
.ic{display:inline-block;flex:none}
.sbar{height:46px;display:flex;align-items:center;justify-content:space-between;padding:0 26px 0 30px;font:600 15px/1 Inter;position:relative;z-index:4}
.sbar .sig{display:flex;gap:6px;align-items:center}
.sbar .sig b{display:block;width:16px;height:10px;border-radius:2px;background:currentColor;opacity:.85}
.sbar .sig b.bat{width:24px;height:11px;border-radius:3px}
.mnav{position:absolute;left:0;right:0;bottom:0;display:grid;grid-template-columns:repeat(5,1fr);z-index:5}
.mnav a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}

"""

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=Bricolage+Grotesque:opsz,wght@12..96,400..800'
         '&family=DM+Sans:opsz,wght@9..40,400..800&family=Fraunces:ital,opsz,wght@0,9..144,400..900;1,9..144,400..900&family=IBM+Plex+Mono:wght@400;500;600'
         '&family=Instrument+Sans:wght@400..700&family=Inter:wght@400..800&display=swap" rel="stylesheet">')
