# 00 — Plan de présentation orale (Bloc 1)

> **Document de travail** (guide de montage des diapos), pas un livrable en soi.
> Le livrable évalué = **le support de présentation (diapositives)** + la prestation orale.

---

## Cadre de l'épreuve

| Élément | Détail |
|---------|--------|
| **Format** | Simulation d'une présentation de cadrage projet à un client (fictif ou réel) |
| **Durée** | **30 min** = **20 min de présentation** + **10 min d'échanges** avec le jury |
| **Support** | Diapositives au choix du candidat — **c'est le livrable** |
| **Jury** | **2 professionnels externes** du domaine (pas Ynov) |
| **Validation du bloc** | ≥ **50 %** des compétences acquises **ET aucune éliminatoire non-acquise** |
| **Compétences éliminatoires** | **C1.1.1 · C1.2.2 · C1.3.2 · C1.4.1 · C1.6** → zéro droit à l'erreur |

> **Conséquences directes sur la présentation :**
> - Jury externe → **vocabulaire pro + vulgarisation systématique** (cf. C1.6).
> - 20 min pour 11 compétences → **fil resserré**, ~1 visuel fort par diapo, pas de texte dense.
> - Les 5 éliminatoires reçoivent **2 diapos** (plus de temps de parole) ; les autres 1 diapo.

---

## Principes de montage

1. **11 chapitres = les 11 compétences**, dans l'ordre actuel des documents (01 → 11) — facile à suivre, mappe la grille du jury.
2. **~19 diapos** au total (1 titre + 17 contenu + 1 annexe), soit ~1 min/diapo, pondéré éliminatoires.
3. **Chaque diapo s'articule autour d'un visuel déjà présent dans le document source** (matrice, diagramme C4, mindmap, tableau de synthèse). Le visuel porte le message ; le texte reste minimal (3-4 puces max).
4. **Discours orienté client** (le « pourquoi » et la valeur), pas déroulé de référentiel. Le mapping RNCP reste **discret** (annexe / pied de page) — *à arbitrer au montage (point 3 reporté).*

---

## Budget temps (20 min)

```
Ouverture ............ ~0:45   (1 diapo)
11 chapitres ......... ~17:45  (17 diapos)
Buffer transitions ... ~1:30
─────────────────────────────
Total ................ 20:00
+ Annexe (Q&A) ....... hors temps de présentation
```

---

## Déroulé diapo par diapo

> Légende : **ÉLIM** = compétence éliminatoire (2 diapos). Le « visuel héros » renvoie à l'élément déjà produit dans le document du chapitre.

