import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabPanel } from '@/shared/components/Tabs';

type Key = 'a' | 'b' | 'c';

function Harness({ active, onChange }: Readonly<{ active: Key; onChange: (key: Key) => void }>) {
  return (
    <>
      <Tabs
        idBase="t"
        ariaLabel="Onglets de test"
        tabs={[
          { key: 'a', label: 'Alpha' },
          { key: 'b', label: 'Beta', badge: 3 },
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

  it('un seul panneau est monté à la fois', () => {
    render(<Harness active="b" onChange={vi.fn()} />);
    expect(screen.queryByText('Contenu Alpha')).not.toBeInTheDocument();
    expect(screen.getByText('Contenu Beta')).toBeInTheDocument();
    expect(screen.queryByText('Contenu Gamma')).not.toBeInTheDocument();
  });

  it('le clic sur un onglet déclenche onChange', async () => {
    const onChange = vi.fn();
    render(<Harness active="a" onChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Gamma' }));
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('la flèche droite déplace la sélection et le focus vers l’onglet suivant', async () => {
    const user = userEvent.setup();
    render(<Harness active="a" onChange={vi.fn()} />);
    screen.getByRole('tab', { name: 'Alpha' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Beta3' })).toHaveFocus();
  });

  it('chaque panneau référence son onglet via aria-labelledby / id', () => {
    render(<Harness active="a" onChange={vi.fn()} />);
    const tab = screen.getByRole('tab', { name: 'Alpha' });
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', tab.id);
    expect(tab).toHaveAttribute('aria-controls', panel.id);
  });
});
