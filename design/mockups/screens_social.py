import json
import random

import base_screens as b

av = b.av
poster = b.poster
FILMS = b.FILMS
hole = b.hole
on = b.on
when = b.when
href = b.href
hx = b.hx

XI = {
    "star": '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    "uplus": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    "ucheck": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
    "shuffle": '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"/><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"/>',
    "pointer": '<path d="M14 4.1 12 6"/><path d="m5.1 8-2.9-.8"/><path d="m6 12-1.9 2"/><path d="M7.2 2.2 8 5.1"/><path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z"/>',
    "xcircle": '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
    "calsync": '<path d="M11 10v4h4"/><path d="m11 14 1.535-1.605a5 5 0 0 1 8 1.5"/><path d="M16 2v4"/><path d="m21 18-1.535 1.605a5 5 0 0 1-8-1.5"/><path d="M21 22v-4h-4"/><path d="M21 8.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4.3"/><path d="M3 10h4"/><path d="M8 2v4"/>',
    "calclock": '<path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4M8 2v4M3 10h5"/><path d="M17.5 17.5 16 16.3V14"/><circle cx="16" cy="16" r="6"/>',
    "calplus": '<path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18M10 16h4M12 14v4"/>',
    "mail": '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    "hourglass": '<path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
    "refresh": '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    "logout": '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    "heart": '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    "bulb": '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/>',
    "download": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    "sun": '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    "moon": '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    "monitor": '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/>',
    "sparkles": '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4M22 5h-4"/>',
    "flag": '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    "sort": '<path d="m3 16 4 4 4-4M7 20V4M21 8l-4-4-4 4M17 4v16"/>',
    "inbox": '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    "searchx": '<path d="m13.5 8.5-5 5M8.5 8.5l5 5"/><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
}


def xi(name, size=18, stroke=2):
    path = XI.get(name) or b.foundation.ICONS[name]
    return (f'<svg class="ic" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{stroke}" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{path}</svg>')


def still(fn, *args, **kwargs):
    dc = b.DC
    b.DC = False
    try:
        return b.embedded(lambda: fn(*args, **kwargs))
    finally:
        b.DC = dc


def heat(seed):
    rnd = random.Random(seed)
    cells = "".join(f'<i class="h{rnd.choice([0, 0, 1, 1, 1, 2, 3])}"></i>' for _ in range(26))
    legend = '<span class="lg">Moins<i class="h0"></i><i class="h1"></i><i class="h2"></i><i class="h3"></i>Plus</span>'
    return f'<div class="heat">{cells}</div><div class="hleg"><span>Une case par semaine</span>{legend}</div>'


