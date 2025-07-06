import React, { useState, useEffect } from 'react';
import { EventFiltersProps } from '../../types';
import { FaFilter, FaCalendarAlt, FaMoneyBillWave, FaMapMarkerAlt, FaSearch, FaTimes, FaSortAmountDown, FaSortAmountUp, FaTags } from 'react-icons/fa';

const FilterInput: React.FC<{ id: string; type: string; placeholder: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; icon: React.ReactNode }> = ({ id, type, placeholder, value, onChange, icon }) => (
  <div className="relative w-full">
    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neon-pink">{icon}</span>
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full bg-dark-bg/50 text-light-text placeholder-light-text/50 font-body text-fluid-base pl-12 pr-4 py-3 border-2 border-vibrant-purple rounded-lg focus:ring-2 focus:ring-neon-pink focus:border-neon-pink transition-all duration-300 shadow-inner-neon"
    />
  </div>
);

const FilterSelect: React.FC<{ id: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode; icon: React.ReactNode }> = ({ id, value, onChange, children, icon }) => (
  <div className="relative w-full">
    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neon-pink">{icon}</span>
    <select
      id={id}
      value={value}
      onChange={onChange}
      className="w-full appearance-none bg-dark-bg/50 text-light-text font-body text-fluid-base pl-12 pr-10 py-3 border-2 border-vibrant-purple rounded-lg focus:ring-2 focus:ring-neon-pink focus:border-neon-pink transition-all duration-300 shadow-inner-neon"
    >
      {children}
    </select>
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-light-text">
      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.516 7.548c.436-.446 1.144-.446 1.58 0L10 10.405l2.904-2.857c.436-.446 1.144-.446 1.58 0 .436.446.436 1.167 0 1.613l-3.72 3.667a1.12 1.12 0 0 1-1.58 0L5.516 9.16c-.436-.446-.436-1.167 0-1.613z"/></svg>
    </div>
  </div>
);

const ActionButton: React.FC<{ onClick: () => void; children: React.ReactNode; variant?: 'primary' | 'secondary' }> = ({ onClick, children, variant = 'primary' }) => {
  const baseClasses = "font-heading text-fluid-base px-6 py-3 rounded-md shadow-3d font-bold border-2 transform transition-all duration-300 hover:scale-105 active:translate-y-1 active:shadow-none flex items-center justify-center gap-2";
  const variantClasses = variant === 'primary'
    ? "bg-gradient-to-br from-neon-green to-electric-blue text-dark-text border-light-text"
    : "bg-transparent border-neon-pink text-neon-pink hover:bg-neon-pink hover:text-dark-bg";
  return <button onClick={onClick} className={`${baseClasses} ${variantClasses}`}>{children}</button>;
};

export const EventFilters: React.FC<EventFiltersProps> = ({ filters, onFilterChange }) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [priceRange, setPriceRange] = useState({
    min: filters.minPrice?.toString() || '',
    max: filters.maxPrice?.toString() || '',
  });

  useEffect(() => {
    setLocalFilters(filters);
    setPriceRange({ min: filters.minPrice?.toString() || '', max: filters.maxPrice?.toString() || '' });
  }, [filters]);

  const handleFilterChange = (key: keyof typeof localFilters, value: any) => {
    setLocalFilters({ ...localFilters, [key]: value });
  };

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    setPriceRange({ ...priceRange, [type]: value });
  };

  const applyFilters = () => {
    const updatedFilters = { ...localFilters };
    if (priceRange.min) updatedFilters.minPrice = parseFloat(priceRange.min); else delete updatedFilters.minPrice;
    if (priceRange.max) updatedFilters.maxPrice = parseFloat(priceRange.max); else delete updatedFilters.maxPrice;
    onFilterChange(updatedFilters);
  };

  const resetFilters = () => {
    const newFilters = {
      limit: filters.limit,
      page: 1,
      sortBy: 'date' as const,
      sortOrder: 'asc' as const,
      search: undefined,
      type: undefined,
      date: undefined,
      venue: undefined,
      minPrice: undefined,
      maxPrice: undefined,
    };
    setLocalFilters(newFilters);
    setPriceRange({ min: '', max: '' });
    onFilterChange(newFilters);
  };

  const hasActiveFilters = () => {
    const { sortBy, sortOrder, ...activeFilters } = filters;
    return Object.values(activeFilters).some(value => value !== undefined && value !== '');
  };

  return (
    <div className="font-body text-light-text">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
        <FilterInput id="search" type="text" placeholder="Search by keyword..." value={localFilters.search || ''} onChange={(e) => handleFilterChange('search', e.target.value)} icon={<FaSearch />} />
        <FilterSelect id="type" value={localFilters.type || ''} onChange={(e) => handleFilterChange('type', e.target.value || undefined)} icon={<FaTags />}>
          <option value="">All Types</option>
          <option value="movie">Movie</option>
          <option value="concert">Concert</option>
          <option value="travel">Travel</option>
        </FilterSelect>
        <FilterInput id="date" type="date" placeholder="Select Date" value={localFilters.date || ''} onChange={(e) => handleFilterChange('date', e.target.value || undefined)} icon={<FaCalendarAlt />} />
        <FilterInput id="venue" type="text" placeholder="Venue name..." value={localFilters.venue || ''} onChange={(e) => handleFilterChange('venue', e.target.value || undefined)} icon={<FaMapMarkerAlt />} />
        
        <div className="flex items-center gap-4 md:col-span-2 lg:col-span-1">
          <FilterInput id="minPrice" type="number" placeholder="Min Price" value={priceRange.min} onChange={(e) => handlePriceChange('min', e.target.value)} icon={<FaMoneyBillWave />} />
          <span className="text-fluid-lg font-bold text-vibrant-purple">-</span>
          <FilterInput id="maxPrice" type="number" placeholder="Max Price" value={priceRange.max} onChange={(e) => handlePriceChange('max', e.target.value)} icon={<FaMoneyBillWave />} />
        </div>

        <div className="flex items-center gap-4 md:col-span-2 lg:col-span-2 xl:col-span-1">
          <FilterSelect id="sortBy" value={localFilters.sortBy || 'date'} onChange={(e) => handleFilterChange('sortBy', e.target.value)} icon={<FaSortAmountDown />}>
            <option value="date">Sort by Date</option>
            <option value="price">Sort by Price</option>
            <option value="title">Sort by Title</option>
          </FilterSelect>
        </div>

        <div className="flex items-center gap-4">
            <FilterSelect id="sortOrder" value={localFilters.sortOrder || 'asc'} onChange={(e) => handleFilterChange('sortOrder', e.target.value)} icon={localFilters.sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />}>
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
            </FilterSelect>
        </div>
      </div>

      <div className="flex justify-center md:justify-end items-center gap-4">
        {hasActiveFilters() && (
          <ActionButton onClick={resetFilters} variant="secondary">
            <FaTimes /> Clear Filters
          </ActionButton>
        )}
        <ActionButton onClick={applyFilters}>
          <FaFilter /> Apply Filters
        </ActionButton>
      </div>
    </div>
  );
};

export default EventFilters;