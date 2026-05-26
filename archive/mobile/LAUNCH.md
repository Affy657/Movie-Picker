# Lancer l'app mobile en local

Trois options, du plus simple au plus complet. **Toutes** ont besoin que l'API .NET tourne sur `localhost:4000` :

```powershell
# Dans un terminal séparé, à la racine du repo :
pnpm dev:api-dotnet
# Vérifier : curl http://localhost:4000/health → 200
```

---

## Option A — Web (le plus rapide, recommandé pour une 1re prise en main)

L'app Expo tourne dans le navigateur. SecureStore retombe sur `localStorage`, Share retombe sur `navigator.share`, `Localization` lit `navigator.language`. La plupart des écrans fonctionnent identiquement.

```powershell
cd C:\ynov\movie-picker
pnpm --filter mobile run web
```

Ouvre automatiquement `http://localhost:8081`. Si rien ne s'ouvre, copie l'URL affichée dans la console.

**Limitations connues** :
- L'animation de la roue est plus lisse en natif mais fonctionne aussi en web.
- Le QR code de partage s'affiche mais l'API Share natif est remplacée par l'API navigateur (peut être absente sur certains navigateurs desktop — fallback via copie du lien).

---

## Option B — Émulateur Android

Pré-requis : Android Studio installé + un AVD lancé (Pixel 7 recommandé).

```powershell
# Dans .env, basculer l'URL :
# EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
# (10.0.2.2 = alias de localhost vu depuis l'émulateur Android)

cd C:\ynov\movie-picker
pnpm --filter mobile run android
```

Le bundler boote, l'émulateur installe l'app Expo Go (ou ré-utilise celle déjà installée), et l'app charge.

---

## Option C — Device physique avec Expo Go

Pré-requis :
- App **Expo Go** installée sur le téléphone (Play Store / App Store).
- Téléphone et PC **sur le même Wi-Fi**.
- API .NET liée à `0.0.0.0` (cf. ci-dessous), pas seulement `localhost`.

**1. Faire écouter l'API sur le réseau** : par défaut elle bind `localhost:4000` (voir `apps/api-dotnet/MoviePicker.Api/Properties/launchSettings.json`). Pour le LAN, passe la variable d'env :

```powershell
$env:ASPNETCORE_URLS = "http://0.0.0.0:4000"
pnpm dev:api-dotnet
```

**2. Trouver ton IP LAN** :

```powershell
ipconfig | Select-String "IPv4"
# Ex. IPv4. . . . : 192.168.1.42
```

**3. Configurer le mobile** : dans `apps/mobile/.env`, mets ton IP :

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.42:4000
```

**4. Lancer Expo** :

```powershell
cd C:\ynov\movie-picker
pnpm --filter mobile run dev
```

Un QR code s'affiche. Scanne-le avec Expo Go (Android) ou avec l'app appareil photo (iOS) → l'app charge.

> ⚠️ **Pare-feu Windows** : à la 1re connexion, Windows peut demander une autorisation pour `dotnet.exe` et `node.exe`. Accepter "Réseaux privés".

---

## Variables d'environnement (rappel)

| Variable | Web/iOS sim | Émulateur Android | Device physique |
|---|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:4000` | `http://10.0.2.2:4000` | `http://<IP LAN>:4000` |
| `EXPO_PUBLIC_TMDB_IMAGE_BASE` | `https://image.tmdb.org/t/p` | idem | idem |
| `EXPO_PUBLIC_WEB_BASE_URL` | `http://localhost:5173` | idem | URL publique pour le QR de partage |

Le `.env` est déjà créé pour l'option A. Adapte-le pour B ou C.

---

## Vérification rapide

Une fois l'app lancée :

1. **Écran landing** : 2 boutons "Se connecter" / "Créer un compte".
2. **Créer un compte** : email + mot de passe (≥ 8 char + 1 lettre + 1 chiffre) + pseudo → arrive sur **Mes soirées**.
3. **+** (FAB) → créer une soirée (date `2026-12-15`, time `20:00`).
4. **Tap sur la carte** → écran détail event.
5. **Proposer un film** → recherche TMDB (taper "Inception" → résultats).
6. **🎯 Lancer la roue** (hôte) → animation + gagnant.

Si une étape échoue, regarder la console Metro et le terminal API (.NET) pour les erreurs.

---

## Dépannage rapide

| Symptôme | Cause probable | Fix |
|---|---|---|
| "Network request failed" en boucle | API pas joignable | Vérifier `curl <EXPO_PUBLIC_API_URL>/health` |
| L'écran reste sur "Chargement…" | Cookies non préservés | Vérifier les DevTools du navigateur (cookies non bloqués) |
| QR code Expo Go ne scanne pas | Pas le même Wi-Fi | Confirmer SSID identique entre PC et téléphone |
| Erreur Metro "transformer" | Cache pourri | `pnpm --filter mobile run dev --clear` |