CSS = r"""
.S .xd-clip{position:absolute;inset:0;overflow:hidden}
.S .xd-in{flex:1;min-width:0;height:100%;border:0;outline:0;background:transparent;font:inherit;font-size:13.5px;color:var(--tx)}
.S .xd-in::placeholder{color:var(--tx3)}
.S .xd-sf{display:flex;align-items:center;gap:10px;height:40px;padding:0 14px;border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line2);color:var(--tx3);width:260px}
.S .chip.xd-on{background:var(--acc-soft);box-shadow:inset 0 0 0 1px var(--acc);color:var(--acc-tx)}
.S .xd-sup{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 10px;border-radius:999px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px var(--line2);font-size:12px;font-weight:700;color:var(--tx)}
.S .xd-sup .ic{color:var(--tx2)}

.S .xd-np{padding-top:96px}
.S .xd-np .ph{margin-bottom:20px}
.S .xd-ncols{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
.S .xd-ncol{display:flex;flex-direction:column;gap:10px}
.S .xd-nc{border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line);overflow:hidden}
.S .xd-nh{display:flex;align-items:center;gap:8px;height:34px;padding:0 16px;font-size:12px;font-weight:700;letter-spacing:.02em;color:var(--tx2);border-bottom:1px solid var(--line)}
.S .xd-nh .ic{color:var(--tx3)}
.S .xd-nr{display:grid;grid-template-columns:36px minmax(0,1fr) auto 8px;gap:12px;align-items:center;width:100%;padding:10px 16px;font-size:13.5px;line-height:1.42;color:var(--tx2)}
.S .xd-nr+.xd-nr{border-top:1px solid var(--line)}
.S .xd-nr.xd-un{color:var(--tx);background:rgba(255,255,255,.035)}
.S .xd-nr b{color:var(--tx);font-weight:700}
.S .xd-ni{width:36px;height:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--s3);color:var(--tx)}
.S .xd-nr .av{box-shadow:0 0 0 1px rgba(255,255,255,.1)}
.S .xd-nm{font-size:12px;color:var(--tx3);white-space:nowrap}
.S .xd-dot{width:8px;height:8px;border-radius:50%;background:var(--acc);visibility:hidden}
.S .xd-un .xd-dot{visibility:visible}
.S .xd-nmore{display:flex;align-items:center;gap:6px;width:100%;height:40px;padding:0 16px;border-top:1px solid var(--line);font-size:13px;font-weight:600;color:var(--tx2)}
.S .xd-lm{align-self:flex-start;margin-top:4px}
.S.xd-read .bell b{display:none}

.S .xd-mtl{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px 0}
.S .xd-mtl h1{font-size:44px}
.S .xd-msub{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px 12px;min-height:44px}
.S .xd-msub .cnt{font-size:13px;font-weight:600;color:var(--tx2)}
.S .xd-msub .btn{margin-left:auto}
.S .xd-mlist{position:absolute;left:0;right:0;top:162px;bottom:76px;overflow-x:hidden;overflow-y:auto;scrollbar-width:none;padding:0 16px 16px;display:flex;flex-direction:column;gap:10px}
.S .xd-mlist::-webkit-scrollbar{display:none}
.S .xd-mlist>*{flex:none}
.S .xd-mlist .xd-nr{grid-template-columns:32px minmax(0,1fr) 8px;align-items:start;padding:12px 14px;font-size:13px}
.S .xd-mlist .xd-ni{width:32px;height:32px}
.S .xd-nb{display:flex;flex-direction:column;gap:3px;min-width:0}
.S .xd-mlist .xd-dot{margin-top:6px}
.S .xd-mlist .xd-nh{padding:0 14px}
.S .xd-mlist .xd-nmore{height:44px;padding:0 14px}

.S .xd-under{position:absolute;inset:0}
.S .xd-under>.S{position:absolute;inset:0;box-shadow:none}
.S .xd-catch{position:absolute;inset:0;z-index:7}
.S .xd-me{position:absolute;top:18px;right:40px;z-index:8;display:inline-flex;border-radius:50%;box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--acc)}
.S .xd-menu{position:absolute;top:64px;right:28px;z-index:9;width:300px;padding:8px;border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line2),0 30px 80px -16px rgba(0,0,0,.85)}
.S.light .xd-menu{box-shadow:inset 0 0 0 1px var(--line2),0 24px 60px -18px rgba(15,23,42,.35)}
.S .xd-mh{display:flex;align-items:center;gap:12px;padding:8px 10px 10px}
.S .xd-mh div>b{display:block;font-size:15px;font-weight:700}
.S .xd-mh div>span{display:block;font-size:12.5px;color:var(--tx3);margin-top:3px}
.S .xd-ms{height:1px;background:var(--line);margin:6px 6px}
.S .xd-mi{display:flex;align-items:center;gap:12px;width:100%;height:40px;padding:0 10px;border-radius:12px;font-size:14px;font-weight:500;color:var(--tx)}
.S .xd-mi .ic{color:var(--tx2)}
.S .xd-mi.xd-hv{background:var(--s2)}
.S .xd-mi em{margin-left:auto;font-style:normal;font-size:12px;font-weight:600;color:var(--tx3)}
.S .xd-mt{display:flex;align-items:center;justify-content:space-between;gap:10px;height:48px;padding:0 6px 0 10px}
.S .xd-mt>span{display:flex;align-items:center;gap:12px;font-size:14px;font-weight:500}
.S .xd-mt>span .ic{color:var(--tx2)}
.S .xd-th>*{min-width:36px;width:36px;padding:0}

.S .xd-pban{height:200px}
.S .xd-pm{margin-top:-118px}
.S .xd-pav .av{box-shadow:0 0 0 4px var(--bg),0 0 0 6px var(--line2)}
.S .xd-pm .pid h1{font-size:60px;margin:6px 0 6px}
.S .xd-hl{display:flex;align-items:center;gap:10px}
.S .xd-pm .pfl a{display:inline-flex;align-items:center;gap:6px}
.S .xd-pm .pfl .ic{color:var(--tx3)}
.S .xd-pm .pact .btn{min-width:124px}
.S .xd-st5{grid-template-columns:repeat(5,1fr);margin:20px 0 20px}
.S .xd-st5 div{padding:12px 0 12px 20px}
.S .xd-st5 b{font-size:40px}
.S .xd-st5 b .ic{color:var(--tx2)}
.S .xd-st5 span em{font-style:normal;color:var(--tx3)}
.S .xd-pc{grid-template-columns:1fr 1fr;gap:40px}
.S .xd-pc .sh{margin-bottom:12px}
.S .xd-gen{margin-top:20px}
.S .xd-gbar{display:flex;gap:2px;height:10px;border-radius:999px;overflow:hidden}
.S .xd-gbar i{display:block;height:100%;background:var(--tx)}
.S .xd-gl{display:grid;grid-template-columns:repeat(3,auto);justify-content:start;gap:8px 22px;margin-top:12px;font-size:12.5px;color:var(--tx2)}
.S .xd-gl span{display:inline-flex;align-items:center;gap:6px}
.S .xd-gl i{width:8px;height:8px;border-radius:50%;background:var(--tx)}
.S .xd-gl b{color:var(--tx);font-weight:700}
.S .xd-g1{opacity:.74}
.S .xd-g2{opacity:.54}
.S .xd-g3{opacity:.38}
.S .xd-g4{opacity:.26}
.S .xd-g5{opacity:.16}
.S .xd-pc .seen{margin-top:0}

.S .xd-fm{position:absolute;left:50%;top:84px;width:540px;transform:translateX(-50%);border-radius:18px;background:var(--s1);box-shadow:0 40px 100px -20px #000,inset 0 0 0 1px var(--line);z-index:2;padding:16px 20px 14px}
.S .xd-fmh{display:flex;align-items:center;justify-content:space-between;gap:12px}
.S .xd-fmh .seg.big>*{padding:0 14px}
.S .xd-fs{display:flex;flex-direction:column;gap:8px;margin-top:14px}
.S .xd-fs .xd-sf{width:100%;height:44px}
.S .xd-fl{display:flex;flex-direction:column;margin-top:8px}
.S .xd-fr{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--line)}
.S .xd-fl .xd-fr:first-child{border-top:0}
.S .xd-fa{display:flex;align-items:center;gap:12px;flex:1;min-width:0}
.S .xd-fi{display:flex;flex-direction:column;gap:3px;min-width:0}
.S .xd-fi>b{font-size:14.5px;font-weight:600}
.S .xd-fi>span{font-size:12.5px;color:var(--tx3)}
.S .xd-fi b.xd-mk,.S .xd-fi span .xd-mk{display:inline;font-size:inherit;color:var(--tx);font-weight:800;background:rgba(255,255,255,.16);border-radius:3px}
.S .xd-fr .btn{height:36px;padding:0 14px;font-size:13px;gap:8px}
.S .xd-fr .btn.gh{box-shadow:inset 0 0 0 1px var(--line2);color:var(--tx2)}
.S .xd-you{display:inline-flex;align-items:center;height:26px;padding:0 10px;border-radius:999px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px var(--line2);font-size:12px;font-weight:700}
.S .xd-note{font-size:12.5px;color:var(--tx3);text-align:center;padding:12px 0 2px;border-top:1px solid var(--line)}
.S .xd-es{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;padding:26px 20px 18px}
.S .xd-es .ic{color:var(--tx3);margin-bottom:6px}
.S .xd-es b{font-size:15px;font-weight:700}
.S .xd-es p{font-size:13px;color:var(--tx2);max-width:360px;line-height:1.5}
.S .xd-es .btn{margin-top:10px}
.S .xd-hint{font-size:12.5px;color:var(--tx3)}

.S .xd-cp{padding-top:88px}
.S .xd-chd{display:flex;align-items:center;gap:16px;margin:14px 0 20px}
.S .xd-chd .av{box-shadow:0 0 0 3px var(--bg),0 0 0 4px var(--line2)}
.S .xd-chd h1{font-size:52px}
.S .xd-chd .cnt{display:block;font-size:14px;font-weight:600;color:var(--tx2);margin-top:6px}
.S .xd-tool{margin-bottom:16px}
.S .xd-tool .chip.tg em{font-style:normal;display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:var(--tx);color:var(--bg);font-size:12px;font-weight:800}
.S .xd-res{font-size:13px;font-weight:600;color:var(--tx2)}
.S .xd-sort{margin-left:auto;display:flex;align-items:center;gap:10px}
.S .xd-sl{font-size:12.5px;font-weight:600;color:var(--tx3)}
.S .xd-dir{flex:none;white-space:nowrap;display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 14px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--line2);font-size:13px;font-weight:600}
.S .xd-dir .ic{color:var(--tx2)}
.S .xd-fp{display:grid;grid-template-columns:auto 1fr;gap:10px 18px;align-items:center;padding:16px 18px;margin-bottom:16px;border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line)}
.S .xd-fgl{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--tx3)}
.S .xd-fch{display:flex;flex-wrap:wrap;gap:6px}
.S .xd-rst{grid-column:2;justify-self:start;font-size:13px;font-weight:600;color:var(--tx2);text-decoration:underline;text-underline-offset:3px}
.S .xd-act{display:flex;align-items:center;gap:8px;margin:-4px 0 16px}
.S .xd-act .chip .ic{color:var(--tx3)}
.S .xd-act .xd-clr{font-size:13px;font-weight:600;color:var(--tx2);margin-left:6px}
.S .xd-g{grid-template-columns:repeat(7,minmax(0,1fr))}
.S .xd-rt{position:absolute;left:6px;top:6px;z-index:3;display:inline-flex;align-items:center;gap:3px;height:24px;padding:0 8px;border-radius:999px;background:rgba(0,0,0,.78);color:#fff;font-size:13px;font-weight:800}
.S .xd-bm{position:absolute;right:6px;top:6px;z-index:4;width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:rgba(0,0,0,.66);color:#e2e8f0;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
.S .xd-bm.on{background:var(--acc);color:var(--acc-c);box-shadow:none}
.S .xd-wc .pw{display:block}
.S .xd-wc .ovl2 .btn{flex:1;min-width:0;padding:0 8px}
.S .xd-wc .ovl2 .mini{flex:none}
.S .xd-empty{display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:40px 20px;border-radius:18px;box-shadow:inset 0 0 0 1.5px var(--line2)}
.S .xd-empty .ic{color:var(--tx3);margin-bottom:4px}
.S .xd-empty b{font-size:16px}
.S .xd-empty p{font-size:13.5px;color:var(--tx2);max-width:420px;line-height:1.5}

.S .xd-mban{height:150px}
.S .xd-mid{margin-top:-46px}
.S .xd-mid .pav .av{box-shadow:0 0 0 4px var(--bg),0 0 0 6px var(--line2)}
.S .xd-mid .xd-hl{justify-content:center;margin-top:12px}
.S .xd-mid .xd-hl .ov{margin-top:0}
.S .xd-mid h1{font-size:46px;margin:6px 0 4px}
.S .xd-fol{margin:14px 16px 0}
.S .xd-fol .btn{width:100%;height:46px}
.S .xd-mfl{display:flex;justify-content:center;gap:20px;margin-top:12px;font-size:13px;color:var(--tx2)}
.S .xd-mfl a{position:relative}
.S .xd-mfl a::after{content:'';position:absolute;left:-6px;right:-6px;top:-14px;bottom:-14px}
.S .xd-mfl b{color:var(--tx);font-weight:700}
.S .xd-mst{grid-template-columns:repeat(5,1fr);margin-top:16px}
.S .xd-mst div{padding:9px 0}
.S .xd-mst b{font-size:24px}
.S .xd-mst b .ic{color:var(--tx2)}
.S .xd-mst span{line-height:1.25}
.S .xd-cells{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 16px 0}
.S .xd-cell{display:flex;align-items:center;gap:10px;height:56px;padding:0 10px 0 12px;border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line);min-width:0}
.S .xd-cell>.ic:first-child{color:var(--tx2)}
.S .xd-cell>.ic:last-child{margin-left:auto;color:var(--tx3)}
.S .xd-cell div>b{display:block;font-size:13px;font-weight:700;white-space:nowrap}
.S .xd-cell div>span{display:block;font-size:12px;color:var(--tx2);margin-top:2px;white-space:nowrap}
.S .xd-mp .sh{margin-bottom:10px}
.S .xd-mp{padding-top:14px}

.S .xd-mch{padding:6px 18px 0}
.S .xd-mch h1{font-size:38px;line-height:.95}
.S .xd-mby{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13px;color:var(--tx2)}
.S .xd-mtool{display:flex;align-items:center;gap:8px;padding:14px 16px 12px}
.S .xd-mtool .xd-sf{flex:1;width:auto;min-width:0;height:44px}
.S .xd-mtool .ib{width:44px;height:44px}
.S .xd-mtool .xd-dir{height:44px;padding:0 12px}
.S .xd-mgw{position:absolute;left:0;right:0;top:252px;bottom:76px;overflow:hidden;padding:0 16px}
.S .xd-mg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 10px}
.S .xd-mg .pw{display:block;position:relative;border-radius:6px;overflow:hidden}
.S .xd-mg .xd-rt{left:5px;top:5px;height:22px;padding:0 7px;font-size:12px}
.S .xd-mg .t{font-size:12.5px;font-weight:600;margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.S .xd-mg .m{font-size:12px;color:var(--tx3);margin-top:2px}
.S .xd-ncols.one{grid-template-columns:minmax(0,760px)}
.S .xd-scroll{overflow-y:auto;scrollbar-width:none}
.S .xd-scroll::-webkit-scrollbar{display:none}
.S .xd-scroll .xd-np{padding-bottom:40px}
"""


