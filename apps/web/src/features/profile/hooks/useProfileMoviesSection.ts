import { useEffect, useState } from 'react';
import type ProfileMoviesSection from '@/features/profile/components/ProfileMoviesSection';

type MoviesSection = typeof ProfileMoviesSection;

export function useProfileMoviesSection(profileLoaded: boolean): MoviesSection | null {
  const [section, setSection] = useState<MoviesSection | null>(null);
  const [failure, setFailure] = useState<unknown>(null);

  useEffect(() => {
    if (!profileLoaded || section) return;
    let active = true;
    import('@/features/profile/components/ProfileMoviesSection').then(
      (module) => {
        if (active) setSection(() => module.default);
      },
      (error: unknown) => {
        if (active) setFailure(error);
      }
    );
    return () => {
      active = false;
    };
  }, [profileLoaded, section]);

  if (failure) throw failure;
  return section;
}
