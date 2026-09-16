# Changelog

Toutes les évolutions notables de Movie Picker sont consignées dans ce fichier.

Le format s'appuie sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le
projet suit le [versionnage sémantique](https://semver.org/lang/fr/) (SemVer). Chaque
version publiée est associée à un tag Git et à une release GitHub.

## [Non publié]

### Security

- **Le jeton qui donne les commandes de l'hôte ne transite plus dans l'adresse des requêtes** mais dans un en-tête, et il est masqué dans les journaux du serveur et le suivi d'erreurs. Un compte créé avec un mot de passe ne peut plus être rattaché à Google ou GitHub par simple coïncidence d'adresse e-mail : il faut se connecter puis lier le fournisseur depuis les paramètres. L'API impose HTTPS pour deux ans aux navigateurs, un e-mail inconnu au login répond dans le même temps qu'un e-mail connu, les affiches proposées ne peuvent venir que de TMDB, les abonnements aux notifications ne visent que des services push publics et le mot de passe est plafonné à 128 caractères.

### Changed

- **Les mêmes onglets, menus et pastilles partout** : les onglets de « Mes soirées », de la liste d'abonnés et du choix d'avatar sont le composant d'onglets commun (celui des abonnés n'annonçait pas ses onglets aux lecteurs d'écran), le menu du compte et celui de l'agenda sont le menu commun, les filtres de recherche de films, les thèmes suggérés, l'invitation d'un participant et une dizaine de badges (« Vous », « Complet », « Série », gagnant, date relative, liste masquée) sont la pastille commune, et les boutons « Charger plus », « Tout marquer lu », « Suivre », les votes du détail d'un film et les filtres de liste sont le bouton commun. Le mode de tirage, les candidats Letterboxd et la grille d'avatars partagent une même carte à cocher, les avatars empilés une même pile, les réglages à interrupteur une même ligne. Les icônes suivent une échelle de huit tailles, les avatars et les petites dimensions la grille de 4 px, ce qui décale certains dessins d'un ou deux pixels. Le bouton « Détails » d'un film, qui n'était plus branché nulle part, disparaît.
- **Tout ce qui se touche fait au moins 44 px** : petits boutons, pastilles de filtre, croix de retrait, interrupteurs, liens dans une phrase, flèches des rangées de films et boutons de carte gardent leur dessin mais répondent au doigt sur une zone plus large. Les croix de fermeture des feuilles et des panneaux, les boutons de renommage et de suppression des modèles de soirée, le bouton des paramètres et celui de l'agenda d'une soirée sont désormais le même bouton à icône que partout ailleurs, et les badges « Hôte » et « Soutien » la même pastille que les filtres.
- **Le focus clavier reste visible partout** : dix-sept boutons et entrées de menu (menus contextuels, colonnes de la vue liste, notes de film, fournisseurs de streaming, sous-menu « Proposer ») n'avaient pour tout repère de focus qu'un fond à peine teinté ; ils prennent le contour standard. Les boutons d'envoi (connexion, inscription, création de soirée, proposition d'idée, suppression de compte) montrent un spinner pendant l'attente au lieu de seulement se griser, et les boutons de tri de la vue liste, les badges d'invitation et la pastille « Nouveautés » sont désormais la même pastille que partout ailleurs.
- **Le mode sombre distingue ce qui flotte** : menus, feuilles, modales, infobulles et cartes surélevées se posent sur une surface un ton plus claire que la page, au lieu de compter sur une ombre invisible sur fond sombre ; les séparateurs discrets y sont aussi un peu plus lisibles. La pastille « Nouveautés » suit la couleur d'accent choisie au lieu de rester verte, et la piste d'un interrupteur éteint est plus foncée pour rester visible.
- **Deux personnes qui modifient la même soirée en même temps ne s'écrasent plus** : deux lancements de roue simultanés donnaient deux gagnants différents, chacun affiché à son auteur et un seul retenu. Le second reçoit maintenant « modifiée entre-temps, rechargez ». Les plafonds de participants, de propositions et de votes tiennent aussi sous des envois simultanés, et retirer un participant ou un film est tout ou rien.
- **L'API démarre et répond plus vite** : les index de la base ne sont plus recréés à chaque démarrage, la session n'est plus relue en base à chaque requête pendant trente secondes, et les rappels de soirée ne lisent plus toutes les soirées ouvertes mais seulement celles dont l'heure approche. « Mes soirées » n'oublie plus les soirées créées au-delà de la deux-centième.
- **La page d'accueil n'attend plus TMDB à chaque redémarrage du serveur** : les sélections de films gardent une copie partagée entre les instances, donc un serveur qui vient de démarrer répond en quelques millisecondes au lieu de 6 à 10 secondes. Deux visiteurs qui arrivent en même temps ne déclenchent plus deux fois le même travail, et les réponses de l'API voyagent compressées.
- **L'application s'affiche plus tôt** : l'outil de suivi des erreurs se charge à la première interaction ou dix secondes après l'affichage, au lieu de retarder le premier rendu, et chaque page demande sept fichiers de moins. Les rangées de l'accueil sont demandées dès l'ouverture et servies depuis le cache du navigateur quand on revient.
- **Un lien de soirée s'ouvre plus vite** : la liste des films part sans attendre les détails de la soirée, et les fenêtres de partage, de paramètres, de proposition et de tirage ne sont chargées qu'à leur première ouverture, soit un tiers de JavaScript en moins pour un invité. L'animation de la roue est plus régulière sur mobile.
- **Une soirée où personne ne bouge ne coûte presque rien** : pendant une soirée, chaque téléphone redemande la page toutes les 3,5 secondes ; le serveur reconnaît maintenant qu'il n'y a rien de neuf et répond « rien n'a changé » sans recalculer la liste des films ni la retransmettre, ce qui divise par sept le travail de la base et le trafic mobile sur une soirée calme. Dès qu'un vote, une proposition, un retrait ou une note arrive, tout le monde reçoit la nouvelle liste comme avant.

### Fixed

- **Revenir à une version précédente de l'API ne perd plus de données** : une ancienne version qui réécrivait une soirée ou un compte effaçait les réglages qu'elle ne connaissait pas encore (gagnants multiples, récurrence, modèles de soirée). Elle ne touche plus qu'aux champs qu'elle connaît.
- **Avec un accent vert, orange ou cyan, les liens et les textes en couleur restaient sous le seuil de lisibilité** en mode clair (3,3 à 3,7:1 au lieu des 4,5:1 requis). Le texte prend maintenant une teinte plus foncée que les boutons, pour chacun des huit accents. Au passage, le bouton d'aide des champs avait perdu son arrondi et deux étiquettes de la page `/tech` leur petite taille, deux jetons qui n'existaient pas ; une porte de qualité refuse désormais tout jeton fantôme.
- **Le retrait d'un gagnant journalisait l'identifiant reçu dans la requête** plutôt que celui du film réellement retiré de la soirée, la dernière alerte CodeQL ouverte du dépôt. Les titres d'onglet (« Mes soirées | Movie Picker »), les aperçus de partage, les courriels de réinitialisation et les métadonnées SEO abandonnent aussi le tiret cadratin et le point médian.
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
- Résorption de vulnérabilités SonarCloud (Security Rating C → A) et durcissement du pipeline CI (SHA-pin, secrets en variables d'environnement).

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
