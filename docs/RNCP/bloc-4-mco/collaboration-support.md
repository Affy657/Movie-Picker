# Problème résolu en collaboration avec le support (C4.3.3)

> Grille : [`../referentiel/bloc-04-maintenir-application-mco.md`](../referentiel/bloc-04-maintenir-application-mco.md) · Suivi : [`../suivi-rncp.md`](../suivi-rncp.md) § 20
>
> **Objectif du critère (C4.3.3)** : présenter un problème résolu en collaboration avec le support client, en explicitant le contexte du retour client, la résolution apportée et la contribution des différentes parties prenantes.

## 1. Dispositif de support

Movie Picker est développé et exploité par une seule personne : les rôles de support de niveau 1 (réception et qualification du retour) et de niveau 2 (diagnostic et correction) sont tenus par le même intervenant. Le dispositif est donc dimensionné pour que **le retour utilisateur ne dépende pas d'un canal informel**.

| Fonction | Qui l'assure | Support |
|----------|--------------|---------|
| Réception du signalement | Développeur-mainteneur | Lien **« Signaler un problème »** en pied de page (livré en v1.3.2), message pré-rempli avec page, version et navigateur |
| Qualification et reproduction | Développeur-mainteneur | [`processus-anomalies.md`](processus-anomalies.md) — gabarit d'issue, grille de sévérité |
| Diagnostic et correction | Développeur-mainteneur | Sentry, Cloud Monitoring, logs Cloud Run |
| Validation du retour au normal | Développeur-mainteneur **et utilisateurs signalants** | Vérification en production, confirmation d'usage |
| Fournisseurs de service | Google Cloud Run, MongoDB Atlas, Sentry | Documentation, comportements de plateforme, télémétrie |

Ce dispositif remplace l'équipe de support d'une organisation plus grande. Sa faiblesse structurelle est connue : le signalant et le correcteur ne se contrôlent pas mutuellement. Elle est compensée par la formalisation écrite de chaque anomalie, y compris lorsqu'une seule personne la lit.

## 2. Contexte du retour utilisateur

**17 juillet 2026.** Plusieurs utilisateurs signalent le même symptôme, exprimé en langage courant : *« je dois me reconnecter à chaque fois »*. Les échanges de qualification apportent trois précisions décisives, qu'aucun outil technique n'aurait fournies :

1. La déconnexion survient **à la fermeture de l'onglet ou du navigateur**, pas pendant l'utilisation.
2. Elle touche **tous les supports** : ordinateur, mobile, application installée en PWA.
3. **« Avant, ça marchait »** — le comportement s'est dégradé sans qu'aucune nouvelle version n'ait été publiée.

Ces retours sont d'autant plus précieux qu'**aucune alerte technique ne s'est déclenchée** : l'application répondait normalement, ne levait aucune exception, et renvoyait des 401 parfaitement conformes à son propre code. Pour la supervision de l'époque, tout allait bien. Seuls les utilisateurs pouvaient signaler l'anomalie.

**Le problème à résoudre**, une fois traduit : pourquoi un cookie d'authentification, émis avec une durée de vie longue, cesse-t-il d'être reconnu après la fermeture du navigateur, sans modification du code ?

## 3. Résolution apportée

La troisième précision — « avant, ça marchait » — a orienté le diagnostic vers un élément **dépendant du temps** plutôt que vers une régression de code. Le diagnostic a mis au jour **deux causes cumulées** :

1. La clé de chiffrement ASP.NET Data Protection, générée sans durée explicite, avait atteint son **expiration par défaut de 90 jours**. Le trousseau ne contenant qu'une clé, chaque instance en régénérait une éphémère, perdue au redémarrage : combinée au *scale-to-zero* de Cloud Run, cette perte rendait le cookie indéchiffrable dès le premier démarrage à froid — ce qui explique le lien avec la fermeture du navigateur et l'absence de changement de code.
2. Le configurateur du cookie était enregistré sur une interface **jamais consommée** par l'injection de dépendances : plusieurs réglages de sécurité et de session étaient inopérants depuis l'origine.

**Correction livrée** : persistance des clés de chiffrement dans MongoDB (durables et partagées entre instances), enregistrement du configurateur corrigé, durée de session portée à 30 jours glissants, test de non-régression sur l'application effective de la configuration. Déploiement par le pipeline d'intégration continue, avec une reconnexion unique pour tous les utilisateurs — assumée et annoncée.

Le détail technique complet est consigné dans l'issue [#67](https://github.com/Affy657/Movie-Picker/issues/67).

## 4. Contribution des parties prenantes

| Partie prenante | Contribution | Sans elle |
|-----------------|--------------|-----------|
| **Utilisateurs signalants** | Détection de l'anomalie, description du symptôme, et surtout les trois précisions de contexte (fermeture du navigateur, tous supports, régression sans déploiement) | L'anomalie restait invisible : aucune alerte, aucune exception, aucun code d'erreur anormal |
| **Développeur-mainteneur** | Qualification, reproduction, diagnostic des deux causes racines, correctif, test de non-régression, déploiement, vérification | — |
| **Google Cloud Run** | Le comportement documenté de *scale-to-zero* et du stockage éphémère a fourni le chaînon explicatif entre l'expiration de la clé et le symptôme perçu | Le lien entre une clé expirée et une déconnexion à la fermeture du navigateur restait incompréhensible |
| **MongoDB Atlas** | Support de persistance durable des clés de chiffrement, partagé entre instances et révisions | La correction se serait limitée à repousser l'expiration, sans traiter la cause |
| **Pipeline CI/CD** | Portes de qualité, déploiement, smoke test post-déploiement | Correction déployée sans garantie de non-régression |

La contribution la plus déterminante n'est pas technique : c'est le **« avant, ça marchait »** des utilisateurs. Cette phrase a exclu d'emblée l'hypothèse d'une régression de code et orienté vers un mécanisme temporel — l'expiration d'une clé. Un signalement limité à « je suis déconnecté » aurait coûté plusieurs heures de recherche supplémentaires.

## 5. Ce que l'épisode a changé dans le dispositif

Trois évolutions ont été tirées de ce cas :

1. **Un canal de signalement explicite** — le lien « Signaler un problème » (v1.3.2) évite de dépendre du fait qu'un utilisateur pense à écrire spontanément ; le message pré-rempli embarque page, version et navigateur, soit trois des précisions qu'il avait fallu demander.
2. **Une supervision capable de voir ce type de dégradation** — la sonde de readiness, les alertes sur les erreurs serveur et la règle Sentry de régression réduisent la dépendance au signalement humain.
3. **Une consignation systématique** — le processus formalisé garantit qu'une anomalie signalée oralement laisse désormais une trace écrite reproductible.

## 6. Limite assumée

Sur un projet à un seul intervenant, la « collaboration avec le support » se joue entre le développeur et ses utilisateurs, non entre deux équipes. Le cas présenté est réel et non simulé : les utilisateurs ont tenu le rôle de détection et de qualification que tiendrait un support de niveau 1, et leurs précisions ont directement orienté le diagnostic. Dans une organisation plus grande, la différence porterait sur la traçabilité du ticket et la passation entre niveaux — deux points que le processus écrit couvre déjà.
