import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EventFilters from '../components/event/EventFilters';
import EventList from '../components/event/EventList';
import { Event, EventFilters as EventFiltersType } from '../types';
import { FaThList, FaThLarge } from 'react-icons/fa';
import eventService from '../services/event.service';

const PaginationButton: React.FC<{ onClick: () => void; disabled: boolean; children: React.ReactNode }> = ({ onClick, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="font-heading text-fluid-base px-6 py-2 rounded-md shadow-3d bg-gradient-to-br from-neon-green to-electric-blue text-dark-text font-bold border-2 border-light-text transform transition-all duration-300 hover:scale-105 active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-3d disabled:translate-y-0"
  >
    {children}
  </button>
);

const Events: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<EventFiltersType>({
    sortBy: 'date',
    sortOrder: 'asc',
    page: 1,
    limit: 9,
  });
  const [events, setEvents] = useState<Event[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 9,
    pages: 1,
  });

  useEffect(() => {
    fetchEvents(filters);
  }, [filters]);

  const fetchEvents = async (eventFilters: EventFiltersType) => {
    try {
      setLoading(true);
      setError(undefined);
      const response = await eventService.getEvents(eventFilters);
      setEvents(response.events);
      setPagination({
        total: response.total,
        page: eventFilters.page || 1,
        limit: eventFilters.limit || 9,
        pages: Math.ceil(response.total / (eventFilters.limit || 9)),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load events.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: EventFiltersType) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handleEventClick = (event: Event) => {
    navigate(`/events/${event.id}`);
  };

  const toggleViewType = () => {
    setViewType(viewType === 'grid' ? 'list' : 'grid');
  };

  const handleRetry = () => {
    fetchEvents(filters);
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="w-full p-8">
      <section className="text-center mb-12">
        <h1 className="font-heading text-fluid-7xl text-light-text animate-glow leading-tight">
          Find Your <span className="text-laser-lemon">Next</span> Event
        </h1>
        <p className="font-body text-fluid-lg text-light-text/80 max-w-3xl mx-auto mt-4">
          Explore a universe of possibilities. The hottest tickets in the galaxy are right here.
        </p>
      </section>

      <div className="bg-dark-bg/30 backdrop-blur-sm p-6 rounded-2xl border-2 border-vibrant-purple shadow-neon-outline-purple mb-8">
        <EventFilters filters={filters} onFilterChange={handleFilterChange} />
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="font-body text-fluid-base text-neon-pink text-shadow-neon-pink">
          {!loading && !error ? `${pagination.total} events found` : 'Searching the cosmos...'}
        </div>
        <button
          onClick={toggleViewType}
          className="p-3 rounded-md text-laser-lemon bg-dark-bg/50 border-2 border-laser-lemon shadow-3d transform transition-transform duration-300 hover:scale-110 hover:bg-vibrant-purple active:translate-y-1 disabled:opacity-50"
          aria-label={viewType === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          disabled={loading || events.length === 0}
        >
          {viewType === 'grid' ? <FaThList size={24} /> : <FaThLarge size={24} />}
        </button>
      </div>

      <EventList
        events={events}
        loading={loading}
        error={error}
        viewType={viewType}
        onEventClick={handleEventClick}
        onRetry={handleRetry}
      />

      {!loading && !error && pagination.pages > 1 && (
        <div className="flex justify-center items-center mt-12 space-x-6">
          <PaginationButton onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}>
            Previous
          </PaginationButton>
          <span className="font-heading text-fluid-lg text-light-text text-shadow-neon-green">
            Page {pagination.page} of {pagination.pages}
          </span>
          <PaginationButton onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.pages}>
            Next
          </PaginationButton>
        </div>
      )}
    </div>
  );
};

export default Events;