N = {
    "r0": dict(icon="star", text="Alors, <b>Orbite basse</b>&nbsp;? Donnez-lui votre note", time="il y a 10 minutes", unread=True, d="52-noter", m="15-m-noter"),
    "r1": dict(icon="shuffle", text="Le verdict est tombé&nbsp;: ce sera <b>Orbite basse</b>&nbsp;!", time="hier", unread=True, d="51-film-tire", m="14-m-film-tire"),
    "r2": dict(icon="clock", text="La soirée arrive à grands pas&nbsp;!", time="hier", unread=False, d="02-soiree", m="12-m-soiree"),
    "r3": dict(actor="sam", text="<b>Brume</b> a été ajouté à la soirée", time="il y a 3 jours", unread=False, d="02-soiree", m="12-m-soiree"),
    "r4": dict(actor="ines", text="Inès vient de rejoindre la soirée&nbsp;!", time="il y a 5 jours", unread=False, d="02-soiree", m="12-m-soiree"),
    "r5": dict(actor="lea", text="Léa a commencé à vous suivre.", time="il y a 3 heures", unread=True, d="64-profil-ami", m="69-m-profil-ami"),
    "r6": dict(actor="hugo", text="Hugo vous invite à rejoindre <b>Nuit de l’horreur</b>", time="il y a 5 heures", unread=True, d="50-invitation", m="20-m-invitation"),
    "r7": dict(actor="sam", text="Sam vient de rejoindre la soirée&nbsp;!", time="hier", unread=False, d="02-soiree", m="12-m-soiree"),
    "r8": dict(actor="nico", text="<b>Tempête de verre</b> a été ajouté à la soirée", time="il y a 2 jours", unread=False, d="02-soiree", m="12-m-soiree"),
    "r9": dict(icon="calsync", text="La soirée a été reprogrammée.", time="il y a 2 jours", unread=False, d="02-soiree", m="12-m-soiree"),
    "r10": dict(icon="refresh", text="La synchro Letterboxd n’a pas pu identifier certains films automatiquement. Réglez ça dans vos paramètres.", time="il y a 2 jours", unread=False,
                d="28-reglages-integrations", m="33-m-reglages"),
    "r11": dict(icon="pointer", text="L’hôte a choisi <b>Brume</b>&nbsp;!", time="il y a 9 jours", unread=False, d="02-soiree", m="12-m-soiree"),
    "r12": dict(icon="calclock", text="C’est demain&nbsp;! Préparez le canapé et le popcorn", time="il y a 10 jours", unread=False, d="02-soiree", m="12-m-soiree"),
    "r13": dict(icon="hourglass", text="<b>Soirée crêpes</b> s’est terminée sans qu’aucun film n’ait été choisi… on se rattrape la prochaine fois&nbsp;?", time="il y a 2 semaines",
                unread=False, d="02-soiree", m="90-m-soiree-en-suspens"),
    "r14": dict(icon="xcircle", text="<b>Brunch ciné</b> a été annulée.", time="il y a 3 semaines", unread=False, d="", m=""),
    "r15": dict(icon="shuffle", text="Le verdict est tombé&nbsp;: ce sera <b>Kilomètre zéro</b>&nbsp;!", time="hier", unread=False, d="51-film-tire", m="89-m-plusieurs-films"),
    "r16": dict(icon="shuffle", text="Le verdict est tombé&nbsp;: ce sera <b>Les Nuits de Marseille</b>&nbsp;!", time="hier", unread=False, d="51-film-tire", m="89-m-plusieurs-films"),
}

G_LEA = ("Soirée chez Léa", ["r0", "r1", "r2"], ["r3", "r4"])
G_CINE = ("Ciné-club du mercredi", ["r7", "r8", "r9"], [])
G_HALL = ("Halloween chez Sam", ["r11", "r12"], [])
G_DOUBLE = ("Double séance chez Nico", ["r15", "r16"], [])


