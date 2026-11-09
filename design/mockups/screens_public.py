import json
import random

import base_screens as b

ic = b.ic
av = b.av
href = b.href
hole = b.hole
on = b.on
when = b.when
hx = b.hx
FILMS = b.FILMS

XI = {
    "heart": '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    "hand": '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66"/><path d="m18 15-2-2"/><path d="m15 18-2-2"/>',
    "server": '<rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 6h.01M6 18h.01"/>',
    "db": '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
    "globe": '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    "activity": '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    "sparkles": '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/><path d="M5 3v4M19 17v4M3 5h4M17 19h4"/>',
    "wand": '<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3M5 6v4M19 14v4M10 2v2M7 8H3M21 16h-4M11 3H9"/>',
    "wrench": '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    "imgplus": '<path d="M16 5h6M19 2v6"/><path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/><circle cx="9" cy="9" r="2"/>',
    "mail": '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    "copy": '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    "crash": '<path d="M6 10H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><path d="M4 14H2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2"/><path d="M6 6h.01M6 18h.01"/><path d="m13 6-4 6h6l-4 6"/>',
    "cookie": '<path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01M16 15.5v.01M12 12v.01M11 17v.01M7 14v.01"/>',
    "lock": '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    "phone": '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
    "iosshare": '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>',
    "sqplus": '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8M12 8v8"/>',
    "home": '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    "dots": '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    "ext": '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    "sun": '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    "moon": '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    "msg": '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    "palette": '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z"/>',
    "route": '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    "layers": '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    "compare": '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M11 18H8a2 2 0 0 1-2-2V9"/>',
    "refresh": '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    "login": '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
    "languages": '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
    "shield": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    "a11y": '<circle cx="16" cy="4" r="1"/><path d="m18 19 1-7-6 1"/><path d="m5 8 3-3 5.5 3-2.36 3.5"/><path d="M4.24 14.5a5 5 0 0 0 6.88 6"/><path d="M13.76 17.5a5 5 0 0 0-6.88-6"/>',
    "film": b.foundation.ICONS["film"],
    "back": '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    "fwd": '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
}

GH = ('<path d="M12 2C6.48 2 2 6.48 2 12.02c0 4.42 2.87 8.18 6.84 9.5.5.09.68-.22.68-.48l-.01-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 '
      '1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03a9.56 '
      '9.56 0 0 1 5 0c1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.94.36.31.68.92.68 1.86l-.01 2.75c0 .27.18.58.69.48A10.02 10.02 0 0 0 22 12.02C22 6.48 17.52 2 12 2z"/>')
LI = '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>'

EMAIL = "contact@movie-picker.fr"
NB = " "


def xi(name, size=18, stroke=2):
    path = XI.get(name) or b.foundation.ICONS[name]
    return (f'<svg class="ic" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{stroke}" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{path}</svg>')


def fic(path, size=16):
    return f'<svg class="ic" width="{size}" height="{size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{path}</svg>'


def mail():
    return f'<a class="xe-mail">{EMAIL}</a>'


def hdr_in():
    return b.hdr(-1, solid=True)


def pub_hdr(solid=True):
    return b.guest_hdr(solid)


def mnav_guest():
    items = [("Explorer", ic("compass", 20), "11-m-explorer"), ("Soirées", ic("cal", 20), "31-m-connexion"), ("Créer", ic("plus", 20), "31-m-connexion"),
             ("Ma liste", ic("bookmark", 20), "31-m-connexion"), ("Connexion", xi("login", 20), "31-m-connexion")]
    return '<nav class="mnav">' + "".join(f'<a{href(t)}>{i}<span>{lab}</span></a>' for lab, i, t in items) + "</nav>"


def links(items):
    return "".join(f'<a{href(t)}>{x}</a>' for x, t in items)


def settings_row():
    return (f'<span class="xe-lang">{xi("languages", 14)}Français{ic("chevd", 14)}</span>'
            f'<span class="seg xe-thm"><span class="on" aria-label="Thème sombre">{xi("moon", 14)}</span><span aria-label="Thème clair">{xi("sun", 14)}</span></span>'
            f'<a class="xe-soc" aria-label="GitHub">{fic(GH, 16)}</a><a class="xe-soc" aria-label="LinkedIn">{fic(LI, 15)}</a>')


def foot(signed=True):
    nav = [("Accueil", "01-explorer"), ("Comment ça marche", "09-accueil-public"), ("Mes soirées", "05-mes-soirees" if signed else "21-connexion"),
           ("Nouvelle soirée", "08-creer" if signed else "21-connexion"), ("Ma liste", "06-ma-liste" if signed else "21-connexion"),
           ("Paramètres", "25-reglages-profil" if signed else "21-connexion")]
    aide = [("Signaler un problème", "79-signaler")] + ([("Proposer une idée", "80-proposer-une-idee")] if signed else []) \
        + [("Soutenir le projet", "71-soutenir"), ("Dossier technique", "74-tech")]
    leg = [("Mentions légales", "72-mentions-legales"), ("Politique de confidentialité", "73-confidentialite"), ("Gérer les cookies", "77-consentement")]
    wn = f'<a class="xe-fwn"{href("78-nouveautes")}>{xi("sparkles", 13)}Nouveautés</a>' if signed else ""
    return f'''<footer class="xe-ft"><div class="xe-ftg">
<div class="xe-ftb"><a class="logo"{href("01-explorer" if signed else "09-accueil-public")}>Movie Picker<i></i></a><p>Choisissez votre prochain film ensemble.</p>
<a class="xe-inst"{href("84-m-installer")}>{xi("phone", 15)}Installer l’app</a></div>
<div><p class="xe-ftt">Navigation</p><div class="xe-ftl two">{links(nav)}</div></div>
<div><p class="xe-ftt">Aide</p><div class="xe-ftl">{links(aide)}</div></div>
<div><p class="xe-ftt">Informations légales</p><div class="xe-ftl">{links(leg)}</div></div></div>
<div class="xe-ftbot"><span>© 2026 Movie Picker v1.7.0</span>{wn}<span class="xe-tmdb">Données fournies par <b>TMDB</b>. Les notes et disponibilités sont indicatives.</span>
<div class="xe-ftset">{settings_row()}</div></div></footer>'''


def foot_m(signed=True):
    aide = [("Signaler un problème", "79-signaler")] + ([("Proposer une idée", "80-proposer-une-idee")] if signed else []) \
        + [("Soutenir le projet", "82-m-soutenir"), ("Dossier technique", "74-tech")]
    leg = [("Mentions légales", "72-mentions-legales"), ("Confidentialité", "73-confidentialite"), ("Gérer les cookies", "85-m-consentement")]
    nav = [("Accueil", "11-m-explorer"), ("Comment ça marche", "81-m-accueil-public"), ("Mes soirées", "16-m-mes-soirees" if signed else "31-m-connexion"),
           ("Ma liste", "44-m-ma-liste" if signed else "31-m-connexion")]
    wn = f'<a class="xe-fwn"{href("78-nouveautes")}>{xi("sparkles", 13)}Nouveautés</a>' if signed else ""
    return f'''<footer class="xe-mft"><a class="logo"{href("11-m-explorer")}>Movie Picker<i></i></a><p>Choisissez votre prochain film ensemble.</p>
<a class="xe-inst"{href("84-m-installer")}>{xi("phone", 15)}Installer l’app</a>
<div class="xe-mfg"><div><p class="xe-ftt">Aide</p><div class="xe-ftl">{links(aide)}</div></div><div><p class="xe-ftt">Légal</p><div class="xe-ftl">{links(leg)}</div></div>
<div class="xe-mfn"><p class="xe-ftt">Navigation</p><div class="xe-ftl two">{links(nav)}</div></div></div>
<div class="xe-mfb"><div class="xe-mfr"><span>© 2026 Movie Picker v1.7.0</span>{wn}</div><span>Données fournies par <b>TMDB</b>. Les notes et disponibilités sont indicatives.</span>
<div class="xe-ftset">{settings_row()}</div></div></footer>'''


def page_title(over, title, cls=""):
    return f'<div class="ov">{over}</div><h1 class="disp{(" " + cls) if cls else ""}">{title}</h1>'


COSTS = [("server", "Hébergement du site et de l’API", "Google Cloud Platform"), ("db", "Base de données", "MongoDB Atlas"),
         ("globe", "Nom de domaine", "movie-picker.fr"), ("activity", "Surveillance des erreurs et des performances", "Sentry")]
DONATE_INTRO = ("Movie Picker est développé par une seule personne, sur son temps libre. Le service est gratuit, sans publicité, et le restera. "
                "Les dons servent uniquement à payer ce qui le fait tourner.")
NO_PERKS = ("Toutes les fonctionnalités sont accessibles à tout le monde, avec ou sans don. Pas de version payante, pas de limite levée par un don, "
            "pas de contenu réservé.")
BADGE = ("Un badge apparaît sur votre profil public quand vous soutenez le projet. Il est purement décoratif et s’ajoute automatiquement si "
         "l’adresse e-mail du don est celle de votre compte Movie Picker.")


def kofi_card(mob=False):
    return f'''<aside class="xe-kofi{" m" if mob else ""}"><span class="xe-kic">{xi("hand", 28 if not mob else 24, 1.8)}</span>
<h2 class="disp">Un coup de pouce</h2><p>Tout se passe sur Ko-fi : Movie Picker ne voit jamais vos coordonnées bancaires.</p>
<a class="btn full">Faire un don sur Ko-fi{xi("ext", 15)}</a><p class="xe-knote">Montant libre, ponctuel ou mensuel, sans engagement.</p>
<div class="xe-kb"><div class="xe-cap">Sur votre profil public</div><div class="xe-kbr">{av("adrien", 40)}<div><b>Adrien<span class="xe-sup">{xi("heart", 12, 2.2)}Soutien</span></b><span>@adrien</span></div></div></div></aside>'''


def costs_html():
    return "".join(f'<div class="xe-cost"><span class="xe-ci">{xi(i, 17)}</span><div><b>{t}</b><span>{s}</span></div></div>' for i, t, s in COSTS)


def screen_71():
    return f'''<div class="S desk frame">{hdr_in()}
<div class="xe-scr"><div class="xe-don"><div class="xe-dmain">{page_title("Gratuit, sans publicité", "Soutenir Movie Picker")}
<p class="xe-lead">{DONATE_INTRO}</p>
<h2 class="disp xe-h2">Où va l’argent</h2><p class="xe-p">Movie Picker a des frais fixes chaque mois :</p>
<div class="xe-costs">{costs_html()}</div>
<div class="xe-pair"><div><h3>Rien à débloquer</h3><p class="xe-p">{NO_PERKS}</p></div><div><h3>Le badge soutien</h3><p class="xe-p">{BADGE}</p></div></div>
<p class="xe-p xe-mis">Vous avez donné avec une autre adresse, ou vous préférez que le badge n’apparaisse pas&nbsp;? Écrivez à {mail()}.</p>
<a class="btn gl sm xe-backb"{href("01-explorer")}>{ic("left", 15)}Retour à Movie Picker</a></div>
{kofi_card()}</div>{foot(True)}</div></div>'''


NOTICE = [
    ("Éditeur du site", [f"Adrien Morand, contact : {mail()}"]),
    ("Hébergement", ["Le site (front) et l’API sont hébergés par Google Cloud Platform (Firebase Hosting et Cloud Run).",
                     "La base de données est hébergée par MongoDB Atlas."]),
    ("Propriété intellectuelle", ["Les données de films, séries, affiches et disponibilités proviennent de The Movie Database (TMDB) et restent la propriété de leurs ayants droit respectifs.",
                                  "Movie Picker n’est ni produit ni affilié à TMDB."]),
    ("Dons", ["Les dons versés via Ko-fi sont libres et sans contrepartie : ils ne donnent droit à aucun bien, service ou avantage fonctionnel sur Movie Picker.",
              "Movie Picker n’étant pas un organisme d’intérêt général, ces dons n’ouvrent droit à aucune réduction d’impôt et aucun reçu fiscal n’est délivré.",
              "Ils sont perçus par Adrien Morand à titre personnel et servent à couvrir les frais d’hébergement et de fonctionnement du service."]),
    ("Contact", [f"Pour toute question, écrivez à {mail()}."]),
]

