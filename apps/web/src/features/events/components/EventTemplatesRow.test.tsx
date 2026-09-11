import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import EventTemplatesRow from './EventTemplatesRow';
import { MAX_EVENT_TEMPLATES, type EventTemplateData } from '@/features/events/types';

function makeTemplate(overrides: Partial<EventTemplateData> = {}): EventTemplateData {
  return {
    id: 't1',
    name: 'Soirée horreur',
    theme: '🎃 Halloween',
    maxProposalsPerParticipant: 3,
    maxParticipants: 8,
    wheelMode: 'weightedByVotes',
    richSharePreview: true,
    allowSeries: false,
    winnerCount: 1,
    ...overrides,
  };
}

function renderRow(
  overrides: Partial<{
    templates: EventTemplateData[];
    appliedTemplateId: string | null;
  }> = {}
) {
  const onApply = vi.fn();
  const onRename = vi.fn();
  const onDelete = vi.fn();
  render(
    <LocaleProvider>
      <EventTemplatesRow
        templates={overrides.templates ?? [makeTemplate()]}
        appliedTemplateId={overrides.appliedTemplateId ?? null}
        onApply={onApply}
        onRename={onRename}
        onDelete={onDelete}
      />
    </LocaleProvider>
  );
  return { onApply, onRename, onDelete };
}

describe('EventTemplatesRow', () => {
  it('ne rend rien sans template', () => {
    const { container } = render(
      <LocaleProvider>
        <EventTemplatesRow
          templates={[]}
          appliedTemplateId={null}
          onApply={vi.fn()}
          onRename={vi.fn()}
          onDelete={vi.fn()}
        />
      </LocaleProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('affiche une pastille par template', () => {
    renderRow({
      templates: [makeTemplate(), makeTemplate({ id: 't2', name: 'Ciné du dimanche' })],
    });

    expect(screen.getByRole('button', { name: /Soirée horreur/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ciné du dimanche/ })).toBeInTheDocument();
  });

  it('applique le template au clic', async () => {
    const user = userEvent.setup();
    const { onApply } = renderRow();

    await user.click(screen.getByRole('button', { name: /Soirée horreur/ }));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
  });

  it('marque la pastille appliquée et annonce la configuration', () => {
    renderRow({ appliedTemplateId: 't1' });

    expect(screen.getByRole('button', { name: /Soirée horreur/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByText(/Configuration appliquée/)).toBeInTheDocument();
  });

  it('signale le plafond atteint', () => {
    renderRow({
      templates: Array.from({ length: MAX_EVENT_TEMPLATES }, (_, index) =>
        makeTemplate({ id: `t${index}`, name: `Template ${index}` })
      ),
    });

    expect(screen.getByText(/Supprimez-en un/)).toBeInTheDocument();
  });

  it('bascule en mode gestion et revient aux pastilles', async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole('button', { name: 'Gérer' }));
    expect(screen.getByRole('button', { name: /Renommer le template/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Terminé' }));
    expect(screen.queryByRole('button', { name: /Renommer le template/ })).not.toBeInTheDocument();
  });

  it('renomme un template depuis sa ligne', async () => {
    const user = userEvent.setup();
    const { onRename } = renderRow();

    await user.click(screen.getByRole('button', { name: 'Gérer' }));
    await user.click(screen.getByRole('button', { name: /Renommer le template/ }));

    const field = screen.getByRole('textbox', { name: /Nom du template/ });
    expect(field).toHaveValue('Soirée horreur');

    await user.clear(field);
    await user.type(field, 'Soirée frissons');
    await user.click(screen.getByRole('button', { name: 'Valider' }));

    expect(onRename).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }), 'Soirée frissons');
  });

  it('ignore un renommage vide', async () => {
    const user = userEvent.setup();
    const { onRename } = renderRow();

    await user.click(screen.getByRole('button', { name: 'Gérer' }));
    await user.click(screen.getByRole('button', { name: /Renommer le template/ }));
    await user.clear(screen.getByRole('textbox', { name: /Nom du template/ }));
    await user.click(screen.getByRole('button', { name: 'Valider' }));

    expect(onRename).not.toHaveBeenCalled();
  });

  it('abandonne le renommage sans rien changer', async () => {
    const user = userEvent.setup();
    const { onRename } = renderRow();

    await user.click(screen.getByRole('button', { name: 'Gérer' }));
    await user.click(screen.getByRole('button', { name: /Renommer le template/ }));
    await user.type(screen.getByRole('textbox', { name: /Nom du template/ }), 'zzz');
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Renommer le template/ })).toBeInTheDocument();
  });

  it('supprime un template après confirmation', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderRow();

    await user.click(screen.getByRole('button', { name: 'Gérer' }));
    await user.click(
      screen.getByRole('button', { name: /Supprimer le template « Soirée horreur »/ })
    );

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Supprimer ce template ?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Supprimer le template' }));

    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
  });

  it('renonce à la suppression', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderRow();

    await user.click(screen.getByRole('button', { name: 'Gérer' }));
    await user.click(
      screen.getByRole('button', { name: /Supprimer le template « Soirée horreur »/ })
    );
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Supprimer ce template ?').closest('dialog')).not.toHaveAttribute(
      'open'
    );
  });

  it('quitte le mode gestion quand le dernier template disparaît', () => {
    const { rerender } = render(
      <LocaleProvider>
        <EventTemplatesRow
          templates={[makeTemplate()]}
          appliedTemplateId={null}
          onApply={vi.fn()}
          onRename={vi.fn()}
          onDelete={vi.fn()}
        />
      </LocaleProvider>
    );

    rerender(
      <LocaleProvider>
        <EventTemplatesRow
          templates={[]}
          appliedTemplateId={null}
          onApply={vi.fn()}
          onRename={vi.fn()}
          onDelete={vi.fn()}
        />
      </LocaleProvider>
    );

    expect(screen.queryByText('Mes templates')).not.toBeInTheDocument();
  });

  it('n’affiche aucun compteur tant que rien ne le justifie', () => {
    renderRow({
      templates: [makeTemplate(), makeTemplate({ id: 't2', name: 'Ciné du dimanche' })],
    });

    expect(screen.queryByText(/templates sur 5/)).not.toBeInTheDocument();
  });

  it('affiche le compteur en mode gestion', async () => {
    const user = userEvent.setup();
    renderRow({
      templates: [makeTemplate(), makeTemplate({ id: 't2', name: 'Ciné du dimanche' })],
    });

    await user.click(screen.getByRole('button', { name: 'Gérer' }));

    expect(screen.getByText('2 templates sur 5.')).toBeInTheDocument();
  });
});
