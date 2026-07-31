import React, { useState, useRef, useEffect } from 'react';
import { DayPicker, type Matcher } from 'react-day-picker';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { parseYMD, formatYMD, formatDisplayDate } from '@/utils/date';
import { dayPickerClassNames, dayPickerPanelClassName } from './dayPickerTheme';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  onBlur?: () => void;
  id?: string;
  name?: string;
}

const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  min,
  max,
  disabled,
  placeholder = 'Select date',
  className,
  onBlur,
  id,
  name,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        if (open) onBlur?.();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const minDate = parseYMD(min);
  const maxDate = parseYMD(max);
  const disabledMatchers: Matcher[] = [];
  if (minDate) disabledMatchers.push({ before: minDate });
  if (maxDate) disabledMatchers.push({ after: maxDate });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn('flex items-center justify-between gap-2 text-left', className)}
      >
        <span className={!value ? 'text-[#94A3B8]' : undefined}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        <CalendarIcon size={15} className="text-[#64748B] flex-shrink-0" />
      </button>

      {open && (
        <div className={cn('absolute left-0 top-full mt-2 z-50', dayPickerPanelClassName)}>
          <DayPicker
            mode="single"
            navLayout="around"
            selected={parseYMD(value)}
            onSelect={(date) => {
              onChange(date ? formatYMD(date) : '');
              setOpen(false);
              onBlur?.();
            }}
            disabled={disabledMatchers.length ? disabledMatchers : undefined}
            classNames={dayPickerClassNames}
            showOutsideDays
          />
        </div>
      )}
    </div>
  );
};

export default DateInput;
