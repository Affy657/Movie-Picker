import { describe, expect, it } from 'vitest';
import { drawStory, storySources } from './storyCanvas';
import { STORY_LOGO_SRC } from './storyAssets';
import { STORY_FOOT_CENTER_Y, STORY_SAFE_TOP, STORY_WIDTH } from './storyLayout';
import type { StoryImageSpec } from './storySpec';

type DrawnText = {
  text: string;
  x: number;
  y: number;
  size: number;
  width: number;
  align: CanvasTextAlign;
};
type DrawnImage = { image: CanvasImageSource; x: number; y: number; width: number; height: number };

type Drawn = {
  texts: string[];
  placed: DrawnText[];
  images: CanvasImageSource[];
  boxes: DrawnImage[];
  scales: number[];
  gradientStops: number[];
};

const IMAGE_ARGUMENTS_WITH_CROP = 9;

function recordingContext(): { ctx: CanvasRenderingContext2D; drawn: Drawn } {
  const drawn: Drawn = {
    texts: [],
    placed: [],
    images: [],
    boxes: [],
    scales: [],
    gradientStops: [],
  };
  const noop = () => {};
  const gradient = { addColorStop: (stop: number) => drawn.gradientStops.push(stop) };
  const fontSize = () => Number.parseInt(/(\d+)px/.exec(ctx.font)?.[1] ?? '10', 10);
  const ctx = {
    canvas: { width: 1080, height: 1920 },
    font: '',
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    lineWidth: 1,
    lineJoin: 'miter',
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetY: 0,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    letterSpacing: '',
    measureText: (text: string) => ({
      width: text.length * (fontSize() * 0.5),
      actualBoundingBoxAscent: fontSize() * 0.7,
    }),
    fillText: (text: string, x: number, y: number) => {
      const size = fontSize();
      drawn.texts.push(text);
      const width = text.length * size * 0.5;
      drawn.placed.push({ text, x, y, size, width, align: ctx.textAlign });
    },
    drawImage: (image: CanvasImageSource, ...args: number[]) => {
      drawn.images.push(image);
      const box = args.length + 1 === IMAGE_ARGUMENTS_WITH_CROP ? args.slice(4) : args;
      const [x = 0, y = 0, width = 0, height = 0] = box;
      drawn.boxes.push({ image, x, y, width, height });
    },
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

const filmsSpec: StoryImageSpec = {
  layout: 'films',
  title: 'Soirée du vendredi',
  date: 'vendredi 18 septembre 2026 à 20h30',
  footer: 'Le recap et les notes de chacun',
  people: {
    label: '8 participants',
    avatars: [
      { src: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=a', initials: 'CL' },
      { src: null, initials: 'MA' },
    ],
  },
  theme: 'Années 80',
  films: [film('Inception', '/poster-1.jpg'), film('Heat', '/poster-2.jpg')],
  rows: [],
  moreText: null,
};

const filmSpec: StoryImageSpec = {
  ...filmsSpec,
  layout: 'film',
  people: null,
  films: [film('Inception', '/poster-1.jpg')],
};

const ratingsSpec: StoryImageSpec = {
  ...filmsSpec,
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

const posterAsset = { poster: true } as unknown as CanvasImageSource;

const isBlurredGround = (image: CanvasImageSource) => image instanceof HTMLCanvasElement;

function placed(drawn: Drawn, text: string): DrawnText {
  const found = drawn.placed.find((entry) => entry.text === text);
  if (!found) throw new Error(`${text} was not drawn`);
  return found;
}

describe('storySources', () => {
  it('collects the logo, the posters and the avatars to load', () => {
    expect(storySources(filmsSpec)).toEqual([
      STORY_LOGO_SRC,
      '/poster-1.jpg',
      '/poster-2.jpg',
      'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=a',
    ]);
  });

  it('collects the avatars of the rating rows', () => {
    const rows = ratingsSpec.rows.map((row) => ({ ...row, avatarSrc: '/avatar.svg' }));

    expect(storySources({ ...ratingsSpec, rows })).toContain('/avatar.svg');
  });
});

describe('the ground of a story', () => {
  it('spreads the blurred poster of the movie under the whole image', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, filmSpec, new Map([['/poster-1.jpg', posterAsset]]));

    const ground = drawn.boxes[0];
    expect(ground && isBlurredGround(ground.image)).toBe(true);
  });

  it('darkens the image from the middle to the bottom', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, filmSpec, new Map());

    expect(drawn.gradientStops).toEqual([0, 0.45, 1]);
  });

  it('stays flat when the movie has no poster', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, { ...filmSpec, films: [film('Heat', null)] }, new Map());

    expect(drawn.images.filter(isBlurredGround)).toHaveLength(0);
  });

  it('stays flat when the poster failed to load', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, filmSpec, new Map());

    expect(drawn.images.filter(isBlurredGround)).toHaveLength(0);
    expect(drawn.texts).toContain('🎞');
  });

  it('takes the first movie for the ground of all the movies', () => {
    const { ctx, drawn } = recordingContext();
    const first = { first: true } as unknown as CanvasImageSource;
    const second = { second: true } as unknown as CanvasImageSource;

    drawStory(
      ctx,
      filmsSpec,
      new Map([
        ['/poster-1.jpg', first],
        ['/poster-2.jpg', second],
      ])
    );

    expect(drawn.images.filter(isBlurredGround)).toHaveLength(1);
    expect(isBlurredGround(drawn.images[0] as CanvasImageSource)).toBe(true);
  });

  it('moves on to the next poster when the first movie has none', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, filmsSpec, new Map([['/poster-2.jpg', posterAsset]]));

    expect(drawn.images.filter(isBlurredGround)).toHaveLength(1);
  });
});

