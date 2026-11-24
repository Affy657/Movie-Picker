import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import EventRemovedBanner from './EventRemovedBanner';
import { promptToJoinEvent } from '@/features/events/joinPrompt';
import { AppTestProviders } from '@/test-utils/queryWrapper';

describe('EventRemovedBanner', () => {
  it('takes the focus when a removed guest tries to vote, so the reason is read out', () => {
    render(
      <AppTestProviders>
        <EventRemovedBanner />
      </AppTestProviders>
    );

    promptToJoinEvent();

    expect(screen.getByRole('status', { name: 'Participation retirée' })).toHaveFocus();
  });
});
