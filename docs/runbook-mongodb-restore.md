# Runbook : restaurer une sauvegarde MongoDB en production

`backup-mongo.yml` dépose chaque jour une archive `mongodump` vérifiée dans le bucket de sauvegarde (variable Actions `BACKUP_BUCKET`, rétention 30 jours, versioning actif). Ce runbook dit comment la remettre dans le cluster Atlas. Le retour arrière de code (`rollback.yml`) ne touche jamais aux données ; ce document est le seul chemin pour les données.

Procédure jouée à blanc le 2026-09-17 sur deux MongoDB jetables : dump, pollution de la cible, restauration avec `--drop`, comptage et index vérifiés. Les commandes ci-dessous sont celles de cet exercice, la seule différence en production est l'URI cible.

## Quand

- une migration de données (`IDataMigration`) a corrompu ou perdu des documents ;
- une erreur d'opérateur (suppression, `updateMany` mal ciblé) ;
- un incident Atlas sans snapshot, le palier gratuit n'en fournit pas.

Pas pour un bug de code : une révision Cloud Run se retire en une minute avec `rollback.yml`, une restauration coûte une fenêtre d'indisponibilité et **perd tout ce qui a été écrit depuis l'archive**.

## Ce qu'il faut savoir avant de commencer

- **L'archive n'est pas transactionnelle.** `mongodump` sans `--oplog` lit les collections l'une après l'autre : une transaction validée pendant le dump peut y être à moitié. Le dump est pris vers 10 h Paris (GitHub retarde le cron de cinq heures), pendant l'activité.
- **`--drop` vide chaque collection avant de la recharger.** Entre le drop et la fin du chargement, l'API lit une base partielle : couper les écritures avant, ne pas restaurer en plein trafic.
- **Les index sont dans l'archive.** `mongodump` emporte leurs définitions, `mongorestore` les recrée, y compris les TTL (compteurs de rate limiting, sessions, jetons de réinitialisation). La collection `migrations` est restaurée avec le reste, donc l'empreinte d'index `MongoIndexPlan.MarkerId` et les migrations de données appliquées restent cohérentes avec les documents.
- **L'archive porte des données personnelles** (adresses e-mail, empreintes de mot de passe) : jamais dans le dépôt, jamais dans un artefact, supprimée du poste dès la fin.
- Sous Git Bash, poser `export MSYS_NO_PATHCONV=1` avant les commandes `docker` : sans quoi `/tmp/...` est réécrit en chemin Windows et `mongodump` ne trouve pas son fichier.

## 1. Choisir et rapatrier l'archive

```bash
gcloud storage ls -l "gs://<BUCKET_SAUVEGARDE>/mongodb/<AAAA>/<MM>/"
gcloud storage cp "gs://<BUCKET_SAUVEGARDE>/mongodb/<AAAA>/<MM>/moviepicker-<HORODATAGE>.archive.gz" ./restore.archive.gz
```

Prendre la dernière archive **antérieure** à l'incident, pas la plus récente. Un objet supprimé du bucket se retrouve avec `gcloud storage ls -a` (versioning) pendant 30 jours.

## 2. Vérifier l'archive sur un MongoDB jetable

Même image que la CI et que le workflow de sauvegarde, épinglée par digest dans `.github/workflows/backup-mongo.yml` (`MONGO_IMAGE`), qui embarque `mongorestore`.

```bash
export MSYS_NO_PATHCONV=1
docker run -d --name mongo-restore-check "<MONGO_IMAGE>"
docker cp ./restore.archive.gz mongo-restore-check:/tmp/restore.archive.gz
docker exec mongo-restore-check mongorestore --uri="mongodb://127.0.0.1:27017" \
  --archive=/tmp/restore.archive.gz --gzip --nsInclude='moviepicker.*'
docker exec mongo-restore-check mongosh --quiet --eval \
  'const d = db.getSiblingDB("moviepicker"); for (const n of d.getCollectionNames()) print(n, d.getCollection(n).countDocuments());'
```

