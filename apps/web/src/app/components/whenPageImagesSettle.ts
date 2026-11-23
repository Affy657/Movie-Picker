const DELAY_AFTER_LOAD_MS = 3000;
const MAX_IMAGE_WAIT_MS = 10_000;

function isOnScreen(img: HTMLImageElement): boolean {
  const rect = img.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
}

function finished(img: HTMLImageElement): Promise<void> {
  return new Promise((resolve) => {
    img.addEventListener('load', () => resolve(), { once: true });
    img.addEventListener('error', () => resolve(), { once: true });
  });
}

function whenIdle(callback: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(callback, { timeout: DELAY_AFTER_LOAD_MS });
    return;
  }
  setTimeout(callback, 0);
}

export function whenPageImagesSettle(onSettled: () => void): () => void {
  let done = false;
  const timers: Array<ReturnType<typeof setTimeout>> = [];
  const settle = (): void => {
    if (done) return;
    done = true;
    for (const timer of timers) clearTimeout(timer);
    onSettled();
  };
  const waitForImagesOnScreen = (): void => {
    if (done) return;
    timers.push(setTimeout(settle, MAX_IMAGE_WAIT_MS));
    const loading = [...document.images].filter((img) => !img.complete && isOnScreen(img));
    void Promise.all(loading.map(finished)).then(() => whenIdle(settle));
  };
  const afterLoad = (): void => {
    timers.push(setTimeout(waitForImagesOnScreen, DELAY_AFTER_LOAD_MS));
  };

  if (document.readyState === 'complete') afterLoad();
  else window.addEventListener('load', afterLoad, { once: true });

  return () => {
    done = true;
    for (const timer of timers) clearTimeout(timer);
    window.removeEventListener('load', afterLoad);
  };
}