def n_row(k, mob):
    r = N[k]
    lead = av(r["actor"], 32 if mob else 36) if r.get("actor") else f'<span class="xd-ni">{xi(r["icon"], 16 if mob else 17)}</span>'
    cls = f'xd-nr {hole("un" + k, "xd-un" if r["unread"] else "")}'
    if mob:
        inner = f'{lead}<span class="xd-nb"><span class="xd-nt">{r["text"]}</span><span class="xd-nm">{r["time"]}</span></span><i class="xd-dot"></i>'
    else:
        inner = f'{lead}<span class="xd-nt">{r["text"]}</span><span class="xd-nm">{r["time"]}</span><i class="xd-dot"></i>'
    tgt = r["m"] if mob else r["d"]
    if tgt:
        return f'<a class="{cls}"{href(tgt)}>{inner}</a>'
    return f'<button type="button" class="{cls}">{inner}</button>'


def n_group(g, mob):
    title, shown, extra = g
    rows = "".join(n_row(k, mob) for k in shown)
    more = ""
    if extra:
        rows += when("ex", "".join(n_row(k, mob) for k in extra), False)
        label = "Voir l’autre" if len(extra) == 1 else f"Voir les {len(extra)} autres"
        more = when("notEx", f'<button type="button" class="xd-nmore"{on("expand")}>{label}{b.ic("chevd", 15)}</button>')
    return f'<div class="xd-nc"><div class="xd-nh">{b.ic("cal", 14)}{title}</div>{rows}{more}</div>'


def n_single(k, mob):
    return f'<div class="xd-nc">{n_row(k, mob)}</div>'


def n_logic():
    unread = json.dumps({k: v["unread"] for k, v in N.items()})
    body = """
const all = !!st.allRead;
const U = __U__;
let n = 0;
Object.keys(U).forEach((k) => {
const u = U[k] && !all;
o['un' + k] = u ? 'xd-un' : '';
if (u) n++;
});
o.hasUnread = n > 0;
o.cnt = n + (n > 1 ? ' non lues' : ' non lue');
o.rc = n > 0 ? '' : 'xd-read';
o.markAll = () => this.setState({ allRead: true });
const ex = !!st.ex;
o.ex = ex;
o.notEx = !ex;
o.expand = () => this.setState({ ex: true });
""".replace("__U__", unread)
    return b.component(body)


def mark_all_btn():
    return when("hasUnread", f'<button type="button" class="btn gl sm"{on("markAll")}>{b.ic("check", 15)}Tout marquer comme lu</button>')


def screen_62():
    left = n_group(G_LEA, False) + n_single("r5", False) + n_single("r6", False) + n_group(G_CINE, False)
    right = (n_single("r10", False) + n_group(G_HALL, False) + n_single("r13", False) + n_single("r14", False)
             + '<button type="button" class="btn gl sm xd-lm">Charger la suite</button>')
    cnt = when("hasUnread", f'<span class="cnt">{hole("cnt", "4 non lues")}</span>')
    return f'''<div class="S desk frame {hole("rc", "")}">{b.hdr(-1, solid=True)}<div class="xd-clip xd-scroll">
<div class="page xd-np"><div class="ph"><h1 class="disp util">Notifications</h1>{cnt}<div class="phx">{mark_all_btn()}<a class="ib" aria-label="Réglages des notifications"{href("27-reglages-notifications")}>{b.ic("gear", 18)}</a></div></div>
<div class="xd-ncols one"><div class="xd-ncol">{left}{right}</div></div></div></div></div>'''


def screen_68():
    rows = (n_group(G_LEA, True) + n_single("r5", True) + n_single("r6", True) + n_group(G_DOUBLE, True) + n_group(G_CINE, True) + n_single("r10", True)
            + n_group(G_HALL, True) + n_single("r13", True) + n_single("r14", True))
    cnt = when("hasUnread", f'<span class="cnt">{hole("cnt", "4 non lues")}</span>')
    return f'''<div class="S mob frame {hole("rc", "")}">{b.sbar()}
<div class="xd-mtl"><h1 class="disp util">Notifications</h1><a class="ib" aria-label="Réglages des notifications"{href("33-m-reglages")}>{b.ic("gear", 18)}</a></div>
<div class="xd-msub">{cnt}{mark_all_btn()}</div>
<div class="xd-mlist">{rows}</div>
{b.mnav(-1)}</div>'''


def close_links(slug):
    return (f'<a class="xd-catch" aria-label="Fermer le menu du compte"{href(slug)}></a>'
            f'<a class="xd-me" aria-label="Fermer le menu du compte"{href(slug)}>{av("adrien", 32)}</a>')


def screen_63():
    dark = still(b.d_explorer)
    light = still(b.d_explorer, light=True)
    themes = [("sys", "monitor", "Système"), ("light", "sun", "Clair"), ("dark", "moon", "Sombre")]
    seg = "".join(f'<button type="button" class="{hole("th" + k, "on" if k == "dark" else "")}" aria-label="{lab}"{on("set" + k)}>{xi(icon, 16)}</button>'
                  for k, icon, lab in themes)
    item = lambda icon, label, slug, extra="": (f'<a class="xd-mi{extra}"{href(slug)}>{xi(icon, 18)}{label}</a>' if slug
                                                else f'<button type="button" class="xd-mi{extra}">{xi(icon, 18)}{label}</button>')
    menu = (f'<div class="xd-mh">{av("adrien", 40)}<div><b>Adrien</b><span>@adrien</span></div></div><div class="xd-ms"></div>'
            + item("user", "Voir mon profil public", "07-profil", " xd-hv")
            + item("gear", "Paramètres", "25-reglages-profil")
            + item("heart", "Soutenir le projet", "71-soutenir")
            + item("bulb", "Proposer une idée", "80-proposer-une-idee")
            + item("download", "Installer l’app", "")
            + '<div class="xd-ms"></div>'
            + f'<div class="xd-mt"><span>{xi("moon", 18)}Apparence</span><div class="seg xd-th">{seg}</div></div>'
            + item("sparkles", "Nouveautés", "78-nouveautes")
            + item("flag", "Signaler un problème", "79-signaler")
            + '<div class="xd-ms"></div>'
            + item("logout", "Se déconnecter", "09-accueil-public"))
    return f'''<div class="S desk frame {hole("lt", "")}"><div class="xd-under">{when("isDark", dark)}{when("isLight", light, False)}</div>
{when("isDark", close_links("01-explorer"))}{when("isLight", close_links("10-explorer-clair"), False)}
<div class="xd-menu" role="menu" aria-label="Menu du compte">{menu}</div></div>'''


def theme_logic():
    body = """
const t = st.t || 'dark';
o.lt = t === 'light' ? 'light' : '';
o.isLight = t === 'light';
o.isDark = t !== 'light';
['sys', 'light', 'dark'].forEach((k) => {
o['th' + k] = t === k ? 'on' : '';
o['set' + k] = () => this.setState({ t: k });
});
"""
    return b.component(body)


LEA = dict(since="mars 2025", bio="Hôte des soirées du vendredi. Polars, films de braquage et tout ce qui se passe la nuit.", followers=48, following=31, wl=23,
           created=14, joined=41, proposed=63, wins=11, streak=6, record=9)
LEA_FAVS = ["marseille", "kyoto", "brume"]
LEA_SEEN = [("orbite", 8), ("brume", 9), ("marseille", 9), ("kyoto", 8), ("volets", 7), ("phare", 7), ("projo", 10), ("sable", 6), ("km", 7)]
GENRES = [("Polar", 18), ("Thriller", 12), ("Drame", 9), ("Science-fiction", 7), ("Romance", 5), ("Comédie", 3)]


