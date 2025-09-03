import React from 'react';

export type TimeRange = '1D' | '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL';

interface TimeRangeSelectorProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  className?: string;
}

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  selectedRange,
  onRangeChange,
  className = ''
}) => {
  const ranges: TimeRange[] = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', 'ALL'];

  return (
    <div className={`flex gap-1 ${className}`}>
      {ranges.map(range => (
        <button
          key={range}
          onClick={() => onRangeChange(range)}
          className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
            selectedRange === range
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
          }`}
        >
          {range}
        </button>
      ))}
    </div>
  );
};

export const getDateRangeFromTimeRange = (range: TimeRange): { startDate: Date; endDate: Date } => {
  const endDate = new Date();
  const startDate = new Date();

  switch (range) {
    case '1D':
      startDate.setDate(endDate.getDate() - 1);
      break;
    case '5D':
      startDate.setDate(endDate.getDate() - 5);
      break;
    case '1M':
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case '3M':
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    case '6M':
      startDate.setMonth(endDate.getMonth() - 6);
      break;
    case 'YTD':
      startDate.setMonth(0, 1); // January 1st of current year
      break;
    case '1Y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    case 'ALL':
      startDate.setFullYear(2000, 0, 1); // Far back enough to capture all data
      break;
  }

  return { startDate, endDate };
};
