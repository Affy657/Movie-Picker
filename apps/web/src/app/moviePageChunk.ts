export const MOVIE_PAGE_CHUNK = {
  load: () => import('@/app/pages/movie/MoviePage'),
};

export const MOVIE_PAGE_CHUNKS: ReadonlyArray<() => Promise<unknown>> = [
  () => MOVIE_PAGE_CHUNK.load(),
];
