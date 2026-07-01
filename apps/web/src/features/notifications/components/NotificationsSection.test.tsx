import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import NotificationsSection from '@/features/notifications/components/NotificationsSection';
import { usePushNotifications } from '@/features/notifications/hooks/usePushNotifications';
import {
  fetchNotificationPreferences,
  patchNotificationPreferences,
} from '@/features/notifications/api/notificationsApi';

vi.mock('@/shared/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/features/notifications/hooks/usePushNotifications', () => ({
  usePushNotifications: vi.fn(),
}));

vi.mock('@/features/notifications/api/notificationsApi', () => ({
  fetchNotificationPreferences: vi.fn(),
  patchNotificationPreferences: vi.fn(),
}));

const mockUsePush = vi.mocked(usePushNotifications);
const mockFetchPrefs = vi.mocked(fetchNotificationPreferences);
const mockPatchPrefs = vi.mocked(patchNotificationPreferences);

const pushState = (overrides: Partial<ReturnType<typeof usePushNotifications>> = {}) => ({
  supported: true,
  permission: 'granted' as const,
  subscribed: false,
  loading: false,
  error: null,
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  ...overrides,
});

const allPrefs = {
  notifyOnParticipantJoined: true,
  notifyEventReminder: true,
  notifyOnMovieAdded: true,
  notifyOnMoviePicked: true,
  notifyOnEventDeleted: true,
  notifyOnNewFollower: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('NotificationsSection', () => {
  it('shows the unsupported hint when push is unavailable', () => {
    mockUsePush.mockReturnValue(pushState({ supported: false, permission: 'unsupported' }));

    render(<NotificationsSection />);

    expect(screen.getByText('notifications.unsupported')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('renders only the enable toggle when not subscribed', () => {
    mockUsePush.mockReturnValue(pushState({ subscribed: false }));

    render(<NotificationsSection />);

    expect(screen.getAllByRole('switch')).toHaveLength(1);
    expect(mockFetchPrefs).not.toHaveBeenCalled();
  });

  it('shows the push error message', () => {
    mockUsePush.mockReturnValue(pushState({ error: 'boom' }));

    render(<NotificationsSection />);

    expect(screen.getByRole('alert')).toHaveTextContent('boom');
  });

  it('disables the toggle and shows a hint when permission is denied', () => {
    mockUsePush.mockReturnValue(pushState({ permission: 'denied' }));

    render(<NotificationsSection />);

    expect(screen.getByText('notifications.permissionDenied')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('loads and renders preference toggles when subscribed', async () => {
    mockUsePush.mockReturnValue(pushState({ subscribed: true }));
    mockFetchPrefs.mockResolvedValue(allPrefs);

    render(<NotificationsSection />);

    await waitFor(() => expect(mockFetchPrefs).toHaveBeenCalledOnce());
    expect(await screen.findByRole('switch', { name: 'notifications.prefParticipantJoined' })).toBeInTheDocument();
    expect(screen.getAllByRole('switch')).toHaveLength(7);
  });

  it('patches a preference when its toggle is clicked', async () => {
    mockUsePush.mockReturnValue(pushState({ subscribed: true }));
    mockFetchPrefs.mockResolvedValue(allPrefs);
    mockPatchPrefs.mockResolvedValue({ ...allPrefs, notifyOnParticipantJoined: false });

    render(<NotificationsSection />);

    const toggle = await screen.findByRole('switch', {
      name: 'notifications.prefParticipantJoined',
    });
    await userEvent.click(toggle);

    expect(mockPatchPrefs).toHaveBeenCalledWith({ notifyOnParticipantJoined: false });
  });
});
