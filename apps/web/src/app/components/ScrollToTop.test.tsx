import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import ScrollToTop from '@/app/components/ScrollToTop';
import { writeHistoryEntryValue } from '@/shared/hooks/useHistoryEntryState';

const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

function BackButton() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)}>
      Retour
    </button>
  );
}

function renderApp(initialEntry: string | { pathname: string; key: string } = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ScrollToTop />
      <Link to="/">Explorer</Link>
      <Link to="/watchlist">Ma liste</Link>
      <Link to="/watchlist?tri=note">Trier</Link>
      <Link to="/#faq">Ancre</Link>
      <Link to="/film/42">Film</Link>
      <BackButton />
      <Routes>
        <Route path="/" element={<h1>Accueil</h1>} />
        <Route path="/watchlist" element={<h1>Ma liste</h1>} />
        <Route path="/film/:id" element={<h1>Film</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

function setPageHeight(height: number) {
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: height,
  });
}

function scrollWindowTo(y: number) {
  Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: y });
  fireEvent.scroll(window);
}

function stubAnimationFrames() {
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => {
    frames[handle - 1] = () => undefined;
  });
  return {
    runNext() {
      const pending = frames.splice(0);
      for (const frame of pending) frame(0);
    },
  };
}

describe('ScrollToTop', () => {
  beforeEach(() => {
    scrollTo.mockClear();
    setPageHeight(5000);
    scrollWindowTo(0);
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('does not scroll on the first render', () => {
    renderApp();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls back to the top after navigating to another route', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('link', { name: 'Ma liste' }));
    expect(await screen.findByRole('heading', { name: 'Ma liste' })).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('scrolls back to the top when the link points to the route already displayed', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('link', { name: 'Explorer' }));
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('does not scroll when only the current page parameters change', async () => {
    const user = userEvent.setup();
    renderApp('/watchlist');
    scrollTo.mockClear();
    await user.click(screen.getByRole('link', { name: 'Trier' }));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('lets the browser handle a navigation to an anchor', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('link', { name: 'Ancre' }));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('takes over the scroll restoration of the browser', () => {
    renderApp();
    expect(window.history.scrollRestoration).toBe('manual');
  });

  it('brings Back to the offset the list was left at', async () => {
    const user = userEvent.setup();
    renderApp('/watchlist');
    scrollWindowTo(1800);

    await user.click(screen.getByRole('link', { name: 'Film' }));
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);
    scrollWindowTo(0);
    await user.click(screen.getByRole('button', { name: 'Retour' }));

    expect(await screen.findByRole('heading', { name: 'Ma liste' })).toBeInTheDocument();
    expect(scrollTo).toHaveBeenLastCalledWith(0, 1800);
  });

  it('waits for the list to be tall enough before restoring its offset', async () => {
    const user = userEvent.setup();
    renderApp('/watchlist');
    scrollWindowTo(1800);
    await user.click(screen.getByRole('link', { name: 'Film' }));
    scrollWindowTo(0);
    const frames = stubAnimationFrames();
    setPageHeight(900);
    scrollTo.mockClear();

    await user.click(screen.getByRole('button', { name: 'Retour' }));
    expect(scrollTo).not.toHaveBeenCalled();

    setPageHeight(5000);
    act(() => frames.runNext());

    expect(scrollTo).toHaveBeenCalledWith(0, 1800);
  });

  it('gives up restoring as soon as the reader scrolls', async () => {
    const user = userEvent.setup();
    renderApp('/watchlist');
    scrollWindowTo(1800);
    await user.click(screen.getByRole('link', { name: 'Film' }));
    scrollWindowTo(0);
    const frames = stubAnimationFrames();
    setPageHeight(900);
    scrollTo.mockClear();

    await user.click(screen.getByRole('button', { name: 'Retour' }));
    fireEvent.wheel(window);
    setPageHeight(5000);
    act(() => frames.runNext());

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('restores the offset of the entry after a reload', () => {
    writeHistoryEntryValue('list-entry', 'scrollY', 2400);

    renderApp({ pathname: '/watchlist', key: 'list-entry' });

    expect(scrollTo).toHaveBeenCalledWith(0, 2400);
  });

  it('keeps the offset of the entry when the page is left for good', () => {
    const { unmount } = renderApp({ pathname: '/watchlist', key: 'list-entry' });
    scrollWindowTo(700);

    fireEvent(window, new Event('pagehide'));
    unmount();
    scrollTo.mockClear();
    scrollWindowTo(0);
    renderApp({ pathname: '/watchlist', key: 'list-entry' });

    expect(scrollTo).toHaveBeenCalledWith(0, 700);
  });
});
