export interface BannerSuggestion {
  tmdbId: number;
  imagePath: string;
  year: number;
  title: { fr: string; en: string };
}

export const TMDB_BANNER_THUMBNAIL_BASE = 'https://image.tmdb.org/t/p/w780';

export const BANNER_SUGGESTIONS: readonly BannerSuggestion[] = [
  {
    tmdbId: 693134,
    imagePath: '/87IVlclAfWL6mdicU1DDuxdwXwe.jpg',
    year: 2024,
    title: { fr: 'Dune : Deuxième partie', en: 'Dune: Part Two' },
  },
  {
    tmdbId: 313369,
    imagePath: '/nlPCdZlHtRNcF6C9hzUH4ebmV1w.jpg',
    year: 2016,
    title: { fr: 'La La Land', en: 'La La Land' },
  },
  {
    tmdbId: 76341,
    imagePath: '/uT895WNwm0aIJRtGizcQhrejWUo.jpg',
    year: 2015,
    title: { fr: 'Mad Max : Fury Road', en: 'Mad Max: Fury Road' },
  },
  {
    tmdbId: 129,
    imagePath: '/m4TUa2ciEWSlk37rOsjiSIvZDXE.jpg',
    year: 2001,
    title: { fr: 'Le Voyage de Chihiro', en: 'Spirited Away' },
  },
  {
    tmdbId: 843,
    imagePath: '/ffQFnAUm2Uu4RU0nijpjPRf9TBT.jpg',
    year: 2000,
    title: { fr: 'In the Mood for Love', en: 'In the Mood for Love' },
  },
  {
    tmdbId: 62,
    imagePath: '/w5IDXtifKntw0ajv2co7jFlTQDM.jpg',
    year: 1968,
    title: { fr: "2001 : L'Odyssée de l'espace", en: '2001: A Space Odyssey' },
  },
  {
    tmdbId: 335984,
    imagePath: '/mVr0UiqyltcfqxbAUcLl9zWL8ah.jpg',
    year: 2017,
    title: { fr: 'Blade Runner 2049', en: 'Blade Runner 2049' },
  },
  {
    tmdbId: 157336,
    imagePath: '/vgnoBSVzWAV9sNQUORaDGvDp7wx.jpg',
    year: 2014,
    title: { fr: 'Interstellar', en: 'Interstellar' },
  },
  {
    tmdbId: 194,
    imagePath: '/6n53UI4mX9QMfe2S0Pgt8mGebY1.jpg',
    year: 2001,
    title: { fr: "Le Fabuleux Destin d'Amélie Poulain", en: 'Amélie' },
  },
  {
    tmdbId: 120467,
    imagePath: '/9udCLTxTFl28RxnK8Q05E154ZGa.jpg',
    year: 2014,
    title: { fr: 'The Grand Budapest Hotel', en: 'The Grand Budapest Hotel' },
  },
  {
    tmdbId: 64690,
    imagePath: '/hoyAALgfmjMEK7O1wZ4r8wT91RP.jpg',
    year: 2011,
    title: { fr: 'Drive', en: 'Drive' },
  },
  {
    tmdbId: 372058,
    imagePath: '/mMtUybQ6hL24FXo0F3Z4j2KG7kZ.jpg',
    year: 2016,
    title: { fr: 'Your Name.', en: 'Your Name.' },
  },
  {
    tmdbId: 496243,
    imagePath: '/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg',
    year: 2019,
    title: { fr: 'Parasite', en: 'Parasite' },
  },
  {
    tmdbId: 120,
    imagePath: '/z51Wzj94hvAIsWfknifKTqKJRwp.jpg',
    year: 2001,
    title: {
      fr: "Le Seigneur des anneaux : La Communauté de l'anneau",
      en: 'The Lord of the Rings: The Fellowship of the Ring',
    },
  },
  {
    tmdbId: 329865,
    imagePath: '/r8FD6CC3GgjWaGVkZh00AcedfpA.jpg',
    year: 2016,
    title: { fr: 'Premier Contact', en: 'Arrival' },
  },
  {
    tmdbId: 152601,
    imagePath: '/sPPsR9f4K0movWVQ99u4uMqFzEL.jpg',
    year: 2013,
    title: { fr: 'Her', en: 'Her' },
  },
];
