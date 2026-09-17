import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabPanel } from '@/shared/components/Tabs';

type Key = 'a' | 'b' | 'c';

function Harness({
  active,
  onChange,
  disabledKey,
}: Readonly<{ active: Key; onChange: (key: Key) => void; disabledKey?: Key }>) {
  return (
    <>
      <Tabs
        idBase="t"
        ariaLabel="Onglets de test"
        tabs={[
          { key: 'a', label: 'Alpha' },
          { key: 'b', label: 'Beta', badge: 3, disabled: disabledKey === 'b' },
          { key: 'c', label: 'Gamma' },
        ]}
        active={active}
        onChange={onChange}
      />
      <TabPanel idBase="t" tabKey="a" active={active === 'a'}>
        Contenu Alpha
      </TabPanel>
      <TabPanel idBase="t" tabKey="b" active={active === 'b'}>
        Contenu Beta
      </TabPanel>
      <TabPanel idBase="t" tabKey="c" active={active === 'c'}>
        Contenu Gamma
      </TabPanel>
    </>
  );
}

describe('Tabs', () => {
  it('marque le seul onglet actif via aria-selected et affiche son panneau', () => {
    render(<Harness active="a" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Beta3' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText('Contenu Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Contenu Beta')).not.toBeInTheDocument();
  });

  it('a single panel is mounted at a time', () => {
    render(<Harness active="b" onChange={vi.fn()} />);
    expect(screen.queryByText('Contenu Alpha')).not.toBeInTheDocument();
    expect(screen.getByText('Contenu Beta')).toBeInTheDocument();
    expect(screen.queryByText('Contenu Gamma')).not.toBeInTheDocument();
  });

  it('clicking a tab triggers onChange', async () => {
    const onChange = vi.fn();
    render(<Harness active="a" onChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Gamma' }));
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('the right arrow moves the selection and the focus to the next tab', async () => {
    const user = userEvent.setup();
    render(<Harness active="a" onChange={vi.fn()} />);
    screen.getByRole('tab', { name: 'Alpha' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Beta3' })).toHaveFocus();
  });

  it('a disabled tab is skipped by the arrows and cannot be clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness active="a" onChange={onChange} disabledKey="b" />);
    expect(screen.getByRole('tab', { name: 'Beta3' })).toBeDisabled();

    await user.click(screen.getByRole('tab', { name: 'Beta3' }));
    expect(onChange).not.toHaveBeenCalled();

    screen.getByRole('tab', { name: 'Alpha' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('each panel references its tab through aria-labelledby / id', () => {
    render(<Harness active="a" onChange={vi.fn()} />);
    const tab = screen.getByRole('tab', { name: 'Alpha' });
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', tab.id);
    expect(tab).toHaveAttribute('aria-controls', panel.id);
  });

  it('a vertical wheel scrolls the overflowing list sideways and stops at its edges', () => {
    render(<Harness active="a" onChange={vi.fn()} />);
    const list = screen.getByRole('tablist');
    Object.defineProperty(list, 'scrollWidth', { configurable: true, value: 600 });
    Object.defineProperty(list, 'clientWidth', { configurable: true, value: 200 });
    let scrollLeft = 0;
    Object.defineProperty(list, 'scrollLeft', {
      configurable: true,
      get: () => scrollLeft,
      set: (value: number) => {
        scrollLeft = value;
      },
    });
    const scrollBy = vi.fn(({ left }: ScrollToOptions) => {
      scrollLeft += left ?? 0;
    });
    list.scrollBy = scrollBy as typeof list.scrollBy;

    const backAtStart = new WheelEvent('wheel', { deltaY: -40, cancelable: true, bubbles: true });
    list.dispatchEvent(backAtStart);
    expect(backAtStart.defaultPrevented).toBe(false);
    expect(scrollBy).not.toHaveBeenCalled();

    const forward = new WheelEvent('wheel', { deltaY: 40, cancelable: true, bubbles: true });
    list.dispatchEvent(forward);
    expect(forward.defaultPrevented).toBe(true);
    expect(scrollBy).toHaveBeenCalledWith({ left: 40, behavior: 'instant' });

    scrollLeft = 400;
    const forwardAtEnd = new WheelEvent('wheel', { deltaY: 40, cancelable: true, bubbles: true });
    list.dispatchEvent(forwardAtEnd);
    expect(forwardAtEnd.defaultPrevented).toBe(false);
    expect(scrollBy).toHaveBeenCalledTimes(1);
  });

  it('an iconOnly tab keeps its label as accessible name without drawing it', () => {
    render(
      <Tabs
        idBase="i"
        ariaLabel="Onglets"
        tabs={[
          { key: 'a', label: 'Alpha' },
          { key: 'b', label: 'Rechercher', icon: <span data-testid="icon" />, iconOnly: true },
        ]}
        active="a"
        onChange={vi.fn()}
      />
    );
    const tab = screen.getByRole('tab', { name: 'Rechercher' });
    expect(tab).toHaveAttribute('aria-label', 'Rechercher');
    expect(tab).not.toHaveTextContent('Rechercher');
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
