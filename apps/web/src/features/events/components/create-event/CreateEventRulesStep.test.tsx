import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LocaleProvider } from '@/shared/i18n';
import { defaultTemplateFields } from '@/features/events/lib/eventTemplateDraft';
import type { EventTemplateData } from '@/features/events/types';
import CreateEventRulesStep from './CreateEventRulesStep';

vi.mock('@/shared/hooks/useIsMobile', () => ({ useIsMobile: () => false }));

const HORROR_TEMPLATE: EventTemplateData = {
  id: 't1',
  name: 'Soirée horreur',
  theme: null,
  maxProposalsPerParticipant: null,
  maxParticipants: null,
  maxVotesPerParticipant: null,
  wheelMode: 'weightedByVotes',
  richSharePreview: true,
  allowSeries: false,
  winnerCount: 1,
};

function renderRules({
  nights = [],
  templates = [],
}: {
  nights?: { slug: string; title: string }[];
  templates?: EventTemplateData[];
}) {
  render(
    <LocaleProvider>
      <CreateEventRulesStep
        open
        onClose={vi.fn()}
        fields={defaultTemplateFields()}
        errors={{}}
        onChange={vi.fn()}
        selected="defaults"
        selectedTemplateId={null}
        selectedNightSlug={null}
        nights={nights}
        templates={templates}
        onChoose={vi.fn()}
        canSaveTemplate={false}
        suggestTemplateName={() => null}
        onSaveTemplate={vi.fn()}
        templateError={null}
      />
    </LocaleProvider>
  );
}

describe('CreateEventRulesStep', () => {
  it('offers no starting point when the defaults are the only one', () => {
    renderRules({});

    expect(screen.queryByRole('heading', { name: 'Partir de' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Par défaut' })).toBeNull();
  });

  it('offers the defaults beside a saved template', () => {
    renderRules({ templates: [HORROR_TEMPLATE] });

    expect(screen.getByRole('heading', { name: 'Partir de' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Par défaut' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Soirée horreur' })).toBeInTheDocument();
  });

  it('offers the defaults beside a past night', () => {
    renderRules({ nights: [{ slug: 'cineclub', title: 'Ciné-club' }] });

    expect(screen.getByRole('button', { name: 'Comme « Ciné-club »' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Par défaut' })).toBeInTheDocument();
  });
});
