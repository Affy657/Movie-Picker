import { describe, expect, it } from 'vitest';
import { drawStory, storySources } from './storyCanvas';
import { STORY_LOGO_SRC } from './storyAssets';
import type { StoryImageSpec } from './storySpec';

type Drawn = { texts: string[]; images: CanvasImageSource[]; scales: number[] };

function recordingContext(): { ctx: CanvasRenderingContext2D; drawn: Drawn } {
  const drawn: Drawn = { texts: [], images: [], scales: [] };
  const noop = () => {};
  const gradient = { addColorStop: noop };
  const ctx = {
    canvas: { width: 1080, height: 1920 },
    font: '',
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    lineWidth: 1,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    letterSpacing: '',
    measureText: (text: string) => ({
      width: text.length * (Number.parseInt(/(\d+)px/.exec(ctx.font)?.[1] ?? '10', 10) * 0.5),
    }),
    fillText: (text: string) => drawn.texts.push(text),
    drawImage: (image: CanvasImageSource) => drawn.images.push(image),
    fillRect: noop,
    clearRect: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    arcTo: noop,
    quadraticCurveTo: noop,
    rect: noop,
    fill: noop,
    stroke: noop,
    clip: noop,
    save: noop,
    restore: noop,
    translate: noop,
    scale: (ratio: number) => drawn.scales.push(ratio),
    rotate: noop,
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  } as unknown as CanvasRenderingContext2D;
  return { ctx, drawn };
}

const film = (title: string, posterSrc: string | null, rated = true) => ({
  title,
  year: '2010',
  posterSrc,
  ratingValue: rated ? 9 : null,
  ratingText: rated ? '4,5/5' : null,
  countText: rated ? '6 notes' : null,
  fallbackText: 'Pas encore de note',
});

const baseSpec: StoryImageSpec = {
  layout: 'films',
  brand: 'Movie Picker',
  eyebrow: 'Le recap de la soirée',
  title: 'Soirée du vendredi',
  date: 'vendredi 18 septembre 2026 à 20h30',
  qr: { value: 'https://www.movie-picker.fr/r/abc', caption: 'Voir le recap' },
  url: 'movie-picker.fr/r/abc',
  footer: 'Le recap et les notes de chacun',
  people: {
    label: '8 participants',
    avatars: [
      { src: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=a', initials: 'CL' },
      { src: null, initials: 'MA' },
    ],
  },
  theme: 'Années 80',
  films: [film('Inception', '/poster-1.jpg')],
  rows: [],
  moreText: null,
};

const ratingsSpec: StoryImageSpec = {
  ...baseSpec,
  layout: 'ratings',
  people: null,
  films: [film('Heat', '/poster-2.jpg')],
  rows: [
    {
      name: 'Clara',
      avatarSrc: null,
      initials: 'CL',
      isHost: true,
      hostText: 'hôte',
      ratingValue: 10,
      ratingText: '5,0/5',
      fallbackText: 'Pas encore noté',
    },
    {
      name: 'Yann',
      avatarSrc: null,
      initials: 'YA',
      isHost: false,
      hostText: 'hôte',
      ratingValue: null,
      ratingText: null,
      fallbackText: 'Pas encore noté',
    },
  ],
  moreText: 'et 4 autres participants',
};

describe('storySources', () => {
  it('collects the logo, the posters and the avatars to load', () => {
    expect(storySources(baseSpec)).toEqual([
      STORY_LOGO_SRC,
      '/poster-1.jpg',
      'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=a',
    ]);
  });

  it('collects the avatars of the rating rows', () => {
    const rows = ratingsSpec.rows.map((row) => ({ ...row, avatarSrc: '/avatar.svg' }));

    expect(storySources({ ...ratingsSpec, rows })).toContain('/avatar.svg');
  });
});

describe('drawStory', () => {
  it('writes the night, the movies and the recap link', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, baseSpec, new Map());

    expect(drawn.texts).toEqual(
      expect.arrayContaining([
        'Movie Picker',
        'LE RECAP DE LA SOIRÉE',
        'Soirée du vendredi',
        'vendredi 18 septembre 2026 à 20h30',
        '8 participants',
        'Années 80',
        'Inception',
        '2010',
        '4,5/5',
        '6 notes',
        'Voir le recap',
        'movie-picker.fr/r/abc',
        'Le recap et les notes de chacun',
      ])
    );
  });

  it('says when a movie has no rating', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, { ...baseSpec, films: [film('Heat', null, false)] }, new Map());

    expect(drawn.texts).toContain('Pas encore de note');
  });

  it('draws the poster, the avatar and the qr code it was given', () => {
    const { ctx, drawn } = recordingContext();
    const poster = { poster: true } as unknown as CanvasImageSource;
    const avatar = { avatar: true } as unknown as CanvasImageSource;
    const qr = { qr: true } as unknown as CanvasImageSource;
    const assets = new Map<string, CanvasImageSource>([
      ['/poster-1.jpg', poster],
      ['https://api.dicebear.com/9.x/bottts-neutral/svg?seed=a', avatar],
    ]);

    drawStory(ctx, baseSpec, assets, qr);

    expect(drawn.images).toEqual(expect.arrayContaining([poster, avatar, qr]));
  });

  it('falls back to initials when an avatar is missing', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, baseSpec, new Map());

    expect(drawn.texts).toEqual(expect.arrayContaining(['CL', 'MA']));
    expect(drawn.images).toHaveLength(0);
  });

  it('lists the ratings of the movie with their author', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, ratingsSpec, new Map());

    expect(drawn.texts).toEqual(
      expect.arrayContaining([
        'Heat',
        'Clara',
        'hôte',
        '5,0/5',
        'Yann',
        'Pas encore noté',
        'et 4 autres participants',
      ])
    );
  });

  it('keeps a crowded grid of movies above the footer', () => {
    const { ctx, drawn } = recordingContext();
    const films = ['Inception', 'Heat', 'Matrix', 'Alien', 'Dune', 'Drive'].map((title) =>
      film(title, null)
    );

    drawStory(
      ctx,
      {
        ...baseSpec,
        title: 'Une soirée au titre vraiment très long sur deux lignes',
        films,
      },
      new Map()
    );

    const shrink = drawn.scales.at(-1) ?? 1;
    expect(shrink).toBeLessThan(1);
    expect(shrink).toBeGreaterThan(0.8);
  });

  it('draws a grid that fits without shrinking it', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, baseSpec, new Map());

    expect(drawn.scales).toEqual([]);
  });

  it('cuts a night title that runs past two lines', () => {
    const { ctx, drawn } = recordingContext();
    const long = 'Une soirée au titre vraiment très long qui déborde sur trois lignes entières';

    drawStory(ctx, { ...baseSpec, title: long }, new Map());

    expect(drawn.texts).not.toContain(long);
    expect(drawn.texts.some((text) => text.endsWith('…'))).toBe(true);
  });
});
