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
    account: 'Compte',
    navLabel: 'Navigation principale',
    brandLabel: 'Movie Picker \u2014 Accueil',
  },

  auth: {
    login: {
      title: 'Connexion',
      description: 'Connecte-toi pour créer des soirées et retrouver tes participations.',
      emailLabel: 'E-mail',
      passwordLabel: 'Mot de passe',
      submit: 'Se connecter',
      submitting: 'Connexion\u2026',
      fallbackError: 'Connexion impossible.',
      registerPrompt: 'Pas encore de compte ?',
      registerLink: 'Créer un compte',
    },
    register: {
      title: 'Inscription',
      description: 'Créer un compte pour organiser des soirées et retrouver ton historique.',
      emailLabel: 'E-mail',
      passwordLabel: 'Mot de passe',
      passwordHint: 'Au moins 8 caractères',
      pseudoLabel: 'Pseudo affiché',
      submit: "S'inscrire",
      submitting: 'Inscription\u2026',
      fallbackError: 'Inscription impossible.',
      loginPrompt: 'Déjà un compte ?',
      loginLink: 'Se connecter',
    },
    account: {
      title: 'Compte',
      loadingPlaceholder: 'Chargement du profil\u2026',
      pseudoLabel: 'Pseudo affiché',
      profileTitle: 'Profil',
      themeLabel: 'Thème de l\u2019interface',
      preferencesTitle: 'Préférences',
      languageLabel: 'Langue',
      themeHint: 'Clair, sombre ou selon votre appareil.',
      guestLead: 'Connectez-vous ou créez un compte pour garder vos soirées.',
      guestHint: 'Vous pouvez aussi continuer en invité\u00a0: créez ou rejoignez une soirée via le lien partagé.',
      saveSuccess: 'Modifications enregistrées.',
      fallbackError: 'Enregistrement impossible.',
      logoutButton: 'Se déconnecter',
      loginCta: 'Se connecter',
      registerCta: 'Créer un compte',
      sessionTitle: 'Session',
      sessionHint: 'La session est maintenue par un cookie sécurisé (httpOnly) émis par l\u2019API.',
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
      reactionsLabel: 'Réactions disponibles',
      saveButton: 'Enregistrer',
      saving: 'Enregistrement\u2026',
      saveSuccess: 'Paramètres enregistrés.',
      fallbackError: 'Enregistrement impossible.',
    },
    wheel: {
      title: 'Roue',
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
    },
    list: {
      emptyPlaceholder: "Aucun film proposé pour l'instant.",
      proposedBy: 'Proposé par {{pseudo}}',
      voteUp: 'Voter pour',
      voteDown: 'Voter contre',
      voteError: 'Vote impossible',
      removeButton: 'Retirer',
      removeError: 'Suppression impossible',
      myBadge: "C'est moi",
      tmdbVoteTitle: 'Note moyenne TMDB (indicatif)',
      watchLinkLabel: 'Où regarder (TMDB)',
      watchLinkSearch: 'Voir les options sur TMDB',
      sectionLabel: 'Films proposés',
      loadingPlaceholder: 'Chargement des films\u2026',
    },
    reactions: {
      already_seen: 'Déjà vu',
      want_to_watch: 'Envie de voir',
      not_interested: 'Pas intéressé',
      masterpiece: "Chef-d'\u0153uvre",
      meh: 'Bof',
    },
    tmdb: {
      disclaimer:
        'Les notes et les offres de visionnage (streaming / VOD) sont indicatives, issues de The Movie Database (TMDB). Les services disponibles peuvent varier.',
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
