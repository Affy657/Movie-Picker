import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { renderWithBold } from './renderWithBold';

describe('renderWithBold', () => {
  it('renders plain text unchanged when there are no markers', () => {
    const { container } = render(<>{renderWithBold('Bob a rejoint la soirée.')}</>);
    expect(container.textContent).toBe('Bob a rejoint la soirée.');
    expect(container.querySelector('strong')).toBeNull();
  });

  it('wraps a single **marked** segment in <strong>', () => {
    const { container } = render(<>{renderWithBold('Bob a rejoint **Soirée Ciné** !')}</>);
    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('Soirée Ciné');
    expect(container.textContent).toBe('Bob a rejoint Soirée Ciné !');
  });

  it('wraps two separate **marked** segments', () => {
    const { container } = render(<>{renderWithBold('**Dune** ajouté à **Soirée Ciné**')}</>);
    const strongs = container.querySelectorAll('strong');
    expect(strongs).toHaveLength(2);
    expect(strongs[0]?.textContent).toBe('Dune');
    expect(strongs[1]?.textContent).toBe('Soirée Ciné');
  });
});
