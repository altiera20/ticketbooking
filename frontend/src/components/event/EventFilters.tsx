import React, { useState, useEffect } from 'react';
import { EventFiltersProps, EventType } from '../../types';
import { FaFilter, FaCalendarAlt, FaMoneyBillWave, FaMapMarkerAlt, FaSearch, FaTimes } from 'react-icons/fa';
import Button from '../common/Button';
import Input from '../common/Input';

export const EventFilters: React.FC<EventFiltersProps> = ({
  filters,
  onFilterChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);
  const [priceRange, setPriceRange] = useState({
    min: filters.minPrice?.toString() || '',
    max: filters.maxPrice?.toString() || '',
  });
  
  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
    setPriceRange({
      min: filters.minPrice?.toString() || '',
      max: filters.maxPrice?.toString() || '',
    });
  }, [filters]);
  
  // Toggle mobile filters visibility
  const toggleFilters = () => {
    setIsOpen(!isOpen);
  };
  
  // Handle filter changes
  const handleFilterChange = (key: keyof typeof localFilters, value: any) => {
    const updatedFilters = { ...localFilters, [key]: value };
    setLocalFilters(updatedFilters);
  };
  
  // Handle price range changes
  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    setPriceRange({ ...priceRange, [type]: value });
  };
  
  // Apply filters
  const applyFilters = () => {
    const updatedFilters = { ...localFilters };
    
    // Parse price values
    if (priceRange.min) {
      updatedFilters.minPrice = parseFloat(priceRange.min);
    } else {
      delete updatedFilters.minPrice;
    }
    
    if (priceRange.max) {
      updatedFilters.maxPrice = parseFloat(priceRange.max);
    } else {
      delete updatedFilters.maxPrice;
    }
    
    onFilterChange(updatedFilters);
    
    // Close mobile filters
    if (isOpen) {
      setIsOpen(false);
    }
  };
  
  // Reset all filters
  const resetFilters = () => {
    const resetValues = {
      type: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      date: undefined,
      venue: undefined,
      search: undefined,
      sortBy: 'date',
      sortOrder: 'asc',
    };
    
    setLocalFilters(resetValues);
    setPriceRange({ min: '', max: '' });
    onFilterChange(resetValues);
  };
  
  // Check if any filters are applied
  const hasActiveFilters = () => {
    return (
      localFilters.type !== undefined ||
      localFilters.minPrice !== undefined ||
      localFilters.maxPrice !== undefined ||
      localFilters.date !== undefined ||
      localFilters.venue !== undefined ||
      localFilters.search !== undefined
    );
  };
  
  return (
    <div className="bg-white dark:bg-dark-700 rounded-lg shadow-sm mb-6 transition-colors duration-300">
      {/* Mobile Filter Toggle */}
      <div className="md:hidden p-4 flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFilters}
          leftIcon={<FaFilter />}
        >
          Filters
        </Button>
        
        {hasActiveFilters() && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
          >
            Clear All
          </Button>
        )}
      </div>
      
      {/* Desktop Filters */}
      <div className={`${isOpen ? 'block' : 'hidden'} md:block p-4 border-t md:border-t-0 border-gray-200 dark:border-gray-700`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <Input
              id="search"
              name="search"
              type="text"
              label="Search"
              placeholder="Search events..."
              leftIcon={<FaSearch />}
              value={localFilters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          
          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Event Type
            </label>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              value={localFilters.type || ''}
              onChange={(e) => handleFilterChange('type', e.target.value ? e.target.value : undefined)}
            >
              <option value="">All Types</option>
              <option value={EventType.MOVIE}>Movies</option>
              <option value={EventType.CONCERT}>Concerts</option>
              <option value={EventType.TRAIN}>Train Tickets</option>
            </select>
          </div>
          
          {/* Date */}
          <div>
            <Input
              id="date"
              name="date"
              type="date"
              label="Date"
              leftIcon={<FaCalendarAlt />}
              value={localFilters.date || ''}
              onChange={(e) => handleFilterChange('date', e.target.value || undefined)}
            />
          </div>
          
          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Price Range
            </label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaMoneyBillWave className="text-gray-400" />
                </div>
                <input
                  type="number"
                  placeholder="Min"
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm"
                  value={priceRange.min}
                  onChange={(e) => handlePriceChange('min', e.target.value)}
                  min="0"
                />
              </div>
              <span className="text-gray-500">-</span>
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaMoneyBillWave className="text-gray-400" />
                </div>
                <input
                  type="number"
                  placeholder="Max"
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white sm:text-sm"
                  value={priceRange.max}
                  onChange={(e) => handlePriceChange('max', e.target.value)}
                  min="0"
                />
              </div>
            </div>
          </div>
          
          {/* Venue */}
          <div>
            <Input
              id="venue"
              name="venue"
              type="text"
              label="Venue"
              placeholder="Enter venue name"
              leftIcon={<FaMapMarkerAlt />}
              value={localFilters.venue || ''}
              onChange={(e) => handleFilterChange('venue', e.target.value || undefined)}
            />
          </div>
        </div>
        
        {/* Sort Options */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sort By
            </label>
            <div className="flex space-x-2">
              <select
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                value={localFilters.sortBy || 'date'}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                <option value="date">Date</option>
                <option value="price">Price</option>
                <option value="title">Title</option>
              </select>
              <select
                className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                value={localFilters.sortOrder || 'asc'}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="lg:col-span-3 flex justify-end items-end space-x-3">
            {hasActiveFilters() && (
              <Button
                variant="outline"
                size="md"
                onClick={resetFilters}
                leftIcon={<FaTimes />}
              >
                Clear All
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              onClick={applyFilters}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventFilters; 