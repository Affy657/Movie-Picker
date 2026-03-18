import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { toHaveNoViolations } from 'vitest-axe/matchers.js';
import Home from './Home';
import CreateEvent from './CreateEvent';

expect.extend({ toHaveNoViolations });

describe('accessibilité (axe)', () => {
  it('Home n’a pas de violations critiques', async () => {
    const { container } = render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('CreateEvent n’a pas de violations critiques', async () => {
    const { container } = render(
      <MemoryRouter>
        <CreateEvent />
      </MemoryRouter>
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
