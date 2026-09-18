import { describe, it, expect, vi } from 'vitest';
import { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import SearchHistoryDropdown from '@/features/movies/components/SearchHistoryDropdown';

const HISTORY = ['inception', 'matrix', 'dune'];

type Handlers = {
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
  onClose: () => void;
};

function Harness({ initial, ...handlers }: Readonly<Handlers & { initial: readonly string[] }>) {
  const [history, setHistory] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <LocaleProvider>
      <input ref={inputRef} aria-label="search" />
      {history.length > 0 && (
        <SearchHistoryDropdown
          history={history}
          inputRef={inputRef}
          {...handlers}
          onRemove={(query) => {
            setHistory((prev) => prev.filter((q) => q !== query));
            handlers.onRemove(query);
          }}
          onClear={() => {
            setHistory([]);
            handlers.onClear();
          }}
        />
      )}
    </LocaleProvider>
  );
}

function setup(initial: readonly string[] = HISTORY) {
  const handlers = { onSelect: vi.fn(), onRemove: vi.fn(), onClear: vi.fn(), onClose: vi.fn() };
  render(<Harness initial={initial} {...handlers} />);
  const input = screen.getByLabelText('search');
  const item = (query: string) => screen.getByRole('button', { name: `Rechercher « ${query} »` });
  const removeOf = (query: string) =>
    screen.getByRole('button', { name: `Supprimer « ${query} » de l’historique` });
  return { ...handlers, input, item, removeOf };
}

describe('SearchHistoryDropdown', () => {
  it('names the group after its title and lists one search and one remove button per entry', () => {
    const { item, removeOf } = setup();
    expect(screen.getByRole('group', { name: 'Recherches récentes' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(item('dune')).toHaveTextContent('dune');
    expect(removeOf('dune')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Effacer tout' })).toBeInTheDocument();
  });

  it('keeps the input focused when the pointer goes down inside the panel', () => {
    const { input, item } = setup();
    input.focus();
    expect(fireEvent.mouseDown(item('matrix'))).toBe(false);
    expect(input).toHaveFocus();
  });

  it('runs the search and hands the focus back to the input on select', async () => {
    const user = userEvent.setup();
    const { input, item, onSelect } = setup();
    item('matrix').focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('matrix');
    expect(input).toHaveFocus();
  });

  it('moves between the searches with the arrows, Home and End, and returns to the input above the first', async () => {
    const user = userEvent.setup();
    const { input, item } = setup();
    item('inception').focus();
    await user.keyboard('{ArrowDown}');
    expect(item('matrix')).toHaveFocus();
    await user.keyboard('{End}');
    expect(item('dune')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(item('inception')).toHaveFocus();
    await user.keyboard('{Home}{ArrowUp}');
    expect(input).toHaveFocus();
  });

  it('skips the remove buttons when arrowing, while Tab still reaches them', async () => {
    const user = userEvent.setup();
    const { item, removeOf } = setup();
    item('inception').focus();
    await user.tab();
    expect(removeOf('inception')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(item('matrix')).toHaveFocus();
  });

  it('removes the focused search with Delete and lands on the next one, then the previous, then the input', async () => {
    const user = userEvent.setup();
    const { input, item, onRemove } = setup();
    item('matrix').focus();
    await user.keyboard('{Delete}');
    expect(onRemove).toHaveBeenCalledWith('matrix');
    expect(item('dune')).toHaveFocus();
    await user.keyboard('{Delete}');
    expect(item('inception')).toHaveFocus();
    await user.keyboard('{Delete}');
    expect(onRemove).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('leaves the focus on the input when a remove button is clicked with the pointer', async () => {
    const user = userEvent.setup();
    const { input, removeOf, onRemove } = setup();
    input.focus();
    await user.click(removeOf('inception'));
    expect(onRemove).toHaveBeenCalledWith('inception');
    expect(screen.queryByRole('button', { name: 'Rechercher « inception »' })).toBeNull();
    expect(input).toHaveFocus();
  });

  it('closes on Escape and gives the focus back to the input', async () => {
    const user = userEvent.setup();
    const { input, item, onClose } = setup();
    item('dune').focus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(input).toHaveFocus();
  });

  it('sends a typed character back to the input, but lets Space press the focused button', async () => {
    const user = userEvent.setup();
    const { input, item, onSelect } = setup();
    item('dune').focus();
    await user.keyboard('a');
    expect(input).toHaveFocus();
    item('dune').focus();
    await user.keyboard(' ');
    expect(onSelect).toHaveBeenCalledWith('dune');
  });

  it('clears everything and focuses the input', async () => {
    const user = userEvent.setup();
    const { input, onClear } = setup();
    screen.getByRole('button', { name: 'Effacer tout' }).focus();
    await user.keyboard('{Enter}');
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(input).toHaveFocus();
  });
});
