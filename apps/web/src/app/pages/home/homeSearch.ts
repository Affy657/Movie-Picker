import { useNavigate } from 'react-router';
import { ROUTES } from '@/app/routes';

export const SEARCH_EXAMPLES = ['Dune', 'Bong Joon-ho'];

export function useRunSearch(): (term: string) => boolean {
  const navigate = useNavigate();
  return (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return false;
    void navigate(ROUTES.movieSearchFor(trimmed));
    return true;
  };
}
