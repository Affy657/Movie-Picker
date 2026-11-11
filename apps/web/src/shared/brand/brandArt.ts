export const BRAND_NAME = 'Movie Picker';

export const BRAND_COLORS = {
  clap: '#1d4ed8',
  clapOnDark: '#3b82f6',
  ink: '#ffffff',
  tile: '#0f172a',
  word: '#0f172a',
  wordOnDark: '#f8fafc',
  picker: '#2563eb',
  pickerOnDark: '#60a5fa',
  dot: '#22d3ee',
} as const;

export const CLAP = {
  viewBox: '5 5 54 54',
  transform: 'translate(32 32) scale(1.04) translate(-31.19 -30.25)',
  body: { x: 8, y: 26, width: 48, height: 27, rx: 4 },
  play: 'M29.342 33.671L39.658 38.829Q41 39.5 39.658 40.171L29.342 45.329Q28 46 28 44.5L28 34.5Q28 33 29.342 33.671Z',
  bar: { x: 8, y: 16.5, width: 48, height: 8.5, rx: 1.5 },
  barRest: 'rotate(-11 8 25)',
  stripes:
    'M10.03 25H15.78L19.48 16.5H13.73Z' +
    'M21.53 25H27.28L30.98 16.5H25.23Z' +
    'M33.03 25H38.78L42.48 16.5H36.73Z' +
    'M44.53 25H50.28L53.98 16.5H48.23Z',
  spark: 'M58.5 14.5L61.5 12M59.5 20.75H63.5M58.5 27L61.5 29.5',
} as const;

export const WORDMARK = {
  viewBox: '0 0 5687 958',
  movie:
    'M0 755L0 244L138 244L138 291Q163 260 193 246Q222 232 260 232Q305 232 337 250Q368 268 386 304Q411 269 452 251Q493 232 544 232Q642 232 690 283Q738 333 738 437L738 755L600 755L600 486Q600 422 581 393Q562 364 520 364Q491 364 473 376Q455 389 446 415Q438 441 438 483L438 755L300 755L300 486Q300 422 281 393Q263 364 221 364Q177 364 157 392Q138 419 138 482L138 755ZM1066 767Q957 767 894 696Q831 625 831 500Q831 418 860 358Q889 298 941 265Q994 232 1066 232Q1138 232 1190 265Q1242 298 1271 358Q1299 418 1299 500Q1299 583 1271 643Q1243 703 1191 735Q1138 767 1066 767ZM1066 635Q1112 635 1137 600Q1163 564 1163 500Q1163 436 1137 400Q1111 364 1066 364Q1021 364 995 400Q969 437 969 500Q969 563 995 599Q1021 635 1066 635ZM1518 755L1331 244L1474 244L1577 536Q1581 546 1584 559Q1588 572 1591 584Q1594 572 1598 559Q1602 547 1605 536L1708 244L1851 244L1664 755ZM1925 755L1925 244L2062 244L2062 755ZM2401 767Q2326 767 2272 735Q2218 702 2189 642Q2160 582 2160 499Q2160 417 2190 357Q2219 297 2273 265Q2327 232 2401 232Q2464 232 2516 258Q2567 285 2597 338Q2628 392 2628 474Q2628 488 2627 508Q2627 528 2624 547L2295 547Q2296 579 2309 602Q2322 625 2346 637Q2369 650 2401 650Q2439 650 2466 638Q2492 626 2517 598L2596 678Q2561 719 2513 743Q2465 767 2401 767ZM2296 442L2496 442Q2493 413 2481 392Q2469 371 2448 360Q2427 349 2398 349Q2357 349 2329 373Q2302 397 2296 442Z',
  picker:
    'M2960 958L2960 244L3097 244L3097 280Q3135 232 3203 232Q3269 232 3317 264Q3364 297 3390 357Q3415 417 3415 500Q3415 580 3388 640Q3362 700 3314 734Q3266 767 3202 767Q3168 767 3142 755Q3116 743 3097 720L3097 896ZM3180 635Q3227 635 3252 600Q3277 564 3277 500Q3277 435 3252 399Q3227 364 3180 364Q3153 364 3133 373Q3113 382 3097 400L3097 597Q3106 614 3129 625Q3152 635 3180 635ZM3513 755L3513 244L3651 244L3651 755ZM3984 767Q3912 767 3859 735Q3806 702 3777 642Q3749 582 3749 500Q3749 418 3778 358Q3807 298 3860 265Q3913 232 3985 232Q4068 232 4123 271Q4178 310 4203 386L4072 430Q4060 398 4038 381Q4016 364 3987 364Q3943 364 3915 401Q3888 439 3888 500Q3888 561 3915 598Q3941 636 3984 636Q4016 636 4039 617Q4061 598 4073 562L4204 600Q4180 684 4124 725Q4069 767 3984 767ZM4300 755L4300 97L4437 33L4437 379L4571 244L4734 244L4581 394L4768 755L4618 755L4479 492L4437 532L4437 755ZM5031 767Q4956 767 4902 735Q4848 702 4819 642Q4790 582 4790 499Q4790 417 4820 357Q4849 297 4903 265Q4957 232 5031 232Q5094 232 5146 258Q5197 285 5227 338Q5258 392 5258 474Q5258 488 5257 508Q5257 528 5254 547L4925 547Q4926 579 4939 602Q4952 625 4976 637Q4999 650 5031 650Q5069 650 5096 638Q5122 626 5147 598L5226 678Q5191 719 5143 743Q5095 767 5031 767ZM4926 442L5126 442Q5123 413 5111 392Q5099 371 5078 360Q5057 349 5028 349Q4987 349 4959 373Q4932 397 4926 442ZM5351 755L5351 244L5488 244L5488 295Q5501 269 5530 250Q5560 232 5591 232Q5648 232 5687 273L5668 399Q5646 380 5626 372Q5606 365 5581 365Q5552 365 5531 378Q5510 391 5499 417Q5488 442 5488 478L5488 755Z',
  movieDot: { cx: 1989.5, cy: 110, r: 77.5 },
  pickerDot: { cx: 3578, cy: 110, r: 110 },
} as const;

