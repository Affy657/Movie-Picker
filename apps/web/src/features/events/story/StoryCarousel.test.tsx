import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import StoryCarousel from './StoryCarousel';
import type { StorySlide } from './storySlides';
import type { MovieData } from '@/shared/types/movie';

const movies = ['Inception', 'Heat', 'Matrix'].map(
  (title, index) => ({ id: String(index + 1), title }) as MovieData
);

const slides: StorySlide[] = movies.map((movie, index) => ({
  key: `film-${movie.id}`,
  family: 'film',
  movie,
  index,
}));

function setup(index = 0, onIndexChange = vi.fn()) {
  render(
    <StoryCarousel
      slides={slides}
      index={index}
      onIndexChange={onIndexChange}
      label="Stories de la soirée"
      roleDescription="carrousel"
      slideLabel={(slide) => `Story, ${slide.movie?.title}`}
      renderSlide={(slide, current) => (
        <span>{current ? `courant ${slide.movie?.title}` : `voisin ${slide.movie?.title}`}</span>
      )}
      previousLabel="Story précédente"
      nextLabel="Story suivante"
    />
  );
  return onIndexChange;
}

describe('StoryCarousel', () => {
  it('shows the current story between its neighbours', () => {
    setup(1);

    expect(screen.getByText('courant Heat')).toBeInTheDocument();
    expect(screen.getByText('voisin Inception')).toBeInTheDocument();
    expect(screen.getByText('voisin Matrix')).toBeInTheDocument();
  });

  it('tells where the reader stands', () => {
    setup(1);

    expect(screen.getByRole('group', { name: 'Stories de la soirée' })).toBeInTheDocument();
    expect(screen.getByText('Story, Heat')).toBeInTheDocument();
  });

  it('moves with the arrows', async () => {
    const user = userEvent.setup();
    const onIndexChange = setup(1);

    await user.click(screen.getByRole('button', { name: 'Story suivante' }));
    expect(onIndexChange).toHaveBeenCalledWith(2);

    await user.click(screen.getByRole('button', { name: 'Story précédente' }));
    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it('stops at both ends', async () => {
    const user = userEvent.setup();
    const onIndexChange = setup(0);

    expect(screen.getByRole('button', { name: 'Story précédente' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Story suivante' }));
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('moves with the keyboard', () => {
    const onIndexChange = setup(1);
    const group = screen.getByRole('group', { name: 'Stories de la soirée' });

    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onIndexChange).toHaveBeenCalledWith(2);

    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it('follows a swipe to the left', () => {
    const onIndexChange = setup(0);
    const group = screen.getByRole('group', { name: 'Stories de la soirée' });

    fireEvent.pointerDown(group, { clientX: 200, pointerId: 1 });
    fireEvent.pointerUp(group, { clientX: 100, pointerId: 1 });

    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('ignores a finger that barely moved', () => {
    const onIndexChange = setup(1);
    const group = screen.getByRole('group', { name: 'Stories de la soirée' });

    fireEvent.pointerDown(group, { clientX: 200, pointerId: 1 });
    fireEvent.pointerUp(group, { clientX: 190, pointerId: 1 });

    expect(onIndexChange).not.toHaveBeenCalled();
  });

  it('has neither arrows nor dots for a lone story', () => {
    render(
      <StoryCarousel
        slides={[{ key: 'films-0', family: 'films', movie: null, index: 0 }]}
        index={0}
        onIndexChange={vi.fn()}
        label="Stories de la soirée"
        roleDescription="carrousel"
        slideLabel={() => 'Story, les films'}
        renderSlide={() => <span>les films</span>}
        previousLabel="Story précédente"
        nextLabel="Story suivante"
      />
    );

    expect(screen.queryByRole('button', { name: 'Story suivante' })).not.toBeInTheDocument();
    expect(screen.getByText('les films')).toBeInTheDocument();
  });
});
