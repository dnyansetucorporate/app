import { useState, useEffect } from 'react';

export function useSearchDebounce(setPage: (n: number) => void, delay = 400) {
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearchTerm(searchInput);
    }, delay);
    return () => clearTimeout(t);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  return { searchInput, setSearchInput, searchTerm };
}