def genres_block():
    total = sum(n for _, n in GENRES)
    bar = "".join(f'<i class="xd-g{i}" style="width:{n / total * 100:.2f}%"></i>' for i, (_, n) in enumerate(GENRES))
    legend = "".join(f'<span><i class="xd-g{i}"></i>{g} <b>{n}</b></span>' for i, (g, n) in enumerate(GENRES))
    return f'<div class="xd-gbar">{bar}</div><div class="xd-gl">{legend}</div>'


def genres_head(style=""):
    total = sum(n for _, n in GENRES)
    return f'<div class="sh"{style}><h2 class="disp">Genres favoris</h2><span class="more">Top 6 des genres, sur {total} occurrences cumulées</span></div>'


def follow_btn(cls_extra=""):
    if not b.DC:
        return f'<button type="button" class="btn sm{cls_extra}" aria-label="Suivre @lea">{xi("uplus", 16)}Suivre</button>'
    return (f'<button type="button" class="btn sm{cls_extra} {hx("fbCls")}" aria-label="{hx("fAria")}"{on("toggleFollow")}>'
            + when("notFol", xi("uplus", 16) + "Suivre") + when("fol", xi("ucheck", 16) + "Suivi", False) + "</button>")


def follow_logic():
    body = f"""
const f = !!st.fol;
o.fol = f;
o.notFol = !f;
o.fbCls = f ? 'gl' : '';
o.fc = f ? {LEA['followers'] + 1} : {LEA['followers']};
o.fAria = f ? 'Ne plus suivre @lea' : 'Suivre @lea';
o.toggleFollow = () => this.setState({{ fol: !f }});
"""
    return b.component(body)


def screen_64():
    favs = "".join(f'<a class="fv"{href("04-fiche-film")}>{poster(k)}</a>' for k in LEA_FAVS)
    seen = "".join(f'<a class="sn"{href("04-fiche-film")}><div class="pw">{poster(k)}<span class="rt">{b.on5(r)}{b.star(11)}</span></div></a>' for k, r in LEA_SEEN[:6])
    L = LEA
    stats = (f'<div><b class="disp">{L["created"]}</b><span>soirées créées</span></div><div><b class="disp">{L["joined"]}</b><span>soirées rejointes</span></div>'
             f'<div><b class="disp">{L["proposed"]}</b><span>films proposés</span></div><div><b class="disp">{L["wins"]}</b><span>propositions gagnantes</span></div>'
             f'<div><b class="disp">{b.ic("flame", 24)}{L["streak"]}</b><span>semaines de suite <em>(record {L["record"]})</em></span></div>')
    return f'''<div class="S desk frame">{b.hdr(-1)}<div class="xd-clip">
<div class="pban xd-pban"><div class="bd2"></div></div>
<div class="pmain xd-pm"><div class="pid"><span class="pav xd-pav">{av("lea", 104)}</span><div><div class="xd-hl"><span class="ov">@lea, membre depuis {L["since"]}</span><span class="xd-sup">{xi("heart", 12)}Soutien</span></div>
<h1 class="disp">Léa</h1><p>{L["bio"]}</p>
<div class="pfl"><a{href("65-abonnes")}><b>{hole("fc", L["followers"])}</b> abonnés</a><a{href("65-abonnes")}><b>{L["following"]}</b> abonnements</a><a{href("67-liste-ami")}>{b.ic("bookmark", 14)}Sa watchlist, <b>{L["wl"]}</b> films à voir</a></div></div>
<div class="pact">{follow_btn()}<button type="button" class="btn gl sm">{b.ic("share", 15)}Partager</button></div></div>
<div class="stats xd-st5">{stats}</div>
<div class="pcols xd-pc"><div><div class="sh"><h2 class="disp">Ses trois favoris</h2></div><div class="favs">{favs}</div>
<div class="xd-gen">{genres_head()}{genres_block()}</div></div>
<div><div class="sh"><h2 class="disp">Activité</h2><span class="more">6 derniers mois</span></div>{heat(11)}
<div class="sh" style="margin-top:20px"><h2 class="disp">Derniers films vus</h2><a class="more"{href("66-films-vus")}>Tout voir {b.ic("right", 15)}</a></div><div class="seen">{seen}</div></div></div>
</div></div></div>'''


def screen_69():
    favs = "".join(f'<a class="fv"{href("17-m-fiche-film")}>{poster(k)}</a>' for k in LEA_FAVS)
    L = LEA
    stats = (f'<div><b class="disp">{L["created"]}</b><span>soirées<br>créées</span></div><div><b class="disp">{L["joined"]}</b><span>soirées<br>rejointes</span></div>'
             f'<div><b class="disp">{L["proposed"]}</b><span>films<br>proposés</span></div><div><b class="disp">{L["wins"]}</b><span>films<br>gagnants</span></div>'
             f'<div><b class="disp">{b.ic("flame", 16)}{L["streak"]}</b><span>semaines<br>de suite</span></div>')
    cells = (f'<a class="xd-cell"{href("67-liste-ami")}>{b.ic("bookmark", 17)}<div><b>Sa watchlist</b><span>{L["wl"]} films à voir</span></div>{b.ic("right", 15)}</a>'
             f'<a class="xd-cell"{href("70-m-films-vus")}>{b.ic("film", 17)}<div><b>Films vus</b><span>42 films</span></div>{b.ic("right", 15)}</a>')
    return f'''<div class="S mob frame"><div class="xd-clip">
<div class="mpban xd-mban"><div class="bd2"></div>{b.sbar()}{b.m_top("Notifications", "68-m-notifications", ("share",))}</div>
<div class="mpid xd-mid"><span class="pav">{av("lea", 84)}</span><div class="xd-hl"><span class="ov">@lea</span><span class="xd-sup">{xi("heart", 12)}Soutien</span></div><h1 class="disp">Léa</h1><p>Polars, braquages et films de nuit.</p></div>
<div class="xd-fol">{follow_btn()}</div>
<div class="xd-mfl"><a{href("65-abonnes")}><b>{hole("fc", L["followers"])}</b> abonnés</a><a{href("65-abonnes")}><b>{L["following"]}</b> abonnements</a><span>Depuis {L["since"]}</span></div>
<div class="mstats xd-mst">{stats}</div>
<div class="xd-cells">{cells}</div>
<div class="mpsec xd-mp"><div class="sh"><h2 class="disp">Ses trois favoris</h2></div><div class="favs">{favs}</div>
<div class="sh" style="margin-top:16px"><h2 class="disp">Activité</h2><span class="more">6 mois</span></div>{heat(11)}
{genres_head(' style="margin-top:16px"')}{genres_block()}</div>
</div>{b.mnav(-1)}</div>'''


PPL = [("lea", "Léa", "lea"), ("nico", "Nico", "nicolas.b"), ("ines", "Inès", "ines_m"), ("sam", "Sam", "samcine"), ("hugo", "Hugo", "hugo.r"), ("adrien", "Adrien", "adrien")]
FOLLOWERS = [True, True, True, True, True, False]
FOLLOWING = [False, True, False, True, True, False]
I_FOLLOW = [False, True, False, True, True, False]


