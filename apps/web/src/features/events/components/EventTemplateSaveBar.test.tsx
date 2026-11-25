import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
  anonymousProposals: false,
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
    anonymousProposals: false,
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
    hidden: boolean;
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
        hidden={overrides.hidden ?? false}
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

    expect(screen.getByRole('button', { name: 'Enregistrer comme modèle' })).toBeInTheDocument();
  });

  it('stays out of the way when the rules have nothing to save', () => {
    renderBar({ hidden: true });

    expect(screen.queryByRole('button', { name: 'Enregistrer comme modèle' })).toBeNull();
  });

  it('pre-fills the name with the theme then saves', async () => {
    const user = userEvent.setup();
    const { onSave } = renderBar();

    await user.click(screen.getByRole('button', { name: 'Enregistrer comme modèle' }));

    const field = screen.getByRole('textbox', { name: /Nom du modèle/ });
    expect(field).toHaveValue('🎃 Halloween');

    await user.click(screen.getByRole('button', { name: 'Valider' }));

    expect(onSave).toHaveBeenCalledWith('🎃 Halloween');
  });

  it('offers a numbered name without a theme', async () => {
    const user = userEvent.setup();
    renderBar({ draft: { ...draft, theme: null } });

    await user.click(screen.getByRole('button', { name: 'Enregistrer comme modèle' }));

    expect(screen.getByRole('textbox', { name: /Nom du modèle/ })).toHaveValue('Modèle 1');
  });

  it('n’enregistre pas un nom vide', async () => {
    const user = userEvent.setup();
    const { onSave } = renderBar();

    await user.click(screen.getByRole('button', { name: 'Enregistrer comme modèle' }));
    await user.clear(screen.getByRole('textbox', { name: /Nom du modèle/ }));
    await user.click(screen.getByRole('button', { name: 'Valider' }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('abandonne le nommage', async () => {
    const user = userEvent.setup();
    const { onSave } = renderBar();

    await user.click(screen.getByRole('button', { name: 'Enregistrer comme modèle' }));
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Enregistrer comme modèle' })).toBeInTheDocument();
  });

  it('drops the naming on Escape without closing the settings dialog around it', async () => {
    const user = userEvent.setup();
    const { onSave } = renderBar();

    await user.click(screen.getByRole('button', { name: 'Enregistrer comme modèle' }));
    const dialogKeepsOpen = !fireEvent.keyDown(
      screen.getByRole('textbox', { name: /Nom du modèle/ }),
      { key: 'Escape' }
    );

    expect(dialogKeepsOpen).toBe(true);
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: /Nom du modèle/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer comme modèle' })).toBeInTheDocument();
  });

  it('disables saving at the cap', () => {
    renderBar({
      templates: Array.from({ length: MAX_EVENT_TEMPLATES }, (_, index) =>
        makeTemplate({ id: `t${index}`, name: `Template ${index}` })
      ),
    });

    expect(screen.getByRole('button', { name: 'Enregistrer comme modèle' })).toBeDisabled();
    expect(
      screen.getByText(
        `${MAX_EVENT_TEMPLATES} modèles sur ${MAX_EVENT_TEMPLATES}. Supprimez-en un pour en enregistrer un nouveau.`
      )
    ).toBeVisible();
  });

  it('says why a copy cannot be saved at the cap', () => {
    const applied = makeTemplate();
    renderBar({
      draft: { ...draft, maxProposalsPerParticipant: 5 },
      templates: Array.from({ length: MAX_EVENT_TEMPLATES }, (_, index) =>
        makeTemplate({ id: index === 0 ? 't1' : `t${index}`, name: `Template ${index}` })
      ),
      appliedTemplate: applied,
    });

    expect(screen.getByRole('button', { name: 'Enregistrer comme nouveau' })).toBeDisabled();
    expect(screen.getByText(/Supprimez-en un pour en enregistrer un nouveau/)).toBeVisible();
  });

  it('offers nothing while the applied template is unchanged', () => {
    renderBar({ templates: [makeTemplate()], appliedTemplate: makeTemplate() });

    expect(screen.queryByRole('button', { name: 'Mettre à jour' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer comme modèle' })).toBeNull();
  });

  it('offers the update when the applied configuration has changed', async () => {
    const user = userEvent.setup();
    const applied = makeTemplate();
    const { onUpdate } = renderBar({
      draft: { ...draft, maxProposalsPerParticipant: 5 },
      templates: [applied],
      appliedTemplate: applied,
    });

    expect(screen.getByRole('button', { name: 'Enregistrer comme nouveau' })).toBeInTheDocument();

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

    expect(onSave).toHaveBeenCalledWith('Modèle 1');
  });

  it('offers a free name when the theme is already taken', async () => {
    const user = userEvent.setup();
    renderBar({ templates: [makeTemplate({ name: '🎃 Halloween' })] });

    await user.click(screen.getByRole('button', { name: 'Enregistrer comme modèle' }));

    expect(screen.getByRole('textbox', { name: /Nom du modèle/ })).toHaveValue('Modèle 1');
  });

  it('confirms the save once the template is created', () => {
    renderBar({ templates: [makeTemplate()], lastSaved: makeTemplate() });

    expect(screen.getByRole('status')).toHaveTextContent('Enregistré comme « Soirée horreur ».');
  });

  it('does not offer to save again the configuration that was just saved', () => {
    renderBar({ templates: [makeTemplate()], lastSaved: makeTemplate() });

    expect(screen.queryByRole('button', { name: 'Enregistrer comme modèle' })).toBeNull();
  });

  it('removes the confirmation as soon as the configuration changes', () => {
    renderBar({
      draft: { ...draft, maxProposalsPerParticipant: 9 },
      templates: [makeTemplate()],
      lastSaved: makeTemplate(),
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer comme modèle' })).not.toBeDisabled();
  });

  it('confirms the save even when the bar is otherwise hidden', () => {
    renderBar({ templates: [makeTemplate()], lastSaved: makeTemplate(), hidden: true });

    expect(screen.getByRole('status')).toHaveTextContent('Enregistré comme « Soirée horreur ».');
  });
});
