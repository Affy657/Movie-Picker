import { act, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/features/theme/ThemeContext';
import { LocaleProvider } from '@/features/i18n/LocaleContext';
import { OfflineBanner } from './OfflineBanner';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

let netListener: ((s: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void) | null = null;

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn((cb) => {
      netListener = cb;
      return () => {
        netListener = null;
      };
    }),
  },
}));

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>{children}</LocaleProvider>
    </ThemeProvider>
  );
}

describe('OfflineBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    netListener = null;
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing while connection state is unknown', () => {
    const { toJSON } = render(
      <Wrap>
        <OfflineBanner />
      </Wrap>
    );
    expect(toJSON()).toBeNull();
  });

  it('shows the banner after a debounced offline event', () => {
    const { toJSON, queryByText } = render(
      <Wrap>
        <OfflineBanner />
      </Wrap>
    );
    act(() => {
      netListener?.({ isConnected: false, isInternetReachable: false });
    });
    expect(toJSON()).toBeNull();
    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(queryByText(/Hors ligne|Offline/)).toBeTruthy();
  });

  it('hides the banner when connection comes back', () => {
    const { toJSON, queryByText } = render(
      <Wrap>
        <OfflineBanner />
      </Wrap>
    );
    act(() => {
      netListener?.({ isConnected: false, isInternetReachable: false });
      jest.advanceTimersByTime(600);
    });
    expect(queryByText(/Hors ligne|Offline/)).toBeTruthy();
    act(() => {
      netListener?.({ isConnected: true, isInternetReachable: true });
      jest.advanceTimersByTime(600);
    });
    expect(toJSON()).toBeNull();
  });
});
