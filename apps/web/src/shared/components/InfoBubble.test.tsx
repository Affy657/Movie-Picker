import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InfoBubble from './InfoBubble';
import { AppTestProviders } from '@/test-utils/queryWrapper';

function renderBubble() {
  return render(
    <AppTestProviders>
      <InfoBubble label="Comment ça marche">
        <p>Explication détaillée.</p>
      </InfoBubble>
    </AppTestProviders>
  );
}

describe('InfoBubble', () => {
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
  });

  it('reste fermée au premier rendu', () => {
    renderBubble();

    expect(screen.getByRole('button', { name: 'Comment ça marche' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.queryByText('Explication détaillée.')).not.toBeInTheDocument();
  });

  it('ouvre et referme le contenu au clic sur le déclencheur', async () => {
    const user = userEvent.setup();
    renderBubble();
    const trigger = screen.getByRole('button', { name: 'Comment ça marche' });

    await user.click(trigger);
    expect(screen.getByText('Explication détaillée.')).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.click(trigger);
    expect(screen.queryByText('Explication détaillée.')).not.toBeInTheDocument();
  });

  it('referme le contenu avec la touche Échap', async () => {
    const user = userEvent.setup();
    renderBubble();

    await user.click(screen.getByRole('button', { name: 'Comment ça marche' }));
    expect(screen.getByText('Explication détaillée.')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByText('Explication détaillée.')).not.toBeInTheDocument();
  });

  it('referme le contenu au clic sur le bouton Fermer', async () => {
    const user = userEvent.setup();
    renderBubble();

    await user.click(screen.getByRole('button', { name: 'Comment ça marche' }));
    await user.click(screen.getByRole('button', { name: 'Fermer' }));

    expect(screen.queryByText('Explication détaillée.')).not.toBeInTheDocument();
  });

  it('associe le contenu au déclencheur via aria-controls', async () => {
    const user = userEvent.setup();
    renderBubble();
    const trigger = screen.getByRole('button', { name: 'Comment ça marche' });

    await user.click(trigger);

    const panelId = trigger.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId as string)).toContainElement(
      screen.getByText('Explication détaillée.')
    );
  });
});