PRIVACY = [
    ("Données collectées", ["Movie Picker traite trois familles de données :"]),
    ("Connexion via Google ou GitHub", [
        "Si vous choisissez de vous connecter via Google ou GitHub, Movie Picker reçoit votre identifiant, votre adresse e-mail (si vérifiée par le fournisseur) et votre nom affiché.",
        "Un compte créé avec Google reprend aussi votre photo Google comme photo de profil, que vous pouvez remplacer ou supprimer à tout moment.",
        "Aucune autre donnée du fournisseur n’est demandée ni stockée. Vous pouvez lier ou délier ces comptes à tout moment depuis la page Paramètres."]),
    ("Dons via Ko-fi", [
        "Les paiements sont traités intégralement par Ko-fi, qui agit comme responsable de traitement pour les données de paiement : Movie Picker n’y a jamais accès.",
        "À chaque don, Ko-fi notifie notre serveur et transmet l’adresse e-mail du donateur. Cette adresse est utilisée uniquement, en mémoire, pour retrouver le compte Movie Picker correspondant et y afficher le badge de soutien ; elle n’est jamais enregistrée.",
        "Aucun montant, nom de donateur ni message n’est conservé : seule la date du premier don est stockée sur le compte concerné, ainsi qu’un identifiant technique de notification qui évite de traiter deux fois le même don."]),
    ("Suggestions d’idées", [
        "Une suggestion envoyée depuis le bouton « Proposer une idée » devient un ticket public du dépôt GitHub du projet, lisible par tous : son titre, sa description, ses captures d’écran (sans leurs métadonnées), le type de page d’où elle part et la version de l’application.",
        "Votre nom, votre handle et votre e-mail n’y figurent pas, seulement un identifiant technique qui permet de vous recontacter.",
        "La suppression de votre compte n’efface pas ce ticket : écrivez à l’adresse de contact pour le faire retirer."]),
    ("Durée de conservation", [
        "Vos données sont conservées tant que votre compte existe.",
        "La suppression de compte, disponible depuis la page Paramètres, efface définitivement votre profil et votre photo ; les soirées créées, vos votes et vos notes sont conservés mais anonymisés."]),
    ("Vos droits", [
        "Conformément au RGPD, vous pouvez à tout moment exporter vos données (page Paramètres) ou supprimer votre compte.",
        f"Pour toute autre demande relative à vos données, contactez {mail()}."]),
    ("Contact", [f"Pour toute question sur cette politique, écrivez à {mail()}."]),
]

PRIV_ITEMS = [
    ("user", "Compte", "e-mail, pseudo, handle public, photo de profil si vous en avez une, mot de passe (haché) ou identité liée via Google ou GitHub."),
    ("cal", "Usage du service", "soirées créées, votes, notes de films (visibles sur la soirée et sur sa page recap publique), participations, liste, films préférés, notifications, abonnements."),
    ("activity", "Mesure d’audience", "PostHog, uniquement avec votre consentement. PostHog reçoit un identifiant technique, les pages visitées et les actions (créer une soirée, voter, partager un lien), sans pseudo, handle, e-mail ni localisation précise."),
]


def toc(sections, prefix):
    return "".join(f'<a class="{hole(f"t{i}", "on" if i == 0 else "")}" href="#{prefix}{i}"{on(f"g{i}")}><span>{i + 1:02d}</span>{t}</a>'
                   for i, (t, _) in enumerate(sections))


def legal_aside(title, sections, prefix, also, h1cls="", intro=""):
    also_html = "".join(f'<a{href(t)}>{x}{ic("right", 15)}</a>' for x, t in also)
    toc_html = f'<div class="xe-toc" role="navigation"><p class="xe-cap">Sur cette page</p>{toc(sections, prefix)}</div>' if sections else ""
    intro_html = f'<p class="xe-lead xe-lin">{intro}</p>' if intro else ""
    return f'''<aside class="xe-la">{page_title("Informations légales", title, ("util " + h1cls).strip())}{intro_html}
<p class="xe-upd">{ic("clock", 13)}Dernière mise à jour : 9 septembre 2026</p>
{toc_html}
<div class="xe-also">{also_html}</div></aside>'''


def sec_html(i, title, paras, prefix, extra=""):
    ps = "".join(f"<p>{p}</p>" for p in paras)
    return f'<section class="xe-sec" id="{prefix}{i}"><h2><span>{i + 1:02d}</span>{title}</h2>{ps}{extra}</section>'


def screen_72():
    secs = "".join(sec_html(i, t, ps, "xe-l") for i, (t, ps) in enumerate(NOTICE))
    aside = legal_aside("Mentions légales", None, "xe-l", [("Politique de confidentialité", "73-confidentialite"), ("Gérer les cookies", "77-consentement")],
                        intro="Movie Picker est un projet développé et édité à titre personnel par Adrien Morand.")
    return f'''<div class="S desk frame">{pub_hdr()}
<div class="xe-scr"><div class="xe-leg short">{aside}
<div class="xe-lc"><div class="xe-cols">{secs}</div><a class="btn gl sm xe-backb"{href("09-accueil-public")}>{ic("left", 15)}Retour à Movie Picker</a></div></div>
{foot(False)}</div></div>'''


def screen_73():
    items = "".join(f'<div class="xe-item"><span class="xe-ii">{xi(i, 16)}</span><p><b>{t}</b>{d}</p></div>' for i, t, d in PRIV_ITEMS)
    secs = ""
    for i, (t, ps) in enumerate(PRIVACY):
        secs += sec_html(i, t, ps, "xe-p", f'<div class="xe-items">{items}</div>' if i == 0 else "")
    aside = legal_aside("Politique de confidentialité", PRIVACY, "xe-p", [("Mentions légales", "72-mentions-legales"), ("Gérer les cookies", "77-consentement")], "xe-h1s")
    return f'''<div class="S desk frame">{hdr_in()}
<div class="xe-scr"><div class="xe-leg">{aside}
<div class="xe-lc"><p class="xe-lead big">Cette page décrit les données personnelles traitées par Movie Picker et vos droits sur ces données.</p>
<div class="xe-flow">{secs}</div><a class="btn gl sm xe-backb"{href("01-explorer")}>{ic("left", 15)}Retour à Movie Picker</a></div></div>
{foot(True)}</div></div>'''


METRICS = [(f"190{NB}000", "", "lignes de code"), ("86", "", "endpoints HTTP"), (f"4{NB}725", "", "tests automatisés"),
           (f"1{NB}383", "", "commits"), ("6", "mois", "de développement"), ("86", "%", "de couverture exigée")]
TRAJ = [("MVP", "Février 2026"), ("Migration du serveur", "Mars 2026"), ("V1", "Mai 2026"), ("V1.1", "Mai 2026"), ("V1.2", "Juin 2026"),
        ("V1.3", "Juin à juillet 2026"), ("V1.4", "Août 2026"), ("V1.5", "Septembre 2026"), ("V1.6", "Septembre 2026"), ("V1.7", "Novembre 2026"),
        ("V1.8", "Ensuite"), ("V1.9", "Plus tard"), ("V1.10", "Plus tard encore"), ("V2", "Sans date annoncée")]
TECH_NAV = ["Architecture", "Choix techniques", "Le contrat", "Interface", "Serveur", "Modèle de données", "Une fonctionnalité", "Tests",
            "Mesures", "Intégration continue", "Infrastructure", "Sécurité", "Méthode de travail", "Trajectoire"]
TECH_LINKS = {0: "xe-t1", 1: "xe-t2", 13: "xe-traj"}
ARCHI = [("route", "Frontière", "Le front ne connaît du serveur que 86 routes sous /api/v1, décrites par un contrat que la chaîne rejoue à chaque envoi."),
         ("layers", "Aucun état en mémoire", "L’hébergeur peut lancer jusqu’à cinq instances du serveur, alors rien ne vit dans le processus : ni session, ni minuterie, ni tâche de fond."),
         ("compare", "Deux déploiements", "Le front part sur le CDN, le serveur part en image conteneurisée. Chacun peut sortir sans attendre l’autre.")]
CHOICES = [("server", ".NET 10 côté serveur", "Le serveur était en Node et Express jusqu’en mars 2026, puis réécrit en ASP.NET Core à contrat identique."),
           ("db", "MongoDB plutôt que PostgreSQL", "Le document d’une soirée est lu en bloc et sa forme change à chaque palier."),
           ("lock", "Cookie de session plutôt que JWT", "Le navigateur reçoit un cookie signé, marqué HttpOnly et SameSite, jamais un jeton à ranger quelque part."),
           ("globe", "React et Vite plutôt que Next.js", "Une application entièrement cliente, livrée en fichiers statiques : aucun serveur de rendu à exploiter."),
           ("palette", "Modules CSS plutôt que Tailwind", "Des modules CSS et des jetons maison : une échelle fermée que le contrôle refuse de voir contournée."),
           ("activity", "Cloud Run plutôt que Kubernetes", "Un conteneur qui démarre à la demande, sans grappe de machines à administrer.")]


def facts(items):
    return '<div class="xe-facts">' + "".join(f'<div class="xe-fact"><span class="xe-ci">{xi(i, 17)}</span><b>{t}</b><p>{d}</p></div>' for i, t, d in items) + "</div>"


def screen_74():
    mets = "".join(f'<div><b class="disp">{v}{f"<small>{u}</small>" if u else ""}</b><span>{l}</span></div>' for v, u, l in METRICS)
    nodes = ""
    for i, (w, d) in enumerate(TRAJ):
        cls = "p" if i >= 10 else ("last" if i == 9 else "")
        nodes += f'<li class="{cls}"><i></i><b>{w}</b><span>{d}</span></li>'
    rail = ""
    for i, lab in enumerate(TECH_NAV):
        if i in TECH_LINKS:
            k = list(TECH_LINKS).index(i)
            rail += f'<li><a class="{hole(f"t{k}", "on" if i == 0 else "")}" href="#{TECH_LINKS[i]}"{on(f"g{k}")}><em>{i + 1:02d}</em>{lab}</a></li>'
        else:
            rail += f'<li><span class="x"><em>{i + 1:02d}</em>{lab}</span></li>'
    return f'''<div class="S desk frame">{pub_hdr()}
<div class="xe-scr"><section class="xe-th"><div class="xe-thbd"></div>
<div class="xe-thg"><div><div class="ov">Dossier technique</div><h1 class="disp">Comment Movie Picker est construit</h1>
<p class="xe-thl">Movie Picker aide un groupe à choisir un film sans y passer la soirée : chacun propose, tout le monde vote, une roue tranche. Je l’ai commencé en février 2026 pour un besoin réel dans mon entourage.</p>
<p class="xe-stamp">Document mis à jour le 21 septembre 2026, chiffres relevés au build du 2 octobre 2026</p></div>
<div class="xe-met">{mets}</div></div></section>
<section class="xe-traj" id="xe-traj"><div class="xe-trh"><div><div class="ov">14 / Trajectoire</div><h2 class="disp">6 mois, 10 paliers livrés</h2></div>
<p>1{NB}383 commits depuis février 2026. Chaque palier est parti en production avant que le suivant ne s’ouvre.</p>
<div class="xe-lg"><span><i></i>Livré</span><span><i class="p"></i>À venir</span></div></div><ol class="xe-fr">{nodes}</ol></section>
<div class="xe-tsh"><div class="xe-rail" role="navigation"><p class="xe-cap">Sommaire</p><ol>{rail}</ol></div>
<div class="xe-tc"><section class="xe-tsec" id="xe-t1"><div class="ov">01 / Architecture</div><h2 class="disp">Deux applications, une frontière nette</h2>
<p class="l">Un front statique sur CDN, une API conteneurisée, une base managée. Ce qui compte : la frontière entre les deux est un contrat, pas une habitude.</p>{facts(ARCHI)}</section>
<section class="xe-tsec" id="xe-t2"><div class="ov">02 / Choix techniques</div><h2 class="disp">Ce qui a été arbitré, et ce qui a été hérité</h2>
<p class="l">Certaines de ces décisions ont été prises contre une alternative nommée. D’autres viennent de l’histoire du projet et sont gardées en connaissance de cause.</p>{facts(CHOICES)}</section>
<p class="xe-sig"><b>Adrien Morand.</b> Projet personnel conçu, développé et exploité seul, de la première ligne à la mise en production. Les chiffres sont mesurés dans le dépôt au build, pas estimés.</p></div></div>
{foot(False)}</div></div>'''


def screen_75():
    return f'''<div class="S desk frame">{hdr_in()}
<div class="xe-scr"><div class="xe-err"><div class="spot"></div><div class="xe-big disp" aria-hidden="true">404</div>
<div class="xe-ec"><span class="xe-eic">{ic("compass", 30)}</span><div class="ov">Erreur 404</div><h1 class="disp">Page introuvable</h1>
<p>Cette page n’existe pas ou a été déplacée. Pas de panique, on vous remet sur les rails.</p>
<div class="xe-eb"><a class="btn"{href("01-explorer")}>{xi("home", 16)}Retour à l’accueil</a></div></div></div>{foot(True)}</div></div>'''


def screen_76():
    return f'''<div class="S desk frame"><div class="spot xe-cold"></div><a class="logo xe-solo"{href("01-explorer")}>Movie Picker<i></i></a>
<div class="xe-err full"><div class="xe-big disp" aria-hidden="true">500</div>
<div class="xe-ec"><span class="xe-eic">{xi("crash", 30)}</span><div class="ov">Erreur 500</div><h1 class="disp">Un problème est survenu</h1>
<p>Une erreur inattendue s’est produite. Vous pouvez réessayer ou recharger la page.</p>
<div class="xe-eb"><a class="btn"{href("01-explorer")}>{xi("refresh", 16)}Réessayer</a><a class="btn gl"{href("01-explorer")}>Accueil</a></div></div></div></div>'''


CATS = [("Fonctionnels", "Nécessaires au fonctionnement du site : préférences de thème, langue, authentification.", None),
        ("Analyse", "Nous aident à comprendre comment vous utilisez l’application pour l’améliorer.", "a"),
        ("Surveillance des erreurs", "Nous enregistrons les erreurs techniques, sans donnée directement identifiante (aucune IP conservée, ni e-mail, ni identifiant de compte) et sans cookie, pour assurer la stabilité et la sécurité du service. Base légale : intérêt légitime.", None)]


