/**
 * Locale française — source unique pour les chaînes UI.
 *
 * Convention V1 : tout nouvel écran utilise `t('section.clé')` au lieu de chaînes en dur.
 * Les écrans existants seront migrés progressivement ; les clés ci-dessous couvrent
 * les chaînes les plus partagées pour faciliter l'adoption.
 *
 * Organisation : une section par domaine fonctionnel, `common` pour le transversal.
 * Les clés dynamiques utilisent la syntaxe `{{variable}}` (compatible i18next pour V2).
 */
export const fr = {
  common: {
    appName: 'Movie Picker',
    loading: 'Chargement\u2026',
    retry: 'Réessayer',
    backHome: '\u2190 Accueil',
    save: 'Enregistrer',
    cancel: 'Annuler',
    close: 'Fermer',
    send: 'Envoi\u2026',
    pageTitle: '{{segment}} \u2014 Movie Picker',
    languageLabel: 'Langue',
  },

  nav: {
    home: 'Accueil',
    myEvents: 'Mes soirées',
    account: 'Paramètres',
    navLabel: 'Navigation principale',
    brandLabel: 'Movie Picker \u2014 Accueil',
  },

  auth: {
    login: {
      title: 'Connexion',
      description: 'Acc\u00e9dez \u00e0 vos soir\u00e9es et \u00e0 votre profil.',
      emailLabel: 'E-mail',
      passwordLabel: 'Mot de passe',
      submit: 'Se connecter',
      submitting: 'Connexion\u2026',
      fallbackError: 'Connexion impossible.',
      registerPrompt: 'Pas encore de compte ?',
      registerLink: 'Créer un compte',
      devQuickButton: 'Compte dev (local)',
      devQuickHint: 'Visible uniquement en d\u00e9veloppement.',
      devQuickAriaLabel: 'Connexion rapide compte d\u00e9veloppeur (local uniquement)',
    },
    register: {
      title: 'Inscription',
      description: 'Cr\u00e9ez un compte pour retrouver vos soir\u00e9es.',
      emailLabel: 'E-mail',
      passwordLabel: 'Mot de passe',
      passwordHint: 'Au moins 8 caractères',
      passwordRulesHint: '8 caract\u00e8res minimum, au moins une lettre et un chiffre.',
      passwordRulesError:
        'Le mot de passe doit faire au moins 8 caract\u00e8res et inclure au moins une lettre et un chiffre.',
      pseudoLabel: 'Pseudo',
      submit: 'Cr\u00e9er mon compte',
      submitting: 'Cr\u00e9ation\u2026',
      fallbackError: 'Inscription impossible.',
      loginPrompt: 'D\u00e9j\u00e0 inscrit ?',
      loginLink: 'Se connecter',
    },
    account: {
      title: 'Paramètres',
      loadingPlaceholder: 'Chargement du profil\u2026',
      pseudoLabel: 'Pseudo',
      profileTitle: 'Profil',
      themeLabel: 'Thème de l\u2019interface',
      preferencesTitle: 'Préférences',
      languageLabel: 'Langue',
      guestLead: 'Connectez-vous ou créez un compte pour garder vos soirées.',
      saveSuccess: 'Modifications enregistrées.',
      fallbackError: 'Enregistrement impossible.',
      logoutButton: 'Se déconnecter',
      loginCta: 'Se connecter',
      registerCta: 'Créer un compte',
      sessionTitle: 'Session',
      saving: 'Enregistrement\u2026',
      guestNavAriaLabel: 'Connexion et inscription',
    },
    logout: {
      fallbackError: 'Déconnexion impossible.',
      submitting: 'Déconnexion\u2026',
    },
  },

  events: {
    create: {
      title: 'Créer une soirée',
      titleLabel: 'Titre',
      titlePlaceholder: 'Ex: Soirée film du vendredi',
      dateLabel: 'Date',
      timeLabel: 'Heure',
      submit: 'Créer la soirée',
      submitting: 'Création\u2026',
      fallbackError: 'Création impossible',
    },
    join: {
      title: 'Rejoindre la soirée',
      pseudoLabel: 'Ton pseudo',
      pseudoPlaceholder: 'Ex: Alice',
      submit: 'Rejoindre',
      submitting: 'Envoi\u2026',
      fallbackError: 'Impossible de rejoindre',
      pseudoRequired: 'Indique un pseudo pour rejoindre.',
    },
    participants: {
      title: 'Participants',
      empty: "Personne n'a encore rejoint la soirée.",
      meBadge: 'moi',
    },
    detail: {
      loading: 'Chargement\u2026',
      errorFallback: 'Soirée introuvable',
      backHome: "Retour à l'accueil",
      backNav: '\u2190 Retour',
      finishedBadge: 'Terminée',
      finishedBanner: 'Soirée terminée',
      moviesSection: 'Films',
      wheelSection: 'Roue',
    },
    myEvents: {
      title: 'Mes soirées',
      emptyTitle: 'Pas encore de soirée',
      emptyDescription:
        'Aucune soirée pour l\u2019instant. Cr\u00e9ez-en une ou rejoignez une invitation.',
      createCta: 'Créer une soirée',
      hostedSection: "Soirées que j'ai créées",
      joinedSection: "Soirées que j'ai rejointes",
      loadingPlaceholder: 'Chargement\u2026',
      loadingDetail: 'Chargement de vos soir\u00e9es\u2026',
      fallbackError: 'Chargement impossible',
      reconnectLink: 'Se reconnecter',
      actionsNavLabel: 'Actions sur vos soir\u00e9es',
      hostBadge: 'H\u00f4te',
      hostBadgeTitle: 'Vous organisez cette soir\u00e9e',
      historySection: 'Historique',
      emptyDescriptionGuest:
        'Aucune soir\u00e9e enregistr\u00e9e sur cet appareil. Ouvrez un lien d\u2019invitation pour rejoindre une soir\u00e9e : elle appara\u00eetra ici.',
      guestActionsNavLabel: 'Compte et cr\u00e9ation de soir\u00e9e',
      guestLoginCta: 'Se connecter',
      guestRegisterCta: 'Cr\u00e9er un compte',
      guestFallbackError:
        'Impossible de charger vos soir\u00e9es. V\u00e9rifiez la connexion puis r\u00e9essayez.',
      guestAllFailedError:
        'Aucune soir\u00e9e enregistr\u00e9e ici n\u2019a pu \u00eatre charg\u00e9e. R\u00e9essayez ou ouvrez \u00e0 nouveau un lien d\u2019invitation.',
      guestPartialSkipped:
        'Certaines soir\u00e9es m\u00e9moris\u00e9es sur cet appareil n\u2019ont pas pu \u00eatre affich\u00e9es ({{count}}).',
      guestErrorActionsLabel: 'Actions apr\u00e8s erreur de chargement',
      joinedCountOne: '1 participant',
      joinedCountMany: '{{count}} participants',
      movieProposedOne: '1 film propos\u00e9',
      movieProposedMany: '{{count}} films propos\u00e9s',
    },
    share: {
      shareButton: 'Partager',
      copiedButton: 'Lien copié !',
      shareText: 'Rejoins la soirée sur Movie Picker.',
      showQr: 'Afficher le QR code',
      hideQr: 'Masquer le QR code',
      qrTitle: 'QR code \u2014 lien vers la soirée',
      qrHint: "Ouvrez l'appareil photo pour rejoindre la soirée sur mobile.",
      groupLabel: 'Inviter des participants',
    },
    settings: {
      title: 'Paramètres de la soirée',
      themeLabel: 'Thème / ambiance',
      themePlaceholder: 'Ex: Horreur, Sci-fi, Comédie\u2026',
      endDateLabel: 'Date de fin des propositions',
      maxProposalsLabel: 'Limite de propositions par participant',
      wheelModeLabel: 'Mode de la roue',
      saveButton: 'Enregistrer',
      saving: 'Enregistrement\u2026',
      saveSuccess: 'Paramètres enregistrés.',
      fallbackError: 'Enregistrement impossible.',
    },
    wheel: {
      title: 'Roue',
      /** Titre quand l’utilisateur ne peut pas lancer la roue (invité) mais voit le résultat. */
      viewerTitle: 'R\u00e9sultat du tirage',
      emptyPlaceholder: 'Aucun film. Proposez au moins un film pour lancer la roue.',
      winnerLabel: 'Film gagnant',
      launchButton: 'Lancer la roue',
      relaunchButton: 'Relancer la roue',
      spinning: 'Tirage\u2026',
      closeButton: 'Clôturer la soirée',
      launchError: 'Tirage impossible',
      closeError: 'Clôture impossible',
    },
    reminder: {
      startsIn: 'La soirée commence dans {{time}}',
      startedRecently: 'La soirée a commencé !',
    },
    lifecycle: {
      upcoming: 'À venir',
      live: 'En cours',
      finished: 'Terminée',
    },
  },

  movies: {
    search: {
      label: 'Proposer un film',
      placeholder: 'Rechercher un film\u2026',
      searchButton: 'Rechercher',
      searching: '\u2026',
      fallbackError: 'Recherche indisponible',
      addButton: 'Ajouter',
      alreadyListed: 'Déjà listé',
      alreadyListedHint: 'Ce film est déjà dans la liste de la soirée',
      duplicateHint: 'Déjà proposé dans cette soirée.',
      addError: 'Ajout impossible',
      regionHint: 'Disponibilités indicatives \u00b7 région {{region}}',
      posterPlaceholder: 'Affiche',
      tmdbVoteHint: 'Note moyenne TMDB (indicatif)',
      liveSearchMinCharsHint: 'Tapez au moins {{min}} caractères pour lancer une recherche.',
      a11ySearching: 'Recherche en cours\u2026',
      a11yResultsCount: '{{count}} résultat(s)',
      a11yNoResults: 'Aucun résultat pour cette recherche.',
      noResultsForQuery: 'Aucun film ne correspond à « {{query}} ».',
      resultsListAria: 'Résultats de la recherche',
    },
    list: {
      emptyPlaceholder: "Aucun film proposé pour l'instant.",
      proposedBy: 'Proposé par {{pseudo}}',
      proposedByMeLead: 'Proposé par ',
      proposedByMeSelf: 'moi',
      voteUp: 'Voter pour',
      voteDown: 'Voter contre',
      voteError: 'Vote impossible',
      removeButton: 'Retirer',
      removeAsHostAria: 'Retirer « {title} » en tant qu\u2019hôte',
      removeAsHostTitle: 'En tant qu\u2019hôte, vous pouvez retirer n\u2019importe quel film',
      removeError: 'Suppression impossible',
      tmdbVoteTitle: 'Note moyenne TMDB (indicatif)',
      runtimeTitle: 'Durée du film',
      sectionLabel: 'Films proposés',
      loadingPlaceholder: 'Chargement des films\u2026',
    },
    seen: {
      label: 'D\u00e9j\u00e0 vu',
      labelWithCount: 'D\u00e9j\u00e0 vu ({{count}})',
      markAria: 'Marquer \u00ab d\u00e9j\u00e0 vu \u00bb pour {{title}}',
      unmarkAria: 'Retirer \u00ab d\u00e9j\u00e0 vu \u00bb pour {{title}}',
      neutralTooltip:
        "Neutre pour la roue \u2014 indique simplement que vous l'avez d\u00e9j\u00e0 vu",
      actionError: 'Erreur lors du marquage \u00ab d\u00e9j\u00e0 vu \u00bb',
      othersHintOne: 'D\u00e9j\u00e0 vu par {{a}}.',
      othersHintTwo: 'D\u00e9j\u00e0 vu par {{a}} et {{b}}.',
      othersHintManyOne: 'D\u00e9j\u00e0 vu par {{a}}, {{b}} et 1 autre.',
      othersHintManyMany: 'D\u00e9j\u00e0 vu par {{a}}, {{b}} et {{count}} autres.',
    },
    details: {
      toggleShow: "Plus d'infos",
      toggleHide: 'Masquer les infos',
      regionLabel: 'Détails du film',
      loading: 'Chargement des détails\u2026',
      error: 'Impossible de charger les détails du film.',
      empty: 'Aucun détail disponible pour ce film.',
      overviewLabel: 'Synopsis',
      directorLabel: 'Réalisation',
      castLabel: 'Avec',
      runtimeLabel: 'Durée',
      genresLabel: 'Genres',
      releasedLabel: 'Sortie',
      regionAttribution: 'Source : The Movie Database (TMDB)',
    },
    tmdb: {
      disclaimer:
        'Les notes et les offres de visionnage (streaming / VOD) sont indicatives, issues de The Movie Database (TMDB). Les services disponibles peuvent varier.',
    },
    watchProviders: {
      listAria: 'Offres de visionnage indicatives',
      typeFlatrate: 'Abonnement',
      typeRent: 'Location',
      typeBuy: 'Achat',
      chipAria: '{{provider}} ({{type}})',
      chipLinkAria:
        '{{provider}} — {{type}}. Ouvrir sur TMDB la page « où regarder ce film » (nouvel onglet).',
    },
  },

  errors: {
    network: 'Problème de connexion au serveur. Vérifiez votre réseau.',
    generic: 'Une erreur est survenue.',
    notFound: 'Page introuvable',
    boundary: {
      title: 'Un problème est survenu',
      messageProd:
        "Une erreur inattendue s'est produite. Vous pouvez réessayer ou recharger la page.",
      hint: "Vous pouvez recharger la page ou retourner à l'accueil. Si le problème persiste, essayez de vider le cache du navigateur.",
      retryButton: 'Réessayer',
      homeButton: 'Accueil',
    },
  },

  theme: {
    light: 'Clair',
    dark: 'Sombre',
    system: 'Système',
  },
} as const;

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};

/** Structure de locale avec valeurs `string` — permet aux locales secondaires de compiler. */
export type Locale = DeepStringify<typeof fr>;
