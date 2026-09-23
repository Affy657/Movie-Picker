# Changelog

Toutes les évolutions notables de Movie Picker sont consignées dans ce fichier.

Le format s'appuie sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le
projet suit le [versionnage sémantique](https://semver.org/lang/fr/) (SemVer). Chaque
version publiée est associée à un tag Git et à une release GitHub.

## [Non publié]

### Added

- **Le site s'appelle désormais `www.movie-picker.fr`** : l'adresse historique `web.movie-picker.fr` et `movie-picker.fr` y renvoient d'elles-mêmes, en gardant la page demandée, donc un lien de soirée ou un courriel déjà reçu continue d'ouvrir la bonne page ; `www` et l'adresse nue répondent enfin en HTTPS. L'hébergement du site est passé sur Firebase Hosting, à côté de l'API, et une adresse tapée avec une barre finale est ramenée sur sa page.
- **Un environnement de recette, `staging.movie-picker.fr`** : une seconde instance de l'API et du site, avec sa propre base et ses propres comptes de connexion, décrite en code à côté de la production ; chaque livraison y passe d'abord, et la production ne part que si la recette sert exactement le même commit, avec la même image de conteneur, sans reconstruction. La recette n'est pas indexée par les moteurs de recherche.
- **L'infrastructure commence à s'écrire en code** : une arborescence Terraform dédiée, aux versions épinglées, avec un état distant versionné et verrouillé, et une porte `fmt` + `validate` jouée dans la vérification locale comme dans la CI.
- **La production GCP est décrite et importée** : le registre d'images et sa rétention, le service qui sert l'API avec son domaine, et les quatorze secrets avec le droit de les lire, en trois modules réutilisables, sans qu'aucune ressource n'ait été recréée. Le workflow mensuel qui reposait la rétention du registre disparaît, la description la porte.

### Security

- **Une soirée ne s'ouvre plus que par son lien**, plus par son identifiant interne.
- **Les adresses de soirée sont vérifiées avant tout appel au serveur** : le code de la soirée est encodé dans chaque requête, une adresse malformée affiche « soirée introuvable », et l'ajout à l'agenda ne laisse plus passer de saut de ligne.
- **Changer ou réinitialiser son mot de passe coupe aussi les notifications push** des appareils abonnés, se déconnecter désabonne le navigateur, et un appareil encore connecté se réabonne de lui-même ; un navigateur ne reçoit plus que les notifications du dernier compte qui s'y est connecté, et seuls les services push de Google, Mozilla, Microsoft et Apple sont acceptés, y compris pour les abonnements déjà enregistrés.
- **Lier un compte Google ou GitHub, ou définir un premier mot de passe sur un tel compte, demande une connexion de moins de dix minutes**, et un fournisseur déjà lié doit être délié avant d'en lier un autre du même fournisseur. Les messages de liaison s'affichent désormais sur la page Intégrations.
- **Les listes d'abonnés et d'abonnements n'affichent plus les profils privés**, sauf au titulaire du profil, et une ligne le signale quand le compteur en tient compte.
- **Une suggestion d'idée ne publie plus ni votre nom ni votre identifiant de compte**, seulement une référence aléatoire, ni l'adresse de la soirée ou du profil d'où elle part ; ses captures (JPEG, PNG, WebP, GIF) perdent leurs métadonnées, position GPS comprise, avant publication, et le formulaire comme la politique de confidentialité disent que le ticket est public.
- **Le jeton d'un lien de réinitialisation ne part plus vers la mesure d'audience ni le suivi d'erreurs** : il quitte la barre d'adresse dès l'ouverture de la page, et les adresses envoyées à PostHog et Sentry masquent les jetons comme le serveur le faisait déjà.
- **L'API refuse de démarrer hors développement sans l'envoi réel des e-mails**, plutôt que d'écrire les liens de réinitialisation dans ses journaux.
- **Les passes planifiées s'authentifient par un jeton signé, plus par un secret partagé** : Cloud Scheduler signe chaque appel avec une identité dédiée et l'API vérifie hors ligne l'émetteur, l'audience et cette identité ; le secret qui voyageait dans un en-tête n'est plus monté, et une passe planifiée qui échoue déclenche désormais sa propre alerte, là où un échec toutes les trente minutes passait sous les seuils des erreurs serveur.
- **Chaque workflow n'assume plus que l'identité de son environnement** : la sauvegarde a la sienne, seule à lire l'adresse de la base ; l'application de l'infrastructure a la sienne, seule à administrer les droits, dans un environnement qu'aucun autre workflow n'utilise ; le déploiement ne lit plus aucun secret ; et la fédération n'accepte chaque environnement que depuis `master`. Le site se construit dans un job sans identité et n'est publié que par un job qui ne construit rien.
- **Les identités de l'infrastructure ne lisent plus aucun objet des buckets** : le rôle pris pour lire le projet Firebase donnait la lecture des sauvegardes à tout le projet, et les liaisons de convenance des buckets la donnaient à toute identité en lecture ; le compte de calcul par défaut, qui lisait encore neuf secrets de production par des liaisons d'avant l'identité d'exécution, et le compte Firebase Admin, qui pouvait frapper un jeton pour l'identité Terraform, sont désactivés. Une revue hebdomadaire relit chaque liaison que Terraform ne voit pas.
- **Le projet ne peut plus être supprimé d'un geste**, chaque lecture d'un secret est journalisée, les dépendances .NET sont verrouillées par empreinte comme celles du site, le site n'autorise plus aucun script en ligne qui ne soit reconnu par son empreinte, et `HTTPS` est imposé aux sous-domaines aussi depuis les domaines personnalisés, ce que seul l'adresse technique du site faisait.
- **Les sauvegardes gardent une copie mensuelle pendant treize mois**, les versions de secret remplacées sont détruites, et les retours arrière se répètent en recette.
- **La fédération GitHub reconnaît le dépôt par son identifiant numérique**, et plus seulement par son nom, qu'un renommage libérerait pour quelqu'un d'autre.
- **La supervision est décrite en code** : les trois sondes de disponibilité, les six politiques d'alerte avec la conduite à tenir que reçoit l'e-mail, le canal et le tableau de bord sont versionnés et appliqués par le même chemin que le reste de l'infrastructure ; la sonde du front vise le domaine canonique et le tableau de bord la lit à nouveau.
- **L'infrastructure ne change plus que par une revue** : un changement de `infra/terraform/` est planifié contre la production et publié en commentaire de sa pull request, puis appliqué sur `master` derrière l'environnement de production, par deux identités sans clé dont l'une ne sait que lire.
- **La chaîne de déploiement s'identifie avec un compte dédié au moindre privilège** : chaque droit est celui d'une commande du pipeline et vise la ressource qu'elle touche (une seule identité sous laquelle déployer, un seul dépôt d'images, deux secrets lisibles sur quatorze, un seul bucket), la fédération avec GitHub et l'identité d'exécution de l'API sont décrites en Terraform, aucune clé n'existe, et le compte par défaut du projet, qui portait tout, n'a plus aucun droit.
- **La clé TMDB ne circule plus dans l'adresse des requêtes que le serveur envoie à TMDB** : l'API accepte le jeton d'accès en lecture de TMDB, envoyé dans un en-tête, et si l'ancienne clé reste en service elle est masquée dans le suivi d'erreurs comme le jeton d'hôte.
- **La sonde de disponibilité de l'API ne relit plus la base à chaque appel** mais au plus toutes les cinq secondes, et n'accepte plus que trente appels par minute et par adresse ; toute route sans plafond dédié reçoit un plafond global de neuf cents requêtes par minute et par adresse.
- **Le serveur tourne sur une image minimale** sans interpréteur de commandes ni gestionnaire de paquets : dix paquets système au lieu de quatre-vingt-dix-sept, aucune vulnérabilité haute connue au lieu de treize, et il refuse de démarrer si les données de fuseau horaire manquent au lieu de planifier les soirées en UTC.
- **Le jeton qui donne les commandes de l'hôte ne transite plus dans l'adresse des requêtes** mais dans un en-tête, et il est masqué dans les journaux du serveur et le suivi d'erreurs.
- **Un compte créé avec un mot de passe ne peut plus être rattaché à Google ou GitHub par simple coïncidence d'adresse e-mail** : il faut se connecter puis lier le fournisseur depuis les paramètres.
- **Durcissements de l'API** : HTTPS imposé pour deux ans aux navigateurs, un e-mail inconnu au login répond dans le même temps qu'un e-mail connu, les affiches proposées ne peuvent venir que de TMDB, les abonnements aux notifications ne visent que des services push publics et le mot de passe est plafonné à 128 caractères.
- **Réinitialiser son mot de passe détache les comptes Google et GitHub reliés** : quelqu'un qui avait ouvert un compte avec votre adresse avant vous, puis y avait relié son propre compte Google ou GitHub, gardait une porte d'entrée après que vous avez récupéré le compte par « mot de passe oublié ». La réinitialisation ferme désormais aussi cette porte, et la page de confirmation le dit.
- **Sur un appareil partagé, l'application ne garde plus en réserve les réponses de votre compte** (profil, soirées, notifications, export de vos données) après votre déconnexion : seules les sélections publiques de l'accueil et les affiches restent en cache, et l'API refuse par défaut toute mise en cache de ses réponses.
- **Le retour arrière du site ne republie plus qu'une archive produite par un déploiement depuis `master`.**

