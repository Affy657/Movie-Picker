export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.replace(/^www\./, '');
    let id: string | null = null;
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') id = parsed.searchParams.get('v');
      else if (parsed.pathname.startsWith('/embed/')) id = parsed.pathname.slice('/embed/'.length);
      else if (parsed.pathname.startsWith('/v/')) id = parsed.pathname.slice('/v/'.length);
    } else if (host === 'youtu.be') {
      id = parsed.pathname.slice(1);
    }
    if (!id) return null;
    const base = id.split('/')[0];
    return base && /^[A-Za-z0-9_-]{6,20}$/.test(base) ? base : null;
  } catch {
    return null;
  }
}

export function youTubeEmbedUrl(url: string | null | undefined): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}
