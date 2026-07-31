import React, { useState, useRef, useEffect } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { parseYMD, formatYMD, formatDisplayDate } from '@/utils/date';
import { dayPickerClassNames, dayPickerPanelClassName } from './dayPickerTheme';

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  placeholder?: string;
  className?: string;
  /** Which edge of the trigger the popover hangs from. Defaults to 'right' since
   * this component is typically placed in right-aligned filter bars, where a
   * left-hung popover would overflow off the viewport edge. */
  align?: 'left' | 'right';
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  from,
  to,
  onChange,
  placeholder = 'Select date range',
  className,
  align = 'right',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected: DateRange | undefined =
    from || to ? { from: parseYMD(from), to: parseYMD(to) } : undefined;

  const label = from || to
    ? `${formatDisplayDate(from) || '…'} – ${formatDisplayDate(to) || '…'}`
    : placeholder;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2 text-left',
          className ?? 'border border-[#E2E8F0] rounded-[6px] px-3 py-1.5 text-[13px] text-[#1A2332] hover:border-[#4DB8CA] transition-colors'
        )}
      >
        <CalendarIcon size={14} className="text-[#64748B] flex-shrink-0" />
        <span className={!(from || to) ? 'text-[#94A3B8]' : undefined}>{label}</span>
      </button>

      {open && (
        <div className={cn('absolute top-full mt-2 z-50', align === 'right' ? 'right-0' : 'left-0', dayPickerPanelClassName)}>
          <DayPicker
            mode="range"
            navLayout="around"
            selected={selected}
            onSelect={(range) => {
              onChange(range?.from ? formatYMD(range.from) : '', range?.to ? formatYMD(range.to) : '');
              if (range?.from && range?.to) setOpen(false);
            }}
            classNames={dayPickerClassNames}
            showOutsideDays
          />
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