def consent_cats():
    out = ""
    for name, desc, key in CATS:
        if key:
            out += (f'<li><button type="button" class="xe-cat" role="switch"{on("toggleA")}><div><b>{name}</b><p>{desc}</p></div>'
                    f'<span class="xe-sw {hole("aCls", "")}"><i></i></span></button></li>')
        else:
            out += f'<li><div class="xe-cat"><div><b>{name}</b><p>{desc}</p></div><span class="xe-req">{xi("lock", 12)}Requis</span></div></li>'
    return f'<ul class="xe-cats">{out}</ul>'


def consent_dialog(mob=False):
    head = f'<div class="xe-dh"><div><div class="ov">Confidentialité</div><h2 class="disp">Gestion des cookies</h2></div><button type="button" class="ib s" aria-label="Fermer"{on("closeDlg")}>{ic("x", 16)}</button></div>'
    desc = '<p class="xe-dd">Gérez vos préférences par catégorie. Les cookies fonctionnels sont nécessaires au bon fonctionnement du site et ne peuvent pas être désactivés.</p>'
    acts = (f'<div class="xe-da"><button type="button" class="btn gl sm"{on("rejectAll")}>Tout refuser</button><button type="button" class="btn gl sm"{on("acceptAll")}>Tout accepter</button>'
            f'<button type="button" class="btn sm xe-save"{on("save")}>Enregistrer mes préférences</button></div>')
    if mob:
        return f'<div class="xe-sh"><span class="grab"></span>{head}{desc}{consent_cats()}{acts}</div>'
    return f'<div class="xe-dlg" role="dialog">{head}{desc}{consent_cats()}{acts}</div>'


def consent_banner(mob=False):
    txt = ('<div class="xe-cbt"><b>Vos préférences de confidentialité</b><p>Nous utilisons des cookies pour le bon fonctionnement du site. '
           'Vous pouvez choisir les catégories que vous autorisez.</p></div>')
    btns = (f'<button type="button" class="btn gl sm"{on("rejectAll")}>Tout refuser</button><button type="button" class="btn gl sm"{on("acceptAll")}>Tout accepter</button>'
            f'<button type="button" class="btn gh sm xe-cust"{on("openDlg")}>{ic("sliders", 15)}Personnaliser</button>')
    return f'<section class="xe-cb{" m" if mob else ""}"><div class="xe-cbh"><span class="xe-cbi">{xi("cookie", 20)}</span>{txt}</div><div class="xe-cba">{btns}</div></section>'


def consent_toast(mob=False):
    return (f'<div class="xe-toast{" m" if mob else ""}">{ic("check", 16)}<span>Choix enregistré. Changez d’avis depuis «&nbsp;Gérer les cookies&nbsp;», en bas de chaque page.</span>'
            f'<button type="button" class="xe-tbtn"{on("openDlg")}>Gérer les cookies</button></div>')


def consent_screen(under, mob, init):
    dlg_static = init == "dialog"
    ucls = hole("ucls", "xe-under xe-dm" if dlg_static else "xe-under")
    return (f'<div class="{ucls}">{under}</div>'
            + when("isDlg", f'<div class="xe-veil"></div>{consent_dialog(mob)}', dlg_static)
            + when("isBan", consent_banner(mob), not dlg_static)
            + when("isDone", consent_toast(mob), False))


def screen_77():
    return f'<div class="S desk frame">{consent_screen(b.d_landing(), False, "dialog")}</div>'


def screen_85():
    return f'<div class="S mob frame">{consent_screen(b.m_invite(), True, "banner")}</div>'


def consent_logic(init):
    return b.component(f"""
const m = st.m || '{init}';
const a = !!st.a;
o.isDlg = m === 'dialog';
o.isBan = m === 'banner';
o.isDone = m === 'done';
o.ucls = m === 'dialog' ? 'xe-under xe-dm' : 'xe-under';
o.aCls = a ? 'on' : '';
o.toggleA = () => this.setState({{ a: !a }});
o.openDlg = () => this.setState({{ m: 'dialog' }});
o.closeDlg = () => this.setState({{ m: st.decided ? 'done' : 'banner' }});
o.rejectAll = () => this.setState({{ m: 'done', a: false, decided: true }});
o.acceptAll = () => this.setState({{ m: 'done', a: true, decided: true }});
o.save = () => this.setState({{ m: 'done', decided: true }});
""")


WN = [
    ("new", "sparkles", "Nouveautés", [
        ("Notez les films vus", "Des étoiles, à la demi-étoile près, dès que la soirée commence. Tout le monde voit les notes et la moyenne.", "52-noter"),
        ("Un rappel le lendemain", "À 10 h, une notification ouvre le film qu’il vous reste à noter. Elle se coupe dans les réglages.", "62-notifications"),
        ("Le recap de la soirée", "Films choisis, moyenne et note de chacun, sur un lien à partager, lisible sans compte.", "53-recap"),
        ("Votre soirée en story", "Une image au format story, avec le lien du recap, à partager depuis votre téléphone ou à télécharger.", "61-m-story"),
        ("Votre top 3", "Trois films ou séries préférés, affichés sur votre profil public.", "07-profil"),
        ("Votre photo de profil", "Ajoutez une photo, recadrez-la : elle devient votre avatar partout dans l’app.", "30-choix-avatar"),
        ("Piocher dans ma liste", "Un bouton tire un film au hasard dans votre liste, à proposer dans une soirée en un clic.", "41-au-hasard")]),
    ("improved", "wand", "Améliorations", [
        ("Le film choisi en grand", "Le titre de la soirée et ses actions restent en haut, le film gagnant et ses notes juste dessous.", "51-film-tire"),
        ("Créer une soirée en trois temps", "Le titre, la date, puis les options regroupées par étape. Les paramètres suivent la même grille.", "54-creer-options"),
        ("Explorer plus épuré", "Sous chaque affiche, le titre seul. Les détails restent dans la fiche du film.", "01-explorer"),
        ("Une nouvelle adresse", "Le site s’appelle www.movie-picker.fr. Vos anciens liens fonctionnent toujours.", None),
        ("Vos cookies, à tout moment", "Changez d’avis depuis « Gérer les cookies », en bas de chaque page.", "77-consentement")]),
    ("fixed", "wrench", "Corrections", [
        ("Le poids de chaque film sur la roue", "En mode pondéré, la roue montre enfin la part que les votes donnent à chaque film.", "03-roue"),
        ("Un export de données complet", "Il contient aussi vos films proposés et leurs notes, et vos modèles de soirée.", "29-reglages-securite")]),
]

SAVE_JS = """
const sv = !!st.saved;
o.saved = sv;
o.notSaved = !sv;
o.svCls = sv ? 'on' : '';
o.toggleSave = () => this.setState({ saved: !sv });
"""

SEG_JS = """
const hh = !!st.hist;
o.isA = !hh;
o.isB = hh;
o.tA = hh ? '' : 'on';
o.tB = hh ? 'on' : '';
o.hT = hh ? 'Historique' : 'Dernièrement';
o.showA = () => this.setState({ hist: false });
o.showB = () => this.setState({ hist: true });
"""


def screen_78():
    body = ""
    for _, icon, title, entries in WN:
        rows = ""
        for t, d, target in entries:
            inner = f'<span><b>{t}</b><span>{d}</span></span>'
            if target:
                rows += f'<a class="xe-wne"{href(target)}>{inner}{ic("right", 16)}</a>'
            else:
                rows += f'<div class="xe-wne">{inner}</div>'
        body += f'<section><div class="xe-wnc"><span class="xe-wnci">{xi(icon, 15)}</span><h3>{title}</h3><em>{len(entries)}</em></div>{rows}</section>'
    return f'''<div class="S desk frame"><div class="dim">{b.embedded(b.d_explorer)}</div>
<div class="xe-wn" role="dialog"><div class="xe-wnh">{b.hero_bd()}<a class="ib s xe-x" aria-label="Fermer"{href("01-explorer")}>{ic("x", 16)}</a>
<div class="xe-wnt"><div class="ov">Version 1.7.0, novembre 2026</div><h2 class="disp">Quoi de neuf&nbsp;?</h2></div></div>
<div class="xe-wnb">{body}</div>
<div class="xe-wnf"><span>14 changements depuis la version 1.6.0</span><a class="btn"{href("01-explorer")}>C’est noté</a></div></div></div>'''


REPORT = ("Décrivez le problème rencontré :\nLe bouton Partager ne réagit pas sur mon profil.\n\n"
          "Étapes pour le reproduire :\n1. Ouvrir mon profil\n2. Appuyer sur Partager\n3. \n\n"
          "Ce que vous attendiez :\nLa fenêtre de partage.\n\nCe qui s’est passé :\nRien ne s’affiche.")


def textarea(cls, name, static):
    if b.DC:
        return f'<textarea class="{cls}" value="{hx(name)}" onChange="{hx("on" + name.capitalize())}"></textarea>'
    return f'<textarea class="{cls}" readonly>{static}</textarea>'


def text_input(cls, name, static):
    if b.DC:
        return f'<input class="{cls}" value="{hx(name)}" onChange="{hx("on" + name.capitalize())}">'
    return f'<input class="{cls}" value="{static}" readonly>'


def modal_head(over, title, close_target):
    return (f'<div class="xe-mdh"><div><div class="ov">{over}</div><h2 class="disp">{title}</h2></div>'
            f'<a class="ib s" aria-label="Fermer"{href(close_target)}>{ic("x", 16)}</a></div>')


def screen_79():
    tech = "".join(f"<span>{x}</span>" for x in ["Page : /u/adrien", "Version : 1.7.0", "Navigateur : Chrome 142, Windows"])
    return f'''<div class="S desk frame"><div class="dim">{b.embedded(b.d_profile)}</div>
<div class="xe-md" role="dialog">{modal_head("Aide", "Signaler un problème", "07-profil")}
<p class="xe-mdi">Envoyez-nous le message ci-dessous. Il contient la page, la version et votre navigateur pour nous aider à reproduire le problème.</p>
<label class="fl xe-fl2">Message à envoyer</label>
<div class="xe-env"><div class="xe-envh"><span>À :</span><b>{EMAIL}</b><span>Objet :</span><b>[Movie Picker] Signalement d’un problème</b></div>
{textarea("xe-ta", "rep", REPORT)}
<div class="xe-tech"><em>Informations techniques, à conserver</em>{tech}</div></div>
<div class="xe-mda"><a class="btn">{xi("mail", 16)}Ouvrir ma messagerie</a><button type="button" class="btn gl"{on("copy")}>{xi("copy", 15)}Copier le message</button>
{when("copied", f'<span class="xe-st">{ic("check", 15)}Message copié.</span>', False)}</div>
<p class="xe-hint">Si votre messagerie ne s’ouvre pas, écrivez-nous directement à {mail()}.</p></div></div>'''


def logic_79():
    return b.component(f"""
const r = st.r !== undefined ? st.r : {json.dumps(REPORT, ensure_ascii=False)};
o.rep = r;
o.onRep = (e) => this.setState({{ r: e.target.value, c: false }});
o.copied = !!st.c;
o.copy = () => this.setState({{ c: true }});
""")


IDEA_T = "Prévenir quand un ami rejoint la soirée"
IDEA_D = "Une notification quand quelqu’un rejoint par le lien, pour savoir qui sera là avant de lancer la roue."
SHOTS = ["orbite", "kyoto", "phare", "sable"]


def screen_80():
    cats = "".join(f'<button type="button" class="{hole(f"k{j}", "on" if j == 0 else "")}"{on(f"sk{j}")}>{x}</button>' for j, x in enumerate(["Idée", "Bug", "Amélioration"]))
    thumbs = "".join(when(f"s{i}", f'<div class="xe-tn"><div class="xe-tni">{b.poster(k)}</div><button type="button" class="xe-tnx" aria-label="Retirer cette image {i + 1}"{on(f"rm{i}")}>{ic("x", 12)}</button></div>', i < 2)
                     for i, k in enumerate(SHOTS))
    left = f"1{NB}{2000 - len(IDEA_D) - 1000:03d}"
    form = f'''<div class="xe-row2"><div class="fld"><span class="fl">Catégorie</span><div class="seg big xe-kseg">{cats}</div></div>
<label class="fld"><span class="fl">Titre</span>{text_input("in", "ti", IDEA_T)}</label></div>
<label class="fld"><span class="fl">Description</span>{textarea("in xe-tad", "de", IDEA_D)}<span class="xe-hr">{hole("left", left)} caractères restants</span></label>
<div class="fld"><span class="fl">Captures d’écran (optionnel)</span><div class="xe-drop">{thumbs}<button type="button" class="xe-add {hole("addCls", "")}"{on("add")}>{xi("imgplus", 18)}<span>Ajouter une image</span></button></div>
<span class="xe-hr l">Glissez-déposez, collez ou choisissez jusqu’à 4 images (PNG, JPEG, WebP ou GIF, 4 Mo max)</span></div>
<p class="xe-pub">{fic(GH, 16)}<span>Votre suggestion et vos captures seront publiées dans un ticket public sur GitHub, sans votre nom. N’y mettez rien de personnel.</span></p>
<div class="xe-mdf">{when("missing", f'<span class="xe-err2">{ic("alert", 14)}Renseignez un titre et une description.</span>', False)}<button type="button" class="btn"{on("send")}>Envoyer</button></div>'''
    done = (f'<div class="xe-ok"><span class="xe-oki">{ic("check", 30)}</span><h3 class="disp">Merci&nbsp;!</h3><p>Votre suggestion a bien été envoyée.</p>'
            f'<a class="btn"{href("05-mes-soirees")}>Fermer</a></div>')
    return f'''<div class="S desk frame"><div class="dim">{b.embedded(b.d_events)}</div>
<div class="xe-md idea" role="dialog">{modal_head("Votre avis", "Proposer une idée", "05-mes-soirees")}
{when("isForm", form)}{when("isSent", done, False)}</div></div>'''


