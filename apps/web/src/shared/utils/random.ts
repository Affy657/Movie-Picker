const UINT32_RANGE = 2 ** 32;
const UINT32_MAX = 0xffffffff;

function randomUint32(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]!;
}

export function randomIndex(length: number): number {
  const unbiasedLimit = UINT32_RANGE - (UINT32_RANGE % length);
  let draw = randomUint32();
  while (draw >= unbiasedLimit) draw = randomUint32();
  return draw % length;
}

export function randomCenteredUnit(): number {
  return randomUint32() / UINT32_MAX - 0.5;
}
