import { lazy, Suspense, type ComponentProps } from 'react';

export const loadMovieDetailsModal = () => import('@/features/movies/components/MovieDetailsModal');

const MovieDetailsModal = lazy(loadMovieDetailsModal);

type LazyMovieDetailsModalProps = ComponentProps<typeof MovieDetailsModal>;

export default function LazyMovieDetailsModal(props: Readonly<LazyMovieDetailsModalProps>) {
  return (
    <Suspense fallback={null}>
      <MovieDetailsModal {...props} />
    </Suspense>
  );
}