def logic_80():
    return b.component(SEG_JS + f"""
const cat = st.cat || 0;
[0, 1, 2].forEach((j) => {{
o['k' + j] = cat === j ? 'on' : '';
o['sk' + j] = () => this.setState({{ cat: j }});
}});
const ti = st.ti !== undefined ? st.ti : {json.dumps(IDEA_T, ensure_ascii=False)};
const de = st.de !== undefined ? st.de : {json.dumps(IDEA_D, ensure_ascii=False)};
o.ti = ti;
o.de = de;
o.onTi = (e) => this.setState({{ ti: e.target.value.slice(0, 100), tried: false }});
o.onDe = (e) => this.setState({{ de: e.target.value.slice(0, 2000), tried: false }});
const n = 2000 - de.length;
o.left = n >= 1000 ? Math.floor(n / 1000) + '\\u00a0' + String(n % 1000).padStart(3, '0') : String(n);
const T = st.th || [true, true, false, false];
const k = T.filter(Boolean).length;
T.forEach((v, i) => {{
o['s' + i] = v;
o['rm' + i] = () => {{ const x = T.slice(); x[i] = false; this.setState({{ th: x }}); }};
}});
o.addCls = k >= 4 ? 'off' : '';
o.add = () => {{ const x = T.slice(); const f = x.indexOf(false); if (f >= 0) {{ x[f] = true; this.setState({{ th: x }}); }} }};
const ok = ti.trim().length > 0 && de.trim().length > 0;
const sent = !!st.sent;
o.isForm = !sent;
o.isSent = sent;
o.missing = !ok && !!st.tried;
o.send = () => ok ? this.setState({{ sent: true }}) : this.setState({{ tried: true }});
""")


def m_bar(right):
    return f'<div class="xe-mbar"><a class="logo"{href("81-m-accueil-public")}>Movie Picker<i></i></a>{right}</div>'


def xwheel(size, rot=282, live=True):
    step = 360 / len(b.WHEEL)
    stops = ",".join(f"{c} {i * step}deg {(i + 1) * step}deg" for i, (_, _, c) in enumerate(b.WHEEL))
    labels = ""
    for i, (_, lab, _) in enumerate(b.WHEEL):
        a = i * step + step / 2 - 90
        eff = (a + rot) % 360
        flip = " flip" if 90 < eff < 270 else ""
        labels += f'<span class="{flip}" style="transform:rotate({a}deg)"><b>{lab}</b></span>'
    cls = hx("whCls") if (b.DC and live) else "wh sml"
    wbc = hx("wbCls") if (b.DC and live) else "wb"
    return (f'<div class="{cls}" style="width:{size}px;height:{size}px"><div class="{wbc}" style="transform:rotate({rot}deg);'
            f'background:repeating-conic-gradient(from 0deg,rgba(0,0,0,.6) 0 .7deg,transparent .7deg {step}deg),conic-gradient({stops})">'
            f'<div class="wl">{labels}</div></div><span class="hub"></span><span class="ptr"></span></div>')


def qr_svg(size=84):
    rnd = random.Random(14)
    n = 21
    cells = [[rnd.random() < .48 for _ in range(n)] for _ in range(n)]
    for ox, oy in [(0, 0), (14, 0), (0, 14)]:
        for y in range(7):
            for x in range(7):
                edge = x in (0, 6) or y in (0, 6)
                core = 2 <= x <= 4 and 2 <= y <= 4
                cells[oy + y][ox + x] = edge or core
        for k in range(-1, 8):
            for x, y in [(ox + k, oy - 1), (ox + k, oy + 7), (ox - 1, oy + k), (ox + 7, oy + k)]:
                if 0 <= x < n and 0 <= y < n:
                    cells[y][x] = False
    d = "".join(f"M{x} {y}h1v1h-1z" for y in range(n) for x in range(n) if cells[y][x])
    return f'<svg class="xe-qr" width="{size}" height="{size}" viewBox="-2 -2 25 25" aria-hidden="true"><path d="{d}"/></svg>'


FEATS = [("bookmark", "Votre liste de films à voir", "Ajoutez un film quand vous y pensez, retrouvez-le au moment de proposer. Et si vous tenez déjà une watchlist sur Letterboxd, elle se synchronise toute seule."),
         ("search", "Toutes les infos du film, tout de suite", "Affiche, année, durée, note, synopsis et plateformes de streaming où le film est disponible. De quoi trancher sans ouvrir six onglets."),
         ("bell", "Vous êtes prévenu", "Un film proposé, un vote, un tirage, un rappel avant le début : l’info arrive sur le téléphone comme dans l’app."),
         ("cal", "Dans votre agenda", "Un bouton, et la soirée part dans Google Agenda, Outlook ou Apple Calendrier."),
         ("phone", "Comme une vraie app", "Movie Picker s’installe sur l’écran d’accueil et s’ouvre en plein écran, sans passer par un store."),
         ("palette", "À votre goût", "Thème clair, thème sombre, et huit couleurs d’accent pour que l’app vous ressemble.")]
TRUST = [("Gratuit, sans publicité", "Aucune fonctionnalité payante. Les dons sont libres et ne débloquent rien, à part un badge décoratif."),
         ("Vos données restent les vôtres", "Export complet de votre compte en un clic, suppression définitive quand vous voulez. Rien n’est revendu."),
         ("Pensé pour être accessible", "Navigation au clavier, contrastes vérifiés, lecteurs d’écran pris en charge sur tout le parcours."),
         ("Les films viennent de TMDB", "Affiches, durées, notes et plateformes de streaming proviennent de la base communautaire TMDB.")]
FAQ = [("Faut-il un compte pour rejoindre une soirée&nbsp;?", "Oui. Il se crée en trente secondes avec un e-mail, ou en un clic avec Google ou GitHub. C’est ce qui permet de retrouver vos soirées et de savoir qui a proposé et voté quoi."),
       ("C’est vraiment gratuit&nbsp;?", "Entièrement. Movie Picker est un projet personnel, et les frais d’hébergement sont couverts par des dons libres. Aucune fonctionnalité n’est réservée aux donateurs."),
       ("Combien de personnes peuvent participer&nbsp;?", "Il n’y a pas de limite fixée. Tout le monde rejoint depuis le même lien, propose ses films et vote de son côté, sur téléphone comme sur ordinateur."),
       ("Et si la roue tombe sur un film que personne ne veut&nbsp;?", "L’hôte peut écarter un film du tirage sans le supprimer de la liste, relancer la roue, ou désigner directement le gagnant s’il préfère trancher lui-même."),
       ("Est-ce que ça marche sur téléphone&nbsp;?", "C’est même le cas d’usage principal. Le site est conçu mobile d’abord et s’installe sur l’écran d’accueil comme une application, notifications comprises."),
       ("Peut-on proposer des séries&nbsp;?", "Oui, si l’hôte les autorise. Chaque soirée a un réglage pour ouvrir les propositions aux séries en plus des films ; par défaut, la recherche ne renvoie que des films.")]
THREAD = [("Léa", "on regarde quoi ce soir ?", ""), ("Nico", "jsp, proposez", ""), ("Sam", "Orbite basse ?", "mine"), ("Inès", "déjà vu deux fois", ""),
          ("Nico", "quelqu’un fait un sondage ?", "fade")]
TIMELINE = [("20:41", "Léa crée la soirée", "Un titre, une date, et un lien à partager."), ("20:44", "Six personnes ont rejoint", "Depuis le lien, sans rien installer."),
            ("20:52", "Neuf films proposés, tout le monde a voté", "Affiches, durée, note et plateformes affichées."), ("20:56", "La roue tranche", "Sept secondes de suspense devant tout le monde.")]


def sec_head(over, title, lead=None, sid=""):
    idattr = f' id="{sid}"' if sid else ""
    lead_html = f'<p class="l">{lead}</p>' if lead else ""
    return f'<div class="ov"{idattr}>{over}</div><h2 class="disp">{title}</h2>{lead_html}'


def preview_card():
    rows = ""
    for k, up in [("orbite", 4), ("projo", 3), ("kyoto", 2)]:
        f = FILMS[k]
        rows += (f'<div class="xe-pvr"><span class="xe-pvp">{b.poster(k)}</span><span><b>{f["t"]}</b><span>{f["y"]}, {f["d"]}</span></span>'
                 f'<span class="vb">{ic("up", 12)}{up}</span></div>')
    return f'''<div class="xe-pvw"><article class="xe-pv"><div class="xe-pvbar"><i></i><i></i><i></i><span>movie-picker.fr/e/chez-lea</span></div>
<div class="xe-pvb"><b class="xe-pvt">Soirée film chez Léa</b><div class="xe-pvm"><span>Vendredi 21h00</span><span class="chip">Votes ouverts</span></div>
<div class="xe-pvm">{b.stack(["lea", "sam", "nico", "ines"], 22)}<span>Léa est l’hôte</span></div>{rows}
<span class="btn gl sm full">{ic("wheel", 16)}Lancer la roue</span></div></article>
<p class="xe-fn a">{av("sam", 20)}Sam a proposé <b>Brume</b></p><p class="xe-fn b">{av("ines", 20)}Inès a voté pour <b>Orbite basse</b></p></div>'''


def m_landing_body():
    bubbles = "".join(f'<p class="xe-bub {c}"><b>{w}</b>{t}</p>' for w, t, c in THREAD)
    tl = "".join(f'<div class="xe-tli"><time>{h}</time><div><b>{t}</b><span>{d}</span></div></div>' for h, t, d in TIMELINE)
    steps = [
        ("01", "Créez la soirée", "Un titre, une date, une heure. C’est tout ce qu’il faut pour ouvrir la porte.",
         '<span class="xe-dl">Titre</span><span class="xe-di f">Chez Léa<i class="caret"></i></span><span class="xe-dl">Quand</span><span class="xe-di">ven. 21:00</span>'),
        ("02", "Partagez le lien", "Lien ou QR code : vos amis rejoignent en deux clics, sans rien installer.", qr_svg(78)),
        ("03", "Proposez et votez", "Chacun ajoute ses films depuis la recherche TMDB. Pouce en l’air, pouce en bas, déjà vu.",
         f'<div class="xe-dr"><span class="xe-dp">{b.poster("orbite")}</span><span class="vb on">{ic("up", 12)}4</span></div>'
         f'<div class="xe-dr"><span class="xe-dp">{b.poster("brume")}</span><span class="vb">Déjà vu</span></div>'),
        ("04", "La roue tranche", "Les favoris pèsent plus lourd. Un clic, sept secondes de suspense, et le verdict tombe.", f'<div class="xe-dw">{xwheel(92, 34, False)}</div>'),
    ]
    steps_html = "".join(f'<div class="xe-step"><div><span class="xe-sn disp">{n}</span><h3>{t}</h3><p>{d}</p></div><div class="xe-demo">{demo}</div></div>' for n, t, d, demo in steps)
    feats = "".join(f'<div class="xe-frow"><span class="xe-fi">{xi(i, 18)}</span><div><b>{t}</b><p>{d}</p></div></div>' for i, t, d in FEATS)
    seen = "".join(f'<span class="xe-ps">{b.poster(k)}</span>' for k in ["volets", "brume", "kyoto", "sable"])
    trust = "".join(f'<div class="xe-trr"><b>{t}</b><p>{d}</p></div>' for t, d in TRUST)
    faq = ""
    for i, (q, a) in enumerate(FAQ):
        faq += (f'<div class="xe-qi"><button type="button" class="{hole(f"qc{i}", "xe-q on" if i == 0 else "xe-q")}"{on(f"qt{i}")}><span>{q}</span>{ic("chevd", 18)}</button>'
                + when(f"qo{i}", f'<p class="xe-qa">{a}</p>', i == 0) + "</div>")
    wres = (when("idle", '<p class="xe-wh">Six films en lice, un seul gagnant.</p>')
            + when("spinning", '<p class="xe-wh">Sept secondes de suspense.</p>', False)
            + when("won", '<div class="xe-won"><span class="ov">Film de la soirée</span><b class="disp">Orbite basse</b></div>', False))
    return f'''<section class="xe-mh">{b.hero_bd()}<div class="xe-mhc"><div class="ov">Soirée ciné à plusieurs</div>
<h1 class="disp">Choisissez le film de la soirée, <span>sans y passer la soirée.</span></h1>
<p class="l">Créez la soirée, partagez le lien, chacun propose ses films et vote. Toujours pas d’accord&nbsp;? La roue tranche.</p>
<div class="xe-mcta"><a class="btn"{href("32-m-inscription")}>Créer un compte</a><a class="btn gl" href="#xe-m-steps">{ic("play", 14)}Voir comment ça marche</a></div>
<p class="xe-mnote"><span>Gratuit, sans publicité.</span><span>Déjà un compte&nbsp;? <a{href("31-m-connexion")}>Se connecter</a></span></p>{preview_card()}</div></section>
<section class="xe-ms">{sec_head("Le problème", "Tout le monde a un avis. Personne ne tranche.", "Deux personnes proposent, les autres répondent «&nbsp;jsp&nbsp;», le sondage se perd dans la conversation, et à 23 h on relance une série déjà vue trois fois.")}
<div class="xe-card"><p class="xe-cl">{xi("msg", 15)}Le groupe, vendredi 20h41</p><div class="xe-chat">{bubbles}</div><p class="xe-end">23:12, on a relancé une série déjà vue trois fois.</p></div>
<div class="xe-card"><p class="xe-cl good">{ic("check", 15)}La même soirée, avec Movie Picker</p><div class="xe-tl">{tl}</div>
<div class="xe-win"><span class="xe-wp">{b.poster("orbite")}</span><div><span class="ov">Film de la soirée</span><b class="disp">Orbite basse</b></div></div></div></section>
<section class="xe-ms" id="xe-m-steps">{sec_head("En quatre étapes", "De l’invitation au générique", "Une soirée qui démarre vraiment à l’heure prévue.")}<div class="xe-steps">{steps_html}</div></section>
<section class="xe-ms xe-wsec">{sec_head("Le juge de paix", "Quand personne ne veut trancher.", "La roue prend les films en lice, donne plus de place à ceux qui ont convaincu, et désigne le gagnant devant tout le monde. Celle-ci est la vraie : lancez-la.")}
<ul class="xe-tags"><li>{ic("check", 16)}Pondérée par les votes du groupe</li><li>{ic("check", 16)}L’hôte peut écarter un film du tirage</li><li>{ic("check", 16)}Ou désigner lui-même le gagnant</li></ul>
<div class="xe-wst">{xwheel(306)}<button type="button" class="btn gl xe-spin"{on("spin")}>{ic("wheel", 17)}{hole("spinLab", "Lancer la roue")}</button><div class="xe-wres">{wres}</div></div></section>
<section class="xe-ms">{sec_head("Et aussi", "Ce qui se passe entre deux soirées", "Movie Picker ne sert pas qu’à trancher un vendredi soir.")}<div class="xe-feat">{feats}</div></section>
<section class="xe-ms">{sec_head("Entre amis", "La soirée continue après le générique", "Chaque personne a un profil public : ses soirées, les films qu’elle a vus, et une flamme qui s’allume à chaque semaine passée devant un film avec les autres.")}
<div class="xe-card xe-prof"><div class="xe-pt">{av("lea", 46)}<div><b>Léa</b><span>@lea</span></div><span class="xe-flm">{ic("flame", 14)}7 semaines</span></div>
<div class="xe-pst"><div><b class="disp">23</b><span>soirées</span></div><div><b class="disp">61</b><span>films vus</span></div><div><b class="disp">14</b><span>gagnants</span></div></div>
<p class="xe-cap">Derniers films vus</p><div class="xe-ls4">{seen}</div></div></section>
<section class="xe-ms"><div class="xe-trust">{trust}</div></section>
<section class="xe-ms">{sec_head("Questions", "Ce qu’on nous demande le plus")}<div class="xe-faq">{faq}</div></section>
<section class="xe-fin"><div class="spot"></div><div class="xe-finc">{sec_head("Prêt&nbsp;?", "Votre prochaine soirée commence ici.", "Créez la première en moins d’une minute. Le seul débat qui restera, c’est de savoir qui apporte le pop-corn.")}
<div class="xe-mcta"><a class="btn"{href("32-m-inscription")}>Créer un compte</a><a class="btn gl"{href("31-m-connexion")}>Se connecter</a></div><p class="xe-fnote">Gratuit, sans publicité, sans engagement.</p></div></section>
{foot_m(False)}'''


