# Monitoring et observabilité

Comment vérifier les logs de l'API (GCP) et les métriques Cloud Run / CloudFront pour le MVP.

---

## 1. Logs de l'API (Cloud Logging – GCP)

Les logs du service Cloud Run sont envoyés automatiquement dans **Cloud Logging**.

### Où les voir

1. [Google Cloud Console](https://console.cloud.google.com/) → sélectionner le projet.
2. **Operations** → **Logging** → **Logs Explorer** (ou menu ☰ → Observability → Logging).
3. Pour filtrer sur le service Movie Picker :
   - Dans l'éditeur de requête, utiliser par exemple :
   ```text
   resource.type="cloud_run_revision"
   resource.labels.service_name="movie-picker-api"
   ```
   - Ou : **Logs** → **Cloud Run** → sélectionner le service **movie-picker-api**.

### Ce que tu verras

- Requêtes HTTP (méthode, chemin, status).
- Erreurs et stack traces si l'API crash ou renvoie 5xx.
- Logs applicatifs si l'API fait des `console.log` / `console.error`.

### Vérification (section 15 roadmap)

- [ ] Les logs du service `movie-picker-api` apparaissent bien dans Logs Explorer après une requête (ex. ouvrir l'URL Cloud Run dans le navigateur ou appeler `/health`).

---

## 2. Métriques Cloud Run (GCP)

Cloud Run expose des métriques dans **Cloud Monitoring**.

### Où les voir

1. [Cloud Console](https://console.cloud.google.com/) → **Operations** → **Monitoring** (ou menu ☰ → Observability → Monitoring).
2. **Dashboard** ou **Metrics Explorer**.
3. Métriques utiles pour le service Cloud Run :
   - **Run (Cloud Run)** : requêtes, latence, nombre d'instances, CPU / mémoire, erreurs.

### Métriques clés

| Métrique | Description |
|----------|-------------|
| Request count | Nombre de requêtes (succès / erreur). |
| Request latency | Latence des réponses. |
| Container instance count | Nombre d'instances actives. |
| CPU / Memory utilization | Utilisation des ressources. |

### Vérification (section 15 roadmap)

- [ ] Dans Monitoring → Metrics Explorer (ou tableau de bord Cloud Run), les métriques du service **movie-picker-api** sont visibles après quelques requêtes.

---

## 3. Métriques CloudFront (AWS)

CloudFront envoie des métriques dans **CloudWatch** (AWS).

### Où les voir

1. [AWS Console](https://console.aws.amazon.com/) → **CloudWatch**.
2. **Metrics** → **CloudFront** (ou **All metrics** → chercher **CloudFront**).
3. Sélectionner la distribution qui sert le front (ex. ID `E32M2PR26FCH96`).

### Métriques utiles

| Métrique | Description |
|----------|-------------|
| Requests | Nombre de requêtes. |
| BytesDownloaded | Volume téléchargé. |
| 4xxErrorRate / 5xxErrorRate | Taux d'erreurs 4xx / 5xx. |

### Vérification (section 15 roadmap)

- [ ] Dans CloudWatch → Metrics → CloudFront, la distribution du front Movie Picker apparaît et des métriques sont disponibles après des accès au site.

---

## 4. Résumé

| Composant | Où regarder | Données |
|-----------|-------------|---------|
| API (Cloud Run) | GCP → Logging + Monitoring | Logs, requêtes, latence, erreurs, CPU/RAM |
| Front (CloudFront) | AWS → CloudWatch → CloudFront | Requêtes, bande passante, erreurs |

Une fois ces points vérifiés, la section **15. Monitoring et documentation** du roadmap peut être considérée comme couverte pour le monitoring.
