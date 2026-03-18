# Référence contrat API — migration .NET

Document complémentaire à [contrat-api-openapi.json](contrat-api-openapi.json). Tout doit rester **identique** côté URLs, JSON et codes HTTP pour ne pas casser le front React.

**Référence :** API .NET `apps/api-dotnet/MoviePicker.Api` ; contrat aligné sur l’ancienne API Node (mêmes routes et JSON).

---

## Routes (ordre important en ASP.NET)

| Méthode | Chemin | Query / body | Rôle |
|---------|--------|----------------|------|
| `GET` | `/health` | — | Santé |
| `GET` | `/movies/search` | `q` (requis) | TMDB → tableau `{ id, title, year, posterPath }` |
| `POST` | `/events` | `{ title, date, time }` | Création (date `YYYY-MM-DD`, time `HH:mm`) |
| `GET` | `/events/slug/{idOrSlug}` | `host?` | Détail (slug ou id 24 hex) — **déclarer avant** `GET /events/{idOrSlug}` |
| `GET` | `/events/{idOrSlug}` | `host?` | Idem (id Mongo ou slug) |
| `POST` | `/events/{idOrSlug}/join` | `{ pseudo }` | Rejoindre |
| `GET` | `/events/{idOrSlug}/movies` | — | Liste films + scores |
| `POST` | `/events/{idOrSlug}/movies` | voir ci-dessous | Ajouter film |
| `DELETE` | `/events/{idOrSlug}/movies/{movieId}` | body `{ participantId }` | Retirer (proposant) |
| `POST` | `/events/{idOrSlug}/movies/{movieId}/vote` | `{ participantId, value }` | `value` = **1** ou **-1** |
| `POST` | `/events/{idOrSlug}/wheel` | **`host` requis** (query) | Tirage |
| `POST` | `/events/{idOrSlug}/close` | **`host` requis** | Clôture |

**Hôte :** `?host=<hostToken>` **ou** cookie `moviepicker_host` (même valeur). Sinon `isHost: false` et wheel/close → 403.

---

## Schémas JSON

### Erreur (générique)

Toutes les erreurs métier / validation :

```json
{ "error": "message en français" }
```

### `POST /events` → 201

Champs Mongo visibles + :

- `hostToken` (string) — **indispensable** pour le lien hôte
- `shareUrl` (string) — ex. `"/s/xxxxx"` (chemin relatif)
- `slug`, `title`, `date`, `time`, `_id`, `createdAt`, `updatedAt`

`hostToken` ne doit **jamais** apparaître sur `GET` event.

### `GET /events/...` (détail)

Même base event **sans** `hostToken`, plus :

- `isHost` (bool)
- `terminé` (bool) — `true` si `closedAt` ou date/heure soirée passée ou `config.endDate` passée
- `winnerMovie` — document film Mongo complet ou `null` (populate depuis `winnerMovieId`)

Champs event possibles : `config` (objet libre), `closedAt`, `winnerMovieId`, etc.

### `POST .../join`

- **201** : corps = participant `{ _id, eventId, pseudo, createdAt, updatedAt }`
- **200** : `{ participant, message: "Déjà inscrit avec ce pseudo" }`
- **400** : validation Zod ou `"Soirée terminée. Lecture seule."`

### `GET .../movies` — élément de liste

Spread du document `Movie` + :

- `proposerPseudo` (string)
- `score`, `up`, `down` (entiers)

`participantId` peut être une string ou un sous-document peuplé selon sérialisation Mongo.

### `POST .../movies` — body

```json
{
  "tmdbId": 550,
  "title": "Fight Club",
  "year": "1999",
  "posterPath": "https://..." | null,
  "participantId": "<24 hex Mongo>"
}
```

`posterPath` : optionnel ; si présent doit être URL valide ou null.

**201** : film créé + `proposerPseudo`, `score: 0`, `up: 0`, `down: 0`.

### `POST .../vote` — body

```json
{ "participantId": "<24 hex>", "value": 1 }
```

`value` : **uniquement** `1` (up) ou `-1` (down). Un vote par couple (film, participant) — upsert.

**200** : document vote `{ _id, eventId, movieId, participantId, value, createdAt, updatedAt }`.

### `POST .../wheel` — 200

```json
{
  "winner": { /* MovieStored : _id, eventId, participantId, tmdbId, title, year, posterPath, … */ },
  "message": "Un seul film proposé : gagnant direct." | "Roue lancée."
}
```

### `POST .../close` — 200

Spread de l’event (avec `closedAt` renseigné) + `message` :

- `"Soirée clôturée."` ou `"Soirée déjà clôturée"` (si déjà fermé, pas d’erreur)

### `GET /movies/search` — 200

Tableau max 20 entrées TMDB :

```json
{ "id": 123, "title": "…", "year": "2024", "posterPath": "https://image.tmdb.org/..." | null }
```

---

## Codes HTTP (récap)

| Code | Cas typiques |
|------|----------------|
| **200** | OK (join déjà inscrit, vote, wheel, close) |
| **201** | Création event, participant, film |
| **204** | DELETE film OK (corps vide) |
| **400** | Validation, soirée terminée (écriture), aucun film (wheel), roue déjà lancée (delete), etc. |
| **403** | Wheel/close sans hôte ; DELETE film si pas le proposant — `"Réservé à l'hôte de la soirée"` / `"Seul le participant qui a proposé peut retirer ce film"` |
| **404** | Event ou film introuvable — `"Soirée introuvable"` / `"Film introuvable"` |
| **409** | Film doublon TMDB ou titre — messages dédiés |
| **500** | Erreur non gérée — `{ "error": "…" }` |
| **503** | `GET /movies/search` sans `TMDB_API_KEY` — `"Recherche films temporairement indisponible"` |

---

## Collections Mongo (inchangées)

| Collection | Champs principaux |
|------------|-------------------|
| **events** | title, date, time, hostToken, slug, config?, closedAt?, winnerMovieId? |
| **participants** | eventId, pseudo (unique par event) |
| **movies** | eventId, participantId, tmdbId, title, year, posterPath |
| **votes** | eventId, movieId, participantId, value (1 \| -1), unique (movieId, participantId) |

---

## Swagger UI (Node actuel)

Exposé sur `/api-docs` — non obligatoire à reproduire en .NET pour le MVP migration, mais utile en dev.