def screen_81():
    return f'''<div class="S mob frame"><div class="xe-mscr">{m_landing_body()}</div>
<div class="xe-mtopbar">{b.sbar()}{m_bar(f'<a class="btn gl sm"{href("31-m-connexion")}>Se connecter</a>')}</div></div>'''


def logic_81():
    methods = """spin() {
const s = this.state || {};
if (s.sp) return;
const n = (s.n || 0) + 1;
this.setState({ n: n, sp: true, done: false });
clearTimeout(this.tm);
this.tm = setTimeout(() => this.setState({ sp: false, done: true }), 4700);
}
componentWillUnmount() {
clearTimeout(this.tm);
}
"""
    body = """
const n = st.n || 0;
const sp = !!st.sp;
const dn = !!st.done;
o.wbCls = n === 0 ? 'wb' : (n % 2 ? 'wb xe-s1' : 'wb xe-s2');
o.whCls = sp ? 'wh sml spin' : 'wh sml';
o.spinLab = sp ? 'Tirage en cours…' : (dn ? 'Relancer la roue' : 'Lancer la roue');
o.spin = () => this.spin();
o.idle = !sp && !dn;
o.spinning = sp;
o.won = dn && !sp;
const q = st.q === undefined ? 0 : st.q;
for (let i = 0; i < 6; i++) {
o['qo' + i] = q === i;
o['qc' + i] = q === i ? 'xe-q on' : 'xe-q';
o['qt' + i] = () => this.setState({ q: q === i ? -1 : i });
}
"""
    return b.component(body, methods)


def screen_82():
    return f'''<div class="S mob frame">{b.sbar()}{b.m_top("Profil", "18-m-profil", ())}
<div class="xe-mscr xe-in"><div class="xe-msup">{page_title("Gratuit, sans publicité", "Soutenir Movie Picker")}<p class="xe-lead">{DONATE_INTRO}</p>{kofi_card(True)}
<h2 class="disp xe-h2">Où va l’argent</h2><p class="xe-p">Movie Picker a des frais fixes chaque mois :</p><div class="xe-costs one">{costs_html()}</div>
<h3>Rien à débloquer</h3><p class="xe-p">{NO_PERKS}</p><h3>Le badge soutien</h3><p class="xe-p">{BADGE}</p>
<p class="xe-p xe-mis">Vous avez donné avec une autre adresse, ou vous préférez que le badge n’apparaisse pas&nbsp;? Écrivez à {mail()}.</p></div>{foot_m(True)}</div>
{b.mnav(-1)}</div>'''


def screen_83():
    return f'''<div class="S mob frame"><div class="spot"></div>{b.sbar()}{m_bar(f'<a class="btn gl sm"{href("31-m-connexion")}>Se connecter</a>')}
<div class="xe-merr"><div class="xe-big disp m" aria-hidden="true">404</div><div class="xe-ec m"><span class="xe-eic">{ic("compass", 28)}</span><div class="ov">Erreur 404</div>
<h1 class="disp">Page introuvable</h1><p>Cette page n’existe pas ou a été déplacée. Pas de panique, on vous remet sur les rails.</p>
<a class="btn full"{href("11-m-explorer")}>{xi("home", 16)}Retour à l’accueil</a></div></div>{mnav_guest()}</div>'''


INSTALL_STEPS = [("Appuyez sur le bouton Partager (le carré avec la flèche vers le haut).", xi("iosshare", 20)),
                 ("Faites défiler et choisissez «&nbsp;Sur l’écran d’accueil&nbsp;».", xi("sqplus", 20)),
                 ("Validez. Movie Picker apparaîtra comme une application.", '<span class="xe-appi"><b>MP</b><i></i></span>')]


def screen_84():
    steps = "".join(f'<li class="xe-st2"><span class="n">{i + 1}</span><p>{t}</p><span class="g">{g}</span></li>' for i, (t, g) in enumerate(INSTALL_STEPS))
    notice = f'''<section class="xe-nt"><div class="xe-nth"><div class="xe-ntc"><b>Movie Picker a changé d’adresse</b>
<p>L’application vit désormais sur www.movie-picker.fr. Si vous l’aviez installée sur votre écran d’accueil, réinstallez-la depuis cette adresse : l’ancienne ne recevra plus les mises à jour.</p></div>
<button type="button" class="ib s" aria-label="Fermer"{on("hideN")}>{ic("x", 15)}</button></div>
<div class="xe-nta"><button type="button" class="btn sm"{on("openG")}>{xi("phone", 15)}Installer l’app</button><button type="button" class="btn gl sm"{on("hideN")}>Compris</button></div></section>'''
    sheet = f'''<div class="xe-veil"></div><div class="xe-sh inst" role="dialog"><span class="grab"></span>
<div class="xe-dh"><span class="xe-kic">{xi("phone", 24, 1.8)}</span><button type="button" class="ib s" aria-label="Fermer"{on("closeG")}>{ic("x", 16)}</button></div>
<h2 class="disp">Ajouter à l’écran d’accueil</h2><p class="xe-dd">Sur iPhone et iPad, Safari n’affiche pas de bouton d’installation. Voici comment faire&nbsp;:</p>
<ol class="xe-steps2">{steps}</ol><button type="button" class="btn full"{on("closeG")}>Fermer</button></div>'''
    return (f'<div class="S mob frame"><div class="{hole("ucls", "xe-under xe-dm")}">{b.m_profile()}{when("notice", notice)}</div>'
            f'{when("guide", sheet)}</div>')


def logic_84():
    return b.component("""
const g = st.g === undefined ? true : st.g;
const nt = st.nt === undefined ? true : st.nt;
o.guide = g;
o.notice = nt;
o.ucls = g ? 'xe-under xe-dm' : 'xe-under';
o.closeG = () => this.setState({ g: false });
o.openG = () => this.setState({ g: true });
o.hideN = () => this.setState({ nt: false });
""")


def invite_page():
    films = "".join(f'<div class="if">{b.poster(k)}</div>' for k in ["projo", "orbite", "kyoto", "marseille"])
    return f'''<div class="ibd big"></div><div class="minv xe-iinv"><div class="logo">Movie Picker<i></i></div>
<div class="ov xe-iov">Vendredi 14 novembre, 21 h</div><h1 class="disp">Soirée chez Léa</h1>
<div class="iby">{av("lea", 30)}<span><b>Léa</b> vous invite à choisir le film de la soirée</span></div>
<div class="ifacts"><div><b class="disp">5</b><span>participants</span></div><div><b class="disp">6</b><span>films proposés</span></div><div><b class="disp gold">4 J</b><span>avant la séance</span></div></div>
<div class="ifilms">{films}<span class="more2">+2</span></div>
<a class="btn full"{href("12-m-soiree")}>{ic("users", 17)}Rejoindre la soirée</a></div>'''


def screen_86():
    banner = f'''<section class="xe-nt ia"><div class="xe-nth"><div class="xe-ntc"><b>Vous êtes dans le navigateur intégré de cette application</b>
<p>Snapchat, Instagram et TikTok effacent souvent la connexion à la fermeture. Ouvrez ce lien dans Safari ou Chrome pour rester connecté.</p></div>
<button type="button" class="ib s" aria-label="Fermer"{on("hide")}>{ic("x", 15)}</button></div>
<div class="xe-nta"><a class="btn sm"{href("20-m-invitation")}>{xi("ext", 15)}Ouvrir dans le navigateur</a>
<button type="button" class="btn gl sm"{on("copy")}>{when("notCopied", xi("copy", 15) + "Copier le lien")}{when("copied", ic("check", 15) + "Lien copié", False)}</button></div></section>'''
    chrome = (f'<div class="xe-iab"><span class="xe-iabb">{ic("x", 20)}</span><div class="t"><b>Soirée chez Léa</b><span>{xi("lock", 11)}movie-picker.fr</span></div>'
              f'<span class="xe-iabb">{xi("dots", 22)}</span></div>')
    toolbar = f'<div class="xe-iatb">{xi("back", 20)}{xi("fwd", 20)}{xi("iosshare", 20)}{xi("globe", 20)}</div>'
    return (f'<div class="S mob frame">{chrome}{b.sbar()}<div class="xe-iapg">{invite_page()}{when("ban", '<div class="xe-scrim"></div>')}</div>'
            f'{when("ban", banner)}{toolbar}</div>')


def logic_86():
    return b.component("""
const v = st.v === undefined ? true : st.v;
const c = !!st.c;
o.ban = v;
o.copied = c;
o.notCopied = !c;
o.copy = () => this.setState({ c: true });
o.hide = () => this.setState({ v: false });
""")


def toc_logic(n):
    return b.component(f"""
const t = st.t || 0;
for (let i = 0; i < {n}; i++) {{
o['t' + i] = t === i ? 'on' : '';
o['g' + i] = () => this.setState({{ t: i }});
}}
""")


