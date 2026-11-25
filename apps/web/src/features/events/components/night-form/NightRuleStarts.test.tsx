import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import type { EventTemplateData } from '@/features/events/types';
import NightRuleStarts, { ManageTemplatesButton } from './NightRuleStarts';

function makeTemplate(overrides: Partial<EventTemplateData> = {}): EventTemplateData {
  return {
    id: 't1',
    name: 'Soirée horreur',
    theme: '🎃 Halloween',
    maxProposalsPerParticipant: 3,
    maxParticipants: 8,
    maxVotesPerParticipant: null,
    wheelMode: 'weightedByVotes',
    richSharePreview: true,
    allowSeries: false,
    anonymousProposals: false,
    winnerCount: 1,
    ...overrides,
  };
}

type Overrides = Partial<{
  templates: EventTemplateData[];
  nights: Array<{ slug: string; title: string }>;
  selectedTemplateId: string | null;
  modifiedTemplateId: string | null;
  applyLocked: boolean;
}>;

function renderStarts(overrides: Overrides = {}) {
  const onChoose = vi.fn();
  const onRename = vi.fn();
  const onDelete = vi.fn();

  function Harness() {
    const [managing, setManaging] = useState(false);
    const templates = overrides.templates ?? [makeTemplate()];
    return (
      <LocaleProvider>
        {templates.length > 0 ? (
          <ManageTemplatesButton managing={managing} onManagingChange={setManaging} />
        ) : null}
        <NightRuleStarts
          defaultsSelected={false}
          nights={overrides.nights}
          templates={templates}
          selectedTemplateId={overrides.selectedTemplateId ?? null}
          modifiedTemplateId={overrides.modifiedTemplateId ?? null}
          applyLocked={overrides.applyLocked}
          managing={managing}
          onManagingChange={setManaging}
          onChoose={onChoose}
          onRename={onRename}
          onDelete={onDelete}
        />
      </LocaleProvider>
    );
  }

  render(<Harness />);
  return { onChoose, onRename, onDelete };
}

describe('NightRuleStarts', () => {
  it('offers no starting point when the defaults are the only one', () => {
    renderStarts({ templates: [] });

    expect(screen.queryByRole('button', { name: 'Par défaut' })).toBeNull();
  });

  it('offers the defaults, the past nights and the saved templates', () => {
    renderStarts({ nights: [{ slug: 'old', title: 'Ciné-club' }] });

    expect(screen.getByRole('button', { name: 'Par défaut' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /comme « ciné-club »/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Soirée horreur' })).toBeInTheDocument();
  });

  it('applies a template on click', async () => {
    const user = userEvent.setup();
    const { onChoose } = renderStarts();

    await user.click(screen.getByRole('button', { name: 'Soirée horreur' }));

    expect(onChoose).toHaveBeenCalledWith({ kind: 'template', template: makeTemplate() });
  });

  it('marks the template in use', () => {
    renderStarts({ selectedTemplateId: 't1' });

    expect(screen.getByRole('button', { name: 'Soirée horreur' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('applies nothing once the draw has started, and says why', async () => {
    const user = userEvent.setup();
    const { onChoose } = renderStarts({ applyLocked: true });

    await user.click(screen.getByRole('button', { name: 'Soirée horreur' }));

    expect(onChoose).not.toHaveBeenCalled();
    expect(screen.getByText(/les modèles ne s’appliquent plus/i)).toBeInTheDocument();
  });

  it('switches to the management of the templates and back', async () => {
    const user = userEvent.setup();
    renderStarts();

    await user.click(screen.getByRole('button', { name: 'Gérer' }));
    expect(
      screen.getByRole('button', { name: 'Renommer le modèle « Soirée horreur »' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Terminé' }));
    expect(screen.getByRole('button', { name: 'Soirée horreur' })).toBeInTheDocument();
  });

  it('renames a template from its row', async () => {
    const user = userEvent.setup();
    const { onRename } = renderStarts();

    await user.click(screen.getByRole('button', { name: 'Gérer' }));
    await user.click(screen.getByRole('button', { name: 'Renommer le modèle « Soirée horreur »' }));
    const field = screen.getByRole('textbox', { name: 'Nom du modèle' });
    await user.clear(field);
    await user.type(field, 'Soirée frissons');
    await user.click(screen.getByRole('button', { name: 'Valider' }));

    expect(onRename).toHaveBeenCalledWith(makeTemplate(), 'Soirée frissons');
  });

  it('drops a rename in progress once the management is left', async () => {
    const user = userEvent.setup();
    const { onRename } = renderStarts();

    await user.click(screen.getByRole('button', { name: 'Gérer' }));
    await user.click(screen.getByRole('button', { name: 'Renommer le modèle « Soirée horreur »' }));
    await user.type(screen.getByRole('textbox', { name: 'Nom du modèle' }), ' bis');
    await user.click(screen.getByRole('button', { name: 'Terminé' }));
    await user.click(screen.getByRole('button', { name: 'Gérer' }));

    expect(screen.queryByRole('textbox', { name: 'Nom du modèle' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Renommer le modèle « Soirée horreur »' })
    ).toBeInTheDocument();
    expect(onRename).not.toHaveBeenCalled();
  });

  it('ignores an empty name', async () => {
    const user = userEvent.setup();
    const { onRename } = renderStarts();

    await user.click(screen.getByRole('button', { name: 'Gérer' }));
    await user.click(screen.getByRole('button', { name: 'Renommer le modèle « Soirée horreur »' }));
    await user.clear(screen.getByRole('textbox', { name: 'Nom du modèle' }));
    await user.click(screen.getByRole('button', { name: 'Valider' }));

    expect(onRename).not.toHaveBeenCalled();
  });

  it('deletes a template after confirmation', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderStarts();

    await user.click(screen.getByRole('button', { name: 'Gérer' }));
    await user.click(
      screen.getByRole('button', { name: 'Supprimer le modèle « Soirée horreur »' })
    );
    await user.click(await screen.findByRole('button', { name: 'Supprimer le modèle' }));

    expect(onDelete).toHaveBeenCalledWith(makeTemplate());
  });

  it('gives up the deletion', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderStarts();

    await user.click(screen.getByRole('button', { name: 'Gérer' }));
    await user.click(
      screen.getByRole('button', { name: 'Supprimer le modèle « Soirée horreur »' })
    );
    await user.click(await screen.findByRole('button', { name: 'Annuler' }));

    expect(onDelete).not.toHaveBeenCalled();
  });
});
