import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import EventDetailSkeleton from '@/features/events/pages/event-detail/EventDetailSkeleton';
import { LocaleProvider } from '@/shared/i18n';

function renderSkeleton() {
  return render(
    <LocaleProvider>
      <EventDetailSkeleton />
    </LocaleProvider>
  );
}

describe('EventDetailSkeleton', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('moviepicker-locale', 'fr');
  });

  it('sketches the list layout by default, the shape the page will take', () => {
    renderSkeleton();
    expect(screen.getByTestId('event-skeleton-list')).toBeInTheDocument();
    expect(screen.queryByTestId('event-skeleton-grid')).not.toBeInTheDocument();
  });

  it('sketches the grid when the visitor last chose it', () => {
    localStorage.setItem('movies-view', 'grid');
    renderSkeleton();
    expect(screen.getByTestId('event-skeleton-grid')).toBeInTheDocument();
  });
});