describe('the slide of a movie', () => {
  it('shows the night, the movie, its average and how many rated it', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, filmSpec, new Map());

    expect(drawn.texts).toEqual(
      expect.arrayContaining(['Soirée du vendredi', 'Inception', '4,5/5', '6 notes'])
    );
  });

  it('leaves out what the design does not show', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, filmSpec, new Map());

    expect(drawn.texts).not.toContain('2010');
    expect(drawn.texts).not.toContain('Années 80');
    expect(drawn.texts).not.toContain('vendredi 18 septembre 2026 à 20h30');
  });

  it('centers the movie title and draws it larger than the night', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, filmSpec, new Map());

    const title = placed(drawn, 'Inception');
    const night = placed(drawn, 'Soirée du vendredi');
    expect(title.x).toBe(STORY_WIDTH / 2);
    expect(title.size).toBeGreaterThan(night.size * 2);
    expect(title.y).toBeGreaterThan(night.y);
    expect(night.y).toBeGreaterThanOrEqual(STORY_SAFE_TOP);
  });

  it('draws the large poster centered', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, filmSpec, new Map([['/poster-1.jpg', posterAsset]]));

    const box = drawn.boxes.find((entry) => entry.image === posterAsset);
    expect(box?.width).toBe(696);
    expect((box?.x ?? 0) + (box?.width ?? 0) / 2).toBe(STORY_WIDTH / 2);
  });

  it('wraps a long movie title rather than running past the sides', () => {
    const { ctx, drawn } = recordingContext();
    const title = 'Le Seigneur des anneaux, la communauté de l anneau';

    drawStory(ctx, { ...filmSpec, films: [film(title, null)] }, new Map());

    const lines = drawn.placed.filter((entry) => title.includes(entry.text));
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.map((line) => line.text).join(' ')).toBe(title);
    for (const line of lines) expect(line.width).toBeLessThanOrEqual(STORY_WIDTH - 2 * 72);
  });

  it('says when the movie has no rating', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, { ...filmSpec, films: [film('Heat', null, false)] }, new Map());

    expect(drawn.texts).toContain('Pas encore de note');
  });

  it('cuts a night title that runs past two lines', () => {
    const { ctx, drawn } = recordingContext();
    const long = 'Une soirée au titre très long '.repeat(6).trim();

    drawStory(ctx, { ...filmSpec, title: long }, new Map());

    expect(drawn.texts).not.toContain(long);
    expect(drawn.texts.some((text) => text.endsWith('…'))).toBe(true);
  });
});

describe('the slide of the ratings', () => {
  it('sets the average apart from its scale', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, ratingsSpec, new Map());

    const value = placed(drawn, '4,5');
    const scale = placed(drawn, '/5');
    expect(value.size).toBeGreaterThan(scale.size * 2);
    expect(value.y).toBe(scale.y);
    expect(scale.x).toBeGreaterThan(value.x);
  });

  it('lists the ratings of the movie with their author', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, ratingsSpec, new Map());

    expect(drawn.texts).toEqual(
      expect.arrayContaining([
        'Soirée du vendredi',
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

  it('draws the small poster at the head of the slide', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, ratingsSpec, new Map([['/poster-2.jpg', posterAsset]]));

    const box = drawn.boxes.find((entry) => entry.image === posterAsset);
    expect(box?.width).toBeLessThan(300);
    expect(box?.y).toBe(STORY_SAFE_TOP);
  });

  it('says when nobody rated the movie, in place of the average', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, { ...ratingsSpec, films: [film('Heat', null, false)] }, new Map());

    expect(drawn.texts).toContain('Pas encore de note');
  });

  it('aligns the values on the right edge, whatever their width', () => {
    const { ctx, drawn } = recordingContext();
    const rows = [
      { ...(ratingsSpec.rows[0] as StoryImageSpec['rows'][number]), ratingText: '10/10' },
      { ...(ratingsSpec.rows[0] as StoryImageSpec['rows'][number]), ratingText: '4,5/10' },
    ];

    drawStory(ctx, { ...ratingsSpec, rows }, new Map());

    const values = ['10/10', '4,5/10'].map((text) => placed(drawn, text));
    expect(values.map((entry) => entry.align)).toEqual(['right', 'right']);
    expect(values[0]?.x).toBe(STORY_WIDTH - 72);
    expect(values[1]?.x).toBe(STORY_WIDTH - 72);
  });

  it('draws an unknown avatar as initials', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, ratingsSpec, new Map());

    expect(drawn.texts).toEqual(expect.arrayContaining(['CL', 'YA']));
  });
});

