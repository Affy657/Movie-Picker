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
    it('affiche une pastille par critère, celle active en évidence avec sa direction', () => {
      render(<SortControl {...baseProps()} sortBy="score" sortDir="desc" isMobile={false} />);
      const active = screen.getByRole('button', { name: /votes/i });
      expect(active).toHaveAttribute('aria-pressed', 'true');
      const others = screen.getAllByRole('button').filter((b) => b !== active);
      expect(others.every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
    });

    it('cliquer une pastille appelle onSetSort avec sa clé', async () => {
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

    it('recliquer la pastille active permet de changer le sens (même clé renvoyée)', async () => {
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
    it('affiche le critère actif comme libellé du déclencheur et ouvre la liste des choix', async () => {
      render(<SortControl {...baseProps()} sortBy="score" sortDir="desc" isMobile />);
      const trigger = screen.getByRole('button', { name: /votes/i });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      await userEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('menuitem', { name: 'Ajout' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /votes/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Durée' })).toBeInTheDocument();
    });

    it('choisir un autre critère dans le menu appelle onSetSort et referme le menu', async () => {
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

    it("l'entrée de direction affiche le sens courant et appelle onSetSort avec la clé active", async () => {
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