Lire les comptes : c'est l'état vers lequel la production va revenir. Si le document ou la soirée à récupérer n'y est pas, remonter d'une archive. Ne pas détruire ce conteneur tout de suite, il sert de référence en fin de procédure.

## 3. Couper les écritures

1. Mettre en pause les trois jobs Cloud Scheduler, sinon les rappels et les balayages nocturnes écrivent pendant la restauration :

   ```bash
   for job in movie-picker-event-reminders movie-picker-recurring-events movie-picker-finished-events; do
     gcloud scheduler jobs pause "$job" --location <REGION>
   done
   ```

2. Prévenir les utilisateurs si l'heure le permet. Il n'y a pas de mode maintenance : pendant la fenêtre, l'API répond sur une base partielle, et une écriture faite à ce moment-là est perdue ou refusée par un conflit de version.

## 4. Restaurer dans le cluster

L'URI de production se lit dans Secret Manager, jamais recopiée dans un fichier :

```bash
export MSYS_NO_PATHCONV=1
URI="$(gcloud secrets versions access latest --secret=MONGODB_URI --project <PROJET_GCP>)"
docker run --rm -v "$PWD/restore.archive.gz:/tmp/restore.archive.gz:ro" "<MONGO_IMAGE>" \
  mongorestore --uri="$URI" --archive=/tmp/restore.archive.gz --gzip --drop --nsInclude='moviepicker.*'
unset URI
```

`--nsInclude='moviepicker.*'` est le garde-fou : l'archive ne contient que cette base, et la commande refuse d'écrire ailleurs même si une archive d'une autre base lui était donnée par erreur. La dernière ligne de `mongorestore` donne le nombre de documents restaurés et le nombre d'échecs ; un échec autre que 0 arrête la procédure ici, la cause se lit dans les lignes précédentes (le plus souvent une violation d'index unique sur une collection que `--drop` n'a pas pu vider).

## 5. Rendre la main à l'API

Les instances Cloud Run gardent des caches en mémoire (catalogue, sessions pendant 30 s, `ETag` calculés sur `writeSeq`) qui décrivent la base d'avant. Remplacer la révision pour repartir d'instances neuves, sans reconstruire l'image :

```bash
gcloud run services update <SERVICE> --region <REGION> --update-env-vars "RESTORED_AT=<HORODATAGE>"
```

Puis :

1. `curl -s https://<API_PUBLIQUE>/health/ready` doit rendre `"status":"ready"` et `"mongodb"` à `ok` ;
2. dans l'application, ouvrir une soirée connue de l'archive et vérifier ses films et ses votes ;
3. comparer un ou deux comptes de collections avec le conteneur de l'étape 2.

## 6. Reprendre le service

```bash
for job in movie-picker-event-reminders movie-picker-recurring-events movie-picker-finished-events; do
  gcloud scheduler jobs resume "$job" --location <REGION>
done
docker rm -f mongo-restore-check
rm -f ./restore.archive.gz
```

Consigner l'incident : archive utilisée, heure de la coupure, ce qui a été perdu entre l'archive et l'incident. La ligne va dans `CHANGELOG.md` si des utilisateurs ont été touchés, en `docs/technical-debt.md` si la cause est une dette.

## Ce que cette procédure ne couvre pas

- **Restaurer une seule collection ou un seul document.** `--nsInclude='moviepicker.events'` limite la restauration à une collection, mais sans `--drop` les documents existants sont conservés et ceux de l'archive ajoutés (conflit sur `_id` ignoré) ; avec `--drop` toute la collection revient à l'archive. Un document seul se récupère en le lisant dans le conteneur de l'étape 2 et en le réécrivant à la main.
- **Un point dans le temps.** Une archive par jour, pas d'oplog : la granularité est la journée.
