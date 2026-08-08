/**
 * Shared react-day-picker theming for DateInput/DateRangePicker, matching the
 * app's brand tokens (navy #0A3D4D, teal #4DB8CA, border #E2E8F0). No default
 * react-day-picker CSS is imported — everything is driven by these Tailwind
 * classNames (react-day-picker is designed to be styled this way).
 *
 * Modifier classes (selected, range start/middle/end, today, disabled, outside)
 * land on the day td cell, not the inner button — the `[&>button]:...` arbitrary
 * variants below reach into that button to recolor it based on the cell's state.
 */
export const dayPickerClassNames = {
  months: 'flex',
  month: 'grid grid-cols-[auto_1fr_auto] items-center gap-1',
  month_caption: 'flex items-center justify-center gap-1 py-1',
  caption_label: 'inline-flex items-center gap-1 text-[14px] font-bold text-[#1A2332]',
  // Dropdown mode (month/year selects, used by DateInput for fast year navigation e.g.
  // date of birth): `dropdown_root` wraps a real <select> stacked on top of the visible
  // `caption_label` text — the select is transparent and sized to fill its parent so the
  // whole pill is clickable, while the label underneath renders the current value + chevron.
  dropdowns: 'flex items-center justify-center gap-1',
  dropdown_root: 'relative inline-flex items-center rounded-md px-2 py-1 hover:bg-gray-100 focus-within:ring-1 focus-within:ring-[#4DB8CA] transition-colors',
  dropdown: 'absolute inset-0 h-full w-full opacity-0 cursor-pointer appearance-none border-none bg-transparent',
  button_previous:
    'h-7 w-7 flex items-center justify-center rounded-full text-[#64748B] hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent',
  button_next:
    'h-7 w-7 flex items-center justify-center rounded-full text-[#64748B] hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent',
  chevron: 'w-4 h-4 fill-current',
  month_grid: 'col-span-3 w-full border-collapse mt-2',
  weekdays: '',
  weekday: 'text-[11px] font-semibold text-[#94A3B8] uppercase w-9 h-8 text-center align-middle',
  weeks: '',
  week: '',
  day: 'w-9 h-9 p-0 text-center align-middle',
  day_button: 'w-9 h-9 mx-auto flex items-center justify-center rounded-full text-[13px] text-[#1A2332] bg-transparent hover:bg-gray-100 transition-colors',
  today: '[&>button]:ring-1 [&>button]:ring-[#0A3D4D] [&>button]:ring-inset',
  // `selected` fires for every day in a range (start, middle, and end alike), not
  // just the endpoints — range_start/range_end restyle the two endpoints, and
  // range_middle restyles everything in between. Since those land on the same day
  // cell as `selected` and target the same bg/text CSS properties, they use `!` so
  // they reliably win regardless of Tailwind's generated rule order.
  selected: 'bg-[#0A3D4D] rounded-full [&>button]:text-white [&>button]:hover:bg-transparent',
  range_start: '!bg-[#0A3D4D] rounded-l-full [&>button]:!text-white [&>button]:hover:bg-transparent',
  range_end: '!bg-[#0A3D4D] rounded-r-full [&>button]:!text-white [&>button]:hover:bg-transparent',
  range_middle: '!bg-[#4DB8CA]/20 rounded-none [&>button]:!text-[#0A3D4D] [&>button]:font-semibold [&>button]:hover:bg-transparent',
  outside: '[&>button]:!text-[#CBD5E1]',
  disabled: '!opacity-40 [&>button]:cursor-not-allowed [&>button]:hover:bg-transparent',
};

// Fixed width (not w-fit): an absolutely-positioned `right-0`/`left-0` panel with
// no explicit width is capped to its containing block's width when shrink-to-fit
// sizing — which is only as wide as the trigger button. A narrow trigger (e.g. a
// compact "Select date range" button) would then clip the ~252px-wide calendar
// grid. An explicit width sidesteps that regardless of the trigger's own size.
export const dayPickerPanelClassName =
  'w-[300px] bg-white rounded-[16px] border border-[#E2E8F0] shadow-lg p-4';
