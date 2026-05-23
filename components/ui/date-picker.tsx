'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface DatePickerProps {
  value: string; // Format: YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
}

const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

const YEARS = Array.from({ length: 21 }, (_, i) => 2018 + i); // 2018 to 2038

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0: CN, 1: T2...
}

function parseDate(dateStr: string) {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return { y, m, d };
    }
  }
  const today = new Date();
  return {
    y: today.getFullYear(),
    m: today.getMonth(),
    d: today.getDate()
  };
}

export function DatePicker({ value, onChange, placeholder = 'YYYY-MM-DD' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prevValue, setPrevValue] = useState(value);
  const [inputValue, setInputValue] = useState(value);
  
  // View states for calendar navigation
  const parsed = useMemo(() => parseDate(value), [value]);
  const [viewYear, setViewYear] = useState(parsed.y);
  const [viewMonth, setViewMonth] = useState(parsed.m);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync local input value when external value changes (during render to satisfy React 19 rules)
  if (value !== prevValue) {
    setPrevValue(value);
    setInputValue(value);
    const parsedExternal = parseDate(value);
    setViewYear(parsedExternal.y);
    setViewMonth(parsedExternal.m);
  }

  // Click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Validate date format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const parts = val.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      
      const parsedDate = new Date(y, m, d);
      if (
        parsedDate.getFullYear() === y &&
        parsedDate.getMonth() === m &&
        parsedDate.getDate() === d
      ) {
        onChange(val);
        setViewYear(y);
        setViewMonth(m);
      }
    }
  };

  const selectDay = useCallback((day: number) => {
    const y = String(viewYear);
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const formatted = `${y}-${m}-${d}`;
    onChange(formatted);
    setIsOpen(false);
  }, [viewYear, viewMonth, onChange]);

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  // Calendar calculations
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayIndex = getFirstDayOfMonth(viewYear, viewMonth); // 0 to 6
  
  const dayCells = useMemo(() => {
    const cells = [];
    // Prev month padding
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`pad-${i}`} className="size-8" />);
    }
    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = parsed.y === viewYear && parsed.m === viewMonth && parsed.d === day;
      cells.push(
        <button
          key={`day-${day}`}
          type="button"
          onClick={() => selectDay(day)}
          className={`size-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all duration-100 ${
            isSelected
              ? 'bg-primary text-primary-foreground font-bold shadow-sm scale-105 hover:bg-primary/90'
              : 'hover:bg-muted cursor-pointer text-foreground'
          }`}
        >
          {day}
        </button>
      );
    }
    return cells;
  }, [viewYear, viewMonth, daysInMonth, firstDayIndex, parsed, selectDay]);

  return (
    <div className="relative flex flex-col w-full sm:w-40" ref={popoverRef}>
      <div className="relative flex items-center">
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="pr-9 font-mono text-xs h-9 rounded-xl border-muted-foreground/20"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-0 h-full px-2.5 hover:bg-transparent text-muted-foreground hover:text-foreground"
        >
          <CalendarIcon className="size-4" />
        </Button>
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1.5 w-72 bg-popover text-popover-foreground border rounded-xl shadow-lg p-3.5 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Calendar Header with Month/Year selectors */}
          <div className="flex items-center justify-between mb-3.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-7 rounded-lg"
              onClick={prevMonth}
            >
              <ChevronLeft className="size-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="bg-transparent hover:bg-muted font-bold text-xs px-1.5 py-1 rounded-md border-none cursor-pointer focus:outline-none transition-colors"
              >
                {MONTHS.map((m, idx) => (
                  <option key={idx} value={idx} className="bg-popover text-foreground">
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="bg-transparent hover:bg-muted font-bold text-xs px-1.5 py-1 rounded-md border-none cursor-pointer focus:outline-none transition-colors"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y} className="bg-popover text-foreground">
                    Năm {y}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-7 rounded-lg"
              onClick={nextMonth}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground mb-1.5">
            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((w) => (
              <div key={w} className="size-8 flex items-center justify-center">
                {w}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {dayCells}
          </div>
        </div>
      )}
    </div>
  );
}
