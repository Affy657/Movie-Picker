import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/features/theme/ThemeContext';
import { Button } from './Button';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

function Wrap({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('Button', () => {
  it('renders the label', () => {
    const { getByText } = render(
      <Wrap>
        <Button label="Valider" onPress={() => {}} />
      </Wrap>
    );
    expect(getByText('Valider')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Wrap>
        <Button label="Go" onPress={onPress} />
      </Wrap>
    );
    fireEvent.press(getByText('Go'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Wrap>
        <Button label="Bloqué" onPress={onPress} disabled />
      </Wrap>
    );
    fireEvent.press(getByText('Bloqué'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('hides label when loading and shows an indicator', () => {
    const { queryByText, UNSAFE_getByType } = render(
      <Wrap>
        <Button label="Patiente" onPress={() => {}} loading />
      </Wrap>
    );
    expect(queryByText('Patiente')).toBeNull();
    const ActivityIndicator = require('react-native').ActivityIndicator;
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('renders the icon when provided', () => {
    const { getByText } = render(
      <Wrap>
        <Button label="Avec icone" onPress={() => {}} icon="heart" />
      </Wrap>
    );
    expect(getByText('Avec icone')).toBeTruthy();
  });

  it('supports secondary, danger and ghost variants', () => {
    const { getByText, rerender } = render(
      <Wrap>
        <Button label="X" onPress={() => {}} variant="secondary" />
      </Wrap>
    );
    expect(getByText('X')).toBeTruthy();
    rerender(
      <Wrap>
        <Button label="X" onPress={() => {}} variant="danger" />
      </Wrap>
    );
    expect(getByText('X')).toBeTruthy();
    rerender(
      <Wrap>
        <Button label="X" onPress={() => {}} variant="ghost" />
      </Wrap>
    );
    expect(getByText('X')).toBeTruthy();
  });
});
