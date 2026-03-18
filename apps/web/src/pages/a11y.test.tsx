import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import Home from './Home';
import CreateEvent from './CreateEvent';

describe('accessibilité (axe)', () => {
  it('Home n’a pas de violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(
      results.violations,
      results.violations.map((v) => v.description).join('\n')
    ).toHaveLength(0);
  });

  it('CreateEvent n’a pas de violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <CreateEvent />
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(
      results.violations,
      results.violations.map((v) => v.description).join('\n')
    ).toHaveLength(0);
  });
});
