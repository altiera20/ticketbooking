import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/common/Layout';
import EventFilters from '../components/event/EventFilters';
import EventList from '../components/event/EventList';
import { Event, EventFilters as EventFiltersType } from '../types';
import { FaThList, FaThLarge } from 'react-icons/fa';
import { eventService } from '../services/event.service';

const Events: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<EventFiltersType>({
    sortBy: 'date',
    sortOrder: 'asc',
  });
  const [events, setEvents] = useState<Event[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 1,
  });
  
  // Fetch events on initial load and when filters change
  useEffect(() => {
    fetchEvents(filters);
  }, [filters]);
  
  // Fetch events from API
  const fetchEvents = async (eventFilters: EventFiltersType) => {
    try {
      setLoading(true);
      setError(undefined);
      
      const response = await eventService.getEvents(eventFilters);
      setEvents(response.events);
      setPagination(response.pagination);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      setError(err.message || 'Failed to load events. Please try again.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle filter changes
  const handleFilterChange = (newFilters: EventFiltersType) => {
    setFilters(newFilters);
  };
        
  // Handle event click - navigate to event details page
  const handleEventClick = (event: Event) => {
    navigate(`/events/${event.id}`);
  };
  
  // Toggle view type
  const toggleViewType = () => {
    setViewType(viewType === 'grid' ? 'list' : 'grid');
  };
  
  // Handle retry on error
  const handleRetry = () => {
    fetchEvents(filters);
  };
  
  return (
    <div className="w-full">
      <div className="bg-primary-50 dark:bg-dark-900 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Browse Events
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Find and book tickets for movies, concerts, and train journeys
          </p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-6">
        <EventFilters filters={filters} onFilterChange={handleFilterChange} />
        
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-gray-700 dark:text-gray-300">
              {!loading && !error ? `${pagination.total} events found` : ''}
            </span>
          </div>
          <div>
            <button
              onClick={toggleViewType}
              className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={viewType === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
              disabled={loading || events.length === 0}
            >
              {viewType === 'grid' ? <FaThList size={20} /> : <FaThLarge size={20} />}
            </button>
          </div>
        </div>
        
        <EventList
          events={events}
          loading={loading}
          error={error}
          viewType={viewType}
          onEventClick={handleEventClick}
          onRetry={handleRetry}
        />
        
        {/* Pagination */}
        {!loading && !error && pagination.pages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex space-x-2">
              <button
                onClick={() => setFilters({ ...filters, page: Math.max(1, (filters.page || 1) - 1) })}
                disabled={(filters.page || 1) <= 1}
                className="px-4 py-2 border rounded-md bg-white text-gray-700 disabled:opacity-50"
              >
                Previous
              </button>
              
              <span className="px-4 py-2 border rounded-md bg-white">
                Page {filters.page || 1} of {pagination.pages}
              </span>
              
              <button
                onClick={() => setFilters({ ...filters, page: Math.min(pagination.pages, (filters.page || 1) + 1) })}
                disabled={(filters.page || 1) >= pagination.pages}
                className="px-4 py-2 border rounded-md bg-white text-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;
