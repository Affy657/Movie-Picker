import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StarRating from '@/shared/components/StarRating';
import { stubMatchMedia } from '@/test-utils/matchMedia';

const starLabel = (stars: number) => `Noter ${stars} étoile${stars > 1 ? 's' : ''}`;

function renderStars(value: number | null, onChange = vi.fn()) {
  render(
    <StarRating value={value} onChange={onChange} ariaLabel="Votre note" starLabel={starLabel} />
  );
  return onChange;
}

function fills(): string[] {
  return screen.getAllByRole('button').map((b) => b.getAttribute('data-fill') ?? '');
}

describe('StarRating', () => {
  it('draws five labelled stars, filled up to the value with a half star for odd tenths', () => {
    renderStars(7);

    expect(screen.getByRole('group', { name: 'Votre note' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Noter 1 étoile' })).toBeInTheDocument();
    expect(fills()).toEqual(['full', 'full', 'full', 'half', 'empty']);
  });

  it('starts empty and unpressed without a value', () => {
    renderStars(null);

    expect(fills()).toEqual(['empty', 'empty', 'empty', 'empty', 'empty']);
    for (const b of screen.getAllByRole('button'))
      expect(b).toHaveAttribute('aria-pressed', 'false');
  });

  it('a tap on a star gives that many full stars', async () => {
    const onChange = renderStars(null);

    await userEvent.click(screen.getByRole('button', { name: 'Noter 4 étoiles' }));

    expect(onChange).toHaveBeenCalledWith(8);
  });

  it('a second tap on the same full star turns it into a half star, a third restores it', async () => {
    const onChange = renderStars(8);
    await userEvent.click(screen.getByRole('button', { name: 'Noter 4 étoiles' }));
    expect(onChange).toHaveBeenLastCalledWith(7);

    const again = renderStars(7);
    await userEvent.click(screen.getAllByRole('button', { name: 'Noter 4 étoiles' })[1]!);
    expect(again).toHaveBeenLastCalledWith(8);
  });

  it('with a mouse, the left half of a star previews and picks the half star', () => {
    stubMatchMedia((query) => query.includes('pointer: fine'));
    const onChange = renderStars(null);
    const star = screen.getByRole('button', { name: 'Noter 3 étoiles' });
    vi.spyOn(star, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      width: 40,
      top: 0,
      height: 40,
      right: 140,
      bottom: 40,
      x: 100,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.mouseMove(star, { clientX: 105 });
    expect(fills()).toEqual(['full', 'full', 'half', 'empty', 'empty']);

    fireEvent.click(star, { clientX: 105, detail: 1 });
    expect(onChange).toHaveBeenCalledWith(5);

    fireEvent.mouseLeave(screen.getByRole('group', { name: 'Votre note' }));
    expect(fills()).toEqual(['empty', 'empty', 'empty', 'empty', 'empty']);
  });

  it('a keyboard activation while the mouse rests on a star still gives the full star', () => {
    stubMatchMedia((query) => query.includes('pointer: fine'));
    const onChange = renderStars(null);
    const star = screen.getByRole('button', { name: 'Noter 3 étoiles' });
    vi.spyOn(star, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      width: 40,
      top: 0,
      height: 40,
      right: 140,
      bottom: 40,
      x: 100,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.mouseMove(star, { clientX: 105 });
    fireEvent.click(star, { clientX: 0, detail: 0 });

    expect(onChange).toHaveBeenCalledWith(6);
  });

  it('moves by half a star with the arrow keys, within 1 and 10', async () => {
    const onChange = renderStars(7);
    const star = screen.getByRole('button', { name: 'Noter 4 étoiles' });
    star.focus();

    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith(8);
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith(6);

    const atMax = renderStars(10);
    screen.getAllByRole('button', { name: 'Noter 5 étoiles' })[1]!.focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(atMax).not.toHaveBeenCalled();
  });
});
