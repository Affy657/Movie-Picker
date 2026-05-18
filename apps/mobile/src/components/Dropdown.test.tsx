import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/features/theme/ThemeContext';
import { Dropdown } from './Dropdown';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

function Wrap({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const options = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
];

describe('Dropdown', () => {
  it('renders the current option label on the trigger', () => {
    const { getByText } = render(
      <Wrap>
        <Dropdown value="fr" options={options} onChange={() => {}} />
      </Wrap>
    );
    expect(getByText('Français')).toBeTruthy();
  });

  it('opens a menu on press and lists all options', () => {
    const { getByText, queryByText } = render(
      <Wrap>
        <Dropdown
          value="fr"
          options={options}
          onChange={() => {}}
          accessibilityLabel="lang"
        />
      </Wrap>
    );
    expect(queryByText('English')).toBeNull();
    fireEvent.press(getByText('Français'));
    expect(getByText('English')).toBeTruthy();
  });

  it('calls onChange and closes the menu when an option is picked', () => {
    const onChange = jest.fn();
    const { getByText, queryByText } = render(
      <Wrap>
        <Dropdown value="fr" options={options} onChange={onChange} />
      </Wrap>
    );
    fireEvent.press(getByText('Français'));
    fireEvent.press(getByText('English'));
    expect(onChange).toHaveBeenCalledWith('en');
    expect(queryByText('English')).toBeNull();
  });
});