type ClapPaint = { readonly clap: string; readonly ink: string };

function clapShapes(paint: ClapPaint): string {
  const { x, y, width, height, rx } = CLAP.body;
  const bar = CLAP.bar;
  return (
    `<g transform="${CLAP.transform}">` +
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" ${paint.clap}/>` +
    `<path d="${CLAP.play}" ${paint.ink}/>` +
    `<g transform="${CLAP.barRest}">` +
    `<rect x="${bar.x}" y="${bar.y}" width="${bar.width}" height="${bar.height}" rx="${bar.rx}" ${paint.clap}/>` +
    `<path d="${CLAP.stripes}" ${paint.ink}/>` +
    `</g></g>`
  );
}

const fill = (color: string) => `fill="${color}"`;

function svgOpen(viewBox: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${BRAND_NAME}">`;
}

export function renderLogoSvg(): string {
  return `${svgOpen(CLAP.viewBox)}${clapShapes({ clap: fill(BRAND_COLORS.clap), ink: fill(BRAND_COLORS.ink) })}</svg>\n`;
}

export function renderFaviconSvg(): string {
  const style = `<style>.c{fill:${BRAND_COLORS.clap}}@media (prefers-color-scheme:dark){.c{fill:${BRAND_COLORS.clapOnDark}}}</style>`;
  return `${svgOpen(CLAP.viewBox)}${style}${clapShapes({ clap: 'class="c"', ink: fill(BRAND_COLORS.ink) })}</svg>\n`;
}

export type AppIconOptions = {
  readonly scale: number;
  readonly background?: string;
  readonly clap?: string;
};

export function renderAppIconSvg({
  scale,
  background,
  clap = BRAND_COLORS.clap,
}: AppIconOptions): string {
  const tile = background ? `<rect width="64" height="64" ${fill(background)}/>` : '';
  return (
    `${svgOpen('0 0 64 64')}${tile}` +
    `<g transform="translate(32 32) scale(${scale}) translate(-32 -32)">` +
    `${clapShapes({ clap: fill(clap), ink: fill(BRAND_COLORS.ink) })}</g></svg>\n`
  );
}

export type WordmarkPaint = {
  readonly word: string;
  readonly picker: string;
  readonly dot: string;
};

export function renderWordmarkShapes(paint: WordmarkPaint): string {
  const { movieDot, pickerDot } = WORDMARK;
  return (
    `<path d="${WORDMARK.movie}" ${fill(paint.word)}/>` +
    `<circle cx="${movieDot.cx}" cy="${movieDot.cy}" r="${movieDot.r}" ${fill(paint.word)}/>` +
    `<path d="${WORDMARK.picker}" ${fill(paint.picker)}/>` +
    `<circle cx="${pickerDot.cx}" cy="${pickerDot.cy}" r="${pickerDot.r}" ${fill(paint.dot)}/>`
  );
}

export function renderClapShapes(clap: string): string {
  return clapShapes({ clap: fill(clap), ink: fill(BRAND_COLORS.ink) });
}