def f_row(i):
    key, name, handle = PPL[i]
    if b.DC:
        nm = f'{hx(f"na{i}")}<b class="xd-mk">{hx(f"nb{i}")}</b>{hx(f"nc{i}")}'
        hd = f'@{hx(f"ha{i}")}<b class="xd-mk">{hx(f"hb{i}")}</b>{hx(f"hc{i}")}'
    else:
        nm, hd = name, "@" + handle
    target = "64-profil-ami" if key == "lea" else ("07-profil" if key == "adrien" else "")
    link = f'<a class="xd-fa"{href(target)}>{av(key, 40)}<span class="xd-fi"><b>{nm}</b><span>{hd}</span></span></a>'
    if key == "adrien":
        right = '<span class="xd-you">Vous</span>'
    elif b.DC:
        right = (f'<button type="button" class="btn sm {hx(f"fc{i}")}" aria-label="Suivre @{handle}"{on(f"tf{i}")}>'
                 + when(f"fo{i}", xi("ucheck", 15) + "Ne plus suivre", I_FOLLOW[i]) + when(f"nf{i}", xi("uplus", 15) + "Suivre", not I_FOLLOW[i]) + "</button>")
    else:
        right = (f'<button type="button" class="btn sm gh">{xi("ucheck", 15)}Ne plus suivre</button>' if I_FOLLOW[i]
                 else f'<button type="button" class="btn sm gl">{xi("uplus", 15)}Suivre</button>')
    return when(f"r{i}", f'<div class="xd-fr">{link}{right}</div>', FOLLOWERS[i])


def screen_65():
    under = still(b.d_profile)
    tabs = (f'<button type="button" class="{hole("t0", "")}"{on("s0")}>9 abonnements</button>'
            f'<button type="button" class="{hole("t1", "on")}"{on("s1")}>12 abonnés</button>'
            f'<button type="button" class="{hole("t2", "")}"{on("s2")}>{b.ic("search", 15)}Rechercher</button>')
    if b.DC:
        field = f'<input class="xd-in" value="{hx("q")}" onChange="{hx("onQ")}" placeholder="Pseudo ou @handle" aria-label="Rechercher des utilisateurs">'
    else:
        field = '<input class="xd-in" placeholder="Pseudo ou @handle" aria-label="Rechercher des utilisateurs">'
    search = when("searching", f'<div class="xd-fs"><label class="xd-sf">{b.ic("search", 16)}{field}</label>'
                  + when("short", '<p class="xd-hint">Tapez au moins 2 caractères.</p>', False) + "</div>", False)
    idle = when("idle", f'<div class="xd-es">{b.ic("search", 28)}<b>Cherchez un pseudo</b><p>Tapez le pseudo ou le handle de la personne que vous voulez suivre.</p></div>', False)
    none = when("none", f'<div class="xd-es">{xi("searchx", 28)}<b>Personne ne correspond</b><p>Vérifiez l’orthographe du pseudo. Les comptes dont le profil est privé n’apparaissent pas dans la recherche.</p></div>', False)
    rows = "".join(f_row(i) for i in range(len(PPL)))
    note = when("priv", '<p class="xd-note">Les profils privés n’apparaissent pas dans cette liste.</p>')
    return f'''<div class="S desk frame"><div class="dim">{under}</div>
<div class="xd-fm" role="dialog" aria-label="Liste des abonnements"><div class="xd-fmh"><div class="seg big">{tabs}</div><a class="ib" aria-label="Fermer"{href("07-profil")}>{b.ic("x", 18)}</a></div>
{search}{idle}{none}<div class="xd-fl">{rows}</div>{note}</div></div>'''


def follows_logic():
    data = json.dumps([list(p) for p in PPL], ensure_ascii=False)
    body = """
const P = __P__;
const FR = __FR__;
const FG = __FG__;
const F = st.f || __IF__;
const tab = st.tab || 'followers';
const q = st.q !== undefined ? st.q : '';
const qq = q.trim().toLowerCase().replace(/^@/, '');
const searching = tab === 'search';
const enabled = searching && qq.length >= 2;
let n = 0;
const split = (s) => {
if (!enabled) return [s, '', ''];
const k = s.toLowerCase().indexOf(qq);
return k < 0 ? [s, '', ''] : [s.slice(0, k), s.slice(k, k + qq.length), s.slice(k + qq.length)];
};
P.forEach((p, i) => {
let vis;
if (searching) vis = enabled && (p[1].toLowerCase().includes(qq) || p[2].includes(qq));
else vis = tab === 'followers' ? FR[i] : FG[i];
o['r' + i] = vis;
if (vis) n++;
const a = split(p[1]);
o['na' + i] = a[0];
o['nb' + i] = a[1];
o['nc' + i] = a[2];
const h = split(p[2]);
o['ha' + i] = h[0];
o['hb' + i] = h[1];
o['hc' + i] = h[2];
o['fo' + i] = !!F[i];
o['nf' + i] = !F[i];
o['fc' + i] = F[i] ? 'gh' : 'gl';
o['tf' + i] = () => {
const g = F.slice();
g[i] = !g[i];
this.setState({ f: g });
};
});
o.t0 = tab === 'following' ? 'on' : '';
o.t1 = tab === 'followers' ? 'on' : '';
o.t2 = searching ? 'on' : '';
o.s0 = () => this.setState({ tab: 'following' });
o.s1 = () => this.setState({ tab: 'followers' });
o.s2 = () => this.setState({ tab: 'search' });
o.searching = searching;
o.priv = !searching;
o.short = searching && qq.length === 1;
o.idle = searching && !enabled;
o.none = enabled && n === 0;
o.q = q;
o.onQ = (e) => this.setState({ q: e.target.value });
"""
    body = (body.replace("__P__", data).replace("__FR__", json.dumps(FOLLOWERS)).replace("__FG__", json.dumps(FOLLOWING))
            .replace("__IF__", json.dumps(I_FOLLOW)))
    return b.component(body)


ADRIEN_SEEN = [("volets", 8), ("brume", 6), ("kyoto", 9), ("sable", 7), ("marseille", 8), ("verre", 5), ("phare", 9), ("projo", 8), ("km", 6)]
DECADES = [(2020, "Années 2020"), (2010, "Années 2010")]


def genres_of(items):
    out = []
    for k, _ in items:
        g = FILMS[k]["g"]
        if g not in out:
            out.append(g)
    return out


