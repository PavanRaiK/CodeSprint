import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, Building, ArrowRight, Check } from 'lucide-react';
import { CampusLocation } from '../types';
import { CampusAPI } from '../services/api';

interface SearchBarProps {
  onSelectDestination: (location: CampusLocation) => void;
  selectedDestination: CampusLocation | null;
  onClearDestination: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSelectDestination,
  selectedDestination,
  onClearDestination
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CampusLocation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Quick recommendation chips for demo
  const quickChips = [
    { label: 'Room 214', query: '214' },
    { label: "Principal's Chamber", query: 'principal' },
    { label: 'Central Library', query: 'library' },
    { label: 'Computer Lab 5', query: 'lab 5' },
    { label: 'Incubation Centre', query: 'incubation' }
  ];

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const matches = await CampusAPI.searchLocations(query);
        setResults(matches);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (loc: CampusLocation) => {
    onSelectDestination(loc);
    setQuery(loc.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    onClearDestination();
  };

  const floorNames = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor'];

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-fog pointer-events-none">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Where do you want to go?"
          className="w-full h-11 pl-10 pr-9 rounded-pill bg-charcoal hover:bg-graphite focus:bg-charcoal border border-gunmetal focus:border-signal text-white placeholder-fog text-sm transition outline-none shadow-md"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 p-1 rounded-full text-fog hover:text-white transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Quick Category / Destination Chips */}
      {!selectedDestination && (
        <div className="flex items-center space-x-1.5 mt-2.5 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-[11px] text-ash font-medium uppercase tracking-wider shrink-0 mr-1">
            Quick:
          </span>
          {quickChips.map(chip => (
            <button
              key={chip.label}
              onClick={() => {
                setQuery(chip.query);
                setIsOpen(true);
              }}
              className="text-xs px-2.5 py-1 rounded-pill bg-gunmetal hover:bg-graphite text-fog hover:text-white border border-steel/40 shrink-0 transition"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Selected Destination Pill Preview */}
      {selectedDestination && (
        <div className="mt-2.5 p-3 rounded-card bg-graphite border border-signal/30 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-full bg-signal/20 text-signal flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span>{selectedDestination.name}</span>
                <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-signal/20 text-signal border border-signal/30">
                  {floorNames[selectedDestination.floor]}
                </span>
              </div>
              <p className="text-[11px] text-fog leading-tight">
                {selectedDestination.description || selectedDestination.department}
              </p>
            </div>
          </div>
          <button
            onClick={handleClear}
            className="text-[11px] text-ash hover:text-mapred px-2 py-1 transition"
          >
            Change
          </button>
        </div>
      )}

      {/* Search Dropdown Results */}
      {isOpen && (
        <div className="absolute top-12 left-0 right-0 max-h-72 overflow-y-auto rounded-card bg-charcoal border border-gunmetal shadow-2xl z-50 p-1.5 space-y-1">
          {isLoading && (
            <div className="py-4 text-center text-xs text-fog">
              Searching campus locations...
            </div>
          )}

          {!isLoading && results.length === 0 && query.trim() && (
            <div className="py-4 text-center text-xs text-fog">
              Location not found in verified Sahyadri blueprint.
            </div>
          )}

          {!isLoading && results.map(loc => (
            <div
              key={loc.id}
              onClick={() => handleSelect(loc)}
              className="flex items-center justify-between p-2.5 rounded-chip hover:bg-graphite cursor-pointer transition group"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-7 h-7 rounded-sharp bg-gunmetal group-hover:bg-signal/20 text-fog group-hover:text-signal flex items-center justify-center shrink-0 transition">
                  <Building className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-medium text-white group-hover:text-signal transition truncate">
                    {loc.name}
                  </div>
                  <div className="text-[11px] text-fog truncate">
                    {loc.department || loc.type}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0 ml-2">
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-gunmetal text-fog border border-steel/30">
                  {floorNames[loc.floor]}
                </span>
                <ArrowRight className="w-3 h-3 text-steel group-hover:text-signal transition" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
