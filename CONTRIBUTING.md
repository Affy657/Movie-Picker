# Contribuer

Merci de passer par ici. Movie Picker est un projet personnel : je le conçois, le développe et l’exploite seul, et le dépôt est public pour que chacun puisse lire le code, le dossier technique et la façon dont le projet avance.

## Ce qui aide le plus

- **Signaler un bug** : le bouton « Signaler un problème » du pied de page de l’application prépare un message vers `contact@movie-picker.fr` avec la page et la version. Ouvrir un ticket sur GitHub marche aussi, avec le gabarit prévu.
- **Proposer une idée** : le bouton « Proposer une idée » de l’application, ou un ticket. Chaque idée est lue, et celles qui sont retenues rejoignent la [roadmap](docs/roadmap.md).
- **Poser une question sur le code ou un choix technique** : un ticket, ou le même e-mail. Le [dossier technique](https://www.movie-picker.fr/tech) répond déjà à beaucoup de questions.
- **Une faille de sécurité** : pas de ticket public, suivez [`SECURITY.md`](SECURITY.md).

## Et le code ?

Les contributions de code ne sont pas fusionnées. Ce n’est pas un jugement sur le code proposé : la [licence](LICENSE) réserve la modification du logiciel, et le projet sert aussi à montrer mon travail, donc chaque ligne doit rester la mienne. Si vous avez écrit un correctif, décrivez plutôt le problème et votre piste dans un ticket : je la reprendrai et je citerai le ticket dans le commit.

Pour la même raison, la CI ne tourne pas sur une pull request venue d’un fork (les jobs de [`ci-cd.yml`](.github/workflows/ci-cd.yml) portent la condition `github.event.pull_request.head.repo.fork != true`) : une telle PR n’affiche aucun résultat, c’est voulu. Forker pour lire ou expérimenter chez vous reste libre, comme cloner.

## Si vous travaillez sur ce dépôt

Tout est dans [`AGENTS.md`](AGENTS.md) : règles du dépôt, conventions et chaîne de vérification. Avant de pousser, seulement les vérifications ciblées sur ce qui a changé ; la CI de `master` rejoue tout le reste sur chaque commit.

```bash
pnpm install --frozen-lockfile
pnpm run test:changed   # tests front touchés depuis origin/master
pnpm run lint           # tsc et ESLint
# et, si l’API a changé : dotnet test --filter <ce qui a changé>, puis pnpm run format:dotnet:check
```

Le hook pre-push joue `pnpm run check:static` tout seul. `pnpm run verify:local` reste disponible pour reproduire un échec de CI sur le poste, mais il prend une demi-heure et n’est pas à lancer avant chaque push.