def collection_logic(items, total, primary_label, with_panel=True):
    data = json.dumps([dict(t=FILMS[k]["t"], y=int(FILMS[k]["y"]), g=FILMS[k]["g"]) for k, _ in items], ensure_ascii=False)
    gens = json.dumps(genres_of(items), ensure_ascii=False)
    body = """
const I = __I__;
const GEN = __GEN__;
const DEC = __DEC__;
const q = st.q !== undefined ? st.q : '';
const qq = q.trim().toLowerCase();
const s = st.s || 'p';
const dflt = { p: 'desc', t: 'asc', y: 'desc' };
const dir = st.dir || dflt[s];
const G = st.G || [];
const T = st.T || [];
const D = st.D || 0;
const vis = I.map((f) => (!qq || f.t.toLowerCase().includes(qq)) && (!G.length || G.includes(f.g)) && (!T.length || T.includes('film')) && (!D || (f.y >= D && f.y <= D + 9)));
let n = 0;
vis.forEach((v, i) => {
o['c' + i] = v;
if (v) n++;
});
const key = { p: (i) => -i, t: (i) => I[i].t, y: (i) => I[i].y };
const idx = I.map((_, i) => i);
idx.sort((a, b) => {
const ka = key[s](a);
const kb = key[s](b);
const c = typeof ka === 'string' ? ka.localeCompare(kb, 'fr') : ka - kb;
return (dir === 'asc' ? c : -c) || a - b;
});
idx.forEach((i, pos) => {
o['o' + i] = pos;
});
const nAct = G.length + T.length + (D ? 1 : 0);
o.filtered = !!qq || nAct > 0;
o.res = n + ' sur ' + __TOTAL__;
o.hasF = nAct > 0;
o.fN = nAct;
o.empty = n === 0;
o.notEmpty = n > 0;
o.panel = !!st.panel;
o.flCls = st.panel ? 'xd-on' : '';
o.togglePanel = () => this.setState({ panel: !st.panel });
o.q = q;
o.onQ = (e) => this.setState({ q: e.target.value });
o.sp = s === 'p' ? 'on' : '';
o.st = s === 't' ? 'on' : '';
o.sy = s === 'y' ? 'on' : '';
o.ssp = () => this.setState({ s: 'p', dir: null });
o.sst = () => this.setState({ s: 't', dir: null });
o.ssy = () => this.setState({ s: 'y', dir: null });
const LAB = { p: __PL__, t: 'Titre', y: 'Année' };
const NEXT = { p: 't', t: 'y', y: 'p' };
o.sLab = LAB[s];
o.cycle = () => this.setState({ s: NEXT[s], dir: null });
o.dirLab = dir === 'asc' ? 'Croissant' : 'Décroissant';
o.flip = () => this.setState({ dir: dir === 'asc' ? 'desc' : 'asc' });
GEN.forEach((g, j) => {
const onG = G.includes(g);
o['gc' + j] = onG ? 'xd-on' : '';
o['ga' + j] = onG;
o['gt' + j] = () => this.setState({ G: onG ? G.filter((x) => x !== g) : G.concat([g]) });
});
['film', 'tv'].forEach((t, j) => {
const onT = T.includes(t);
o['tc' + j] = onT ? 'xd-on' : '';
o['ta' + j] = onT;
o['tt' + j] = () => this.setState({ T: onT ? T.filter((x) => x !== t) : T.concat([t]) });
});
DEC.forEach((d, j) => {
const onD = D === d;
o['dc' + j] = onD ? 'xd-on' : '';
o['da' + j] = onD;
o['dt' + j] = () => this.setState({ D: onD ? 0 : d });
});
o.reset = () => this.setState({ G: [], T: [], D: 0, q: '' });
o.clearF = () => this.setState({ G: [], T: [], D: 0 });
"""
    body = (body.replace("__I__", data).replace("__GEN__", gens).replace("__DEC__", json.dumps([d for d, _ in DECADES]))
            .replace("__TOTAL__", str(total)).replace("__PL__", json.dumps(primary_label, ensure_ascii=False)))
    return b.component(body)


def search_field(placeholder, aria):
    if b.DC:
        inp = f'<input class="xd-in" value="{hx("q")}" onChange="{hx("onQ")}" placeholder="{placeholder}" aria-label="{aria}">'
    else:
        inp = f'<input class="xd-in" placeholder="{placeholder}" aria-label="{aria}">'
    return f'<label class="xd-sf">{b.ic("search", 16)}{inp}</label>'


def filter_panel(items):
    gens = genres_of(items)
    gchips = "".join(f'<button type="button" class="chip {hole(f"gc{j}", "")}"{on(f"gt{j}")}>{g}</button>' for j, g in enumerate(gens))
    tchips = "".join(f'<button type="button" class="chip {hole(f"tc{j}", "")}"{on(f"tt{j}")}>{t}</button>' for j, t in enumerate(["Films", "Séries"]))
    dchips = "".join(f'<button type="button" class="chip {hole(f"dc{j}", "")}"{on(f"dt{j}")}>{lab}</button>' for j, (_, lab) in enumerate(DECADES))
    return (f'<div class="xd-fp"><span class="xd-fgl">Genre</span><div class="xd-fch">{gchips}</div><span class="xd-fgl">Type</span><div class="xd-fch">{tchips}</div>'
            f'<span class="xd-fgl">Décennie</span><div class="xd-fch">{dchips}</div><button type="button" class="xd-rst"{on("clearF")}>Réinitialiser les filtres</button></div>')


def active_chips(items):
    x = b.ic("x", 13)
    out = "".join(when(f"ga{j}", f'<button type="button" class="chip" aria-label="Retirer ce filtre"{on(f"gt{j}")}>{g}{x}</button>', False) for j, g in enumerate(genres_of(items)))
    out += "".join(when(f"ta{j}", f'<button type="button" class="chip" aria-label="Retirer ce filtre"{on(f"tt{j}")}>{t}{x}</button>', False) for j, t in enumerate(["Films", "Séries"]))
    out += "".join(when(f"da{j}", f'<button type="button" class="chip" aria-label="Retirer ce filtre"{on(f"dt{j}")}>{lab}{x}</button>', False) for j, (_, lab) in enumerate(DECADES))
    return when("hasF", f'<div class="xd-act">{out}<button type="button" class="xd-clr"{on("clearF")}>Tout effacer</button></div>', False)


def empty_state():
    return when("empty", f'''<div class="xd-empty">{b.ic("film", 28)}<b>Aucun titre ne correspond</b><p>Aucun film ne correspond à ces critères. Élargissez la recherche ou retirez un filtre.</p>
<button type="button" class="btn gl sm"{on("reset")}>Réinitialiser les filtres</button></div>''', False)


def toolbar(primary_label, items):
    flt = (f'<button type="button" class="chip tg {hole("flCls", "")}" aria-label="Filtres"{on("togglePanel")}>{b.ic("sliders", 15)}Filtres'
           + when("hasF", f'<em>{hole("fN", "1")}</em>', False) + "</button>")
    res = when("filtered", f'<span class="xd-res">{hole("res", "")}</span>', False)
    seg = (f'<div class="seg big"><button type="button" class="{hole("sp", "on")}"{on("ssp")}>{primary_label}</button>'
           f'<button type="button" class="{hole("st", "")}"{on("sst")}>Titre</button><button type="button" class="{hole("sy", "")}"{on("ssy")}>Année</button></div>')
    dirb = f'<button type="button" class="xd-dir"{on("flip")}>{xi("sort", 15)}{hole("dirLab", "Décroissant")}</button>'
    return (f'<div class="tool xd-tool">{search_field("Rechercher un film…", "Rechercher parmi les films vus")}{flt}{res}'
            f'<div class="xd-sort"><span class="xd-sl">Trier par</span>{seg}{dirb}</div></div>')


def screen_66():
    cells = ""
    for i, (k, r) in enumerate(ADRIEN_SEEN):
        f = FILMS[k]
        if i == 1:
            pw = (f'<div class="pw">{poster(k)}<span class="xd-rt">{b.on5(r)}{b.star(12)}</span><div class="ovl2"><a class="btn sm"{href("47-proposer-un-film")}>{b.ic("plus", 14)}Proposer</a>'
                  f'<span class="mini">{b.ic("bookmark", 14)}</span></div></div>')
            cell = f'<div class="wlc hov xd-wc" style="order:{hole(f"o{i}", i)}">{pw}<div class="m">{f["y"]}{b.rating(f["r"])}</div></div>'
        else:
            cell = (f'<div class="wlc xd-wc" style="order:{hole(f"o{i}", i)}"><a class="pw"{href("04-fiche-film")}>{poster(k)}<span class="xd-rt">{b.on5(r)}{b.star(12)}</span></a>'
                    f'<div class="m">{f["y"]}{b.rating(f["r"])}</div></div>')
        cells += when(f"c{i}", cell)
    return f'''<div class="S desk frame">{b.hdr(-1, solid=True)}<div class="xd-clip"><div class="page xd-cp">
<a class="back"{href("07-profil")}>{b.ic("left", 16)}Retour au profil</a>
<div class="xd-chd">{av("adrien", 56)}<div><h1 class="disp">Les films vus par Adrien</h1><span class="cnt">36 films vus</span></div></div>
{toolbar("Vu le", ADRIEN_SEEN)}{when("panel", filter_panel(ADRIEN_SEEN), False)}{active_chips(ADRIEN_SEEN)}
{when("notEmpty", f'<div class="wgr xd-g">{cells}</div>')}{empty_state()}</div></div></div>'''


