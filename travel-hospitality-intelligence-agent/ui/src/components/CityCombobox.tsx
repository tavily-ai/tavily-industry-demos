import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CITIES } from "../data/cities";

interface CityComboboxProps {
  value: string;
  onChange: (value: string) => void;
  className: string;
}

const CityCombobox = ({ value, onChange, className }: CityComboboxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => {
    const query = value.trim().toLocaleLowerCase();
    return CITIES.filter((city) => city.toLocaleLowerCase().includes(query)).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [value]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => setActiveIndex(0), [value]);

  const choose = (city: string) => {
    onChange(city);
    setIsOpen(false);
  };

  return (
    <div className="city-combobox" ref={containerRef}>
      <input
        required
        id="destination"
        type="text"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls="city-options"
        value={value}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((index) => Math.min(index + 1, options.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && isOpen && options[activeIndex]) {
            event.preventDefault();
            choose(options[activeIndex]);
          } else if (event.key === "Escape") {
            setIsOpen(false);
          }
        }}
        className={className}
        placeholder="Search or choose a city"
      />
      <button
        type="button"
        className="city-combobox-toggle"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Show city list"
        tabIndex={-1}
      >
        <ChevronDown size={18} />
      </button>
      {isOpen && (
        <ul id="city-options" className="city-options" role="listbox" aria-label="City suggestions">
          {options.length ? (
            options.map((city, index) => (
              <li key={city} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  className={index === activeIndex ? "is-active" : ""}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(city)}
                >
                  {city}
                </button>
              </li>
            ))
          ) : (
            <li className="city-options-empty">
              No matching city — keep typing to use a custom destination.
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default CityCombobox;
