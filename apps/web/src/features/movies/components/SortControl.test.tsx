import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SortControl from '@/features/movies/components/SortControl';

const sortOptions = [
  { key: 'createdAt' as const, label: 'Ajout' },
  { key: 'score' as const, label: 'Votes' },
  { key: 'duration' as const, label: 'Durée' },
];

function baseProps() {
  return {
    sortOptions,
    onSetSort: vi.fn(),
    sortLabel: 'Trier par',
    sortMenuAriaLabel: 'Trier par',
    sortDirectionAscLabel: 'Croissant',
    sortDirectionDescLabel: 'Décroissant',
  };
}

describe('SortControl', () => {
  describe('desktop (pastilles)', () => {
    it('shows one chip per criterion, the active one highlighted with its direction', () => {
      render(<SortControl {...baseProps()} sortBy="score" sortDir="desc" isMobile={false} />);
      const active = screen.getByRole('button', { name: /votes/i });
      expect(active).toHaveAttribute('aria-pressed', 'true');
      const others = screen.getAllByRole('button').filter((b) => b !== active);
      expect(others.every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
    });

    it('clicking a chip calls onSetSort with its key', async () => {
      const onSetSort = vi.fn();
      render(
        <SortControl
          {...baseProps()}
          onSetSort={onSetSort}
          sortBy="score"
          sortDir="desc"
          isMobile={false}
        />
      );
      await userEvent.click(screen.getByRole('button', { name: /durée/i }));
      expect(onSetSort).toHaveBeenCalledWith('duration');
    });

    it('clicking the active chip again allows changing the direction (same key returned)', async () => {
      const onSetSort = vi.fn();
      render(
        <SortControl
          {...baseProps()}
          onSetSort={onSetSort}
          sortBy="score"
          sortDir="desc"
          isMobile={false}
        />
      );
      await userEvent.click(screen.getByRole('button', { name: /votes/i }));
      expect(onSetSort).toHaveBeenCalledWith('score');
    });
  });

  describe('mobile (menu)', () => {
    it('shows the active criterion as the trigger label and opens the list of choices', async () => {
      render(<SortControl {...baseProps()} sortBy="score" sortDir="desc" isMobile />);
      const trigger = screen.getByRole('button', { name: /votes/i });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      await userEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('menuitem', { name: 'Ajout' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /votes/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Durée' })).toBeInTheDocument();
    });

    it('choosing another criterion in the menu calls onSetSort and closes the menu', async () => {
      const onSetSort = vi.fn();
      render(
        <SortControl
          {...baseProps()}
          onSetSort={onSetSort}
          sortBy="score"
          sortDir="desc"
          isMobile
        />
      );
      await userEvent.click(screen.getByRole('button', { name: /votes/i }));
      await userEvent.click(screen.getByRole('menuitem', { name: 'Durée' }));
      expect(onSetSort).toHaveBeenCalledWith('duration');
      expect(screen.queryByRole('menuitem', { name: 'Durée' })).not.toBeInTheDocument();
    });

    it('the direction entry shows the current direction and calls onSetSort with the active key', async () => {
      const onSetSort = vi.fn();
      render(
        <SortControl {...baseProps()} onSetSort={onSetSort} sortBy="score" sortDir="asc" isMobile />
      );
      await userEvent.click(screen.getByRole('button', { name: /votes/i }));
      const directionItem = screen.getByRole('menuitem', { name: 'Croissant' });
      await userEvent.click(directionItem);
      expect(onSetSort).toHaveBeenCalledWith('score');
    });
  });
});
