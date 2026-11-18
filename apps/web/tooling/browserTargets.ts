import browserslist from 'browserslist';

const BUILD_NAMES: Readonly<Record<string, string>> = {
  ios_saf: 'ios',
  safari: 'safari',
  chrome: 'chrome',
  edge: 'edge',
  firefox: 'firefox',
};

export function buildTargetsFrom(browsers: ReadonlyArray<string>): string[] {
  const oldest = new Map<string, number[]>();
  for (const entry of browsers) {
    const [name = '', range = ''] = entry.split(' ');
    const buildName = BUILD_NAMES[name];
    if (!buildName) continue;
    const version = (range.split('-')[0] ?? '').split('.').map(Number);
    const current = oldest.get(buildName);
    const older =
      !current ||
      version[0]! < current[0]! ||
      (version[0] === current[0] && (version[1] ?? 0) < (current[1] ?? 0));
    if (older) oldest.set(buildName, version);
  }
  return [...oldest].map(([name, version]) => `${name}${version.join('.')}`).sort();
}

export function browserTargets(webRoot: string): string[] {
  return buildTargetsFrom(browserslist(undefined, { path: webRoot }));
}