### Changed

- **Les écrans parlent le même langage visuel** : un même lien de retour en haut des pages secondaires (compte, formulaires, listes, profil, soirée), des titres de page à la même taille, les mêmes pastilles de compteur sur les filtres, la cloche et les onglets, le même encart « Réessayer » quand un bloc ne charge pas, les mêmes états vides, et la création de soirée prend la carte des pages de connexion. Un bouton de filtre ou de menu ouvert se teinte de la couleur d'accent au lieu de changer de forme.
- **Lighthouse ne se joue qu'à la mise en recette** : la même mesure, sur le même build local, ne se rejoue plus en production, qui exige déjà que la recette serve ce commit ; neuf minutes de moins par livraison et une occasion de moins pour le runner de planter.
- **La description du rôle Terraform sur les secrets dit ce qu'elle garantit** : ne jamais lire une version soi-même, sans prétendre fermer le chemin par lequel une identité fuitée se donnerait le droit ; la politique de refus IAM qui le fermerait demande une organisation Google Cloud, ce que le projet n'a pas, et la limite est écrite.
- **Le dossier technique suit la chaîne telle qu'elle tourne** : l'application Terraform derrière un relecteur et le plan du lundi qui signale une dérive, la sauvegarde surveillée, l'analyse hebdomadaire de l'image de base et de la description Terraform, le journal d'audit gardé 400 jours, la version servie relue après chaque déploiement et chaque retour arrière, la moitié refusée quand l'autre a bougé, le planificateur qui retente ses appels, l'ancienne adresse et son service worker de départ, huit politiques d'alerte, et les trois accès plus larges que leur usage parmi les chantiers ouverts.
- **Le dossier technique dit ce que l'infrastructure est devenue** : la recette, l'infrastructure décrite en code et les identités sans clé rejoignent la section infrastructure, les chaînes d'infrastructure et de sauvegarde rejoignent les chaînes annexes, les trois jobs du planificateur sont comptés, et les chantiers ouverts sont ceux qui le sont encore : cache partagé, conteneur décrit à deux endroits, planificateur authentifié par secret, dernier jeton de dépôt.
- **La page « Créer une soirée » se lit en trois temps** : le titre, la date et l'heure, puis les options avancées regroupées par phase (ambiance, participants et films, vote et tirage), puis les templates. Le nombre de participants et de films par personne ne sont plus deux compteurs calés sur 300 et 15 mais deux interrupteurs « Limiter », éteints par défaut : une soirée créée sans y toucher n'a plus de plafond affiché, et l'allumer propose 10 personnes ou 3 films, à ajuster. Appliquer un template n'ouvre plus les options : une ligne résume ce qu'il règle, presser sa pastille une seconde fois revient aux réglages par défaut, un bouton « Réinitialiser les options » fait de même, et « Enregistrer en template » se grise tant que la configuration est identique au template appliqué au lieu de proposer un doublon. La barre d'enregistrement rejoint les pastilles dans un même bloc, comme dans les paramètres d'une soirée.
- **Les paramètres d'une soirée suivent la même grille** : trois sections (participants et films, vote et tirage, après la soirée) à la place du bloc « Le déroulé », et les mêmes interrupteurs « Limiter le nombre de participants » et « Limiter les films proposés par personne » que la création, avec le compteur dessous ; éteindre l'un retire le plafond de la soirée au lieu de le poser à 300 ou 15, et une soirée dont le plafond vaut déjà le maximum se lit comme sans limite.
- **Sur téléphone, le choix d'emoji du thème s'ouvre dans une feuille en bas de l'écran** au lieu d'un popover, et « Plus de thèmes » est une pastille qui dit combien de thèmes elle cache.
- **Le mode sombre s'applique aussi aux contrôles natifs** : les icônes calendrier et horloge des champs de date et d'heure ne sont plus noires sur bleu nuit, et les sélecteurs natifs s'ouvrent en sombre.
- **Les textes d'exemple des champs sont lisibles sur Safari** : ils prennent la couleur de texte atténué du thème au lieu du gris clair par défaut du navigateur (2,35:1 sur fond blanc).

