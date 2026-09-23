import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StoryShareTab from './StoryShareTab';
import { renderStoryImage } from './renderStoryImage';
import * as download from '@/shared/utils/downloadBlob';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import type { EventData } from '@/features/events/types';
import type { MovieData } from '@/shared/types/movie';

vi.mock('./renderStoryImage', () => ({ renderStoryImage: vi.fn() }));

const rendered = vi.mocked(renderStoryImage);

const movie = (id: string, title: string): MovieData =>
  ({ id, title, year: '2010', posterPath: null, ratings: [] }) as unknown as MovieData;

const winners = [movie('1', 'Inception'), movie('2', 'Heat'), movie('3', 'Matrix')];

const event = {
  slug: 'abc',
  title: 'Soirée du vendredi',
  date: '2026-09-18',
  time: '20:30',
  participantCount: 3,
  participants: [{ id: 'p1', pseudo: 'Clara', isCreator: true }],
  config: { theme: null },
} as EventData;

function setup(over: { winners?: MovieData[] } = {}) {
  return render(
    <AppTestProviders>
      <StoryShareTab
        event={event}
        winners={over.winners ?? winners}
        recapUrl="https://www.movie-picker.fr/r/abc"
        shareText="On a vu Inception pendant Soirée du vendredi, voici le recap !"
      />
    </AppTestProviders>
  );
}

let share: ReturnType<typeof vi.fn>;

function withFileShare() {
  share = vi.fn(async () => undefined);
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
  Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
}

beforeEach(() => {
  rendered.mockReset();
  rendered.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:story'),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'share');
  Reflect.deleteProperty(navigator, 'canShare');
});

describe('StoryShareTab', () => {
  it('offers the three families of story', () => {
    setup();

    const families = screen.getByRole('radiogroup', { name: 'Type de story' });
    expect(within(families).getByRole('radio', { name: 'Les films' })).toBeChecked();
    expect(within(families).getByRole('radio', { name: 'Un film' })).toBeInTheDocument();
    expect(within(families).getByRole('radio', { name: 'Les notes' })).toBeInTheDocument();
  });

  it('drops the all movies family when the night chose a single movie', () => {
    setup({ winners: [winners[0]!] });

    const families = screen.getByRole('radiogroup', { name: 'Type de story' });
    expect(within(families).getByRole('radio', { name: 'Le film' })).toBeChecked();
    expect(within(families).queryByRole('radio', { name: 'Les films' })).not.toBeInTheDocument();
  });

  it('prepares the image, then shows it', async () => {
    setup();

    expect(screen.getByText("Préparation de l'image…")).toBeInTheDocument();
    expect(await screen.findByAltText('Story de Soirée du vendredi')).toHaveAttribute(
      'src',
      'blob:story'
    );
  });

  it('leaves the swipe alone rather than dragging the image away', async () => {
    setup();

    expect(await screen.findByAltText('Story de Soirée du vendredi')).toHaveAttribute(
      'draggable',
      'false'
    );
  });

  it('walks the movies of a family and says where it stands', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('radio', { name: 'Un film' }));
    expect(screen.getByText('Inception (2010)')).toBeInTheDocument();
    expect(screen.getByText('1 sur 3 films')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Story suivante' }));
    expect(screen.getByText('Heat (2010)')).toBeInTheDocument();
    expect(screen.getByText('2 sur 3 films')).toBeInTheDocument();
  });

  it('comes back to the first movie when the family changes', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('radio', { name: 'Un film' }));
    await user.click(screen.getByRole('button', { name: 'Story suivante' }));
    await user.click(screen.getByRole('radio', { name: 'Les notes' }));

    expect(screen.getByText('Inception (2010)')).toBeInTheDocument();
  });

  it('only downloads when the browser cannot share a file', async () => {
    const user = userEvent.setup();
    const downloaded = vi.spyOn(download, 'downloadBlob').mockReturnValue(true);
    setup();

    const button = await screen.findByRole('button', { name: "Télécharger l'image" });
    expect(screen.queryByRole('button', { name: 'Partager' })).not.toBeInTheDocument();

    await user.click(button);
    expect(downloaded).toHaveBeenCalledWith(expect.any(Blob), 'movie-picker-story-abc-films.jpg');
  });

  it('shares the image through the phone when it can', async () => {
    const user = userEvent.setup();
    withFileShare();
    setup();

    await user.click(await screen.findByRole('button', { name: 'Partager' }));

    await waitFor(() => expect(share).toHaveBeenCalled());
    const call = share.mock.calls[0]?.[0] as { files: File[]; url: string };
    expect(call.files[0]?.name).toBe('movie-picker-story-abc-films.jpg');
    expect(call.url).toBe('https://www.movie-picker.fr/r/abc');
  });

  it('says when the image could not be created', async () => {
    rendered.mockResolvedValue(null);
    setup();

    expect(await screen.findByText("L'image n'a pas pu être créée")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "Télécharger l'image" })).not.toBeInTheDocument();
  });

  it('offers to draw the image again after a failure', async () => {
    const user = userEvent.setup();
    rendered.mockResolvedValueOnce(null);
    setup();

    await user.click(await screen.findByRole('button', { name: 'Réessayer' }));

    expect(await screen.findByAltText('Story de Soirée du vendredi')).toBeInTheDocument();
  });

  it('tells how to walk the stories only when there are several', async () => {
    const user = userEvent.setup();
    setup();

    expect(screen.queryByText(/Balayez/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Un film' }));
    expect(screen.getByText(/Balayez/)).toBeInTheDocument();
  });
});