describe('the slide of all the movies', () => {
  it('writes the night, its people and its movies', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, filmsSpec, new Map());

    expect(drawn.texts).toEqual(
      expect.arrayContaining([
        'Soirée du vendredi',
        'vendredi 18 septembre 2026 à 20h30',
        '8 participants',
        'Années 80',
        'Inception',
        'Heat',
        '2010',
        '4,5/5',
        '6 notes',
      ])
    );
  });

  it('drops the rating count in a crowded grid rather than running into the next column', () => {
    const { ctx, drawn } = recordingContext();
    const wide = {
      ...film('Inception', null),
      ratingValue: 10,
      ratingText: '10.0/10',
      countText: '12 ratings of the night',
    };
    const films = ['Inception', 'Heat', 'Matrix', 'Alien'].map((title) => ({ ...wide, title }));

    drawStory(ctx, { ...filmsSpec, films }, new Map());

    expect(drawn.texts).toContain('10.0/10');
    expect(drawn.texts).not.toContain('12 ratings of the night');
  });

  it('wraps a long title under its poster rather than cutting it', () => {
    const { ctx, drawn } = recordingContext();
    const films = [film('Le Dernier Phare du Bout du Monde', null), film('Heat', null)];

    drawStory(ctx, { ...filmsSpec, films }, new Map());

    expect(drawn.texts.some((text) => text.endsWith('…'))).toBe(false);
    expect(drawn.texts).not.toContain('Le Dernier Phare du Bout du Monde');
  });

  it('draws the posters and the avatars it was given', () => {
    const { ctx, drawn } = recordingContext();
    const avatar = { avatar: true } as unknown as CanvasImageSource;
    const assets = new Map<string, CanvasImageSource>([
      ['/poster-1.jpg', posterAsset],
      ['https://api.dicebear.com/9.x/bottts-neutral/svg?seed=a', avatar],
    ]);

    drawStory(ctx, filmsSpec, assets);

    expect(drawn.images).toEqual(expect.arrayContaining([posterAsset, avatar]));
  });

  it('falls back to initials when an avatar is missing', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, filmsSpec, new Map());

    expect(drawn.texts).toEqual(expect.arrayContaining(['CL', 'MA']));
    expect(drawn.images).toHaveLength(0);
  });

  it('keeps a crowded grid of movies above the footer', () => {
    const { ctx, drawn } = recordingContext();
    const films = ['Inception', 'Heat', 'Matrix', 'Alien', 'Dune', 'Drive', 'Seven'].map((title) =>
      film(title, null)
    );
    const crowded = Array.from({ length: 3 }, () => films).flat();

    drawStory(ctx, { ...filmsSpec, films: crowded }, new Map());

    const shrink = drawn.scales.at(-1) ?? 1;
    expect(shrink).toBeLessThan(1);
    expect(shrink).toBeGreaterThan(0.6);
  });

  it('draws a grid that fits without shrinking it', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, filmsSpec, new Map());

    expect(drawn.scales).toEqual([]);
  });
});

describe('the footer', () => {
  it('closes every slide with the logo and the line, centered together', () => {
    const logo = { logo: true } as unknown as CanvasImageSource;

    for (const spec of [filmsSpec, filmSpec, ratingsSpec]) {
      const { ctx, drawn } = recordingContext();

      drawStory(ctx, spec, new Map([[STORY_LOGO_SRC, logo]]));

      const box = drawn.boxes.find((entry) => entry.image === logo);
      const line = placed(drawn, spec.footer);
      const left = box?.x ?? 0;
      const right = line.x + line.width;
      expect(box).toBeDefined();
      expect((left + right) / 2).toBeCloseTo(STORY_WIDTH / 2, 3);
      expect((box?.y ?? 0) + (box?.height ?? 0) / 2).toBe(STORY_FOOT_CENTER_Y);
    }
  });

  it('keeps the line centered without a logo', () => {
    const { ctx, drawn } = recordingContext();

    drawStory(ctx, filmSpec, new Map());

    const line = placed(drawn, filmSpec.footer);
    expect(line.x + line.width / 2).toBeCloseTo(STORY_WIDTH / 2, 3);
  });
});
