import type { ReactElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import PersonRow from '@/shared/components/PersonRow';
import styles from '@/shared/components/PersonRow.module.css';

function renderRow(ui: ReactElement) {
  return render(
    <MemoryRouter>
      <ul>{ui}</ul>
    </MemoryRouter>
  );
}

describe('PersonRow', () => {
  it('shows the name, its badges, a detail line and an action on the right', () => {
    renderRow(
      <PersonRow
        avatar={<span />}
        name="Adrien"
        badges={<span>Vous</span>}
        detail="@adrien"
        action={<button type="button">Suivre</button>}
      />
    );

    const row = screen.getByRole('listitem');
    expect(within(row).getByText('Adrien')).toBeInTheDocument();
    expect(within(row).getByText('Vous')).toBeInTheDocument();
    expect(within(row).getByText('@adrien')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Suivre' })).toBeInTheDocument();
  });

  it('links the avatar and the name to the profile, never the action', async () => {
    const onNavigate = vi.fn();
    renderRow(
      <PersonRow
        avatar={<span />}
        name="Alice"
        to="/u/alice"
        linkAriaLabel="Voir le profil de Alice"
        onNavigate={onNavigate}
        action={<button type="button">Retirer</button>}
      />
    );

    const link = screen.getByRole('link', { name: 'Voir le profil de Alice' });
    expect(link).toHaveAttribute('href', '/u/alice');
    expect(within(link).queryByRole('button')).toBeNull();
    await userEvent.click(link);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('puts a presence dot on the avatar of someone online', () => {
    const { container } = renderRow(<PersonRow avatar={<span />} name="Bob" online />);

    expect(container.querySelector(`.${styles.presence}`)).not.toBeNull();
  });

  it('dims a person who can no longer be picked', () => {
    renderRow(<PersonRow avatar={<span />} name="Bob" muted />);

    expect(screen.getByRole('listitem')).toHaveClass(styles.muted!);
  });
});
