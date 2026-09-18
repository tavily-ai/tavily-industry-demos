import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const TRAVEL_FOCUSES = [
  'Luxury travel', 'Boutique hotels', 'Resorts and all-inclusive', 'Business travel',
  'Family travel', 'Solo travel', 'Adventure travel', 'Wellness and spa travel',
  'Food and culinary tourism', 'Cultural and heritage tourism', 'Events and festivals',
  'Tours and activities', 'Cruises', 'Air travel', 'Vacation rentals', 'Destination marketing',
] as const;

interface TravelFocusComboboxProps {
  value: string;
  onChange: (value: string) => void;
  className: string;
  id?: string;
  suggestions?: readonly string[];
  label?: string;
}

const TravelFocusCombobox = ({ value, onChange, className, id = 'travelFocus', suggestions = TRAVEL_FOCUSES, label = 'focus' }: TravelFocusComboboxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const options = suggestions.filter((focus) => focus.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase()));

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const choose = (focus: string) => {
    onChange(focus);
    setIsOpen(false);
  };

  return (
    <div className="city-combobox" ref={containerRef}>
      <input
        id={id}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={`${id}-options`}
        value={value}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => { onChange(event.target.value); setIsOpen(true); }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsOpen(false);
          if (event.key === 'Enter' && isOpen && options[0]) { event.preventDefault(); choose(options[0]); }
        }}
        className={className}
        placeholder={`Choose or enter a ${label}`}
      />
      <button type="button" className="city-combobox-toggle" onClick={() => setIsOpen((open) => !open)} aria-label={`Show ${label} list`} tabIndex={-1}>
        <ChevronDown size={18} />
      </button>
      {isOpen && (
        <ul id={`${id}-options`} className="city-options travel-focus-options" role="listbox" aria-label={`${label} suggestions`}>
          {options.map((focus) => <li key={focus} role="option"><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(focus)}>{focus}</button></li>)}
          {!options.length && <li className="city-options-empty">No matching {label} — keep typing to add your own.</li>}
        </ul>
      )}
    </div>
  );
};

export default TravelFocusCombobox;
