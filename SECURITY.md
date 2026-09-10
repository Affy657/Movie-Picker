# Politique de sécurité

## Signaler une faille

**Ne pas ouvrir de ticket public.** Un ticket décrit la faille à tout le monde en même temps qu'à moi.

Deux canaux privés, au choix :

1. **Signalement privé GitHub** : onglet « Security » du dépôt, « Report a vulnerability ». C'est le canal à préférer : l'échange reste privé jusqu'au correctif.
2. **Courriel** : `contact@movie-picker.fr`, avec `[securite]` en objet.

Ce qui aide, dans l'ordre d'utilité : l'URL ou l'endpoint touché, les étapes pour reproduire, ce que la faille permet d'obtenir, et la date de l'observation. Une capture ou une trace réseau vaut mieux qu'une description.

**Ne pas inclure de données personnelles d'un autre utilisateur** dans le signalement, même à titre de preuve : décrire l'accès obtenu suffit.

## Ce à quoi s'attendre

Movie Picker est développé par une seule personne, sur son temps libre. Accusé de réception sous une semaine, et un délai de correction annoncé une fois la faille confirmée. **Il n'y a pas de programme de récompense.**

Je demande de ne pas divulguer publiquement avant qu'un correctif soit en production, et de ne pas tester d'une façon qui dégrade le service ou touche des données qui ne sont pas les vôtres : pas de déni de service, pas d'attaque en force brute, pas d'accès aux comptes d'autrui. Un compte de test se crée librement sur l'application.

## Périmètre

**Dans le périmètre** : l'application web, son API, et le code de ce dépôt.

**Hors périmètre** : les services tiers que le projet consomme (TMDB, MongoDB Atlas, GCP, AWS, Sentry, PostHog, Resend), qui ont leurs propres canaux ; l'absence d'un en-tête ou d'un durcissement déjà consigné dans [`docs/technical-debt.md`](docs/technical-debt.md), qui est connu et suivi ; et les rapports issus d'un scanner automatique sans démonstration d'impact.

## Versions couvertes

Seule la version en production sur `https://web.movie-picker.fr` est corrigée. Le dépôt n'a pas de branche de maintenance : un correctif part de `master`.
