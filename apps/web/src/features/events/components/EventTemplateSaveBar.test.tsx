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

    expect(screen.getByRole('button', { name: 'Enregistrer en template' })).toBeInTheDocument();
  });

  it('keeps the same label on the movie night page, only the advice changes', () => {
    renderBar({ variant: 'event' });

    expect(screen.getByRole('button', { name: 'Enregistrer en template' })).toBeInTheDocument();
    expect(screen.getByText('Cette configuration marche bien ?')).toBeInTheDocument();
  });

  it('pre-fills the name with the theme then saves', async () => {
    const user = userEvent.setup();
    const { onSave } = renderBar();

    await user.click(screen.getByRole('button', { name: 'Enregistrer en template' }));

    const field = screen.getByRole('textbox', { name: /Nom du template/ });
    expect(field).toHaveValue('🎃 Halloween');

    await user.click(screen.getByRole('button', { name: 'Valider' }));

    expect(onSave).toHaveBeenCalledWith('🎃 Halloween');
  });

  it('offers a numbered name without a theme', async () => {
    const user = userEvent.setup();
    renderBar({ draft: { ...draft, theme: null } });

    await user.click(screen.getByRole('button', { name: 'Enregistrer en template' }));

    expect(screen.getByRole('textbox', { name: /Nom du template/ })).toHaveValue('Template 1');
  });

  it('n’enregistre pas un nom vide', async () => {
    const user = userEvent.setup();
    const { onSave } = renderBar();

    await user.click(screen.getByRole('button', { name: 'Enregistrer en template' }));
    await user.clear(screen.getByRole('textbox', { name: /Nom du template/ }));
    await user.click(screen.getByRole('button', { name: 'Valider' }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('abandonne le nommage', async () => {
    const user = userEvent.setup();
    const { onSave } = renderBar();

    await user.click(screen.getByRole('button', { name: 'Enregistrer en template' }));
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Enregistrer en template' })).toBeInTheDocument();
  });

  it('disables saving at the cap', () => {
    renderBar({
      templates: Array.from({ length: MAX_EVENT_TEMPLATES }, (_, index) =>
        makeTemplate({ id: `t${index}`, name: `Template ${index}` })
      ),
    });

    expect(screen.getByRole('button', { name: 'Enregistrer en template' })).toBeDisabled();
  });

  it('offers nothing more when the applied template is unchanged', () => {
    renderBar({ templates: [makeTemplate()], appliedTemplate: makeTemplate() });

    expect(screen.queryByRole('button', { name: 'Mettre à jour' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer en template' })).toBeInTheDocument();
  });

  it('offers the update when the applied configuration has changed', async () => {
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

  it('allows saving a copy when the applied configuration has changed', async () => {
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

  it('offers a free name when the theme is already taken', async () => {
    const user = userEvent.setup();
    renderBar({ templates: [makeTemplate({ name: '🎃 Halloween' })] });

    await user.click(screen.getByRole('button', { name: 'Enregistrer en template' }));

    expect(screen.getByRole('textbox', { name: /Nom du template/ })).toHaveValue('Template 1');
  });

  it('confirms the save once the template is created', () => {
    renderBar({ templates: [makeTemplate()], lastSaved: makeTemplate() });

    expect(screen.getByRole('status')).toHaveTextContent('Enregistré comme « Soirée horreur ».');
  });

  it('does not offer to save again the configuration that was just saved', () => {
    renderBar({ templates: [makeTemplate()], lastSaved: makeTemplate() });

    expect(screen.getByRole('button', { name: 'Enregistrer en template' })).toBeDisabled();
  });

  it('removes the confirmation as soon as the configuration changes', () => {
    renderBar({
      draft: { ...draft, maxProposalsPerParticipant: 9 },
      templates: [makeTemplate()],
      lastSaved: makeTemplate(),
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer en template' })).not.toBeDisabled();
  });

  it('does not ask again when the applied template is unchanged', () => {
    renderBar({ variant: 'event', templates: [makeTemplate()], appliedTemplate: makeTemplate() });

    expect(screen.queryByText('Cette configuration marche bien ?')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer en template' })).toBeInTheDocument();
  });

  it('asks as long as no template is applied', () => {
    renderBar({ variant: 'event', templates: [makeTemplate()] });

    expect(screen.getByText('Cette configuration marche bien ?')).toBeInTheDocument();
  });

  it('also confirms from a movie night panel', () => {
    renderBar({ variant: 'event', templates: [makeTemplate()], lastSaved: makeTemplate() });

    expect(screen.getByRole('status')).toHaveTextContent('Enregistré comme « Soirée horreur ».');
    expect(screen.queryByText('Cette configuration marche bien ?')).not.toBeInTheDocument();
  });
});
