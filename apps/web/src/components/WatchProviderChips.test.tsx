import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WatchProviderChips from './WatchProviderChips';

describe('WatchProviderChips', () => {
  it('affiche les noms des fournisseurs', () => {
    render(
      <WatchProviderChips
        providers={[
          { providerId: 1, name: 'Service A', logoPath: null, type: 'flatrate' },
          { providerId: 2, name: 'Service B', logoPath: null, type: 'rent' },
        ]}
      />
    );
    expect(screen.getByText('Service A')).toBeInTheDocument();
    expect(screen.getByText('Service B')).toBeInTheDocument();
  });

  it('ne rend rien si liste vide', () => {
    const { container } = render(<WatchProviderChips providers={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
