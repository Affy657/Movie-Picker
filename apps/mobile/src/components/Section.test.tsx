import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider } from '@/features/theme/ThemeContext';
import { Section } from './Section';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

function Wrap({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('Section', () => {
  it('renders the title when provided', () => {
    const { getByText } = render(
      <Wrap>
        <Section title="Mes infos">
          <Text>contenu</Text>
        </Section>
      </Wrap>
    );
    expect(getByText('Mes infos')).toBeTruthy();
    expect(getByText('contenu')).toBeTruthy();
  });

  it('omits the title when not provided', () => {
    const { queryByText, getByText } = render(
      <Wrap>
        <Section>
          <Text>contenu</Text>
        </Section>
      </Wrap>
    );
    expect(queryByText('Mes infos')).toBeNull();
    expect(getByText('contenu')).toBeTruthy();
  });
});