| # | Chapitre / Compétence | Titre diapo (orienté client) | Contenu clé (puces) | Visuel héros | Durée |
|---|----------------------|------------------------------|---------------------|--------------|-------|
| 1 | — | **Movie Picker — Cadrage du projet** | Pitch 1 ligne · agenda en 11 points | Logo + écran mobile | 0:45 |
| 2 | **01 · C1.1.1 ÉLIM** | Qui sont les acteurs du projet ? | Commanditaire · équipe (solo cumulé) · utilisateurs · acteurs externes · niveaux d'implication | Mindmap parties prenantes | 1:00 |
| 3 | **01 · C1.1.1 ÉLIM** | À qui s'adresse le produit ? | 3 personas (Léa hôte · Tom participant · groupe récurrent) · mobile-first · compte requis | Fiches personas | 1:00 |
| 4 | **02 · C1.1.2** | Le problème à résoudre | Problématique (choix de film à plusieurs) · besoins par partie prenante · objectifs · pistes | Tableau besoins → produit | 1:15 |
| 5 | **03 · C1.2.2 ÉLIM** | La démarche d'audit | Projet greenfield · grille 5 étapes · langages/BDD/techno disponibles · diagnostic | Flowchart démarche 5 étapes | 1:00 |
| 6 | **03 · C1.2.2 ÉLIM** | Le projet est-il réalisable ? | Contraintes (budget/solo/délais/volume) · **verdict Go** · risques majeurs + atténuations | Encadré « Go » + tableau risques | 1:00 |
| 7 | **04 · C1.3.2 ÉLIM** | Quelles technologies, et pourquoi ? | Stack retenue · 6 critères (sécurité, systèmes, réseau, a11y, env., coût) · décisions justifiées | Schéma stack + tableau synthèse | 1:00 |
| 8 | **04 · C1.3.2 ÉLIM** | Sécurité & ressources nécessaires | Focus sécurité (cookie HttpOnly, CORS) · impact environnemental · ressources matérielles/techniques | Tableau critères sécurité | 1:00 |
| 9 | **05 · C1.4.1 ÉLIM** | Les fonctionnalités hiérarchisées | Bête à cornes · MoSCoW (principales/secondaires/complémentaires) · outil d'analyse explicité | Mindmap MoSCoW | 1:00 |
| 10 | **05 · C1.4.1 ÉLIM** | Combien de travail ? | Charge ≈ **98 J/H** (MVP/migration/V1/RNCP) · couverture technique · prise en compte UX | Tableau charge J/H | 1:00 |
| 11 | **06 · C1.2.1** | Opportunités & menaces | Matrice SWOT · adhérences externes · impact environnemental · points de vigilance | Matrice SWOT | 1:15 |
| 12 | **07 · C1.2.3** | Cartographie des risques | Référentiel P×I · risques tech + fonctionnels · 2 prioritaires (CSRF, abandon) · indicateurs | Matrice risques P×I | 1:15 |
| 13 | **08 · C1.3.1** | La veille mise en place | Stratégie (auto-first) · sources (tech/sécu/réglementaire) · outils (Dependabot, scans) · classification | Tableau classification | 1:00 |
| 14 | **09 · C1.5** | L'architecture proposée (1/2) | Méthode C4 justifiée · niveau Contexte · niveau Conteneurs (front AWS / API GCP / Mongo) | Diagrammes C4 niv. 1 + 2 | 1:00 |
| 15 | **09 · C1.5** | L'architecture proposée (2/2) | Hexagonale (niv. composants) · séquence « lancer la roue » · maintenable/sécurisée/extensible · éco | Diagramme de séquence | 1:00 |
| 16 | **10 · C1.4.2** | Le budget prévisionnel | Valeur dev ≈ 34 300 € simulés · infra ~1–5 €/mois · 0 € licences · trésorerie < 200 €/an | Tableau budget récap | 1:00 |
| 17 | **11 · C1.6 ÉLIM** | Nos décisions & axes de solutions | 5 décisions structurantes (web mobile-first · compte pour tous · stack · sécurité · serverless) | Tableau 5 décisions | 1:00 |
| 18 | **11 · C1.6 ÉLIM** | Pourquoi nous suivre (clôture) | Réponses aux objections · synthèse valeur · **demande d'adhésion/validation** | Tableau objections → réponses | 1:00 |
| A | Annexe (Q&A) | Couverture RNCP & roadmap | Mapping 11 compétences ↔ diapos · roadmap MVP→V1→V1.1 | Tableau mapping | hors temps |

---

## Conseils de restitution (jury externe)

- **Vulgariser chaque terme technique** : *serverless* → « ne tourne (et ne coûte) que quand c'est utilisé » ; *hexagonale* → « code en couches indépendantes, facile à tester et faire évoluer » ; *scale-to-zero* → « zéro serveur allumé la nuit ».
- **Parler valeur avant technique** : commencer chaque chapitre par le bénéfice client, finir par le « comment ».
- **Soigner l'ouverture et la clôture** (diapos 1 et 18) : ce sont elles qui portent l'adhésion (C1.6 éliminatoire).
- **Anticiper les 10 min d'échanges** : préparer les objections de la diapo 18 + la diapo annexe (mapping RNCP) pour répondre vite et factuellement.
- **Tenir le minutage** : 20 min est court ; répéter à voix haute, viser ~1 min/diapo, garder le buffer pour les transitions.

---

## Point reporté (à trancher au montage des diapos)

**Jargon RNCP vs discours client** : faut-il afficher les codes compétences (C1.x.x / ÉLIMINATOIRE) sur les diapos ?
- **Reco** : non sur le corps des diapos (casse la fiction « client »), mais **oui en pied de page discret** ou sur la **diapo annexe de mapping** — pour que le jury coche sa grille sans friction.
