import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/features/theme/ThemeContext';
import { EventThemeBanner } from './EventThemeBanner';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

function Wrap({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('EventThemeBanner', () => {
  it('renders the theme label trimmed', () => {
    const { getByText } = render(
      <Wrap>
        <EventThemeBanner theme="  Marvel  " />
      </Wrap>
    );
    expect(getByText('Marvel')).toBeTruthy();
    expect(getByText('THÈME')).toBeTruthy();
  });

  it('renders nothing when theme is null', () => {
    const { toJSON } = render(
      <Wrap>
        <EventThemeBanner theme={null} />
      </Wrap>
    );
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when theme is an empty string', () => {
    const { toJSON } = render(
      <Wrap>
        <EventThemeBanner theme="   " />
      </Wrap>
    );
    expect(toJSON()).toBeNull();
  });

  it('exposes an accessibility label', () => {
    const { getByLabelText } = render(
      <Wrap>
        <EventThemeBanner theme="Sci-Fi" />
      </Wrap>
    );
    expect(getByLabelText('Thème de soirée : Sci-Fi')).toBeTruthy();
  });
});