LEA_WL = ["km", "verre", "sable", "projo", "orbite", "phare", "volets", "kyoto", "marseille", "brume"]
MINE = {"orbite", "phare", "sable"}


def screen_67():
    cells = ""
    for i, k in enumerate(LEA_WL):
        f = FILMS[k]
        bm_on = k in MINE
        if b.DC:
            bm = (f'<button type="button" class="xd-bm {hx(f"bc{i}")}" aria-label="Ma liste"{on(f"bt{i}")}>'
                  + when(f"bi{i}", b.ic("check", 15), bm_on) + when(f"bo{i}", b.ic("bookmark", 15), not bm_on) + "</button>")
        else:
            bm = f'<button type="button" class="xd-bm{" on" if bm_on else ""}" aria-label="Ma liste">{b.ic("check" if bm_on else "bookmark", 15)}</button>'
        if i == 1:
            pw = (f'<div class="pw">{poster(k)}{bm}<div class="ovl2"><a class="btn sm"{href("47-proposer-un-film")}>{b.ic("plus", 14)}Proposer</a>'
                  f'<a class="mini" aria-label="Voir la fiche"{href("04-fiche-film")}>{b.ic("info", 14)}</a></div></div>')
            cell = f'<div class="wlc hov xd-wc">{pw}<div class="m">{f["y"]}{b.rating(f["r"])}</div></div>'
        else:
            cell = (f'<div class="wlc xd-wc"><div class="pw"><a class="pw"{href("04-fiche-film")}>{poster(k)}</a>{bm}</div>'
                    f'<div class="m">{f["y"]}{b.rating(f["r"])}</div></div>')
        cells += when(f"c{i}", cell)
    seg = '<div class="seg big"><button type="button" class="on">Ajouté le</button><button type="button">Titre</button><button type="button">Année</button></div>'
    tool = (f'<div class="tool xd-tool">{search_field("Rechercher un film…", "Rechercher dans la watchlist")}'
            f'<button type="button" class="chip tg" aria-label="Filtres">{b.ic("sliders", 15)}Filtres</button>'
            + when("filtered", f'<span class="xd-res">{hole("res", "")}</span>', False)
            + f'<div class="xd-sort"><span class="xd-sl">Trier par</span>{seg}<button type="button" class="xd-dir">{xi("sort", 15)}Décroissant</button></div></div>')
    empty = when("empty", f'''<div class="xd-empty">{b.ic("film", 28)}<b>Aucun titre ne correspond</b><p>Aucun film ne correspond à ces critères. Élargissez la recherche ou retirez un filtre.</p>
<button type="button" class="btn gl sm"{on("reset")}>Réinitialiser les filtres</button></div>''', False)
    return f'''<div class="S desk frame">{b.hdr(-1, solid=True)}<div class="xd-clip"><div class="page xd-cp">
<a class="back"{href("64-profil-ami")}>{b.ic("left", 16)}Retour au profil</a>
<div class="xd-chd">{av("lea", 56)}<div><h1 class="disp">La watchlist de Léa</h1><span class="cnt">{LEA["wl"]} films à voir</span></div></div>
{tool}<div class="wgr xd-g">{cells}</div>{empty}</div></div></div>'''


def wl_logic():
    data = json.dumps([FILMS[k]["t"] for k in LEA_WL], ensure_ascii=False)
    mine = json.dumps([k in MINE for k in LEA_WL])
    body = """
const T = __T__;
const M = st.m || __M__;
const q = st.q !== undefined ? st.q : '';
const qq = q.trim().toLowerCase();
let n = 0;
T.forEach((t, i) => {
const v = !qq || t.toLowerCase().includes(qq);
o['c' + i] = v;
if (v) n++;
o['bc' + i] = M[i] ? 'on' : '';
o['bi' + i] = !!M[i];
o['bo' + i] = !M[i];
o['bt' + i] = () => {
const g = M.slice();
g[i] = !g[i];
this.setState({ m: g });
};
});
o.filtered = !!qq;
o.res = n + ' sur __TOTAL__';
o.empty = n === 0;
o.q = q;
o.onQ = (e) => this.setState({ q: e.target.value });
o.reset = () => this.setState({ q: '' });
"""
    body = body.replace("__T__", data).replace("__M__", mine).replace("__TOTAL__", str(LEA["wl"]))
    return b.component(body)


def screen_70():
    cells = ""
    for i, (k, r) in enumerate(LEA_SEEN):
        f = FILMS[k]
        cells += when(f"c{i}", f'''<div style="order:{hole(f"o{i}", i)}"><a class="pw"{href("17-m-fiche-film")}>{poster(k)}<span class="xd-rt">{b.on5(r)}{b.star(11)}</span></a><div class="m">{f["y"]}</div></div>''')
    if b.DC:
        inp = f'<input class="xd-in" value="{hx("q")}" onChange="{hx("onQ")}" placeholder="Rechercher un film…" aria-label="Rechercher parmi les films vus">'
    else:
        inp = '<input class="xd-in" placeholder="Rechercher un film…" aria-label="Rechercher parmi les films vus">'
    sort = f'<button type="button" class="xd-dir" aria-label="Trier par"{on("cycle")}>{xi("sort", 15)}{hole("sLab", "Vu le")}</button>'
    empty = when("empty", f'''<div class="xd-empty">{b.ic("film", 26)}<b>Aucun titre ne correspond</b><p>Élargissez la recherche ou retirez un filtre.</p>
<button type="button" class="btn gl sm"{on("reset")}>Tout effacer</button></div>''', False)
    return f'''<div class="S mob frame">{b.sbar()}{b.m_top("Retour au profil", "69-m-profil-ami", ())}
<div class="xd-mch"><h1 class="disp">Les films vus par Léa</h1><div class="xd-mby">{av("lea", 22)}<span>@lea, 42 films vus</span></div></div>
<div class="xd-mtool"><label class="xd-sf">{b.ic("search", 16)}{inp}</label><a class="ib" aria-label="Filtres"{href("46-m-filtres")}>{b.ic("sliders", 17)}</a>{sort}</div>
<div class="xd-mgw"><div class="xd-mg">{cells}</div>{empty}</div>
{b.mnav(-1)}</div>'''


SCREENS = {
    "62": screen_62,
    "63": screen_63,
    "64": screen_64,
    "65": screen_65,
    "66": screen_66,
    "67": screen_67,
    "68": screen_68,
    "69": screen_69,
    "70": screen_70,
}

LOGIC = {
    "62": n_logic(),
    "63": theme_logic(),
    "64": follow_logic(),
    "65": follows_logic(),
    "66": collection_logic(ADRIEN_SEEN, 36, "Vu le"),
    "67": wl_logic(),
    "68": n_logic(),
    "69": follow_logic(),
    "70": collection_logic(LEA_SEEN, 42, "Vu le"),
}
