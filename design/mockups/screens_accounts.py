import json

import base_screens as b

XICONS = {
    "mail": '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    "key": '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>',
    "download": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    "logout": '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    "globe": '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    "imgplus": '<path d="M16 5h6"/><path d="M19 2v6"/><path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><circle cx="9" cy="9" r="2"/>',
    "shield": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    "sun": '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    "moon": '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    "monitor": '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/>',
    "refresh": '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    "belloff": '<path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5"/><path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="m2 2 20 20"/>',
    "warn": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    "imgup": '<path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"/><path d="m14 19.5 3-3 3 3"/><path d="M17 22v-5.5"/><circle cx="9" cy="9" r="2"/>',
    "smile": '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
    "bot": '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/>',
    "heart": '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    "image": '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
}

GOOGLE = ('<svg class="ic" width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">'
          '<path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.81 2.73v2.26h2.92c1.7-1.57 2.69-3.88 2.69-6.63z"/>'
          '<path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33C2.44 15.98 5.48 18 9 18z"/>'
          '<path d="M3.97 10.71c-.18-.54-.28-1.11-.28-1.71s.1-1.17.28-1.71V4.96H.96C.35 6.17 0 7.55 0 9s.35 2.83.96 4.04l3.01-2.33z"/>'
          '<path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>')

GITHUB = ('<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
          '<path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>')


