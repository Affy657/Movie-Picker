import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopNoticeQueueProvider from '@/app/components/TopNoticeQueueProvider';
import {
  TOP_NOTICE_ORDER,
  useTopNoticeTurn,
  type TopNoticeId,
} from '@/app/components/topNoticeQueue';

function NoticeProbe({ id }: Readonly<{ id: TopNoticeId }>) {
  const [wanted, setWanted] = useState(true);
  const shown = useTopNoticeTurn(id, wanted);
  if (!shown) return null;
  return (
    <button type="button" onClick={() => setWanted(false)}>
      {id}
    </button>
  );
}

function shownNotices() {
  return screen.queryAllByRole('button').map((button) => button.textContent);
}

describe('TopNoticeQueueProvider', () => {
  it('shows one top notice at a time, the next one once it is put away', async () => {
    const user = userEvent.setup();
    render(
      <TopNoticeQueueProvider>
        {[...TOP_NOTICE_ORDER].reverse().map((id) => (
          <NoticeProbe key={id} id={id} />
        ))}
      </TopNoticeQueueProvider>
    );

    for (const id of TOP_NOTICE_ORDER) {
      expect(shownNotices()).toEqual([id]);
      await user.click(screen.getByRole('button', { name: id }));
    }
    expect(shownNotices()).toEqual([]);
  });

  it('puts the session expiry first, then the in-app browser, the former address and the language', () => {
    expect(TOP_NOTICE_ORDER.indexOf('sessionExpired')).toBeLessThan(
      TOP_NOTICE_ORDER.indexOf('inAppBrowser')
    );
    expect(TOP_NOTICE_ORDER.indexOf('inAppBrowser')).toBeLessThan(
      TOP_NOTICE_ORDER.indexOf('movedOrigin')
    );
    expect(TOP_NOTICE_ORDER.indexOf('movedOrigin')).toBeLessThan(
      TOP_NOTICE_ORDER.indexOf('languageSuggestion')
    );
  });

  it('lets a notice show on its own outside the queue', () => {
    render(<NoticeProbe id="languageSuggestion" />);

    expect(shownNotices()).toEqual(['languageSuggestion']);
  });
});