- **Le site et l'API sont hébergés chez un seul fournisseur** : le front a quitté AWS pour Firebase Hosting, à côté de l'API sur Google Cloud ; la chaîne de déploiement, le retour arrière et la sonde de disponibilité ne connaissent plus qu'un cloud, et le compte AWS est vide.
- **Les mêmes onglets, menus et pastilles partout** : les onglets de « Mes soirées », de la liste d'abonnés et du choix d'avatar sont le composant d'onglets commun (celui des abonnés n'annonçait pas ses onglets aux lecteurs d'écran), le menu du compte et celui de l'agenda sont le menu commun, les filtres de recherche de films, les thèmes suggérés, l'invitation d'un participant et une dizaine de badges (« Vous », « Complet », « Série », gagnant, date relative, liste masquée) sont la pastille commune, et les boutons « Charger plus », « Tout marquer lu », « Suivre », les votes du détail d'un film et les filtres de liste sont le bouton commun.
- **Le mode de tirage, les candidats Letterboxd et la grille d'avatars partagent une même carte à cocher**, les avatars empilés une même pile, les réglages à interrupteur une même ligne.
- **Les icônes suivent une échelle de huit tailles**, les avatars et les petites dimensions la grille de 4 px, ce qui décale certains dessins d'un ou deux pixels.
- **Tout ce qui se touche fait au moins 44 px** : petits boutons, pastilles de filtre, croix de retrait, interrupteurs, liens dans une phrase, flèches des rangées de films et boutons de carte gardent leur dessin mais répondent au doigt sur une zone plus large.
- **Les croix de fermeture des feuilles et des panneaux, les boutons de renommage et de suppression des modèles de soirée, le bouton des paramètres et celui de l'agenda d'une soirée sont le même bouton à icône que partout ailleurs**, et les badges « Hôte » et « Soutien » la même pastille que les filtres.
- **Le focus clavier reste visible partout** : dix-sept boutons et entrées de menu (menus contextuels, colonnes de la vue liste, notes de film, fournisseurs de streaming, sous-menu « Proposer ») n'avaient pour tout repère de focus qu'un fond à peine teinté ; ils prennent le contour standard.
- **Les boutons d'envoi montrent un spinner pendant l'attente** (connexion, inscription, création de soirée, proposition d'idée, suppression de compte) au lieu de seulement se griser, et les boutons de tri de la vue liste, les badges d'invitation et la pastille « Nouveautés » sont désormais la même pastille que partout ailleurs.
- **Les menus et sélecteurs se pilotent au clavier** : le menu « ⋮ » d'un film et le survol « Proposer dans une soirée » se parcourent aux flèches, Home et End, et Échap les ferme en rendant le focus à leur bouton ; le menu du compte comme celui de l'agenda gagnent les mêmes flèches ; le choix d'emoji du thème et les pastilles de couleur d'accent sont des groupes de boutons radio de 44 px, où les flèches changent la sélection sans fermer la grille.
- **Chaque champ de formulaire annonce son aide et son erreur au lecteur d'écran** (création de soirée, paramètres d'une soirée, compte, mots de passe, proposition d'idée), et l'erreur porte une icône partout, plus seulement dans les paramètres d'une soirée.
- **Le champ de recherche prend le même habillage que les autres champs**, un champ ou un menu désactivé se grise, et les boutons ne se soulèvent plus au survol quand le système demande moins d'animations.
- **Le mode sombre distingue ce qui flotte** : menus, feuilles, modales, infobulles et cartes surélevées se posent sur une surface un ton plus claire que la page, au lieu de compter sur une ombre invisible sur fond sombre ; les séparateurs discrets y sont aussi un peu plus lisibles.
- **La pastille « Nouveautés » suit la couleur d'accent choisie** au lieu de rester verte, et la piste d'un interrupteur éteint est plus foncée pour rester visible.
- **Deux personnes qui modifient la même soirée en même temps ne s'écrasent plus** : deux lancements de roue simultanés donnaient deux gagnants différents, chacun affiché à son auteur et un seul retenu. Le second reçoit maintenant « modifiée entre-temps, rechargez ». Les plafonds de participants, de propositions et de votes tiennent aussi sous des envois simultanés, et retirer un participant ou un film est tout ou rien.
- **L'API démarre et répond plus vite** : les index de la base ne sont plus recréés à chaque démarrage, la session n'est plus relue en base à chaque requête pendant trente secondes, et les rappels de soirée ne lisent plus toutes les soirées ouvertes mais seulement celles dont l'heure approche.
- **La page d'accueil n'attend plus TMDB à chaque redémarrage du serveur** : les sélections de films gardent une copie partagée entre les instances, donc un serveur qui vient de démarrer répond en quelques millisecondes au lieu de 6 à 10 secondes. Deux visiteurs qui arrivent en même temps ne déclenchent plus deux fois le même travail, et les réponses de l'API voyagent compressées.
- **L'application s'affiche plus tôt** : l'outil de suivi des erreurs se charge à la première interaction ou dix secondes après l'affichage, au lieu de retarder le premier rendu, et chaque page demande sept fichiers de moins. Les rangées de l'accueil sont demandées dès l'ouverture et servies depuis le cache du navigateur quand on revient.
- **Un lien de soirée s'ouvre plus vite** : la liste des films part sans attendre les détails de la soirée, et les fenêtres de partage, de paramètres, de proposition et de tirage ne sont chargées qu'à leur première ouverture, soit un tiers de JavaScript en moins pour un invité. L'animation de la roue est plus régulière sur mobile.
- **Une soirée où personne ne bouge ne coûte presque rien** : pendant une soirée, chaque téléphone redemande la page toutes les 3,5 secondes ; le serveur reconnaît maintenant qu'il n'y a rien de neuf et répond « rien n'a changé » sans recalculer la liste des films ni la retransmettre, ce qui divise par sept le travail de la base et le trafic mobile sur une soirée calme. Dès qu'un vote, une proposition, un retrait ou une note arrive, tout le monde reçoit la nouvelle liste comme avant.
- **Les titres d'onglet (« Mes soirées | Movie Picker »), les aperçus de partage, les courriels de réinitialisation et les métadonnées SEO abandonnent le tiret cadratin et le point médian.**

### Removed

- Le bouton « Détails » d'un film, qui n'était plus branché nulle part.

### Fixed

- **Les accents vert, orange et cyan se lisent en thème clair** : le texte blanc de leurs boutons et les liens teintés de ces couleurs passaient sous le contraste minimal recommandé, comme les messages de succès et d'avertissement ; ils sont foncés d'un ton. En sombre, le texte d'une option ou d'un bouton d'accent survolés et le contour des champs posés sur une carte gagnent aussi en contraste. Chaque couleur d'accent est désormais vérifiée sur les fonds où elle sert, en clair comme en sombre, avant toute livraison.
- **Les téléphones qui avaient gardé l'ancienne adresse retrouvent le site** : un navigateur qui avait visité `web.movie-picker.fr` avant le changement d'adresse y gardait un service worker que la redirection ne pouvait pas mettre à jour, et qui rouvrait l'ancienne application depuis son cache, sans connexion possible. L'ancienne adresse sert désormais un worker qui se retire de lui-même et envoie chaque fenêtre ouverte sur `www`, avec la page demandée ; et quand on arrive de l'ancienne adresse, ou de l'application installée depuis elle, le site le dit une fois et propose de réinstaller l'application, une application installée ne pouvant pas changer d'adresse toute seule.
- **Une panne de la base de recette ne bloque plus une mise en production** : la porte lit la version que la recette sert même quand sa base ne répond pas, au lieu de refuser sur le code d'erreur.
- **La production reprend exactement ce que la recette sert** : le digest de la révision en service, relu avec le commit dont elle a été construite, et non le dernier tag poussé, qu'une mise en recette échouée à la validation aurait pu laisser en avance.
- **Créer une soirée sans titre, sans date ou sans heure le dit sous le champ, en français**, au lieu de la bulle du navigateur qui pointait sur un champ caché derrière l'en-tête ; le champ fautif reçoit le focus et n'est plus masqué par la barre du haut. Une date déjà passée est signalée sous le champ sans bloquer. L'erreur de création s'affiche juste au-dessus du bouton, pas en haut du formulaire, et si la soirée est créée mais que ses options n'ont pas pu être enregistrées, la page de la soirée le dit au lieu de se taire.
- **Le lien de retour « Mes soirées », le sommaire « Options avancées » et « Plus de thèmes » répondent au doigt sur 44 px**, comme le reste de l'interface.

- **Sur un téléphone, « Mes soirées » ne se coupe plus en « Mes soir… » dans la barre du bas** : la barre dit « Soirées » et « Connexion », un mot chacun, et les cinq libellés tiennent sur une ligne même sur un écran de 320 px ou avec une taille de texte système agrandie.
- **Les rangées de films de l'accueil ne bougent plus de quelques pixels vers le haut quand on les fait défiler** : la ligne année, note, durée de chaque carte dépassait sa hauteur et donnait à la rangée un défilement vertical de 3 px.
- **L'historique des soirées se lit sur un téléphone** : le titre et le film gagnant prennent toute la largeur au lieu d'être coupés après cinq lettres, la date, les participants, les films et la couronne d'hôte passent en dessous, le récapitulatif tient sur trois colonnes, et la barre de recherche défile avec la page comme sur Ma liste.
- **Un film ajouté à Ma liste sans durée ni note les reçoit de TMDB au moment de l'ajout**, et ceux déjà ajoutés sans elles sont complétés au démarrage suivant : « Dans votre liste » sur l'accueil et la liste publique du profil lisent désormais la même ligne année, note, durée que Ma liste.
- **Les derniers films vus du profil lisent la note sur l'échelle du compte** (sur 5 ou sur 10), comme toutes les autres cartes.
- **Les notifications push n'ouvrent plus une connexion neuve à chaque envoi** : le serveur créait un client HTTP par notification et ne le libérait jamais, il passe désormais par un pool de connexions partagé.
- **Revenir à une version précédente de l'API ne perd plus de données** : une ancienne version qui réécrivait une soirée ou un compte effaçait les réglages qu'elle ne connaissait pas encore (gagnants multiples, récurrence, modèles de soirée). Elle ne touche plus qu'aux champs qu'elle connaît.
- **« Mes soirées » n'oublie plus les soirées créées au-delà de la deux-centième.**
- **Avec un accent vert, orange ou cyan, les liens et les textes en couleur restaient sous le seuil de lisibilité** en mode clair (3,3 à 3,7:1 au lieu des 4,5:1 requis). Le texte prend maintenant une teinte plus foncée que les boutons, pour chacun des huit accents.
- **Le bouton d'aide des champs avait perdu son arrondi et deux étiquettes de la page `/tech` leur petite taille**, deux jetons qui n'existaient pas ; une porte de qualité refuse désormais tout jeton fantôme.
- **Le retrait d'un gagnant journalisait l'identifiant reçu dans la requête** plutôt que celui du film réellement retiré de la soirée, la dernière alerte CodeQL ouverte du dépôt.
- **Les interrupteurs des paramètres de la soirée étaient inégalement espacés** : « Répéter cette soirée » collait à « Limiter les votes par participant ». Les champs du panneau suivent maintenant un pas unique.
- **Se déconnecter oublie vraiment la soirée en cours** : la page gardait les commandes de l'hôte et les votes du compte fermé, jusqu'à afficher « Retirer mon vote » à un visiteur anonyme sur un appareil partagé. La déconnexion vide le cache et les identités de participant retenues par l'onglet.
- **Une adresse de réglages inconnue** (`/settings/account`, un vieux favori) affichait une page vide en empilant `profil/profil/profil…` dans l'URL. Elle renvoie vers le profil.
- **Un film de la watchlist Letterboxd ne peut plus être pris pour une série** : « Come and See » (1985) arrivait comme série TMDB sans note. Le rapprochement automatique ne retient plus qu'un film ; à titre égal, l'année Letterboxd départage, ce qui réduit aussi la liste des titres à confirmer.
- **Les votes d'un participant restent les siens** : la liste des films d'une soirée renvoyait « mon vote » pour n'importe quel identifiant de participant, y compris à un visiteur anonyme. Le champ n'est rempli que pour le compte connecté.
- **Demander un nouveau mot de passe répond dans le même temps** qu'une adresse existe ou non, ce qui fermait une façon de deviner les comptes.
- **Détails de coquilles** : l'aide sous la date d'une soirée commençait par « aujourd'hui. », une soirée dans neuf ans se disait « dans 105 mois », un groupe de notifications proposait « Voir les 1 autres », la date de sortie d'un film s'affichait en `2021-09-15`, et le bloc « Rejoindre la soirée » tutoyait dans une application qui vouvoie. Les boutons « Ajouter » de la recherche de films portent maintenant le titre pour les lecteurs d'écran.

## [1.6.0] - 2026-09-12

### Added

- **Recherche d'utilisateurs** : un troisième onglet « Rechercher » dans la modale Abonnements / Abonnés trouve un compte par pseudo ou par handle, insensible à la casse et aux accents, la portion trouvée surlignée. Les profils privés en sont exclus, et les correspondances en début de pseudo passent devant les autres.
- **Soirée récurrente** : l'hôte fait se répéter une soirée au rythme hebdomadaire, bimensuel ou mensuel. L'occurrence suivante naît à la clôture de la précédente, avec la même configuration et une liste de films vide, une seule ouverte à la fois. Le groupe n'est pas reconduit : à l'hôte de repartager le lien. Une série laissée en plan est rattrapée à l'ouverture de « Mes soirées », et une série dormante au-delà de soixante intervalles s'arrête d'elle-même.
- **Le dépôt est préparé pour être lu de l'extérieur** : `CONTRIBUTING.md` dit que le projet est solo et qu'aucune PR externe ne sera fusionnée, `SECURITY.md` détourne les failles vers un canal privé plutôt qu'un ticket public, et `infra/README.md` documente les fichiers de configuration appliqués à la main. Les identifiants d'infrastructure qui traînaient dans la documentation, compte, distribution, bucket, certificat, projet, organisation, sont remplacés par des gabarits, avec la commande qui relève chaque valeur.
- **Sauvegarde quotidienne de la base de production** : le palier gratuit Atlas ne fournit aucun instantané, et rien ne sauvegardait la base. Un dump part chaque nuit vers un bucket Cloud Storage versionné, puis est relu depuis ce bucket et restauré dans une MongoDB jetable avant d'être publié, une archive qui échoue la restauration ne devient jamais la sauvegarde du jour.
- **Archive du build front à chaque déploiement** (30 jours) : l'hébergement ne conserve aucune version, un retour arrière ne demande plus de rejouer toute la chaîne de portes.
- Porte de qualité sur les workflows eux-mêmes (`actionlint`, `shellcheck`, `zizmor`), bloquante pour le déploiement : jusqu'ici la chaîne qui garde le code n'était gardée par rien.
- **Les pages publiques sont servies en HTML complet** : « Comment ça marche », « Soutenir » et le dossier technique sont rendus au moment du build, titre, description et données structurées compris. Un moteur d'indexation ou un aperçu de lien recevait jusqu'ici un document vide qu'il fallait exécuter pour lire ; il reçoit maintenant la page.
- **Modèles de soirée** : jusqu'à cinq configurations nommées par compte, enregistrées depuis la création d'une soirée comme depuis les paramètres d'une soirée existante, et réappliquées en un clic. Le modèle porte la configuration avancée seule, le titre et la date restent propres à chaque soirée, et le menu d'une soirée passée propose « Refaire cette soirée ».
- **Plusieurs films gagnants par soirée** : l'hôte règle le nombre de films gagnants jusqu'à dix, à la création comme en cours de soirée. Chaque tirage, roue ou choix manuel, ajoute un film au palmarès et l'exclut des suivants ; les gagnants comptent partout, historique, statistiques, partage et « Vos amis ont vu ». Le bouton de clôture disparaît, il ne servait plus à rien.
- **Limite de votes par participant** : l'hôte active un nombre de votes par personne dans les paramètres de la soirée, repris par les modèles et les soirées récurrentes. Le quota s'affiche au-dessus de la liste, les pouces des autres films se grisent une fois le quota consommé, et le serveur refuse le vote de trop.
- **Watchlist d'un autre compte** : la liste d'un compte se consulte depuis son profil public, sur une page calquée sur celle de ses films vus. Un réglage dédié, actif par défaut, permet de masquer la sienne ; le serveur répond alors 404 aux visiteurs et cache le compteur.
- **Les films d'une soirée se voient sans avoir rejoint** : un lien de soirée montre affiches, titres, scores et film gagnant à tout visiteur ; un clic sur un vote sans avoir rejoint ramène sur la carte de participation. Proposer, voter et marquer un film vu restent réservés aux participants.
- **Letterboxd depuis la carte d'un film en soirée** : le menu des trois points ouvre la page Letterboxd du film en un clic, sans passer par sa fiche.

### Fixed

- **Le site entier était ralenti par un mot** : une ligne du point d'entrée attendait la fin du démarrage avant de laisser le reste s'exécuter, ce qui retardait l'affichage sur onze pages sur treize. Le plus grand élément de chaque page apparaît de nouveau 3 à 5 points de performance plus tôt. Les deux pages épargnées étaient l'accueil et la connexion, les seules dont le contenu principal n'attendait pas l'application.
- **Un échec au démarrage laissait l'écran de lancement affiché indéfiniment.** Il est désormais retiré et l'erreur remontée, donc l'utilisateur voit l'application ou une erreur, plus un écran figé.
- **Le gagnant de la roue était annoncé avant qu'elle ne s'arrête** : la notification partait dès le lancement du tirage, pendant les sept secondes d'animation. Elle part maintenant quand le résultat est révélé, et une seule fois par tirage.
- **Les modales « Proposer une idée » et « Signaler un problème » débordaient de l'écran sur mobile**, ce qui rendait leur bouton d'envoi inatteignable avec des images jointes ou une police agrandie. Elles adoptent le gabarit des autres fenêtres du projet : en-tête et pied fixes, corps défilant.
- **La barre du bas mobile recouvrait les actions d'une soirée** quand le libellé « Nouvelle soirée » passait sur deux lignes : sa hauteur est désormais fixe, le libellé court sur mobile.
- **Un lien de soirée ouvert sans réseau restait sur son squelette de chargement** sans message : la page distingue maintenant la pause réseau du chargement et affiche l'erreur réseau existante.
- **PostHog ne se charge plus avant le consentement** : la bibliothèque s'amorçait au démarrage et posait déjà des identifiants dans le stockage local avant tout choix ; elle n'est chargée qu'après un consentement explicite.
- **Les captures jointes à une suggestion ne disparaissent plus de l'issue GitHub** : l'URL portait un jeton temporaire qui expirait en quelques minutes ; seul son chemin est conservé.
- **Le réglage « Watchlist visible sur mon profil » revenait à ON à chaque rechargement** alors que la liste était masquée : le serveur renvoie maintenant la visibilité réelle.

### Changed

- **Les pages qui demandent de se connecter s'affichent presque aussitôt** : un visiteur déconnecté qui ouvrait « Mes soirées », « Ma liste », ses notifications ou la création de soirée téléchargeait la page entière, une quarantaine de fichiers, avant de lire la phrase qui l'invitait à se connecter. L'invitation vient maintenant de l'ossature de l'application, et le code de la page n'est chargé qu'une fois la session confirmée.
- **Le premier affichage est plus rapide sur presque toutes les pages** : la feuille de style principale voyage avec le document au lieu d'être réclamée dans un second aller-retour, et les polices ne prennent plus la bande passante du code dont l'affichage dépend.
- **Les mentions légales et la politique de confidentialité sont servies en HTML complet**, comme les trois pages publiques déjà prérendues. Et chaque page prérendue emporte désormais ses styles, donc son contenu s'affiche directement dans sa mise en page finale au lieu d'apparaître brut puis de se réorganiser.
- **Le dossier technique et toute sa page sortent de l'angle mort de l'analyse statique** : environ 3 000 lignes de code de production en avaient été exclues pour tenir sous le plafond de lignes du plan gratuit, plafond qui disparaît avec le passage du dépôt en public.
- **Une pull request venue d'un fork ne déclenche plus aucun run** : les jobs d'entrée de la CI la sautent. Sans cette condition, un tel run échouerait de toute façon sur l'analyse SonarCloud, GitHub ne fournissant aucun secret à une PR externe, tout en dépensant des minutes de build.
- **La CI n'accepte plus qu'une action épinglée par empreinte** : le réglage était déjà la pratique du dépôt, il est maintenant imposé côté GitHub, donc une action référencée par tag est refusée au lieu de passer inaperçue.
- **La mise en production est devenue un geste manuel** : un push sur `master` joue les portes de qualité et s'arrête là, le déploiement se déclenche depuis GitHub Actions en choisissant sa cible (tout, front seul, API seule). Il refuse de partir sur un commit dont la CI n'est pas verte, et un garde-fou final vérifie que chaque cible demandée est réellement en ligne. Motif : les minutes de build d'un dépôt privé sont facturées, et rejouer le chemin de déploiement à chaque commit en consommait la moitié pour des livraisons qui, en pratique, se groupent. Contrepartie assumée : la production est en retard sur `master` entre deux déclenchements.
- La porte de performance Lighthouse est passée sur le chemin du déploiement, avec ses seuils inchangés : elle bloque toujours la mise en ligne du front, mais ne pèse plus sur chaque commit. Une régression de performance se voit donc au déploiement et non plus au push.
- **Déploiement API validé avant exposition** : chaque révision est déployée sans trafic, éprouvée sur son URL taguée, et n'est promue qu'une fois ses sondes vertes. Une révision défaillante n'atteint plus aucun utilisateur, là où le trafic basculait auparavant avant toute vérification.
- L'image de l'API est déployée par digest et non plus par tag : la révision en production désigne exactement les octets scannés par Trivy.
- Les vérifications de fin de déploiement couvrent aussi les domaines publics de l'API et du front, et non plus seulement les URL internes.
- **Démarrage de la page d'accueil deux fois plus rapide** : son titre est désormais peint dès le HTML initial au lieu d'attendre le montage de React. Le plus grand élément de la page s'affiche en 2,3 s au lieu de 4,2 s (score Lighthouse 80 puis 95, médiane de 5 passages), ce qui remet la porte de performance au vert et débloque le déploiement du front.
- Le front ne charge plus que la langue affichée : la langue inactive, environ 93 Ko, quitte le chemin de démarrage.
- Les icônes sont regroupées en un seul fichier au lieu d'une quarantaine : autant d'allers-retours réseau en moins avant le premier rendu.
- `<html lang>` porte la langue réelle du visiteur dès la première peinture, au lieu d'être corrigé après le montage de React.
- **Le bouton de partage d'une soirée reste une icône seule** sur toutes les largeurs, son libellé survivant comme nom accessible et infobulle.
- **Les chiffres du dossier technique sont de nouveau mesurés à chaque build** : le script qui les relève échouait en silence depuis le 2026-09-10 et republiait les nombres du 2026-09-09 ; il lit maintenant les deux workflows et fait échouer le build plutôt que de conserver des chiffres périmés. Le dossier annonce la V1.6 livrée, les deux jobs du planificateur, les sondes et alertes Cloud Monitoring, les pages pré-rendues et les six procédures outillées.

### Security

- **`js-yaml` remonté en 4.3.2** : la version tirée par l'outillage de génération des types OpenAPI était vulnérable à une consommation de processeur non bornée. Dépendance de développement uniquement, donc jamais servie aux utilisateurs. Bornée au `4.x` : la contrainte ouverte résolvait un `5.4.1` majeur sur un outil qui garde le contrat d'API.

## [1.5.0] - 2026-09-07

### Added

- **Page d'accueil d'exploration** : la racine `/` propose des films à tout le monde, connecté ou non, en huit rangées ordonnées du plus personnel au plus exploratoire. Une entrée « Explorer » ouvre la page depuis la nav et depuis la barre du bas mobile.
- **Recherche en tête d'accueil** : un champ de recherche et trois exemples cliquables, sans compte requis.
- **Rangées personnelles** : votre liste triée par note, des recommandations tirées du dernier film vu en soirée, et ce qu'ont vu les personnes que vous suivez.
- **Ce soir en streaming** : Netflix, Prime Video, Disney+, Canal+ et Apple TV+, avec bascule d'une plateforme à l'autre.
- **Cent vingt sagas** : les grandes franchises réunies, chacune avec sa page, et une barre de recherche et de tri sur la page qui les liste.
- **Dix sélections thématiques** : frissons, comédies françaises, années 80 à 2000, braquages, pépites A24, moins de 90 minutes, indétrônables, en famille.
- **Classement communautaire** : les films que les soirées proposent le plus souvent, un film y entrant à partir de deux soirées distinctes.
- **Nouvelle landing page** : neuf sections, l'interface du produit reconstruite en CSS et une roue de tirage réellement jouable depuis la page.
- Pages listes complètes derrière chaque rangée, avec filtres par genre et par type, tri et recherche.
- Composant partagé `SearchField`, extrait de la barre d'outils des listes et réutilisé par la recherche d'accueil.
- Endpoints `GET /movies/showcase`, `GET /movies/collections`, `GET /users/me/watched-movies` et `GET /users/me/following-watched-movies`, avec cache mémoire de six heures par section.
- Contexte `.on-dark` dans le design system : une bande sombre redéfinit les jetons de thème pour ses descendants, si bien que `Button`, `Card`, `Chip` et `Avatar` s'y posent sans classe locale.
- Taille `lg` sur `Button` et `buttonClass`, pour les appels à l'action de page d'accueil.
- Test de parité des clés d'internationalisation : une clé française sans équivalent anglais fait désormais échouer la suite.

### Changed

- La racine `/` sert la page d'exploration ; la présentation du produit vit sur `/decouvrir`, annoncée dans le sitemap.
- Les listes de films et les profils affichent la note et la durée, comme Ma liste.
- Les rangées d'onglets signalent leur débordement par un dégradé et ramènent l'onglet actif dans le champ de vision.
- Les recommandations d'accueil passent par un endpoint authentifié plutôt que par le profil public : un compte au profil privé garde sa rangée.
- Sur mobile, le titre d'une rangée tient sur une ligne et le lien « voir tout » descend sous lui, aligné à droite, quand la place manque.
- La roue de tirage s'adapte enfin à la largeur de son conteneur au lieu d'être figée à 460 pixels.
- Les pastilles `Chip` de ton primaire passent sur le bleu de texte, mieux contrasté que le bleu de fond en thème clair comme en thème sombre.

### Fixed

- La fiche film ouverte depuis un carrousel d'accueil affiche son affiche et son année.
- Le service worker de développement ne s'enregistre plus par défaut : un worker obsolète interceptait `/api/v1/*` sur `localhost` et vidait toutes les sections sans le moindre message d'erreur. Il revient avec `VITE_DEV_SERVICE_WORKER=true`.
- La rangée « Vos amis ont vu » exclut les profils passés en privé.

## [1.4.1] - 2026-09-04

### Added

- **Navigation ouverte aux visiteurs sans compte** : la nav, le pied de page et cinq pages (Mes soirées, Nouvelle soirée, Ma liste, Notifications, Paramètres) sont désormais accessibles sans compte, avec un état déconnecté dédié par page et un appel à l'action vers la connexion ou l'inscription.
- **Pièces jointes sur « Proposer une idée »** : jusqu'à 4 images (bouton, glisser-déposer ou collage) jointes à une suggestion de feature ou de bug.
- **Resservir un film déjà vu** : proposer un film de son historique vers une soirée en cours, sans le rechercher.
- **Alerte de date changée** : quand l'hôte reprogramme une soirée, les participants reçoivent une notification push et un message in-app.

### Changed

- La racine `/` redirige désormais vers Mes soirées ; la landing publique déménage sur `/decouvrir`, qui devient la page indexable de présentation du produit (FR / EN).
- **Mes soirées repensée** : onglets Actives et Historique, bloc « À traiter » pour les soirées en suspens, cartes adaptées au mobile.
- **Historique fouillable** : recherche, tris (date, titre, films, participants) et filtre sur les soirées restées sans film choisi.
- **Mon compte devient Paramètres** : cinq rubriques (Profil, Préférences, Notifications, Intégrations, Compte et sécurité), enregistrement automatique.
- **Panneau de soirée revu** : enregistrement en direct, erreurs par champ, mode de roue et séries TV dès la création ; jusqu'à 15 films par personne et 300 participants.
- **Liste de films** : vue liste en plus de la grille, date de sortie, indicateur Ma liste, plateformes redessinées, fiche film en un geste.
- **Partage unifié** : une seule fenêtre pour le lien, le QR code et l'invitation des abonnements, sur la soirée comme sur le profil.
- Premier affichage plus rapide : le chunk App et sa CSS sont préchargés en parallèle de l'entrée.

### Fixed

- Contraste du libellé actif de la navigation mobile et de l'option de thème sélectionnée en mode sombre (ratio AA).
- Navigateurs intégrés (Snapchat, etc.) : un bandeau propose d'ouvrir Movie Picker dans Safari ou Chrome, au lieu de perdre la session.
- Pseudo et identifiant public exclus des événements d'analytics.

## [1.4.0] - 2026-08-25

### Added

- **Watchlist personnelle** : liste de films « à voir » par utilisateur, alimentée depuis la recherche TMDB, avec proposition rapide d'un film de la watchlist directement dans une soirée.
- **Intégration Letterboxd** : synchronisation bidirectionnelle de la watchlist à partir du pseudo Letterboxd, rafraîchie automatiquement (plafonnée à une fois par jour côté serveur) avec un écran de revue des correspondances à l'import.
- **Sélection manuelle du film gagnant** : alternative au tirage par la roue, l'hôte bascule en « choix manuel » et désigne lui-même le gagnant, avec la même animation de révélation et un badge « Choisi par l'hôte ».
- **Exclusion d'un film de la roue** : l'hôte écarte un film du tirage sans le retirer de la liste ; réversible à tout moment, y compris après un tirage.
- **Flamme streak de soirées** : compteur de semaines consécutives de participation à une soirée avec tirage, affiché sur le profil public, mis en avant sur la carte de profil.
- **Connexion sociale (OAuth)** : connexion et inscription via Google ou GitHub, avec une section « Connexions » sur la page Compte pour lier ou délier un fournisseur.
- **Système de dons** : page publique « Soutenir Movie Picker » exposant les frais réels du service, renvoyant vers Ko-fi, avec un badge « Soutien » décoratif sur le profil public des donateurs.
- **Modale de nouveautés** : à la première visite suivant une mise à jour, une modale résume ce qui a changé dans la version ; affichée une seule fois par version connectée, consultable ensuite à la demande depuis le pied de page.
- **Bouton « Proposer une idée »** : depuis le pied de page ou le menu compte, titre + description ; la soumission crée une GitHub Issue côté serveur.
- **Bouton d'installation PWA** : « Installer l'app » dans le pied de page et le menu compte ; prompt natif Chrome/Edge/Android, guide iOS et navigateurs in-app.

## [1.3.2] - 2026-07-25

### Added

- Lien **« Signaler un problème »** en pied de page : ouvre un message pré-rempli (description, étapes, comportement attendu et observé) avec le contexte technique (page, version, navigateur).
- Sonde de disponibilité applicative **`GET /health/ready`** : vérifie la joignabilité de MongoDB, renvoie 503 si la base est injoignable, et expose la version déployée.
- **Supervision de production** : trois sondes de disponibilité (API, readiness, front) interrogées depuis trois continents, cinq politiques d'alerte (indisponibilité, base injoignable, erreurs serveur, latence dégradée) notifiées par e-mail, tableau de bord d'exploitation, et alertes Sentry sur les régressions et les rafales d'erreurs.
- Vérification de la readiness dans le **smoke test de déploiement** : une révision dont la base est injoignable fait échouer sa propre mise en production.
- **Monitoring d'erreurs Sentry** sur le front (React) et l'API (.NET), en production uniquement, avec une catégorie « surveillance des erreurs » dans les préférences de confidentialité.
- **SEO global** : métadonnées par page, image Open Graph, données structurées JSON-LD et sitemap dynamique des profils publics.
- QR code de partage sur le profil public.
- Filtre de durée de film dans la recherche d'ajout (10 min ou moins à 3h et plus).
- Réglage de compte pour l'échelle de notes TMDB (affichage sur 5 ou sur 10).
- Nouveau logo (clap incliné, fond sombre) et icônes PWA régénérées.
- Version de l'application affichée dans le pied de page.

### Changed

- Portes de qualité CI désormais **bloquantes** (Quality Gate SonarCloud, Lighthouse, E2E Playwright) : un échec fait échouer le pipeline et bloque le déploiement.
- Réduction de la duplication de code : factorisation des handlers d'action sur un film (vote, « déjà vu », note de pitch, suppression), fermeture des modales mutualisée (`useModalDialog`), pied de carte film partagé entre les vues grille et liste.
- Optimisations Lighthouse : accessibilité 100/100, CLS éliminé, bundle réduit de 83 %.
- Immersion PWA Android (theme-color dynamique, safe-area) et alignements optiques (logo, pseudo/avatar).
- Cartes film : streaming affiché uniquement par abonnement, location et achat regroupés en pastilles compactes.

### Removed

- Barre de couleur du thème sur la page de détail d'une soirée.

### Fixed

- **Sessions non persistées en production** : les utilisateurs étaient déconnectés à la fermeture du navigateur, sans qu'aucun code n'ait changé. Deux causes cumulées, l'expiration au bout de 90 jours de la clé de protection des données (générée sans durée explicite, puis régénérée en éphémère à chaque démarrage à froid) et un configurateur de cookie enregistré sur une interface que la fabrique d'options ne consomme pas, donc inopérant depuis l'origine. Les clés sont désormais persistées en base et partagées entre instances et révisions, le configurateur est enregistré sur la bonne interface, la durée de session est unifiée à 30 jours glissants et un test de non-régression vérifie que la configuration s'applique réellement. Une reconnexion unique a été nécessaire au déploiement.
- Résolution des 7 signalements SonarCloud restants (règle CA1861 : tableaux constants hissés en `static readonly`).
- CSRF : les deux endpoints de lancement/clôture de la roue exigent désormais un corps JSON, alignés sur le reste de l'API.
- Accessibilité : l'animation de la roue respecte `prefers-reduced-motion` (affiche le résultat directement si la préférence système est active).
- Images cassées en production : la CSP bloquait les posters et les avatars par défaut (`img-src` incomplet).
- Cookie de session passé en `SameSite=Lax` en production.
- Bandes-annonces cassées, contraste des actions de carte film en thème clair, modale sur mobile.
- Année de film absente désormais acceptée à l'ajout ; QR code et copie du lien regroupés.
- Le skip transitif du pipeline empêchait `deploy-api` et `deploy-front` de s'exécuter.
- Envoi d'e-mails de production rebranché (`RESEND_API_KEY`, `EMAIL_PROVIDER=resend`).

### Security

- Montée de **react-router 7.18.1 vers 8.3.0** (paquet unifié `react-router`), corrigeant `GHSA-qwww-vcr4-c8h2` (contournement CSRF en mode RSC). L'API de routage utilisée est inchangée.
- Résolution des 8 alertes Dependabot ouvertes (6 hautes, 2 basses) : `fast-uri`, `shell-quote`, `brace-expansion`, `dompurify`, `linkify-it`, `js-yaml`.
- Remplacement de `pnpm audit` par Trivy sur `pnpm-lock.yaml`, le service d'audit npm ayant été retiré le 15 juillet 2026 ; l'audit ne scannait plus aucun fichier depuis son introduction.
- Déblocage du pipeline : CVE de l'image Docker de base et version de Java obsolète pour le scanner Sonar.

## [1.3.1] - 2026-07-08

### Added

- Content-Security-Policy (CSP) sur le front SPA.
- Repli sur les initiales pour l'avatar quand aucun avatar n'est choisi.

### Changed

- Refonte du pipeline CI/CD : filtrage par chemins, découpage du lint, mise en cache, images taguées par digest (temps de CI réduit de plus de moitié).
- Analyse SonarCloud basculée en mode CI (couverture ingérée, quality gate informatif).
- Refonte des cartes film : affiche immersive en grille, vue liste, modale dédiée aux plateformes de streaming.

### Removed

- Configuration de dev « mobile-web » obsolète (le prototype mobile est archivé).

### Security

- Scans de sécurité étendus en CI : dépendances NuGet vulnérables, Trivy (image Docker), Gitleaks (secrets).
- Durcissement de la sécurité applicative : validation SSRF sur la récupération des affiches TMDB, sandbox de l'iframe bande-annonce, assainissement des URLs (Security Rating SonarCloud A).

### Fixed

- Résorption de la dette technique (élimination des warnings SonarCloud .NET et TS/CSS, déduplication).
- Comblement des lacunes de tests (front, API, E2E) et relèvement des seuils de couverture front.

## [1.3.0] - 2026-06-19

### Added

- Roue de tirage repensée en canvas, avec animation de confettis.
- Recherche avancée de films : note minimale, langue originale, décennie, disponibilité.
- Tri de la liste de films (votes, note TMDB, durée, ordre d'ajout).
- Affichage de la location et de l'achat (VOD) sur la fiche film.
- États vides (empty states) harmonisés sur les écrans sans contenu.
- Export calendrier `.ics` (Google / Outlook / Apple) pour les soirées à venir.
- Infobulles (tooltips) accessibles et réutilisables.

### Changed

- Refonte de la navigation : entrée « Nouvelle soirée » dans la barre, menu utilisateur, retrait du bouton flottant.

### Security

- Correctifs de vulnérabilités dans les dépendances (undici, esbuild, ws).

## [1.2.0] - 2026-06-11

### Added

- Profil public léger : handle `/u/:handle`, bio, visibilité (public par défaut, profil privé en 404).
- Statistiques utilisateur sur le profil public.
- Suivi (follow) léger entre utilisateurs.
- Notifications in-app (7 types) avec cloche d'inbox.
- Invitations in-app : l'hôte invite ses follows depuis la soirée.
- Historique de recherche de films (local, par utilisateur).
- Analytics produit (PostHog) et bandeau de consentement (CMP).
- Accessibilité étendue : lien d'évitement, focus-visible global, couverture axe sur 9 vues.
- Suppression de compte et export des données personnelles (RGPD).
- Note de pitch sur les propositions de film.
- Pages d'erreur dédiées (404, 500).
- Personnalisation de la couleur d'accent des soirées (palette étendue).

### Changed

- Migration complète des tokens du design system.
- Isolation des bases de données dev / prod avec garde-fou anti-base-prod en environnement Development.
- PWA : ajout d'un splash screen et d'une bannière de mise à jour du service worker.

### Removed

- Mode invité : un compte est désormais obligatoire pour rejoindre une soirée.

### Security

- Correction d'une faille IDOR sur les actions de film (vote, déjà vu, note, suppression, ajout).
- Résorption de vulnérabilités SonarCloud (Security Rating de C à A) et durcissement du pipeline CI (SHA-pin, secrets en variables d'environnement).

## [1.1.0] - 2026-05-25

### Added

- Progressive Web App : manifest, icônes, service worker (Workbox).
- Notifications push (VAPID) : 5 déclencheurs (rejoindre la soirée, ajout de film, tirage, suppression, rappels 1h/24h avant l'événement).
- Séries TV, bandes-annonces TMDB, liens externes et deep links vers les plateformes de streaming.
- Sélecteur d'avatar (DiceBear Bottts, thème cinéma, 18+ options).

## [1.0.0] - 2026-05-19

Première version de production complète.

### Added

- Comptes utilisateurs : inscription, connexion, mot de passe oublié par e-mail.
- Création de soirée, lien de partage (+ QR code), configuration par l'hôte (thème, expiration, limite de propositions, type de roue).
- Proposition de films (recherche TMDB), vote, marqueur « déjà vu » (avec décompte des autres participants), roue de tirage.
- Fournisseurs de visionnage (watch providers), aperçus Open Graph, internationalisation (FR / EN).
- Landing page publique ; mode sombre / clair ; mise à jour en direct des films et votes ; rappel in-app avant le début de soirée.
- Suppression d'un événement et expulsion d'un participant par l'hôte.

### Changed

- Migration de la stack back-end de Node / Express vers ASP.NET Core (.NET).

### Security

- Rate limiting par endpoint, CORS strict avec allowlist, en-têtes de sécurité, secrets gérés hors dépôt.

## [0.1.0] - 2026-02-27

### Added

- Prototype initial (MVP) : création de soirée, proposition de films (recherche TMDB), vote, roue de tirage, front React, API Node / Express.

[Non publié]: https://github.com/Affy657/Movie-Picker/compare/v1.6.0...HEAD
[1.6.0]: https://github.com/Affy657/Movie-Picker/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/Affy657/Movie-Picker/compare/v1.4.1...v1.5.0
[1.4.1]: https://github.com/Affy657/Movie-Picker/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/Affy657/Movie-Picker/compare/v1.3.2...v1.4.0
[1.3.2]: https://github.com/Affy657/Movie-Picker/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/Affy657/Movie-Picker/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/Affy657/Movie-Picker/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Affy657/Movie-Picker/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Affy657/Movie-Picker/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Affy657/Movie-Picker/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/Affy657/Movie-Picker/releases/tag/v0.1.0