CSS = r"""
.S .xe-scr{position:absolute;left:0;right:0;top:68px;bottom:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:var(--line2) transparent;z-index:1}
.S .xe-scr.top0{top:0}
.S .xe-cap{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--tx3)}
.S .xe-lead{font-size:15px;line-height:1.55;color:var(--tx2);max-width:560px}
.S .xe-lead.big{font-size:17px;line-height:1.5;color:var(--tx);max-width:660px}
.S .xe-p{font-size:13.5px;line-height:1.6;color:var(--tx2)}
.S .xe-h2{font-size:26px;margin:30px 0 6px}
.S .xe-mail{white-space:nowrap;color:var(--tx);font-weight:600;text-decoration:underline;text-decoration-color:var(--line2);text-underline-offset:3px;cursor:pointer}
.S .xe-backb{margin-top:26px}
.S .xe-nchip{height:32px;gap:7px;padding:0 12px}
.S .xe-ci{width:36px;height:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line);color:var(--tx);flex:none}

.S .xe-ft{position:relative;border-top:1px solid var(--line);padding:26px 40px 20px;background:var(--bg)}
.S .xe-ftg{display:grid;grid-template-columns:1.3fr 1.4fr 1fr 1.15fr;gap:32px}
.S .xe-ftb .logo,.S .xe-mft .logo{font-size:21px}
.S .xe-ftb p,.S .xe-mft>p{font-size:13px;line-height:1.5;color:var(--tx2);margin-top:8px}
.S .xe-inst{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;margin-top:14px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--line2);font-size:13px;font-weight:600;color:var(--tx)}
.S .xe-ftt{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--tx3);margin-bottom:10px}
.S .xe-ftl{display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.S .xe-ftl.two{display:grid;grid-template-columns:auto auto;justify-content:start;column-gap:28px;row-gap:8px}
.S .xe-ftl a{font-size:13px;line-height:1.3;color:var(--tx2);font-weight:500}
.S .xe-ftbot{display:flex;align-items:center;gap:18px;margin-top:20px;padding-top:14px;border-top:1px solid var(--line);font-size:12px;color:var(--tx3)}
.S .xe-ftbot b,.S .xe-mfb b{color:var(--tx2);font-weight:700}
.S .xe-fwn{display:inline-flex;align-items:center;gap:6px;color:var(--tx2);font-weight:600;font-size:12px}
.S .xe-tmdb{flex:1;min-width:0}
.S .xe-ftset{display:flex;align-items:center;gap:8px}
.S .xe-lang{display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 10px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--line2);color:var(--tx);font-weight:600;font-size:12.5px}
.S .xe-lang .ic:last-child{color:var(--tx3)}
.S .xe-thm{padding:2px}
.S .xe-thm>*{height:26px;min-width:30px;padding:0 4px}
.S .xe-soc{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;color:var(--tx2);box-shadow:inset 0 0 0 1px var(--line)}

.S .xe-mft{padding:30px 20px 28px;border-top:1px solid var(--line);background:var(--bg)}
.S .xe-mfg{display:grid;grid-template-columns:1fr 1fr;gap:24px 16px;margin-top:24px}
.S .xe-mfn{grid-column:1/-1}
.S .xe-mfb{display:flex;flex-direction:column;gap:12px;margin-top:24px;padding-top:16px;border-top:1px solid var(--line);font-size:12px;line-height:1.5;color:var(--tx3)}
.S .xe-mfr{display:flex;align-items:center;justify-content:space-between}
.S .xe-mft .xe-ftl a{font-size:13.5px}

.S .xe-don{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:56px;padding:34px 40px 56px}
.S .xe-don h1{font-size:64px;margin:12px 0 16px}
.S .xe-costs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
.S .xe-costs.one{grid-template-columns:1fr}
.S .xe-cost{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line);min-height:60px}
.S .xe-cost b{display:block;font-size:13px;font-weight:600;line-height:1.3}
.S .xe-cost div span{display:block;font-size:12px;color:var(--tx3);margin-top:2px}
.S .xe-pair{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:28px}
.S .xe-pair h3,.S .xe-msup h3{font-size:15px;font-weight:700;margin-bottom:6px}
.S .xe-mis{margin-top:16px}
.S .xe-kofi{position:relative;align-self:start;border-radius:18px;padding:28px;background:radial-gradient(380px 240px at 85% 0%,var(--acc-soft),transparent 70%),var(--s1);box-shadow:inset 0 0 0 1px var(--line),0 30px 80px -24px #000}
.S .xe-kic{width:56px;height:56px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line2);color:var(--tx);flex:none}
.S .xe-kofi h2{font-size:40px;margin:18px 0 10px}
.S .xe-kofi>p{font-size:14px;line-height:1.55;color:var(--tx2);margin-bottom:20px}
.S .xe-kofi .btn .ic{opacity:.8}
.S .xe-kofi>p.xe-knote{font-size:12.5px;color:var(--tx3);text-align:center;margin:12px 0 0}
.S .xe-kb{margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}
.S .xe-kbr{display:flex;align-items:center;gap:12px;margin-top:12px}
.S .xe-kbr b{display:flex;align-items:center;gap:8px;font-size:15px}
.S .xe-kbr div>span{display:block;font-size:12.5px;color:var(--tx3);margin-top:3px}
.S .xe-sup{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:999px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line2);font-size:12px;font-weight:700;color:var(--tx)}

.S .xe-leg{display:grid;grid-template-columns:300px minmax(0,1fr);gap:64px;padding:36px 40px 52px}
.S .xe-la{position:sticky;top:36px;align-self:start}
.S .xe-la h1{font-size:56px;margin:12px 0 14px}
.S .xe-la h1.xe-h1s{font-size:44px}
.S .xe-upd{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--tx3)}
.S .xe-toc{display:flex;flex-direction:column;gap:2px;margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}
.S .xe-toc .xe-cap{margin-bottom:8px}
.S .xe-toc a{display:flex;align-items:center;gap:12px;height:34px;padding:0 12px;border-radius:12px;font-size:13.5px;font-weight:600;color:var(--tx2)}
.S .xe-toc a span{font-size:12px;font-weight:700;color:var(--tx3);font-variant-numeric:tabular-nums;width:18px}
.S .xe-toc a.on{background:var(--s1);color:var(--tx);box-shadow:inset 0 0 0 1px var(--line)}
.S .xe-also{display:flex;flex-direction:column;gap:4px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}
.S .xe-also a{display:flex;align-items:center;justify-content:space-between;height:30px;font-size:13px;font-weight:600;color:var(--tx2)}
.S .xe-cols{columns:2;column-gap:40px}
.S .xe-leg.short{padding-bottom:36px}
.S .xe-lin{font-size:15px;color:var(--tx);margin-bottom:14px}
.S .xe-leg.short .xe-also{margin-top:22px;padding-top:16px}
.S .xe-sec{break-inside:avoid;padding-top:16px;margin-bottom:22px;border-top:1px solid var(--line);scroll-margin-top:20px}
.S .xe-sec h2{display:flex;align-items:baseline;gap:10px;font-size:15px;font-weight:700;margin-bottom:8px}
.S .xe-sec h2 span{font-size:12px;color:var(--tx3);font-variant-numeric:tabular-nums}
.S .xe-sec p{font-size:13.5px;line-height:1.6;color:var(--tx2)}
.S .xe-sec p+p{margin-top:8px}
.S .xe-flow{margin-top:26px;max-width:660px}
.S .xe-flow .xe-sec{padding-top:20px;margin-bottom:26px}
.S .xe-flow .xe-sec h2{font-size:17px}
.S .xe-items{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.S .xe-item{display:grid;grid-template-columns:32px 1fr;gap:12px;align-items:start;padding:12px 14px;border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line)}
.S .xe-item p{font-size:13px;line-height:1.55}
.S .xe-item b{display:block;color:var(--tx);font-weight:700;margin-bottom:2px}
.S .xe-ii{width:32px;height:32px;border-radius:50%;background:var(--s2);display:flex;align-items:center;justify-content:center;color:var(--tx)}

.S .xe-th{position:relative;padding:30px 40px 26px;overflow:hidden}
.S .xe-thbd{position:absolute;inset:0;background:radial-gradient(560px 300px at 78% 20%,var(--acc-soft),transparent 70%),linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:auto,44px 44px,44px 44px;-webkit-mask-image:linear-gradient(180deg,#000 30%,transparent 100%);mask-image:linear-gradient(180deg,#000 30%,transparent 100%);opacity:.7}
.S .xe-thg{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 430px;gap:48px;align-items:end}
.S .xe-th h1{font-size:54px;margin:12px 0 14px}
.S .xe-thl{font-size:14.5px;line-height:1.55;color:var(--tx2);max-width:560px}
.S .xe-stamp{font-size:12px;color:var(--tx3);margin-top:14px}
.S .xe-met{display:grid;grid-template-columns:repeat(3,1fr);gap:14px 16px;padding:18px 20px;border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line)}
.S .xe-met b{display:flex;align-items:baseline;gap:3px;font-size:34px;line-height:1;white-space:nowrap}
.S .xe-met small{font-size:18px;color:var(--tx2)}
.S .xe-met span{display:block;font-size:12px;color:var(--tx2);margin-top:5px}
.S .xe-traj{position:relative;margin:0 40px;padding:20px 0 22px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);scroll-margin-top:12px}
.S .xe-trh{display:flex;align-items:flex-end;gap:28px}
.S .xe-trh h2{font-size:30px;margin-top:8px}
.S .xe-trh p{font-size:13px;line-height:1.5;color:var(--tx2);max-width:420px}
.S .xe-lg{margin-left:auto;display:flex;gap:16px;font-size:12px;color:var(--tx3)}
.S .xe-lg span{display:inline-flex;align-items:center;gap:7px}
.S .xe-lg i{width:10px;height:10px;border-radius:50%;background:var(--tx)}
.S .xe-lg i.p{background:transparent;box-shadow:inset 0 0 0 2px var(--line2)}
.S .xe-fr{list-style:none;display:grid;grid-template-columns:repeat(14,minmax(0,1fr));margin-top:20px}
.S .xe-fr li{position:relative;padding:24px 8px 0 0}
.S .xe-fr li::before{content:'';position:absolute;left:0;right:0;top:5px;height:2px;background:var(--tx3)}
.S .xe-fr li.p::before{background:repeating-linear-gradient(90deg,var(--line2) 0 6px,transparent 6px 11px)}
.S .xe-fr li:last-child::before{right:auto;width:12px}
.S .xe-fr li i{position:absolute;left:0;top:0;width:12px;height:12px;border-radius:50%;background:var(--tx);box-shadow:0 0 0 3px var(--bg)}
.S .xe-fr li.p i{background:var(--bg);box-shadow:inset 0 0 0 2px var(--line2),0 0 0 3px var(--bg)}
.S .xe-fr li.last i{box-shadow:0 0 0 3px var(--bg),0 0 0 5px var(--tx2),0 0 16px 4px var(--acc-soft)}
.S .xe-fr b{display:block;font-size:13px;font-weight:700;line-height:1.25}
.S .xe-fr li.p b{color:var(--tx2)}
.S .xe-fr span{display:block;font-size:12px;line-height:1.3;color:var(--tx3);margin-top:3px}
.S .xe-tsh{display:grid;grid-template-columns:200px minmax(0,1fr);gap:48px;padding:26px 40px 44px}
.S .xe-rail{position:sticky;top:22px;align-self:start}
.S .xe-rail ol{list-style:none;display:flex;flex-direction:column;gap:1px;margin-top:10px}
.S .xe-rail a,.S .xe-rail span.x{display:flex;align-items:center;gap:10px;height:27px;padding:0 10px;border-radius:12px;font-size:12.5px;font-weight:500;color:var(--tx2)}
.S .xe-rail a.on{background:var(--s1);color:var(--tx);font-weight:600;box-shadow:inset 0 0 0 1px var(--line)}
.S .xe-rail em{font-style:normal;font-size:12px;font-weight:700;color:var(--tx3);font-variant-numeric:tabular-nums;width:18px}
.S .xe-tsec{scroll-margin-top:20px}
.S .xe-tsec+.xe-tsec{margin-top:40px}
.S .xe-tsec h2{font-size:36px;margin:10px 0 10px}
.S .xe-tsec .l{font-size:14px;line-height:1.55;color:var(--tx2);max-width:680px}
.S .xe-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:18px}
.S .xe-fact{padding:16px;border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line)}
.S .xe-fact b{display:block;font-size:14px;margin-top:12px}
.S .xe-fact p{font-size:12.5px;line-height:1.55;color:var(--tx2);margin-top:4px}
.S .xe-sig{margin-top:36px;padding-top:20px;border-top:1px solid var(--line);font-size:13.5px;line-height:1.6;color:var(--tx2);max-width:720px}
.S .xe-sig b{color:var(--tx)}

.S .xe-err{position:relative;height:404px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.S .xe-err.full{position:absolute;inset:0;height:auto}
.S .xe-big{position:absolute;left:50%;top:50%;transform:translate(-50%,-52%);font-size:330px;line-height:.8;color:transparent;-webkit-text-stroke:1.5px var(--line2);opacity:.45;white-space:nowrap;pointer-events:none}
.S .xe-ec{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;text-align:center;max-width:680px}
.S .xe-eic{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line2),0 0 50px var(--acc-soft);color:var(--tx);margin-bottom:18px}
.S .xe-ec h1{font-size:72px;margin:12px 0 14px}
.S .xe-ec p{font-size:15px;line-height:1.55;color:var(--tx2);max-width:440px}
.S .xe-eb{display:flex;gap:12px;margin-top:26px}
.S .xe-solo{position:absolute;left:40px;top:23px;z-index:3}
.S .spot.xe-cold{background:radial-gradient(ellipse 380px 700px at 50% -12%,rgba(220,232,255,.1),transparent 70%)}

.S .xe-under{position:absolute;inset:0;transition:filter .3s}
.S .xe-under.xe-dm{filter:blur(6px) brightness(.35)}
.S .xe-under>.S.mob{width:100%;height:100%;border:0;border-radius:0;box-shadow:none}
.S .xe-veil{position:absolute;inset:0;background:rgba(0,0,0,.3);z-index:7}
.S .xe-cb{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);width:640px;z-index:8;padding:20px 22px;border-radius:18px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line2),0 30px 80px -10px #000}
.S .xe-cbh{display:flex;align-items:flex-start;gap:14px}
.S .xe-cbi{width:44px;height:44px;border-radius:50%;background:var(--s3);display:flex;align-items:center;justify-content:center;color:var(--tx);flex:none}
.S .xe-cbt b{display:block;font-size:15px;font-weight:700;line-height:1.35}
.S .xe-cbt p{font-size:13px;line-height:1.5;color:var(--tx2);margin-top:4px}
.S .xe-cba{display:flex;align-items:center;gap:10px;margin-top:16px;padding-left:58px}
.S .xe-cba .btn.gl{min-width:150px}
.S .xe-cba .xe-cust{margin-left:auto;gap:8px;padding:0 6px}
.S .xe-dlg{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:560px;z-index:9;border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line),0 40px 100px -20px #000;padding:26px 28px 24px}
.S .xe-dh{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.S .xe-dh h2{font-size:42px;margin-top:8px}
.S .xe-dd{font-size:13.5px;line-height:1.55;color:var(--tx2);margin:10px 0 18px}
.S .xe-cats{list-style:none;display:flex;flex-direction:column;gap:10px}
.S .xe-cat{display:flex;align-items:center;gap:16px;width:100%;padding:14px 16px;border-radius:12px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line);text-align:left}
.S .xe-cat>div{flex:1;min-width:0}
.S .xe-cat b{display:block;font-size:14px;font-weight:700}
.S .xe-cat p{font-size:12.5px;line-height:1.5;color:var(--tx2);margin-top:3px}
.S .xe-req{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 10px;border-radius:999px;background:var(--s3);font-size:12px;font-weight:700;color:var(--tx2);flex:none}
.S .xe-sw{position:relative;width:46px;height:28px;border-radius:999px;background:var(--s3);box-shadow:inset 0 0 0 1px var(--line2);flex:none;transition:background .2s}
.S .xe-sw i{position:absolute;left:3px;top:3px;width:22px;height:22px;border-radius:50%;background:var(--tx2);transition:transform .2s,background .2s}
.S .xe-sw.on{background:var(--acc);box-shadow:none}
.S .xe-sw.on i{transform:translateX(18px);background:var(--tx)}
.S .xe-da{display:flex;gap:10px;margin-top:20px}
.S .xe-da .btn{flex:1;padding:0 12px}
.S .xe-da .xe-save{flex:1.7}
.S .xe-toast{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);z-index:8;display:flex;align-items:center;gap:12px;padding:10px 10px 10px 16px;border-radius:12px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line2),0 20px 40px -10px #000;font-size:13px;color:var(--tx2);white-space:nowrap}
.S .xe-toast>.ic{color:var(--ok)}
.S .xe-tbtn{height:32px;padding:0 12px;border-radius:12px;background:var(--s3);font-size:12.5px;font-weight:700;color:var(--tx);white-space:nowrap}

.S .xe-wn{position:absolute;left:50%;top:40px;width:560px;height:620px;transform:translateX(-50%);z-index:3;border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line),0 40px 100px -20px #000;overflow:hidden;display:flex;flex-direction:column}
.S .xe-wnh{position:relative;height:156px;flex:none;overflow:hidden}
.S .xe-wnh .bd .planet{right:-30px;top:-110px;width:250px;height:250px}
.S .xe-wnh::after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,var(--s1) 12%,rgba(19,26,43,0) 88%)}
.S .xe-x{position:absolute;right:16px;top:16px;z-index:3;background:rgba(0,0,0,.45)}
.S .xe-wnt{position:absolute;left:28px;bottom:12px;z-index:2}
.S .xe-wnt h2{font-size:54px;margin-top:8px}
.S .xe-wnb{flex:1;min-height:0;overflow-y:auto;padding:4px 28px 14px;scrollbar-width:thin;scrollbar-color:var(--line2) transparent}
.S .xe-wnc{display:flex;align-items:center;gap:10px;margin:14px 0 6px}
.S .xe-wnci{width:28px;height:28px;border-radius:50%;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line);display:inline-flex;align-items:center;justify-content:center;color:var(--tx)}
.S .xe-wnc h3{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--tx2)}
.S .xe-wnc em{font-style:normal;font-size:12px;font-weight:700;color:var(--tx3)}
.S .xe-wne{display:flex;align-items:center;gap:14px;padding:9px 12px;margin:0 -12px;border-radius:12px}
.S .xe-wne>span{flex:1;min-width:0}
.S .xe-wne b{display:block;font-size:14px;font-weight:600}
.S .xe-wne span span{display:block;font-size:12.5px;line-height:1.45;color:var(--tx2);margin-top:2px}
.S .xe-wne>.ic{color:var(--tx3)}
.S a.xe-wne:hover{background:var(--s2)}
.S .xe-wnf{flex:none;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 28px;border-top:1px solid var(--line);font-size:12.5px;color:var(--tx3)}

.S .xe-md{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:600px;z-index:3;border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line),0 40px 100px -20px #000;padding:24px 28px 22px}
.S .xe-mdh{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.S .xe-mdh h2{font-size:42px;margin-top:8px}
.S .xe-mdi{font-size:13.5px;line-height:1.55;color:var(--tx2);margin:10px 0 16px}
.S .xe-fl2{display:block;margin-bottom:7px}
.S .xe-env{border-radius:12px;box-shadow:inset 0 0 0 1px var(--line2);overflow:hidden;background:var(--bg)}
.S .xe-envh{display:grid;grid-template-columns:56px 1fr;gap:6px 8px;padding:10px 14px;border-bottom:1px solid var(--line);font-size:12.5px}
.S .xe-envh span{color:var(--tx3)}
.S .xe-envh b{font-weight:600}
.S .xe-ta{display:block;width:100%;height:182px;padding:12px 14px;border:0;outline:0;resize:none;background:transparent;color:var(--tx);font:13px/1.55 'IBM Plex Mono',monospace}
.S .xe-ta:focus{box-shadow:inset 0 0 0 1.5px var(--acc)}
.S .xe-tech{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:10px 14px;border-top:1px solid var(--line)}
.S .xe-tech em{flex:1 1 100%;font-style:normal;font-size:13px;color:var(--tx3);margin-bottom:2px}
.S .xe-tech span{display:inline-flex;align-items:center;height:24px;padding:0 9px;border-radius:999px;background:var(--s2);font-size:13px;color:var(--tx2)}
.S .xe-mda{display:flex;align-items:center;gap:10px;margin-top:18px}
.S .xe-st{display:inline-flex;align-items:center;gap:6px;margin-left:6px;font-size:13px;font-weight:600;color:var(--ok)}
.S .xe-hint{font-size:12.5px;line-height:1.5;color:var(--tx3);margin-top:14px}

.S .xe-md.idea{padding-bottom:20px}
.S .xe-md.idea .xe-mdh{margin-bottom:18px}
.S .xe-row2{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:end}
.S .xe-row2 .seg.big>*{height:42px}
.S .xe-md .fld{margin-bottom:12px}
.S .xe-kseg{display:inline-flex;align-self:flex-start}
.S textarea.in{white-space:pre-wrap;line-height:1.5;resize:none;font:inherit;font-size:14px;color:var(--tx);border:0;outline:0;background:var(--s1)}
.S .xe-tad{height:72px;padding:12px 16px;align-items:flex-start;white-space:normal}
.S textarea.in:focus,.S input.in:focus{box-shadow:inset 0 0 0 1.5px var(--acc),0 0 0 4px var(--acc-soft)}
.S .xe-hr{font-size:12px;color:var(--tx3);text-align:right}
.S .xe-hr.l{text-align:left}
.S .xe-drop{display:flex;align-items:center;gap:10px;padding:10px;border-radius:12px;border:1.5px dashed var(--line2)}
.S .xe-tn{position:relative;width:76px;height:56px;border-radius:6px;overflow:hidden;box-shadow:0 0 0 1px var(--line2);flex:none}
.S .xe-tni{position:absolute;left:0;right:0;top:-14px}
.S .xe-tnx{position:absolute;right:4px;top:4px;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,.72);color:var(--tx);display:flex;align-items:center;justify-content:center;z-index:3}
.S .xe-add{display:inline-flex;align-items:center;gap:8px;height:56px;padding:0 16px;border-radius:12px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line);font-size:13px;font-weight:600;color:var(--tx)}
.S .xe-add.off{opacity:.4}
.S .xe-pub{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:12px;background:var(--s2);font-size:12.5px;line-height:1.5;color:var(--tx2)}
.S .xe-pub .ic{margin-top:1px;color:var(--tx)}
.S .xe-mdf{display:flex;align-items:center;justify-content:flex-end;gap:14px;margin-top:16px}
.S .xe-err2{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--err);margin-right:auto}
.S .xe-ok{display:flex;flex-direction:column;align-items:center;text-align:center;padding:40px 0 14px}
.S .xe-oki{width:68px;height:68px;border-radius:50%;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line2);color:var(--ok);display:flex;align-items:center;justify-content:center}
.S .xe-ok h3{font-size:48px;margin:18px 0 8px}
.S .xe-ok p{font-size:14px;color:var(--tx2);margin-bottom:24px}

.S .xe-mscr{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:none}
.S .xe-mscr::-webkit-scrollbar{display:none}
.S .xe-mscr.xe-in{top:90px;bottom:76px}
.S .xe-mtopbar{position:absolute;left:0;right:0;top:0;z-index:6;background:var(--hdr);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);box-shadow:0 1px 0 var(--line)}
.S .xe-mbar{position:relative;z-index:5;display:flex;align-items:center;justify-content:space-between;padding:2px 16px 12px}
.S .xe-mbar .logo{font-size:20px}
.S .xe-mbar .btn.sm{padding:0 16px}

.S .xe-mh{position:relative;padding:112px 20px 0;overflow:hidden}
.S .xe-mh>.bd{bottom:auto;height:520px}
.S .xe-mh>.bd .planet{right:-110px;top:70px;width:250px;height:250px;opacity:.75}
.S .xe-mh>.bd::after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,var(--bg) 6%,rgba(10,15,28,.55) 50%,rgba(10,15,28,.2) 100%)}
.S .xe-mhc{position:relative;z-index:2}
.S .xe-mh h1{font-size:46px;margin:14px 0 14px}
.S .xe-mh h1 span{display:block;color:var(--tx2)}
.S .xe-mh p.l,.S .xe-ms p.l,.S .xe-fin p.l{font-size:14px;line-height:1.55;color:var(--tx2)}
.S .xe-mcta{display:flex;flex-direction:column;gap:10px;margin-top:22px}
.S .xe-mcta .btn{width:100%;height:52px;font-size:15px}
.S .xe-mnote{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12.5px;color:var(--tx3);margin-top:16px}
.S .xe-mnote a{color:var(--tx);font-weight:600}
.S .xe-pvw{position:relative;margin-top:50px;padding:0 6px}
.S .xe-pv{border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line),0 30px 60px -20px #000;overflow:hidden}
.S .xe-pvbar{display:flex;align-items:center;gap:6px;height:34px;padding:0 14px;border-bottom:1px solid var(--line);font-size:12px;color:var(--tx3)}
.S .xe-pvbar i{width:8px;height:8px;border-radius:50%;background:var(--s3)}
.S .xe-pvbar span{margin-left:8px}
.S .xe-pvb{padding:14px 14px 16px}
.S .xe-pvt{display:block;font-size:16px;font-weight:700}
.S .xe-pvm{display:flex;align-items:center;gap:10px;margin-top:8px;font-size:12.5px;color:var(--tx2)}
.S .xe-pvm .chip{height:24px}
.S .xe-pvr{display:grid;grid-template-columns:32px 1fr auto;gap:12px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)}
.S .xe-pvr:nth-of-type(3){margin-top:10px;border-top:1px solid var(--line)}
.S .xe-pvp{display:block;border-radius:4px;overflow:hidden}
.S .xe-pvr b{display:block;font-size:13.5px;font-weight:600}
.S .xe-pvr span span{display:block;font-size:12px;color:var(--tx3);margin-top:2px}
.S .xe-pvb .btn{margin-top:12px}
.S .xe-fn{position:absolute;z-index:3;display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:12px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line2),0 14px 30px -8px #000;font-size:12px;color:var(--tx2);white-space:nowrap}
.S .xe-fn b{color:var(--tx)}
.S .xe-fn.a{right:-4px;top:-26px}
.S .xe-fn.b{left:-6px;top:150px}

.S .xe-ms{padding:52px 20px 0}
.S .xe-ms h2,.S .xe-fin h2{font-size:36px;margin:10px 0 10px}
.S .xe-card{margin-top:16px;padding:16px;border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line)}
.S .xe-cl{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--tx3)}
.S .xe-cl.good{color:var(--ok)}
.S .xe-chat{display:flex;flex-direction:column;gap:6px;margin-top:12px}
.S .xe-bub{align-self:flex-start;max-width:80%;padding:7px 12px 8px;border-radius:12px 12px 12px 4px;background:var(--s2);font-size:13px;line-height:1.35}
.S .xe-bub b{display:block;font-size:12px;color:var(--tx3);font-weight:700;margin-bottom:1px}
.S .xe-bub.mine{align-self:flex-end;border-radius:12px 12px 4px 12px;background:var(--s3)}
.S .xe-bub.fade{opacity:.45}
.S .xe-end{font-size:12.5px;color:var(--tx3);margin-top:12px;font-style:italic}
.S .xe-tl{display:flex;flex-direction:column;gap:12px;margin-top:14px}
.S .xe-tli{display:grid;grid-template-columns:44px 1fr;gap:10px}
.S .xe-tli time{font:600 12px/1.6 'IBM Plex Mono',monospace;color:var(--tx3)}
.S .xe-tli b{display:block;font-size:13.5px;line-height:1.35}
.S .xe-tli span{display:block;font-size:12.5px;line-height:1.45;color:var(--tx2);margin-top:2px}
.S .xe-win{display:flex;align-items:center;gap:14px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}
.S .xe-wp{width:46px;border-radius:6px;overflow:hidden;flex:none}
.S .xe-win .disp{display:block;font-size:26px;margin-top:6px}
.S .xe-steps{display:flex;flex-direction:column;gap:10px;margin-top:20px}
.S .xe-step{display:grid;grid-template-columns:1fr 120px;gap:14px;align-items:center;padding:16px;border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line)}
.S .xe-sn{display:block;font-size:30px;color:transparent;-webkit-text-stroke:1.2px var(--tx2)}
.S .xe-step h3{font-size:15px;font-weight:700;margin:6px 0 4px}
.S .xe-step p{font-size:12.5px;line-height:1.5;color:var(--tx2)}
.S .xe-demo{display:flex;flex-direction:column;align-items:stretch;justify-content:center;gap:5px;min-height:112px;padding:10px;border-radius:12px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--line)}
.S .xe-dl{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--tx3)}
.S .xe-di{display:flex;align-items:center;height:28px;padding:0 8px;border-radius:12px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line2);font-size:12px;white-space:nowrap;overflow:hidden}
.S .xe-di.f{box-shadow:inset 0 0 0 1.5px var(--tx2)}
.S .xe-di .caret{height:14px;background:var(--tx)}
.S .xe-qr{display:block;margin:0 auto;color:var(--bg);background:var(--tx);border-radius:6px;fill:currentColor}
.S .xe-dr{display:flex;align-items:center;justify-content:space-between;gap:6px}
.S .xe-dp{width:28px;border-radius:4px;overflow:hidden;flex:none}
.S .xe-dr .vb{height:26px;padding:0 8px;white-space:nowrap}
.S .xe-dw{display:flex;justify-content:center;padding-top:8px}
.S .xe-dw .wl{display:none}
.S .xe-dw .ptr{top:-9px;border-left-width:8px;border-right-width:8px;border-top-width:16px}
.S .xe-tags{list-style:none;display:flex;flex-direction:column;gap:9px;margin-top:16px}
.S .xe-tags li{display:flex;align-items:center;gap:10px;font-size:13.5px;font-weight:600}
.S .xe-tags .ic{color:var(--ok)}
.S .xe-wst{display:flex;flex-direction:column;align-items:center;margin-top:40px}
.S .xe-wst .wl span{padding-right:4%}
.S .xe-spin{margin-top:28px;min-width:220px}
.S .xe-wres{min-height:64px;display:flex;align-items:center;justify-content:center;text-align:center;margin-top:12px}
.S .xe-wh{font-size:13px;color:var(--tx3)}
.S .xe-won b{display:block;font-size:30px;margin-top:6px}
.S .wb.xe-s1{animation:xeSpin1 4.6s cubic-bezier(.15,.65,.12,1) both}
.S .wb.xe-s2{animation:xeSpin2 4.6s cubic-bezier(.15,.65,.12,1) both}
@keyframes xeSpin1{from{transform:rotate(282deg)}to{transform:rotate(2082deg)}}
@keyframes xeSpin2{from{transform:rotate(282deg)}to{transform:rotate(2082deg)}}
.S .xe-feat{display:flex;flex-direction:column;gap:10px;margin-top:20px}
.S .xe-frow{display:grid;grid-template-columns:40px 1fr;gap:14px;padding:14px;border-radius:18px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--line)}
.S .xe-fi{width:40px;height:40px;border-radius:12px;background:var(--s2);display:flex;align-items:center;justify-content:center;color:var(--tx)}
.S .xe-frow b{display:block;font-size:14.5px;line-height:1.3}
.S .xe-frow p{font-size:12.5px;line-height:1.5;color:var(--tx2);margin-top:4px}
.S .xe-prof .xe-cap{margin-top:16px}
.S .xe-pt{display:flex;align-items:center;gap:12px}
.S .xe-pt b{display:block;font-size:16px}
.S .xe-pt div span{display:block;font-size:12.5px;color:var(--tx3);margin-top:2px}
.S .xe-flm{margin-left:auto;display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 10px;border-radius:999px;background:var(--s2);font-size:12px;font-weight:700}
.S .xe-pst{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
.S .xe-pst div{padding:10px 8px;border-radius:12px;background:var(--s2);text-align:center}
.S .xe-pst b{display:block;font-size:30px;line-height:1}
.S .xe-pst span{display:block;font-size:12px;color:var(--tx2);margin-top:4px}
.S .xe-ls4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}
.S .xe-ps{display:block;border-radius:6px;overflow:hidden}
.S .xe-trust{display:flex;flex-direction:column}
.S .xe-trr{padding:16px 0;border-top:1px solid var(--line)}
.S .xe-trr:last-child{border-bottom:1px solid var(--line)}
.S .xe-trr b{display:block;font-size:15px}
.S .xe-trr p{font-size:13px;line-height:1.5;color:var(--tx2);margin-top:4px}
.S .xe-faq{margin-top:18px;border-top:1px solid var(--line)}
.S .xe-qi{border-bottom:1px solid var(--line)}
.S .xe-q{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:56px;padding:12px 0;font-size:14px;font-weight:600;line-height:1.35}
.S .xe-q .ic{color:var(--tx3);flex:none;transition:transform .2s}
.S .xe-q.on .ic{transform:rotate(180deg)}
.S .xe-qa{font-size:13px;line-height:1.55;color:var(--tx2);padding:0 0 16px}
.S .xe-fin{position:relative;margin-top:56px;padding:56px 20px 48px;text-align:center;overflow:hidden;border-top:1px solid var(--line)}
.S .xe-finc{position:relative;z-index:2}
.S .xe-fnote{font-size:12.5px;color:var(--tx3);margin-top:14px}

.S .xe-msup{padding:12px 18px 34px}
.S .xe-msup h1{font-size:46px;margin:10px 0 12px}
.S .xe-msup .xe-lead{font-size:14px}
.S .xe-kofi.m{margin-top:20px;padding:20px}
.S .xe-kofi.m .xe-kic{width:48px;height:48px}
.S .xe-kofi.m h2{font-size:32px;margin:14px 0 8px}
.S .xe-kofi.m>p{font-size:13.5px;margin-bottom:16px}
.S .xe-kofi.m .btn{height:52px}
.S .xe-msup .xe-h2{font-size:24px;margin-top:28px}
.S .xe-msup h3{margin-top:22px}

.S .xe-merr{position:absolute;left:0;right:0;top:100px;bottom:76px;display:flex;align-items:center;justify-content:center;padding:0 22px}
.S .xe-big.m{font-size:190px;top:42%}
.S .xe-ec.m h1{font-size:50px;margin:12px 0 12px}
.S .xe-ec.m p{font-size:14px}
.S .xe-ec.m .btn{margin-top:26px;height:52px}

.S .xe-sh{position:absolute;left:0;right:0;bottom:0;z-index:9;border-radius:18px 18px 0 0;background:var(--s1);box-shadow:0 -20px 60px -10px #000,inset 0 1px 0 var(--line2);padding:28px 18px 20px}
.S.mob .xe-sh>.xe-dh .ib{position:absolute;right:14px;top:20px}
.S .xe-sh .xe-dh h2{font-size:33px}
.S .xe-sh .xe-cat{padding:12px 14px;gap:12px}
.S .xe-sh .xe-cat p{font-size:12px}
.S .xe-sh .xe-da{flex-wrap:wrap;margin-top:16px}
.S .xe-sh .xe-da .btn{height:46px}
.S .xe-sh .xe-da .xe-save{flex:1 1 100%;order:3;height:50px}
.S .xe-sh.inst h2{font-size:38px;margin-top:14px}
.S .xe-steps2{list-style:none;display:flex;flex-direction:column;gap:8px;margin:4px 0 20px}
.S .xe-st2{display:grid;grid-template-columns:30px 1fr 44px;gap:12px;align-items:center;padding:12px;border-radius:12px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line)}
.S .xe-st2 .n{width:30px;height:30px;border-radius:50%;background:var(--s3);font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center}
.S .xe-st2 p{font-size:13px;line-height:1.45}
.S .xe-st2 .g{width:44px;height:44px;border-radius:12px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--line2);display:flex;align-items:center;justify-content:center;color:var(--tx)}
.S .xe-appi{position:relative;width:32px;height:32px;border-radius:9px;background:var(--s3);display:flex;align-items:center;justify-content:center;font:800 13px/1 Archivo,sans-serif;font-stretch:70%;font-variation-settings:'wdth' 70}
.S .xe-appi i{position:absolute;right:5px;top:5px;width:5px;height:5px;border-radius:50%;background:var(--acc)}
.S .xe-sh .btn.full{height:52px}

.S .xe-nt{position:absolute;left:12px;right:12px;top:52px;z-index:6;padding:14px 12px 14px 14px;border-radius:18px;background:var(--s2);box-shadow:inset 0 0 0 1px var(--line2),0 24px 50px -10px #000}
.S .xe-nth{display:flex;align-items:flex-start;gap:10px}
.S .xe-ntc{flex:1;min-width:0;padding-left:12px;border-left:2px solid var(--tx2)}
.S .xe-ntc b{display:block;font-size:14px;font-weight:700;line-height:1.35}
.S .xe-ntc p{font-size:12.5px;line-height:1.5;color:var(--tx2);margin-top:4px}
.S .xe-nta{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;padding-left:14px}
.S .xe-nta .btn{padding:0 14px;gap:8px}
.S .xe-nt.ia{top:108px}
.S .xe-nt.ia .xe-nta{display:grid;grid-template-columns:1fr}
.S .xe-nt.ia .xe-nta .btn{width:100%}

.S .xe-cb.m{left:10px;right:10px;bottom:12px;width:auto;transform:none;padding:16px}
.S .xe-cb.m .xe-cbh{gap:12px}
.S .xe-cb.m .xe-cbi{width:40px;height:40px}
.S .xe-cb.m .xe-cba{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding-left:0;margin-top:14px}
.S .xe-cb.m .btn.gl{min-width:0;height:46px;padding:0 10px}
.S .xe-cb.m .xe-cust{grid-column:1/-1;margin:0;justify-content:center;height:44px}
.S .xe-toast.m{left:10px;right:10px;bottom:12px;transform:none;white-space:normal;display:grid;grid-template-columns:16px 1fr;gap:10px;padding:14px 16px}
.S .xe-toast.m span{line-height:1.45}
.S .xe-toast.m>.ic{margin-top:2px}
.S .xe-toast.m .xe-tbtn{grid-column:2;justify-self:start;height:36px}

.S .xe-iab{position:absolute;left:0;right:0;top:0;height:96px;z-index:3;display:flex;align-items:center;gap:10px;padding:46px 8px 0;background:var(--s1);border-bottom:1px solid var(--line)}
.S .xe-iabb{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--tx)}
.S .xe-iab .t{flex:1;min-width:0;text-align:center}
.S .xe-iab .t b{display:block;font-size:13.5px;font-weight:700}
.S .xe-iab .t span{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--tx3);margin-top:1px}
.S .xe-iapg{position:absolute;left:0;right:0;top:96px;bottom:56px;overflow:hidden}
.S .xe-iinv{padding-top:16px}
.S .xe-iinv .logo{font-size:19px;justify-content:center}
.S .xe-iov{margin-top:236px}
.S .xe-scrim{position:absolute;inset:0;z-index:3;background:rgba(0,0,0,.45)}
.S .xe-iatb{position:absolute;left:0;right:0;bottom:0;height:56px;z-index:3;display:flex;align-items:center;justify-content:space-around;padding-bottom:6px;background:var(--s1);border-top:1px solid var(--line);color:var(--tx2)}
.S.mob .xe-ftl a,.S.mob .xe-fwn{display:flex;align-items:center;min-height:44px}
.S.mob .xe-inst{height:44px}
.S.mob .xe-mft .logo,.S.mob .xe-mbar .logo{display:inline-flex;align-items:center;min-height:44px}
.S .xe-mnote a{position:relative}
.S .xe-mnote a::after{content:'';position:absolute;left:-4px;right:-4px;top:-15px;bottom:-15px}
.S .xe-tmdb,.S .xe-mfb span,.S .xe-stamp,.S .xe-hr.l{font-size:13px}
"""

SCREENS = {
    "71": screen_71, "72": screen_72, "73": screen_73, "74": screen_74, "75": screen_75, "76": screen_76, "77": screen_77, "78": screen_78,
    "79": screen_79, "80": screen_80, "81": screen_81, "82": screen_82, "83": screen_83, "84": screen_84, "85": screen_85, "86": screen_86,
}

LOGIC = {
    "73": toc_logic(len(PRIVACY)),
    "74": toc_logic(len(TECH_LINKS)),
    "77": consent_logic("dialog"),
    "78": b.component(SAVE_JS),
    "79": logic_79(),
    "80": logic_80(),
    "81": logic_81(),
    "84": logic_84(),
    "85": consent_logic("banner"),
    "86": logic_86(),
}