def ic(name, size=18):
    if name in XICONS:
        return (f'<svg class="ic" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
                f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{XICONS[name]}</svg>')
    return b.ic(name, size)


def frozen(fn):
    dc, emb = b.DC, b.EMBED
    b.DC, b.EMBED = False, True
    try:
        return fn()
    finally:
        b.DC, b.EMBED = dc, emb


def inp(name, static, typ="text", cls="", ph=""):
    if b.DC:
        handler = "on" + name[0].upper() + name[1:]
        extra = f" {b.hx(name + 'Cls')}" if cls == "dyn" else (f" {cls}" if cls else "")
        holder = f' placeholder="{ph}"' if ph else ""
        return f'<input class="in{extra}" type="{typ}"{holder} value="{b.hx(name)}" onChange="{b.hx(handler)}">'
    return static


def fld(label, control, right="", cls=""):
    head = f'<span class="fl xa-flr">{label}{right}</span>' if right else f'<span class="fl">{label}</span>'
    return f'<label class="fld{(" " + cls) if cls else ""}">{head}{control}</label>'


def tg(name, on, label, dis=False):
    static = ("on" if on else "") + (" dis" if dis else "")
    return f'<button type="button" class="xa-tg {b.hole(name + "Cls", static.strip())}" aria-label="{label}"{b.on("t" + name[0].upper() + name[1:])}><i></i></button>'


MASK = "••••••••••"
SAVED = f'<span class="xa-saved">{b.ic("check", 14)}Enregistré</span>'


def or_line():
    return '<div class="xa-or"><span>ou</span></div>'


def google_btn(target, cls="btn gl full xa-gg"):
    return f'<a class="{cls}"{b.href(target)}>{GOOGLE}Continuer avec Google</a>'


def auth_hdr():
    return b.guest_hdr(False, actions=False)


WALL = ["phare", "orbite", "kyoto", "volets", "sable", "marseille", "projo", "brume", "km", "verre", "orbite", "phare", "kyoto", "sable", "volets", "projo"]


def wall(keys):
    return '<div class="xa-wall">' + "".join(f'<span>{b.poster(k)}</span>' for k in keys) + "</div>"


def art_login():
    return f'''<div class="xa-art">{wall(WALL)}<div class="xa-artc"><div class="ov">Soirée ciné à plusieurs</div><div class="disp xa-artt">Vos soirées vous attendent</div>
<div class="cd st"><div><div class="cdl">Soirée chez Léa</div><div class="cds">Commence dans</div></div><div class="v">4 J 06 H</div>{b.stack(["lea", "nico", "ines"], 24)}</div></div></div>'''


def art_register():
    steps = "".join(f'<div><b class="disp">{n}</b><span>{t}</span></div>' for n, t in
                    [(1, "Créez la soirée"), (2, "Partagez le lien"), (3, "Proposez et votez"), (4, "La roue tranche")])
    return f'''<div class="xa-art">{wall(WALL[5:] + WALL[:5])}<div class="xa-artc"><div class="ov">Gratuit, sans publicité</div><div class="disp xa-artt">Le film de la soirée, <span>sans y passer la soirée.</span></div>
<div class="xa-steps">{steps}</div></div></div>'''


def screen_21():
    pw_right = f'<a class="xa-lnk"{b.href("23-mot-de-passe-oublie")}>Mot de passe oublié&nbsp;?</a>'
    return f'''<div class="S desk frame">{auth_hdr()}<div class="spot soft"></div>
<div class="xa-auth"><div class="xa-af"><a class="back"{b.href("09-accueil-public")}>{b.ic("left", 16)}Accueil</a>
<div class="ov">Votre compte</div><h1 class="disp">Connexion</h1><p class="xa-lead">Accédez à vos soirées et à votre profil.</p>
{fld("E-mail", '<span class="in">adrien@exemple.fr</span>')}
{fld("Mot de passe", f'<span class="in focus xa-mask">{MASK}<i class="caret"></i></span>', pw_right)}
<a class="btn full xa-go"{b.href("01-explorer")}>Se connecter</a>
{or_line()}{google_btn("01-explorer")}
<p class="xa-alt">Pas encore de compte&nbsp;? <a{b.href("22-inscription")}>Créer un compte</a></p></div>
{art_login()}</div></div>'''


def screen_22():
    return f'''<div class="S desk frame">{auth_hdr()}<div class="spot soft"></div>
<div class="xa-auth"><div class="xa-af"><a class="back"{b.href("09-accueil-public")}>{b.ic("left", 16)}Accueil</a>
<div class="ov">Nouveau compte</div><h1 class="disp">Inscription</h1><p class="xa-lead">Créez un compte pour retrouver vos soirées.</p>
<div class="frow">{fld("Pseudo", '<span class="in">Adrien</span>')}{fld("E-mail", '<span class="in">adrien@exemple.fr</span>')}</div>
{fld("Mot de passe", f'<span class="in focus xa-mask">{MASK}<i class="caret"></i></span><span class="xa-hint">8 caractères minimum, au moins une lettre et un chiffre.</span>')}
<a class="btn full xa-go"{b.href("01-explorer")}>Créer mon compte</a>
{or_line()}{google_btn("01-explorer")}
<p class="xa-alt">Déjà inscrit&nbsp;? <a{b.href("21-connexion")}>Se connecter</a></p></div>
{art_register()}</div></div>'''


def screen_23():
    email = inp("em", '<span class="in focus">adrien@exemple.fr<i class="caret"></i></span>', "email", "dyn")
    err = b.when("bad", f'<span class="msg">{b.ic("alert", 13)}Indiquez une adresse e-mail valide.</span>', False)
    form = f'''<div class="xa-badge">{ic("mail", 24)}</div><div class="ov">Votre compte</div><h1 class="disp">Mot de passe oublié</h1>
<p class="xa-lead">Indiquez votre e-mail pour recevoir un lien de réinitialisation. Le lien est valable 30 minutes.</p>
{fld("E-mail", email + err)}
<button type="button" class="btn full xa-go"{b.on("send")}>Recevoir le lien</button>
<p class="xa-alt"><a{b.href("21-connexion")}>Retour à la connexion</a></p>'''
    sent = f'''<div class="xa-badge">{b.ic("check", 24)}</div><div class="ov">E-mail envoyé</div><h1 class="disp">Vérifiez votre boîte mail</h1>
<p class="xa-lead">Si un compte existe pour {b.hole("mail", "adrien@exemple.fr")}, un lien de réinitialisation vient d’être envoyé. Pensez à vérifier les spams.</p>
<a class="xa-mailc"{b.href("24-nouveau-mot-de-passe")}><span class="xa-mlogo">M</span><span><b>Movie Picker</b><small>Réinitialisez votre mot de passe, lien valable 30 minutes</small></span>{b.ic("right", 16)}</a>
<p class="xa-alt"><a{b.href("21-connexion")}>Retour à la connexion</a></p>'''
    return f'''<div class="S desk frame">{auth_hdr()}<div class="spot soft"></div>
<div class="xa-solo"><a class="back"{b.href("09-accueil-public")}>{b.ic("left", 16)}Accueil</a>
<div class="xa-sc">{b.when("form", form)}{b.when("sent", sent, False)}</div></div></div>'''


RULES = [("r1", "8 caractères minimum"), ("r2", "Au moins une lettre"), ("r3", "Au moins un chiffre")]


def screen_24():
    p1 = inp("p", f'<span class="in xa-mask">{MASK}</span>', "password")
    p2 = inp("c", f'<span class="in focus xa-mask">{MASK}<i class="caret"></i></span>', "password", "dyn")
    rules = "".join(f'<span class="xa-rule {b.hole(k, "ok")}">{b.ic("check", 13)}{t}</span>' for k, t in RULES)
    mism = b.when("mism", f'<span class="msg">{b.ic("alert", 13)}Les deux mots de passe doivent être identiques.</span>', False)
    form = f'''<div class="xa-badge">{ic("key", 24)}</div><div class="ov">Réinitialisation</div><h1 class="disp">Définir un nouveau mot de passe</h1>
<p class="xa-lead">Choisissez un nouveau mot de passe pour votre compte Movie&nbsp;Picker.</p>
{fld("Nouveau mot de passe", p1 + f'<span class="xa-rules">{rules}</span>')}
{fld("Confirmez le mot de passe", p2 + mism)}
<button type="button" class="btn full xa-go"{b.on("submit")}>Mettre à jour mon mot de passe</button>'''
    done = f'''<div class="xa-badge">{b.ic("check", 24)}</div><div class="ov">C’est fait</div><h1 class="disp">Mot de passe mis à jour</h1>
<p class="xa-lead">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe. Les comptes Google ou GitHub qui étaient reliés ont été détachés : reliez-les depuis vos paramètres si besoin.</p>
<a class="btn full xa-go"{b.href("21-connexion")}>Aller à la connexion</a>'''
    return f'''<div class="S desk frame">{auth_hdr()}<div class="spot soft"></div>
<div class="xa-solo"><a class="back"{b.href("09-accueil-public")}>{b.ic("left", 16)}Accueil</a>
<div class="xa-sc">{b.when("form", form)}{b.when("done", done, False)}</div></div></div>'''


RUBS = [
    ("user", "Profil", "25-reglages-profil", "Pseudo, bio, favoris, visibilité"),
    ("sliders", "Préférences", "26-reglages-preferences", "Langue, thème, couleur, notes"),
    ("bell", "Notifications", "27-reglages-notifications", "Push et alertes par soirée"),
    ("link", "Intégrations", "28-reglages-integrations", "Letterboxd, Google, GitHub"),
    ("shield", "Compte et sécurité", "29-reglages-securite", "E-mail, mot de passe, données, déconnexion"),
]


def side(active, name="Adrien"):
    items = ""
    for i, (icon, lab, target, _) in enumerate(RUBS):
        dot = '<i class="xa-dot" aria-label="Action requise"></i>' if i == 3 else ""
        items += f'<a class="xa-rub{" on" if i == active else ""}"{b.href(target)}>{ic(icon, 18)}<span>{lab}</span>{dot}</a>'
    return f'''<div class="xa-side"><a class="xa-me" aria-label="Changer d’avatar"{b.href("30-choix-avatar")}><span class="xa-avw">{b.av("adrien", 48)}<i>{b.ic("pencil", 11)}</i></span>
<span><b>{name}</b><small>@adrien</small></span></a>
<div class="xa-rubs" role="navigation" aria-label="Rubriques des paramètres">{items}</div>
<a class="xa-pub"{b.href("07-profil")}>{ic("globe", 16)}Voir mon profil public</a></div>'''


def settings_inner(active, body, name="Adrien", saved=True):
    chip = b.when("saved", SAVED, False) if saved else ""
    return f'''{b.hdr(-1, solid=True)}<div class="xa-set">{side(active, name)}
<div class="xa-main"><div class="xa-ph"><div><div class="ov">Paramètres</div><h1 class="disp util">{RUBS[active][1]}</h1></div>{chip}</div>{body}</div></div>'''


def settings_desk(active, body, name="Adrien", saved=True):
    return f'<div class="S desk frame">{settings_inner(active, body, name, saved)}</div>'


FAVS = [("phare", "Famille"), ("kyoto", "Romance"), ("orbite", "Science-fiction")]
BIO = "Orga des soirées ciné du vendredi. Faible pour la SF lente et les films de phare."


def profile_body():
    if b.DC:
        bio = f'<textarea class="in xa-ta" rows="3" value="{b.hx("bio")}" onChange="{b.hx("onBio")}"></textarea>'
    else:
        bio = f'<span class="in xa-ta">{BIO}</span>'
    name_in = inp("name", '<span class="in">Adrien</span>', "text", "dyn")
    name_err = b.when("nameMissing", f'<span class="msg">{b.ic("alert", 13)}Le pseudo est requis.</span>', False)
    left_bio = f'<small class="xa-cnt">{b.hole("bioLeft", 140 - len(BIO))} caractères restants</small>'
    ident = f'''<div class="xa-card xa-id"><div class="xa-ida"><a class="xa-avw big" aria-label="Changer d’avatar"{b.href("30-choix-avatar")}>{b.av("adrien", 84)}<i>{b.ic("pencil", 13)}</i></a>
<a class="xa-mini"{b.href("30-choix-avatar")}>Changer</a></div>
<div class="xa-idf">{fld("Pseudo", name_in + name_err)}{fld("Bio", bio, left_bio)}</div></div>'''
    pub_sub = "Votre pseudo, votre bio et vos films sont visibles à l’adresse movie-picker.fr/u/adrien. Votre e-mail n’apparaît jamais."
    wl_pub = "Vos films à voir apparaissent à l’adresse movie-picker.fr/u/adrien/watchlist. Les visiteurs ne peuvent pas la modifier."
    wl_priv = "Votre profil est privé : la watchlist reste masquée tant qu’il le restera."
    vis = f'''<div class="xa-card"><div class="xa-row"><div class="xa-rm"><div class="xa-rl">Profil public</div><div class="xa-rs">{pub_sub}</div></div>{tg("pub", True, "Profil public")}</div>
<div class="xa-row"><div class="xa-rm"><div class="xa-rl">Watchlist visible sur mon profil</div><div class="xa-rs">{b.when("isPub", wl_pub)}{b.when("isPriv", wl_priv, False)}</div></div>{tg("wl", True, "Watchlist visible sur mon profil")}</div></div>'''
    rows = ""
    for i, (k, genre) in enumerate(FAVS):
        f = b.FILMS[k]
        row = (f'<div class="xa-fav"><a class="xa-th"{b.href("04-fiche-film")}>{b.poster(k)}</a><div class="xa-rm"><div class="xa-rl">{f["t"]}</div><div class="xa-rs">{f["y"]}, {genre}</div></div>'
               f'<button type="button" class="xa-mini" aria-label="Retirer {f["t"]} de mes favoris"{b.on(f"rm{i}")}>Retirer</button></div>')
        rows += b.when(f"f{i}", row)
    full = b.when("full", '<p class="xa-rs xa-ffoot">Trois favoris au maximum : retirez-en un pour en choisir un autre.</p>')
    add = b.when("notFull", f'<button type="button" class="btn gl sm xa-add"{b.on("addFav")}>{b.ic("plus", 15)}Ajouter un favori</button>', False)
    favs = f'''<div class="xa-card xa-favs"><div class="xa-fh"><div><div class="xa-rl">Mes favoris</div><div class="xa-rs">Jusqu’à trois films ou séries, affichés sur votre profil public.</div></div><span class="xa-count">{b.hole("fCount", "3 sur 3")}</span></div>
{rows}{full}{add}</div>'''
    return f'<div class="xa-pg"><div>{ident}{vis}</div>{favs}</div>'


def screen_25():
    return settings_desk(0, profile_body(), b.hole("nameOr", "Adrien"))


THEMES = [("system", "monitor", "Système"), ("light", "sun", "Clair"), ("dark", "moon", "Sombre")]
ACCENTS = [("blue", "Bleu", "#2563eb"), ("green", "Vert", "#15803d"), ("purple", "Violet", "#7c3aed"), ("pink", "Rose", "#db2777"),
           ("orange", "Orange", "#c2410c"), ("red", "Rouge", "#dc2626"), ("cyan", "Cyan", "#0e7490"), ("indigo", "Indigo", "#4f46e5")]


def theme_opt(full=False):
    btns = "".join(f'<button type="button" class="{b.hole("th_" + k, "on" if k == "dark" else "")}"{b.on("sth_" + k)}>{ic(icon, 16)}{lab}</button>' for k, icon, lab in THEMES)
    return f'<div class="xa-opt{" xa-optf" if full else ""}" role="radiogroup" aria-label="Thème de l’interface">{btns}</div>'


def swatches(cls="xa-sws"):
    out = ""
    for k, lab, col in ACCENTS:
        out += f'<button type="button" class="xa-sw {b.hole("ac_" + k, "on" if k == "blue" else "")}" aria-label="{lab}"{b.on("sac_" + k)}><i style="background:{col}">{b.ic("check", 15)}</i></button>'
    return f'<div class="{cls}" role="radiogroup" aria-label="Couleur d’accent">{out}</div>'


def scale_opt(full=False):
    btns = (f'<button type="button" class="{b.hole("sc5", "")}"{b.on("ssc5")}>Sur 5</button>'
            f'<button type="button" class="{b.hole("sc10", "on")}"{b.on("ssc10")}>Sur 10</button>')
    ex = f'<span class="xa-ex">Aperçu<b>{b.star(13)}{b.hole("scEx", "8,4")}</b></span>'
    return f'<div class="xa-scl"><div class="xa-opt{" xa-optf" if full else ""}" role="radiogroup" aria-label="Échelle des notes">{btns}</div>{ex}</div>'


def lang_dd(full=False):
    return f'<span class="xa-sel{" xa-self" if full else ""}" role="button" aria-label="Langue">Français{b.ic("chevd", 16)}</span>'


ACC_HINT = "Choisissez la couleur dominante des boutons et accents. S’applique en mode clair et sombre."


def prefs_body():
    def row(label, sub, ctrl):
        s = f'<div class="xa-rs">{sub}</div>' if sub else ""
        return f'<div class="xa-row xa-prow"><div class="xa-rm"><div class="xa-rl">{label}</div>{s}</div><div class="xa-ctl">{ctrl}</div></div>'
    acc_lab = f'Couleur d’accent<span class="xa-accn">{b.hole("acName", "Bleu")}</span>'
    return f'''<div class="xa-card">{row("Langue", "Français ou English, pour toute l’interface.", lang_dd())}
{row("Thème de l’interface", "Système suit le réglage de votre appareil.", theme_opt())}
{row(acc_lab, ACC_HINT, swatches())}
{row("Échelle des notes", "Pour noter les films et lire les notes du groupe.", scale_opt())}</div>'''


def screen_26():
    return settings_desk(1, prefs_body())


NOTIF_GROUPS = [
    ("Vos soirées", [("n0", "Quelqu’un rejoint votre soirée", True), ("n1", "Un film est proposé à votre soirée", True), ("n2", "Résultat du tirage au sort", True),
                     ("n3", "Film choisi par l’hôte (sans la roue)", True), ("n4", "Une soirée est annulée", True), ("n5", "La date d’une soirée change", True),
                     ("n6", "Soirée terminée sans film choisi", False)]),
    ("Rappels", [("n7", "Rappel 1 heure avant la soirée", True), ("n8", "Rappel 24 heures avant la soirée", False), ("n9", "Rappel le lendemain pour noter le film vu", True)]),
    ("Social et imports", [("n10", "Invitation à une soirée", True), ("n11", "Quelqu’un vous suit", True), ("n12", "Films Letterboxd à confirmer", True)]),
]


def notif_body():
    def group(title, items):
        rows = "".join(f'<div class="xa-nr"><span>{lab}</span>{tg(k, on, lab)}</div>' for k, lab, on in items)
        return f'<div class="xa-ng"><div class="xa-ct">{title}</div>{rows}</div>'
    icon_on = b.when("pushOn", b.ic("bell", 20))
    icon_off = b.when("pushOff", ic("belloff", 20), False)
    lab = f'{b.when("pushOn", "Notifications push activées")}{b.when("pushOff", "Notifications push désactivées", False)}'
    push = f'''<div class="xa-card"><div class="xa-row"><span class="xa-ri">{icon_on}{icon_off}</span><div class="xa-rm"><div class="xa-rl">{lab}</div><div class="xa-rs">Sur cet appareil. Les réglages ci-dessous valent pour tous vos appareils.</div></div>{tg("push", True, "Notifications push")}</div></div>'''
    cols = f'<div class="xa-card xa-ncols"><div>{group(*NOTIF_GROUPS[0])}</div><div>{group(*NOTIF_GROUPS[1])}{group(*NOTIF_GROUPS[2])}</div></div>'
    return push + cols


def screen_27():
    return settings_desk(2, notif_body())


def integ_body():
    lb_logo = '<span class="xa-lb" aria-hidden="true"><i></i><i></i><i></i></span>'
    info = f'<button type="button" class="xa-info" aria-label="Comment ça marche"{b.on("tHelp")}>{b.ic("info", 16)}</button>'
    help_box = b.when("help", '''<div class="xa-help"><b>Comment ça marche</b><p>Votre watchlist Letterboxd publique est recopiée ici, au plus une fois par jour à l’ouverture de l’application. Rien n’est écrit sur Letterboxd.</p>
<p>Les films reconnus avec certitude sont ajoutés directement, les titres ambigus vous sont soumis pour arbitrage.</p><p>Votre pseudo est la fin de l’URL letterboxd.com/…, et votre profil doit être public.</p></div>''', False)
    status = f'<span class="xa-ok">{b.ic("check", 14)}{b.hole("lbStatus", "Synchronisé le 8 nov. 2026 à 07:12.")}</span>'
    connected = f'''<div class="xa-lbr"><span class="xa-user">adrien_cine</span><button type="button" class="xa-mini"{b.on("edit")}>Modifier</button><button type="button" class="xa-mini xa-bd"{b.on("disconnect")}>Déconnecter</button>{status}</div>
<div class="xa-att">{ic("warn", 18)}<span>1 film n’a pas pu être identifié automatiquement.</span><a class="xa-mini"{b.href("40-import-letterboxd")}>Les confirmer</a></div>
<div class="xa-lbs"><p class="xa-rs">{b.when("noRep", "Une lecture par jour au maximum. Rien n’est jamais écrit sur Letterboxd.")}{b.when("rep", "3 films ajoutés, 1 retiré. Prochaine lecture automatique demain.", False)}</p><button type="button" class="btn sm"{b.on("sync")}>{ic("refresh", 16)}Synchroniser maintenant</button></div>'''
    edit_in = inp("lbu", '<span class="in">adrien_cine</span>')
    editing = f'''<div class="xa-lbr"><div class="xa-lbin">{edit_in}</div><button type="button" class="ib" aria-label="Enregistrer le pseudo Letterboxd"{b.on("save")}>{b.ic("check", 18)}</button><button type="button" class="ib" aria-label="Annuler"{b.on("save")}>{b.ic("x", 18)}</button></div>'''
    off_in = inp("lbn", '<span class="in xa-ph0">Votre pseudo Letterboxd</span>', ph="Votre pseudo Letterboxd")
    disconnected = f'''<div class="xa-lbr"><div class="xa-lbin">{off_in}</div><a class="btn sm"{b.href("40-import-letterboxd")}>{ic("download", 16)}Connecter et importer</a></div>
<p class="xa-rs">Ajoutez votre pseudo pour activer la synchronisation. Votre watchlist Letterboxd est recopiée dans Movie Picker, les films ajoutés à la main ici ne sont jamais touchés.</p>'''
    lb = f'''<div class="xa-card xa-lbc"><div class="xa-lbh">{lb_logo}<span class="xa-rl">Letterboxd</span>{info}</div>{help_box}
{b.when("conn", connected)}{b.when("editing", editing, False)}{b.when("disc", disconnected, False)}</div>'''
    g_linked = f'''<div class="xa-rs">{b.when("gOk", "Lié")}{b.when("gNo", "Non lié", False)}</div>'''
    g_act = (b.when("gIdle", f'<button type="button" class="xa-mini"{b.on("gAsk")}>Délier</button>')
             + b.when("gAsking", f'<span class="xa-pair"><button type="button" class="xa-mini xa-bdf"{b.on("gUnlink")}>Confirmer</button><button type="button" class="xa-mini"{b.on("gCancel")}>Annuler</button></span>', False)
             + b.when("gNo", f'<a class="xa-mini"{b.href("01-explorer")}>Lier Google</a>', False))
    conns = f'''<div class="xa-card"><div class="xa-ct">Connexions</div>
<div class="xa-row"><span class="xa-pi">{GOOGLE}</span><div class="xa-rm"><div class="xa-rl">Google</div>{g_linked}</div>{g_act}</div>
<div class="xa-row"><span class="xa-pi">{GITHUB}</span><div class="xa-rm"><div class="xa-rl">GitHub</div><div class="xa-rs">Non lié</div></div><a class="xa-mini"{b.href("01-explorer")}>Lier GitHub</a></div>
<p class="xa-rs xa-cfoot">Vous avez aussi un mot de passe, vous pouvez délier ces comptes sans perdre l’accès.</p></div>'''
    return lb + conns


def screen_28():
    return settings_desk(3, integ_body(), saved=False)


DEL_TXT = ("Votre profil, vos notifications, vos abonnements et vos appareils de notification seront définitivement supprimés. "
           "Les soirées que vous avez créées et vos votes sont conservés mais anonymisés (rattachés à «&nbsp;Compte supprimé&nbsp;») pour ne pas perturber les autres participants. Cette action est irréversible.")


def security_body():
    pw_row = f'''<div class="xa-row"><span class="xa-ri">{ic("key", 20)}</span><div class="xa-rm"><div class="xa-rl">Mot de passe</div><div class="xa-rs">{b.hole("pwSub", "Défini")}</div></div>{b.when("pwIdle", f'<button type="button" class="xa-mini"{b.on("openPw")}>Changer</button>')}</div>'''
    pw_form = f'''<div class="xa-pwf"><div class="xa-pw3">{fld("Mot de passe actuel", f'<span class="in xa-mask">{MASK}</span>')}
{fld("Nouveau mot de passe", f'<span class="in xa-mask">{MASK}</span><span class="xa-hint">8 caractères minimum, au moins une lettre et un chiffre.</span>')}
{fld("Confirmer le nouveau mot de passe", f'<span class="in focus xa-mask">{MASK}<i class="caret"></i></span><span class="xa-hint">Changer votre mot de passe vous déconnectera de cet appareil.</span>')}</div>
<div class="xa-pair"><button type="button" class="btn sm"{b.on("submitPw")}>Changer le mot de passe</button><button type="button" class="btn gl sm"{b.on("closePw")}>Annuler</button></div></div>'''
    card = f'''<div class="xa-card"><div class="xa-row"><span class="xa-ri">{ic("mail", 20)}</span><div class="xa-rm"><div class="xa-rl">Adresse e-mail</div><div class="xa-rs">adrien@exemple.fr</div></div></div>
{pw_row}{b.when("pwOpen", pw_form, False)}
<div class="xa-row"><span class="xa-ri">{ic("download", 20)}</span><div class="xa-rm"><div class="xa-rl">Exporter mes données</div><div class="xa-rs">Profil, notifications, abonnements, soirées et votes, au format JSON.</div></div><button type="button" class="xa-mini">Télécharger mes données</button></div>
<div class="xa-row"><span class="xa-ri">{ic("logout", 20)}</span><div class="xa-rm"><div class="xa-rl">Cet appareil</div><div class="xa-rs">Se déconnecter de Movie Picker sur cet appareil.</div></div><a class="xa-mini"{b.href("09-accueil-public")}>Se déconnecter</a></div></div>'''
    del_form = f'''<div class="xa-delf">{fld("Saisissez votre mot de passe pour confirmer", f'<span class="in focus xa-mask">{MASK}<i class="caret"></i></span>')}
<div class="xa-pair"><a class="xa-mini xa-bdf"{b.href("09-accueil-public")}>Supprimer définitivement</a><button type="button" class="xa-mini"{b.on("closeDel")}>Annuler</button></div></div>'''
    danger = f'''<div class="xa-card xa-danger"><div class="xa-dh">{b.ic("trash", 16)}Supprimer mon compte</div><p class="xa-rs">{DEL_TXT}</p>
{b.when("delIdle", f'<button type="button" class="xa-mini xa-bd"{b.on("openDel")}>Supprimer mon compte</button>')}{b.when("delOpen", del_form, False)}</div>'''
    return card + danger


def screen_29():
    return settings_desk(4, security_body(), saved=False)


BOT_COLORS = [c for _, c in b.PEOPLE.values()]
EMOJIS = ["😊", "😉", "🤩", "😇", "😁", "😎", "🤓", "😏", "🥳", "😋", "🤠", "😌", "🙂", "🥰", "🧐", "😜", "🤗", "😺"]
BOT_SEL = 3


def bot(i):
    return f'<span class="xa-bot v{(i * 2 + i // 6) % 5}" style="--c:{BOT_COLORS[(i + 2 * (i // 6)) % len(BOT_COLORS)]}"><s></s><b><i></i></b></span>'


def avatar_modal():
    bots = "".join(f'<button type="button" class="xa-tile {b.hole(f"b{i}", "on" if i == BOT_SEL else "")}" aria-label="Choisir l’avatar robot {i + 1}"{b.on(f"pb{i}")}>{bot(i)}{b.ic("check", 13)}</button>' for i in range(18))
    emos = "".join(f'<button type="button" class="xa-tile {b.hole(f"e{i}", "")}" aria-label="Choisir l’avatar emoji {i + 1}"{b.on(f"pe{i}")}><span class="xa-emo">{e}</span>{b.ic("check", 13)}</button>' for i, e in enumerate(EMOJIS))
    photo = f'''<div class="xa-drop"><span class="xa-dic">{ic("imgplus", 26)}</span><b>Ajoutez votre photo</b><p>Glissez une image ici ou choisissez-la.<br>JPEG, PNG ou WebP, 10 Mo maximum.</p>
<button type="button" class="btn sm">{ic("imgup", 16)}Choisir une photo</button></div>'''
    tabs = (f'<button type="button" class="{b.hole("tP", "")}"{b.on("goP")}>{ic("image", 15)}Ma photo</button>'
            f'<button type="button" class="{b.hole("tB", "on")}"{b.on("goB")}>{ic("bot", 15)}Robots</button>'
            f'<button type="button" class="{b.hole("tE", "")}"{b.on("goE")}>{ic("smile", 15)}Emoji</button>')
    return f'''<div class="xa-modal" role="dialog" aria-label="Avatar"><div class="xa-mh"><div><div class="ov">Votre profil</div><h2 class="disp">Avatar</h2></div><a class="ib" aria-label="Fermer"{b.href("25-reglages-profil")}>{b.ic("x", 18)}</a></div>
<div class="seg big xa-tabs" role="tablist">{tabs}</div>
<div class="xa-tb">{b.when("isP", photo, False)}{b.when("isB", f'<div class="xa-grid">{bots}</div>')}{b.when("isE", f'<div class="xa-grid">{emos}</div>', False)}</div>
<p class="xa-mfoot">Visible sur votre profil et dans vos soirées.</p></div>'''


def screen_30():
    parent = frozen(lambda: settings_inner(0, profile_body()))
    return f'<div class="S desk frame"><div class="dim">{parent}</div>{avatar_modal()}</div>'


def m_auth_top():
    return f'<div class="xa-mband">{b.hero_bd()}</div>{b.sbar()}{b.m_top("Accueil", "81-m-accueil-public", ())}'


def screen_31():
    pw_right = '<span class="xa-lnk">Mot de passe oublié&nbsp;?</span>'
    return f'''<div class="S mob frame">{m_auth_top()}
<div class="xa-mf xa-mf1"><div class="ov">Votre compte</div><h1 class="disp">Connexion</h1><p class="xa-lead">Accédez à vos soirées et à votre profil.</p>
{fld("E-mail", '<span class="in">adrien@exemple.fr</span>')}
{fld("Mot de passe", f'<span class="in focus xa-mask">{MASK}<i class="caret"></i></span>', pw_right)}
<a class="btn full xa-go"{b.href("11-m-explorer")}>Se connecter</a>
{or_line()}{google_btn("11-m-explorer")}
<p class="xa-alt">Pas encore de compte&nbsp;? <a{b.href("32-m-inscription")}>Créer un compte</a></p></div></div>'''


def screen_32():
    return f'''<div class="S mob frame">{m_auth_top()}
<div class="xa-mf xa-mf2"><div class="ov">Nouveau compte</div><h1 class="disp">Inscription</h1><p class="xa-lead">Créez un compte pour retrouver vos soirées.</p>
{fld("Pseudo", '<span class="in">Adrien</span>')}
{fld("E-mail", '<span class="in">adrien@exemple.fr</span>')}
{fld("Mot de passe", f'<span class="in focus xa-mask">{MASK}<i class="caret"></i></span><span class="xa-hint">8 caractères minimum, au moins une lettre et un chiffre.</span>')}
<a class="btn full xa-go"{b.href("11-m-explorer")}>Créer mon compte</a>
{or_line()}{google_btn("11-m-explorer")}
<p class="xa-alt">Déjà inscrit&nbsp;? <a{b.href("31-m-connexion")}>Se connecter</a></p></div></div>'''


def screen_33():
    rows = ""
    for i, (icon, lab, _, summ) in enumerate(RUBS):
        dot = '<i class="xa-dot" aria-label="Action requise"></i>' if i == 3 else ""
        target = "34-m-reglages-preferences" if i == 1 else None
        tag = "a" if target else "div"
        rows += f'<{tag} class="xa-mrow"{b.href(target)}><span class="xa-mic">{ic(icon, 19)}</span><span class="xa-mt"><b>{lab}</b><small>{summ}</small></span>{dot}{b.ic("right", 17)}</{tag}>'
    return f'''<div class="S mob frame">{b.sbar()}{b.m_top("Profil", "18-m-profil", ())}
<div class="xa-ms"><h1 class="disp util">Paramètres</h1>
<div class="xa-mid"><span class="xa-avw big">{b.av("adrien", 64)}<i>{b.ic("pencil", 12)}</i></span><span><b class="disp">Adrien</b><small>@adrien</small></span>
<a class="btn gl sm xa-mpub"{b.href("18-m-profil")}>{ic("globe", 15)}Profil public</a></div>
<div class="xa-mlist">{rows}</div>
<div class="xa-mext"><a class="btn gl sm"{b.href("82-m-soutenir")}>{ic("heart", 15)}Soutenir le projet</a><a class="btn gl sm"{b.href("84-m-installer")}>{ic("download", 15)}Installer l’app</a></div></div>{b.mnav(4)}</div>'''


def screen_34():
    acc_lab = f'Couleur d’accent<span class="xa-accn">{b.hole("acName", "Bleu")}</span>'
    chip = b.when("saved", SAVED, False)
    top = f'<div class="mtop"><a class="back"{b.href("33-m-reglages")}>{b.ic("left", 16)}Paramètres</a><div class="ibs xa-mchip">{chip}</div></div>'
    return f'''<div class="S mob frame">{b.sbar()}{top}
<div class="xa-ms"><h1 class="disp util">Préférences</h1>
<div class="xa-card xa-mcard">
<div class="xa-mfld"><div class="xa-rl">Langue</div>{lang_dd(True)}</div>
<div class="xa-mfld"><div class="xa-rl">Thème de l’interface</div>{theme_opt(True)}</div>
<div class="xa-mfld"><div class="xa-rl xa-flr">{acc_lab}</div>{swatches("xa-sws xa-sws4")}<p class="xa-rs">{ACC_HINT}</p></div>
<div class="xa-mfld"><div class="xa-rl">Échelle des notes</div>{scale_opt(True)}</div>
</div></div>{b.mnav(4)}</div>'''


SCREENS = {
    "21": screen_21, "22": screen_22, "23": screen_23, "24": screen_24, "25": screen_25, "26": screen_26, "27": screen_27,
    "28": screen_28, "29": screen_29, "30": screen_30, "31": screen_31, "32": screen_32, "33": screen_33, "34": screen_34,
}


L23 = r"""
const em = st.em !== undefined ? st.em : 'adrien@exemple.fr';
const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.trim());
o.em = em;
o.onEm = (e) => this.setState({ em: e.target.value });
o.bad = !!st.bad && !valid;
o.emCls = o.bad ? 'err' : 'focus';
o.form = !st.sent;
o.sent = !!st.sent;
o.mail = em.trim();
o.send = () => this.setState(valid ? { sent: true, bad: false } : { bad: true });
"""

L24 = r"""
const p = st.p !== undefined ? st.p : 'Projo2026!';
const c = st.c !== undefined ? st.c : 'Projo2026!';
const r1 = p.length >= 8;
const r2 = /[A-Za-zÀ-ÿ]/.test(p);
const r3 = /[0-9]/.test(p);
const same = c.length > 0 && p === c;
o.p = p;
o.c = c;
o.onP = (e) => this.setState({ p: e.target.value, tried: false });
o.onC = (e) => this.setState({ c: e.target.value, tried: false });
o.r1 = r1 ? 'ok' : '';
o.r2 = r2 ? 'ok' : '';
o.r3 = r3 ? 'ok' : '';
o.mism = c.length > 0 && !same && (!!st.tried || c.length >= p.length);
o.cCls = o.mism ? 'err' : 'focus';
o.form = !st.done;
o.done = !!st.done;
o.submit = () => this.setState(r1 && r2 && r3 && same ? { done: true } : { tried: true });
"""

L25 = ("const BIO = " + json.dumps(BIO, ensure_ascii=False) + ";\n" + r"""
const name = st.name !== undefined ? st.name : 'Adrien';
const bio = st.bio !== undefined ? st.bio : BIO;
const pub = st.pub !== false;
const wl = st.wl !== false;
const F = st.f || [true, true, true];
o.name = name;
o.nameCls = name.trim() ? '' : 'err';
o.nameMissing = !name.trim();
o.nameOr = name.trim() || 'Adrien';
o.onName = (e) => this.setState({ name: e.target.value, sv: true });
o.bio = bio;
o.bioLeft = String(140 - bio.length);
o.onBio = (e) => this.setState({ bio: e.target.value.slice(0, 140), sv: true });
o.pubCls = pub ? 'on' : '';
o.tPub = () => this.setState({ pub: !pub, sv: true });
o.wlCls = (wl ? 'on' : '') + (pub ? '' : ' dis');
o.tWl = () => { if (pub) this.setState({ wl: !wl, sv: true }); };
o.isPub = pub;
o.isPriv = !pub;
F.forEach((v, i) => {
o['f' + i] = v;
o['rm' + i] = () => { const n = F.slice(); n[i] = false; this.setState({ f: n, sv: true }); };
});
const n = F.filter(Boolean).length;
o.fCount = n + ' sur 3';
o.full = n === 3;
o.notFull = n < 3;
o.addFav = () => { const n2 = F.slice(); const j = n2.indexOf(false); if (j >= 0) n2[j] = true; this.setState({ f: n2, sv: true }); };
o.saved = !!st.sv;
""")


def prefs_logic():
    names = json.dumps({k: lab for k, lab, _ in ACCENTS}, ensure_ascii=False)
    return ("const NAMES = " + names + ";\n" + r"""
const th = st.th || 'dark';
['system', 'light', 'dark'].forEach((k) => {
o['th_' + k] = th === k ? 'on' : '';
o['sth_' + k] = () => this.setState({ th: k, sv: true });
});
const ac = st.ac || 'blue';
Object.keys(NAMES).forEach((k) => {
o['ac_' + k] = ac === k ? 'on' : '';
o['sac_' + k] = () => this.setState({ ac: k, sv: true });
});
o.acName = NAMES[ac];
const sc = st.sc || 'ten';
o.sc5 = sc === 'five' ? 'on' : '';
o.sc10 = sc === 'ten' ? 'on' : '';
o.ssc5 = () => this.setState({ sc: 'five', sv: true });
o.ssc10 = () => this.setState({ sc: 'ten', sv: true });
o.scEx = sc === 'five' ? '4,2' : '8,4';
o.saved = !!st.sv;
""")


def notif_logic():
    init = {"push": True}
    for _, items in NOTIF_GROUPS:
        for k, _, on in items:
            init[k] = on
    return ("const INIT = " + json.dumps(init) + ";\n" + r"""
const T = Object.assign({}, INIT, st.t || {});
Object.keys(INIT).forEach((k) => {
const K = k[0].toUpperCase() + k.slice(1);
o[k + 'Cls'] = T[k] ? 'on' : '';
o['t' + K] = () => { const n = Object.assign({}, T); n[k] = !T[k]; this.setState({ t: n, sv: true }); };
});
o.pushOn = T.push;
o.pushOff = !T.push;
o.saved = !!st.sv;
""")


L28 = r"""
const mode = st.mode || 'conn';
o.conn = mode === 'conn';
o.editing = mode === 'edit';
o.disc = mode === 'disc';
o.edit = () => this.setState({ mode: 'edit' });
o.save = () => this.setState({ mode: 'conn' });
o.disconnect = () => this.setState({ mode: 'disc', rep: false });
o.lbu = st.lbu !== undefined ? st.lbu : 'adrien_cine';
o.onLbu = (e) => this.setState({ lbu: e.target.value });
o.lbn = st.lbn !== undefined ? st.lbn : '';
o.onLbn = (e) => this.setState({ lbn: e.target.value });
o.help = !!st.help;
o.tHelp = () => this.setState({ help: !st.help });
o.rep = !!st.rep;
o.noRep = !st.rep;
o.lbStatus = st.rep ? 'Synchronisé à l’instant.' : 'Synchronisé le 8 nov. 2026 à 07:12.';
o.sync = () => this.setState({ rep: true });
const g = st.g || 'idle';
o.gIdle = g === 'idle';
o.gAsking = g === 'ask';
o.gNo = g === 'off';
o.gOk = g !== 'off';
o.gAsk = () => this.setState({ g: 'ask' });
o.gCancel = () => this.setState({ g: 'idle' });
o.gUnlink = () => this.setState({ g: 'off' });
"""

L29 = r"""
const pw = !!st.pw;
o.pwOpen = pw;
o.pwIdle = !pw && !st.pwDone;
o.openPw = () => this.setState({ pw: true });
o.closePw = () => this.setState({ pw: false });
o.submitPw = () => this.setState({ pw: false, pwDone: true });
o.pwSub = st.pwDone ? 'Mot de passe mis à jour. Reconnectez-vous dans un instant…' : 'Défini';
o.delOpen = !!st.del;
o.delIdle = !st.del;
o.openDel = () => this.setState({ del: true });
o.closeDel = () => this.setState({ del: false });
"""

L30 = ("const SEL0 = 'b" + str(BOT_SEL) + "';\n" + r"""
const tab = st.tab || 'bot';
o.tP = tab === 'photo' ? 'on' : '';
o.tB = tab === 'bot' ? 'on' : '';
o.tE = tab === 'emo' ? 'on' : '';
o.isP = tab === 'photo';
o.isB = tab === 'bot';
o.isE = tab === 'emo';
o.goP = () => this.setState({ tab: 'photo' });
o.goB = () => this.setState({ tab: 'bot' });
o.goE = () => this.setState({ tab: 'emo' });
const sel = st.sel || SEL0;
for (let i = 0; i < 18; i++) {
o['b' + i] = sel === 'b' + i ? 'on' : '';
o['e' + i] = sel === 'e' + i ? 'on' : '';
o['pb' + i] = () => this.setState({ sel: 'b' + i });
o['pe' + i] = () => this.setState({ sel: 'e' + i });
}
""")

LOGIC = {
    "23": b.component(L23), "24": b.component(L24), "25": b.component(L25), "26": b.component(prefs_logic()),
    "27": b.component(notif_logic()), "28": b.component(L28), "29": b.component(L29), "30": b.component(L30),
    "34": b.component(prefs_logic()),
}


CSS = r"""
.S .xa-flr{display:flex;align-items:center;justify-content:space-between;gap:12px}
.S .xa-lnk{font-size:12.5px;font-weight:600;color:var(--tx2);text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--line2)}
.S .xa-mask{letter-spacing:.14em;font-size:14px}
.S .xa-hint{font-size:12.5px;color:var(--tx3);line-height:1.4}
.S .xa-lead{font-size:15px;line-height:1.5;color:var(--tx2);margin-bottom:22px}
.S .xa-go{margin-top:6px}
.S .xa-or{display:flex;align-items:center;gap:12px;margin:16px 0;font-size:12px;font-weight:600;color:var(--tx3)}
.S .xa-or::before,.S .xa-or::after{content:'';flex:1;height:1px;background:var(--line)}
.S .xa-gg .ic{color:var(--tx)}
.S .xa-alt{font-size:13px;color:var(--tx2);margin-top:18px}
.S .xa-alt a{color:var(--tx);font-weight:700;text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--line2)}

.S .xa-auth{position:relative;z-index:2;display:grid;grid-template-columns:440px minmax(0,1fr);gap:72px;padding:88px 40px 40px 80px;height:100%}
.S .xa-af .back{margin-bottom:20px}
.S .xa-af h1{font-size:60px;margin:8px 0 8px}
.S .xa-af .fld{margin-bottom:12px}
.S .xa-af .frow .fld{min-width:0}
.S .xa-art{position:relative;height:100%;border-radius:18px;overflow:hidden;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line),0 30px 80px -20px rgba(0,0,0,.8)}
.S .xa-wall{position:absolute;left:-80px;right:-80px;top:-70px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;transform:rotate(-7deg)}
.S .xa-wall>span{display:block;border-radius:6px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.08)}
.S .xa-art::after{content:'';position:absolute;inset:0;z-index:1;background:linear-gradient(0deg,var(--s1) 34%,rgba(19,26,43,.72) 58%,rgba(19,26,43,.18) 100%)}
.S .xa-artc{position:absolute;left:30px;right:30px;bottom:30px;z-index:2}
.S .xa-artt{font-size:44px;margin:10px 0 18px}
.S .xa-artc .cd{display:inline-flex}
.S .xa-steps{display:grid;grid-template-columns:1fr 1fr;gap:12px 18px;padding-top:16px;border-top:1px solid var(--line)}
.S .xa-steps div{display:flex;align-items:center;gap:12px;font-size:13.5px;font-weight:600;color:var(--tx2)}
.S .xa-steps b{font-size:36px;width:22px;color:transparent;-webkit-text-stroke:1.2px var(--tx2)}

.S .xa-solo{position:relative;z-index:2;width:480px;margin:0 auto;padding-top:88px}
.S .xa-sc{margin-top:20px}
.S .xa-solo h1{font-size:50px;margin:8px 0 10px}
.S .xa-badge{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line2);color:var(--tx);margin-bottom:14px}
.S .xa-solo .fld{margin-bottom:12px}
.S .xa-rules{display:flex;flex-wrap:wrap;gap:6px 16px}
.S .xa-rule{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--tx3)}
.S .xa-rule .ic{opacity:.35}
.S .xa-rule.ok{color:var(--tx)}
.S .xa-rule.ok .ic{opacity:1}
.S .xa-mailc{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line);margin-top:4px}
.S .xa-mailc>span:nth-child(2){flex:1;min-width:0}
.S .xa-mailc b{display:block;font-size:14px}
.S .xa-mailc small{display:block;font-size:12.5px;color:var(--tx2);margin-top:3px}
.S .xa-mailc>.ic{color:var(--tx3)}
.S .xa-mlogo{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--s3);font-family:Archivo,sans-serif;font-stretch:70%;font-variation-settings:'wdth' 70;font-weight:800;font-size:22px}

.S .xa-set{position:relative;z-index:2;display:grid;grid-template-columns:216px minmax(0,1fr);gap:44px;padding:92px 40px 0;height:100%}
.S .xa-side{display:flex;flex-direction:column;padding:4px 0 30px}
.S .xa-me{display:flex;align-items:center;gap:12px;padding:0 0 18px;margin-bottom:12px;border-bottom:1px solid var(--line)}
.S .xa-me b{display:block;font-size:15px;font-weight:700}
.S .xa-me small{display:block;font-size:12.5px;color:var(--tx3);margin-top:3px}
.S .xa-avw{position:relative;display:inline-flex;border-radius:50%;flex:none}
.S .xa-avw i{position:absolute;right:-2px;bottom:-2px;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--s3);color:var(--tx);box-shadow:0 0 0 2px var(--bg)}
.S .xa-avw.big i{width:28px;height:28px;right:0;bottom:0}
.S .xa-rubs{display:flex;flex-direction:column;gap:2px}
.S .xa-rub{position:relative;display:flex;align-items:center;gap:12px;height:44px;padding:0 14px;border-radius:12px;font-size:14px;font-weight:600;color:var(--tx2)}
.S .xa-rub .ic{opacity:.8}
.S .xa-rub.on{background:var(--s1);color:var(--tx);box-shadow:inset 0 0 0 1px var(--line)}
.S .xa-rub.on .ic{opacity:1}
.S .xa-rub.on::before{content:'';position:absolute;left:0;top:13px;bottom:13px;width:3px;border-radius:0 3px 3px 0;background:var(--acc)}
.S .xa-dot{margin-left:auto;width:8px;height:8px;border-radius:50%;background:var(--acc);box-shadow:0 0 8px var(--acc);flex:none}
.S .xa-pub{margin-top:auto;display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--tx2)}
.S .xa-main{min-width:0;overflow:hidden auto;scrollbar-width:none;padding-bottom:28px}
.S .xa-main::-webkit-scrollbar{display:none}
.S .xa-ph{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:18px}
.S .xa-ph h1{font-size:52px;margin-top:8px}
.S .xa-ph .xa-saved{margin-bottom:10px}
.S .xa-saved{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border-radius:999px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line);color:var(--tx);font-size:12px;font-weight:700;flex:none}
.S .xa-card{position:relative;background:var(--s1);border-radius:18px;box-shadow:inset 0 0 0 1px var(--line);padding:4px 20px}
.S .xa-card+.xa-card{margin-top:14px}
.S .xa-row{display:flex;align-items:center;gap:16px;padding:16px 0;border-top:1px solid var(--line)}
.S .xa-row:first-child,.S .xa-ct+.xa-row{border-top:0}
.S .xa-ri{display:inline-flex;color:var(--tx2);flex:none}
.S .xa-rm{flex:1;min-width:0}
.S .xa-rl{font-size:14px;font-weight:600;color:var(--tx)}
.S .xa-rs{font-size:12.5px;color:var(--tx3);margin-top:4px;line-height:1.45}
.S .xa-ct{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--tx3);padding:16px 0 6px}
.S .xa-mini{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 14px;border-radius:12px;font-size:13px;font-weight:600;color:var(--tx);background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px var(--line2);white-space:nowrap;flex:none}
.S .xa-mini.xa-bd,.S .btn.xa-bd{background:transparent;color:var(--err);box-shadow:inset 0 0 0 1px var(--err)}
.S .xa-mini.xa-bdf{background:var(--err);color:var(--bg);box-shadow:none}
.S .xa-pair{display:flex;gap:8px;flex:none}
.S .xa-tg{position:relative;flex:none;width:44px;height:26px;border-radius:999px;background:var(--s3);box-shadow:inset 0 0 0 1px var(--line2)}
.S .xa-tg i{position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:var(--tx2);transition:left .15s}
.S .xa-tg.on{background:var(--acc);box-shadow:none}
.S .xa-tg.on i{left:21px;background:#fff}
.S .xa-tg.dis{opacity:.4}

.S .xa-pg{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:14px;align-items:start}
.S .xa-id{display:grid;grid-template-columns:96px minmax(0,1fr);gap:18px;padding:18px 20px 6px}
.S .xa-ida{display:flex;flex-direction:column;align-items:center;gap:12px;padding-top:6px}
.S .xa-ida .av{box-shadow:0 0 0 3px var(--s1),0 0 0 5px var(--line2)}
.S .xa-ida .xa-avw i{box-shadow:0 0 0 2px var(--s1)}
.S .xa-ta{height:88px;align-items:flex-start;padding:12px 16px;white-space:normal;font-size:14px;line-height:1.45}
.S textarea.in.xa-ta{width:100%;border:0;outline:0;resize:none;font:inherit;font-size:14px;line-height:1.45;color:var(--tx);background:var(--s1);box-shadow:inset 0 0 0 1px var(--field);display:block}
.S textarea.in.xa-ta:focus{box-shadow:inset 0 0 0 1.5px var(--acc),0 0 0 4px var(--acc-soft)}
.S .xa-cnt{font-size:12px;font-weight:500;color:var(--tx3)}
.S .xa-favs{padding:16px 18px 14px}
.S .xa-fh{display:flex;align-items:flex-start;gap:12px;padding-bottom:8px}
.S .xa-fh>div{flex:1}
.S .xa-count{font-size:12px;font-weight:700;color:var(--tx2);white-space:nowrap;padding-top:2px}
.S .xa-fav{display:flex;align-items:center;gap:12px;padding:8px 0;border-top:1px solid var(--line)}
.S .xa-th{display:block;width:44px;border-radius:6px;overflow:hidden;flex:none;box-shadow:0 0 0 1px rgba(255,255,255,.08)}
.S .xa-fav .xa-rl{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.S .xa-fav .xa-mini{height:32px;padding:0 12px;font-size:12.5px}
.S .xa-ffoot{padding-top:10px;border-top:1px solid var(--line)}
.S .xa-add{margin-top:10px;width:100%}

.S .xa-prow{align-items:center;padding:18px 0}
.S .xa-prow .xa-rm{max-width:250px}
.S .xa-ctl{margin-left:auto;flex:none}
.S .xa-accn{font-size:12px;font-weight:600;color:var(--tx3);margin-left:8px}
.S .xa-sel{display:inline-flex;align-items:center;justify-content:space-between;gap:10px;height:42px;min-width:220px;padding:0 14px;border-radius:12px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--field);font-size:14px;font-weight:600}
.S .xa-sel .ic{color:var(--tx3)}
.S .xa-self{display:flex;width:100%}
.S .xa-opt{display:inline-flex;gap:4px;padding:4px;border-radius:12px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--line)}
.S .xa-opt>*{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:34px;padding:0 14px;border-radius:9px;font-size:13px;font-weight:600;color:var(--tx2)}
.S .xa-opt>.on{background:var(--acc-soft);box-shadow:inset 0 0 0 1px var(--acc);color:var(--acc-tx)}
.S .xa-optf{display:flex}
.S .xa-optf>*{flex:1;padding:0 8px}
.S .xa-sws{display:flex;gap:6px}
.S .xa-sw{width:40px;height:40px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center}
.S .xa-sw i{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)}
.S .xa-sw .ic{opacity:0}
.S .xa-sw.on{box-shadow:0 0 0 2px var(--acc)}
.S .xa-sw.on .ic{opacity:1}
.S .xa-scl{display:flex;align-items:center;gap:16px}
.S .xa-ex{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:var(--tx3)}
.S .xa-ex b{display:inline-flex;align-items:center;gap:4px;color:var(--gold);font-size:15px;font-weight:700}

.S .xa-ncols{display:grid;grid-template-columns:1fr 1fr;gap:0 36px;padding:0 20px 8px}
.S .xa-nr{display:flex;align-items:center;justify-content:space-between;gap:12px;height:44px;border-top:1px solid var(--line);font-size:13.5px;font-weight:500}
.S .xa-ct+.xa-nr{border-top:0}

.S .xa-lbc{padding:16px 20px 18px}
.S .xa-lbh{display:flex;align-items:center;gap:10px}
.S .xa-lb{display:inline-flex;align-items:center}
.S .xa-lb i{width:13px;height:13px;border-radius:50%;background:var(--tx2)}
.S .xa-lb i+i{margin-left:-4px}
.S .xa-lb i:nth-child(1){opacity:.55}
.S .xa-lb i:nth-child(3){opacity:.8}
.S .xa-info{display:inline-flex;color:var(--tx3);margin-left:2px}
.S .xa-help{position:absolute;left:150px;top:44px;width:360px;z-index:5;padding:14px 16px;border-radius:12px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line2),0 20px 50px -10px #000;font-size:12.5px;line-height:1.5;color:var(--tx2)}
.S .xa-help b{display:block;color:var(--tx);font-size:13px;margin-bottom:6px}
.S .xa-help p+p{margin-top:6px}
.S .xa-lbr{display:flex;align-items:center;gap:8px;margin-top:14px}
.S .xa-user{display:inline-flex;align-items:center;height:36px;padding:0 14px;border-radius:12px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--line);font-size:14px;font-weight:700}
.S .xa-ok{display:inline-flex;align-items:center;gap:6px;margin-left:auto;font-size:12.5px;font-weight:600;color:var(--tx2)}
.S .xa-att{display:flex;align-items:center;gap:12px;margin-top:14px;padding:10px 10px 10px 14px;border-radius:12px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line2);font-size:13px;font-weight:600}
.S .xa-att span{flex:1}
.S .xa-lbs{display:flex;align-items:center;gap:16px;margin-top:14px}
.S .xa-lbs .xa-rs{flex:1;margin:0}
.S .xa-lbin{flex:1;max-width:300px}
.S .xa-lbin .in{height:40px;font-size:14px}
.S .xa-ph0{color:var(--tx3)}
.S .xa-lbc>.xa-rs{margin-top:10px}
.S .xa-pi{width:36px;height:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--s2);color:var(--tx);flex:none}
.S .xa-cfoot{padding:12px 0 14px;border-top:1px solid var(--line);margin-top:0}

.S .xa-pwf{padding:4px 0 18px}
.S .xa-pw3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.S .xa-pw3 .fld{margin:0}
.S .xa-pw3 .in{height:44px}
.S .xa-pwf .xa-pair{margin-top:14px}
.S .xa-danger{padding:16px 20px 18px}
.S .xa-dh{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:var(--err)}
.S .xa-danger>.xa-rs{margin:6px 0 14px;max-width:640px}
.S .xa-delf{max-width:420px}
.S .xa-delf .xa-pair{margin-top:2px}

.S .xa-modal{position:absolute;left:50%;top:64px;width:560px;transform:translateX(-50%);border-radius:18px;background:var(--s1);box-shadow:0 40px 100px -20px #000,inset 0 0 0 1px var(--line);z-index:3;padding:22px 26px 20px}
.S .xa-mh{display:flex;align-items:flex-start;justify-content:space-between}
.S .xa-mh h2{font-size:42px;margin-top:8px}
.S .xa-tabs{display:inline-flex;margin-top:18px}
.S .xa-tb{margin-top:18px;min-height:228px}
.S .xa-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}
.S .xa-tile{position:relative;height:68px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line)}
.S .xa-tile>.ic{position:absolute;right:5px;top:5px;padding:2px;width:17px;height:17px;border-radius:50%;background:var(--acc);color:var(--acc-c);opacity:0}
.S .xa-tile.on{box-shadow:inset 0 0 0 2px var(--acc);background:var(--acc-soft)}
.S .xa-tile.on>.ic{opacity:1}
.S .xa-emo{font-size:32px;line-height:1}
.S .xa-bot{position:relative;display:block;width:44px;height:44px}
.S .xa-bot s{position:absolute;left:50%;top:3px;width:2px;height:9px;margin-left:-1px;background:var(--c);text-decoration:none}
.S .xa-bot s::after{content:'';position:absolute;left:-3px;top:-4px;width:8px;height:8px;border-radius:50%;background:var(--c)}
.S .xa-bot b{position:absolute;left:5px;right:5px;top:12px;bottom:3px;border-radius:10px;background:var(--c);box-shadow:inset 0 -4px 0 rgba(0,0,0,.2)}
.S .xa-bot b::before,.S .xa-bot b::after{content:'';position:absolute;top:7px;width:10px;height:10px;border-radius:50%;background:radial-gradient(circle,#0a0f1c 0 2.4px,#fff 2.9px)}
.S .xa-bot b::before{left:5px}
.S .xa-bot b::after{right:5px}
.S .xa-bot i{position:absolute;left:11px;right:11px;bottom:5px;height:3px;border-radius:2px;background:rgba(0,0,0,.4)}
.S .xa-bot.v1 b{border-radius:50%}
.S .xa-bot.v2 b::before,.S .xa-bot.v2 b::after{border-radius:3px}
.S .xa-bot.v3 s{display:none}
.S .xa-bot.v3 b{top:6px}
.S .xa-bot.v4 i{height:5px;left:9px;right:9px;border-radius:0 0 5px 5px}
.S .xa-bot.v4 b{border-radius:5px}
.S .xa-drop{height:228px;border-radius:12px;box-shadow:inset 0 0 0 1.5px var(--line2);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:8px;padding:0 40px}
.S .xa-drop b{font-size:15px;margin-top:4px}
.S .xa-drop p{font-size:12.5px;color:var(--tx3);line-height:1.45;margin-bottom:8px}
.S .xa-dic{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--s2);color:var(--tx2)}
.S .xa-mfoot{font-size:12.5px;color:var(--tx3);margin-top:14px;text-align:center}

.S .xa-mband{position:absolute;left:0;right:0;top:0;height:320px;overflow:hidden}
.S .xa-mband .bd .planet{right:-70px;top:60px;width:230px;height:230px}
.S .xa-mband::after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,var(--bg) 4%,rgba(10,15,28,.55) 50%,rgba(10,15,28,.2) 100%)}
.S .xa-mf{position:relative;z-index:2;padding:96px 20px 0}
.S .xa-mf h1{font-size:56px;margin:8px 0 8px}
.S .xa-mf1{padding-top:128px}
.S .xa-mf2{padding-top:60px}
.S .xa-mf2 h1{font-size:52px}
.S .xa-artt span{color:var(--tx2)}
.S .xa-mf .xa-lead{font-size:14px;margin-bottom:18px}
.S .xa-mf .fld{margin-bottom:12px}
.S .xa-mf .btn{height:52px}
.S .xa-mf .xa-alt{text-align:center}

.S .xa-ms{padding:6px 18px 0}
.S .xa-ms h1{font-size:46px;margin:6px 0 16px}
.S .xa-mid{display:flex;align-items:center;gap:14px;margin-bottom:16px}
.S .xa-mid>span:nth-child(2){flex:1;min-width:0}
.S .xa-mid b{display:block;font-size:28px}
.S .xa-mid small{display:block;font-size:12.5px;color:var(--tx3);margin-top:4px}
.S .xa-mpub{flex:none}
.S .xa-mlist{border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line);padding:0 14px}
.S .xa-mrow{display:flex;align-items:center;gap:12px;min-height:68px;padding:12px 0;border-top:1px solid var(--line);color:var(--tx)}
.S .xa-mrow:first-child{border-top:0}
.S .xa-mrow>.ic{color:var(--tx3)}
.S .xa-mrow .xa-dot{margin-left:0}
.S .xa-mext{display:flex;gap:8px;margin-top:14px}
.S .xa-mext .btn{flex:1;min-width:0;padding:0 10px;gap:8px}
.S .xa-mic{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--s2);color:var(--tx2);flex:none}
.S .xa-mt{flex:1;min-width:0}
.S .xa-mt b{display:block;font-size:15px;font-weight:600}
.S .xa-mt small{display:block;font-size:12.5px;line-height:1.4;color:var(--tx3);margin-top:3px}
.S .xa-mchip{height:36px;align-items:center}
.S .xa-mcard{padding:4px 16px}
.S .xa-mfld{padding:16px 0;border-top:1px solid var(--line)}
.S .xa-mfld:first-child{border-top:0}
.S .xa-mfld>.xa-rl{margin-bottom:10px}
.S .xa-mfld .xa-scl{justify-content:space-between}
.S .xa-mfld .xa-scl .xa-opt{flex:1;max-width:200px}
.S .xa-sws4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px 0}
.S .xa-sws4 .xa-sw{width:100%;height:46px;border-radius:12px}
.S .xa-sws4 .xa-sw.on{box-shadow:none}
.S .xa-sws4 .xa-sw.on i{box-shadow:0 0 0 2px var(--s1),0 0 0 4px var(--acc)}
.S .xa-mfld .xa-sws+.xa-rs{margin-top:10px}
.S.mob .xa-opt.xa-optf>button{height:44px}
.S.mob .xa-self{height:44px}
.S .xa-alt a{position:relative}
.S .xa-alt a::after{content:'';position:absolute;left:-4px;right:-4px;top:-14px;bottom:-14px}
"""
