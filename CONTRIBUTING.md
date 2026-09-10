# Contribuer

**Movie Picker est un projet solo, et le dépôt n'accepte aucune contribution externe.** Il est public pour être lu, pas pour être développé à plusieurs.

Concrètement :

- **Les pull requests ne sont pas examinées.** Une PR venant d'un fork sera fermée sans revue, quelle qu'en soit la qualité. Ce n'est pas un jugement sur le code proposé : la [licence](LICENSE) réserve la modification du logiciel, donc il n'existe aucune façon pour moi de fusionner un patch externe.
- **La CI ne tourne pas sur une PR de fork.** Les jobs de [`ci-cd.yml`](.github/workflows/ci-cd.yml) portent la condition `github.event.pull_request.head.repo.fork != true`. Une PR externe n'affiche donc aucun résultat de porte : c'est volontaire, pas une panne.
- **GitHub autorise le fork de tout dépôt public et cela ne se désactive pas.** Forker pour lire est libre, comme cloner. Ce que la licence réserve, c'est l'usage qui suit.

## Signaler quelque chose

Les signalements, eux, sont bienvenus.

- **Un bug ou une idée produit** : le bouton « Signaler un problème » du pied de page de l'application, qui prépare un message vers `contact@movie-picker.fr`. Ouvrir un ticket ici marche aussi.
- **Une faille de sécurité** : ne pas ouvrir de ticket, suivre [`SECURITY.md`](SECURITY.md).

## Si vous travaillez sur ce dépôt

Tout est dans [`AGENTS.md`](AGENTS.md) : règles du dépôt, conventions, et la chaîne de vérification à passer avant de pousser. Le raccourci utile :

```bash
pnpm install --frozen-lockfile
pnpm run verify:local
```
