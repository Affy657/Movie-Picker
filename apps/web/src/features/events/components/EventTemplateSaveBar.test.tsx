import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import EventTemplateSaveBar from './EventTemplateSaveBar';
import { MAX_EVENT_TEMPLATES, type EventTemplateData } from '@/features/events/types';
import type { TemplateConfigDraft } from '@/features/events/lib/eventTemplateDraft';

const draft: TemplateConfigDraft = {
  theme: '🎃 Halloween',
  maxProposalsPerParticipant: 3,
  maxParticipants: 8,
  maxVotesPerParticipant: null,
  wheelMode: 'weightedByVotes',
  richSharePreview: true,
  allowSeries: false,
  winnerCount: 1,
};

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
    winnerCount: 1,
    ...overrides,
  };
}

function renderBar(
  overrides: Partial<{
    draft: TemplateConfigDraft;
    templates: EventTemplateData[];
    appliedTemplate: EventTemplateData | null;
    lastSaved: EventTemplateData | null;
    variant: 'create' | 'event';
  }> = {}
) {
  const onSave = vi.fn();
  const onUpdate = vi.fn();
  render(
    <LocaleProvider>
      <EventTemplateSaveBar
        draft={overrides.draft ?? draft}
        templates={overrides.templates ?? []}
        appliedTemplate={overrides.appliedTemplate ?? null}
        lastSaved={overrides.lastSaved ?? null}
        variant={overrides.variant ?? 'create'}
        onSave={onSave}
        onUpdate={onUpdate}
      />
    </LocaleProvider>
  );
  return { onSave, onUpdate };
}

describe('EventTemplateSaveBar', () => {
  it('propose d’enregistrer la configuration', () => {
    renderBar();

    expect(
      screen.getByRole('button', { name: 'Enregistrer cette configuration' })
    ).toBeInTheDocument();
  });

  it('utilise le libellé de la page soirée', () => {
    renderBar({ variant: 'event' });

    expect(screen.getByRole('button', { name: 'En faire un template' })).toBeInTheDocument();
  });

  it('préremplit le nom avec le thème puis enregistre', async () => {
    const user = userEvent.setup();
    const { onSave } = renderBar();

    await user.click(screen.getByRole('button', { name: 'Enregistrer cette configuration' }));

    const field = screen.getByRole('textbox', { name: /Nom du template/ });
    expect(field).toHaveValue('🎃 Halloween');

    await user.click(screen.getByRole('button', { name: 'Valider' }));

    expect(onSave).toHaveBeenCalledWith('🎃 Halloween');
  });

  it('propose un nom numéroté sans thème', async () => {
    const user = userEvent.setup();
    renderBar({ draft: { ...draft, theme: null } });

    await user.click(screen.getByRole('button', { name: 'Enregistrer cette configuration' }));

    expect(screen.getByRole('textbox', { name: /Nom du template/ })).toHaveValue('Template 1');
  });

  it('n’enregistre pas un nom vide', async () => {
    const user = userEvent.setup();
    const { onSave } = renderBar();

    await user.click(screen.getByRole('button', { name: 'Enregistrer cette configuration' }));
    await user.clear(screen.getByRole('textbox', { name: /Nom du template/ }));
    await user.click(screen.getByRole('button', { name: 'Valider' }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('abandonne le nommage', async () => {
    const user = userEvent.setup();
    const { onSave } = renderBar();

    await user.click(screen.getByRole('button', { name: 'Enregistrer cette configuration' }));
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Enregistrer cette configuration' })
    ).toBeInTheDocument();
  });

  it('désactive l’enregistrement au plafond', () => {
    renderBar({
      templates: Array.from({ length: MAX_EVENT_TEMPLATES }, (_, index) =>
        makeTemplate({ id: `t${index}`, name: `Template ${index}` })
      ),
    });

    expect(screen.getByRole('button', { name: 'Enregistrer cette configuration' })).toBeDisabled();
  });

  it('ne propose rien de plus quand le template appliqué est inchangé', () => {
    renderBar({ templates: [makeTemplate()], appliedTemplate: makeTemplate() });

    expect(screen.queryByRole('button', { name: 'Mettre à jour' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Enregistrer cette configuration' })
    ).toBeInTheDocument();
  });

  it('propose la mise à jour quand la configuration appliquée a changé', async () => {
    const user = userEvent.setup();
    const applied = makeTemplate();
    const { onUpdate } = renderBar({
      draft: { ...draft, maxProposalsPerParticipant: 5 },
      templates: [applied],
      appliedTemplate: applied,
    });

    expect(screen.getByText(/Soirée horreur/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mettre à jour' }));

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
  });

  it('permet d’enregistrer une copie quand la configuration appliquée a changé', async () => {
    const user = userEvent.setup();
    const applied = makeTemplate();
    const { onSave } = renderBar({
      draft: { ...draft, theme: null, maxProposalsPerParticipant: 5 },
      templates: [applied],
      appliedTemplate: applied,
    });

    await user.click(screen.getByRole('button', { name: 'Enregistrer comme nouveau' }));
    await user.click(screen.getByRole('button', { name: 'Valider' }));

    expect(onSave).toHaveBeenCalledWith('Template 1');
  });

  it('propose un nom libre quand le thème est déjà pris', async () => {
    const user = userEvent.setup();
    renderBar({ templates: [makeTemplate({ name: '🎃 Halloween' })] });

    await user.click(screen.getByRole('button', { name: 'Enregistrer cette configuration' }));

    expect(screen.getByRole('textbox', { name: /Nom du template/ })).toHaveValue('Template 1');
  });

  it('confirme l’enregistrement une fois le template créé', () => {
    renderBar({ templates: [makeTemplate()], lastSaved: makeTemplate() });

    expect(screen.getByRole('status')).toHaveTextContent('Enregistré comme « Soirée horreur ».');
  });

  it('n’offre pas de réenregistrer la configuration qui vient d’être enregistrée', () => {
    renderBar({ templates: [makeTemplate()], lastSaved: makeTemplate() });

    expect(screen.getByRole('button', { name: 'Enregistrer cette configuration' })).toBeDisabled();
  });

  it('retire la confirmation dès que la configuration change', () => {
    renderBar({
      draft: { ...draft, maxProposalsPerParticipant: 9 },
      templates: [makeTemplate()],
      lastSaved: makeTemplate(),
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Enregistrer cette configuration' })
    ).not.toBeDisabled();
  });

  it('ne repose pas la question quand le template appliqué est inchangé', () => {
    renderBar({ variant: 'event', templates: [makeTemplate()], appliedTemplate: makeTemplate() });

    expect(screen.queryByText('Cette configuration marche bien ?')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'En faire un template' })).toBeInTheDocument();
  });

  it('pose la question tant qu’aucun template n’est appliqué', () => {
    renderBar({ variant: 'event', templates: [makeTemplate()] });

    expect(screen.getByText('Cette configuration marche bien ?')).toBeInTheDocument();
  });

  it('confirme aussi depuis le panneau d’une soirée', () => {
    renderBar({ variant: 'event', templates: [makeTemplate()], lastSaved: makeTemplate() });

    expect(screen.getByRole('status')).toHaveTextContent('Enregistré comme « Soirée horreur ».');
    expect(screen.queryByText('Cette configuration marche bien ?')).not.toBeInTheDocument();
  });
});
