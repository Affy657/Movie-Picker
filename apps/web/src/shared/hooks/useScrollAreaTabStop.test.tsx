import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { useRef } from 'react';
import { useScrollAreaTabStop } from './useScrollAreaTabStop';

function ScrollArea({ scrolls }: Readonly<{ scrolls: boolean }>) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollAreaTabStop(ref, scrolls);
  return <div ref={ref} data-testid="area" />;
}

describe('useScrollAreaTabStop', () => {
  it('makes a scrolling area a tab stop, and takes it back once it no longer scrolls', () => {
    const { getByTestId, rerender } = render(<ScrollArea scrolls />);
    expect(getByTestId('area')).toHaveAttribute('tabindex', '0');

    rerender(<ScrollArea scrolls={false} />);
    expect(getByTestId('area')).not.toHaveAttribute('tabindex');
  });

  it('adds no tab stop to an area that does not scroll', () => {
    const { getByTestId } = render(<ScrollArea scrolls={false} />);
    expect(getByTestId('area')).not.toHaveAttribute('tabindex');
  });
});
