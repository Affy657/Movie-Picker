import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import LandingWheel from './LandingWheel';

const onDoneCalls: Array<() => void> = [];

vi.mock('@/features/events/components/SpinningWheel', () => ({
  default: ({ onDone }: { onDone: () => void }) => {
    onDoneCalls.push(onDone);
    return <div data-testid="spinning-wheel" />;
  },
}));

function renderWheel() {
  return render(
    <AppTestProviders>
      <LandingWheel />
    </AppTestProviders>
  );
}

function finishSpin(): void {
  const done = onDoneCalls.at(-1);
  expect(done).toBeDefined();
  done?.();
}

describe('LandingWheel', () => {
  it('monte la roue, annonce un gagnant puis réarme le bouton', async () => {
    renderWheel();

    expect(screen.getByTestId('spinning-wheel')).toBeInTheDocument();
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/tirage en cours/i);

    finishSpin();

    expect(await screen.findByText(/film de la soirée/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeEnabled();
    expect(screen.getByRole('button')).toHaveTextContent(/relancer la roue/i);
  });

  it('relance un tirage au clic et efface le gagnant précédent', async () => {
    const user = userEvent.setup();
    renderWheel();
    finishSpin();

    const winner = await screen.findByText(/film de la soirée/i);
    expect(winner).toBeInTheDocument();

    await user.click(screen.getByRole('button'));

    expect(screen.queryByText(/film de la soirée/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();

    finishSpin();
    expect(await screen.findByText(/film de la soirée/i)).toBeInTheDocument();
  });

  it('expose la roue comme image nommée pour les lecteurs d’écran', () => {
    renderWheel();
    expect(screen.getByRole('img', { name: /roue de tirage/i })).toBeInTheDocument();
  });
});
