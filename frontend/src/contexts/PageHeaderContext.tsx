import React, { createContext, useContext, useState, useCallback } from 'react';

const toISO = (d: Date) => d.toISOString().split('T')[0];

// Compute the comparison (previous) period dates based on sort mode
export const computeComparisonDates = (
  sortBy: string,
  dateFrom: string,
  dateTo: string
): { prevFrom: string; prevTo: string } => {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  if (sortBy === 'Last Year') {
    const pf = new Date(from); pf.setFullYear(pf.getFullYear() - 1);
    const pt = new Date(to);   pt.setFullYear(pt.getFullYear() - 1);
    return { prevFrom: toISO(pf), prevTo: toISO(pt) };
  }

  // Last Period: shift back by the same duration
  const duration = to.getTime() - from.getTime(); // ms
  const prevTo   = new Date(from.getTime() - 86_400_000); // 1 day before current from
  const prevFrom = new Date(prevTo.getTime() - duration);
  return { prevFrom: toISO(prevFrom), prevTo: toISO(prevTo) };
};

// Default date range = last 6 months
const today = new Date();
const defaultSortBy = 'Last Period';
const defaultDateTo   = toISO(today);
const defaultDateFrom = (() => { const d = new Date(today); d.setMonth(d.getMonth() - 6); return toISO(d); })();

interface PageHeaderState {
  title: string;
  subtitle: string;
  headerAction?: React.ReactNode;
  showFilters?: boolean;
  onBack?: () => void;
  sortBy: string;
  dateFrom: string;
  dateTo: string;
}

interface PageHeaderContextValue extends PageHeaderState {
  setPageHeader: (title: string, subtitle: string, headerAction?: React.ReactNode, showFilters?: boolean, onBack?: () => void) => void;
  setFilters: (sortBy: string, dateFrom: string, dateTo: string) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue>({
  title: '',
  subtitle: '',
  headerAction: undefined,
  showFilters: false,
  onBack: undefined,
  sortBy: defaultSortBy,
  dateFrom: defaultDateFrom,
  dateTo: defaultDateTo,
  setPageHeader: () => {},
  setFilters: () => {},
});

export const PageHeaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [header, setHeader] = useState<PageHeaderState>({
    title: '',
    subtitle: '',
    headerAction: undefined,
    showFilters: false,
    onBack: undefined,
    sortBy: defaultSortBy,
    dateFrom: defaultDateFrom,
    dateTo: defaultDateTo,
  });

  const setPageHeader = useCallback((title: string, subtitle: string, headerAction?: React.ReactNode, showFilters?: boolean, onBack?: () => void) => {
    setHeader(prev => ({ ...prev, title, subtitle, headerAction, showFilters: showFilters ?? false, onBack }));
  }, []);

  const setFilters = useCallback((sortBy: string, dateFrom: string, dateTo: string) => {
    setHeader(prev => ({ ...prev, sortBy, dateFrom, dateTo }));
  }, []);

  return (
    <PageHeaderContext.Provider value={{ ...header, setPageHeader, setFilters }}>
      {children}
    </PageHeaderContext.Provider>
  );
};

export const usePageHeader = () => useContext(PageHeaderContext);
