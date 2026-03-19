import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { AppTestProviders } from '../test-utils/queryWrapper';
import Home from './Home';
import CreateEvent from './CreateEvent';

describe('accessibilité (axe)', () => {
  it('Home n’a pas de violations', async () => {
    const { container } = render(
      <AppTestProviders>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </AppTestProviders>
    );
    const results = await axe(container);
    expect(
      results.violations,
      results.violations.map((v) => v.description).join('\n')
    ).toHaveLength(0);
  });

  it('CreateEvent n’a pas de violations', async () => {
    const { container } = render(
      <AppTestProviders>
        <MemoryRouter>
          <CreateEvent />
        </MemoryRouter>
      </AppTestProviders>
    );
    const results = await axe(container);
    expect(
      results.violations,
      results.violations.map((v) => v.description).join('\n')
    ).toHaveLength(0);
  });
});
