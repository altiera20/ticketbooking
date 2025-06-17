import React from 'react';
import { EventListProps, Event } from '../../types';
import EventCard from './EventCard';
import LoadingSpinner from '../common/LoadingSpinner';

export const EventList: React.FC<EventListProps> = ({
  events,
  loading = false,
  error,
  viewType = 'grid',
  onEventClick,
  onRetry,
}) => {
  // Handle event click
  const handleEventClick = (event: Event) => {
    if (onEventClick) {
      onEventClick(event);
    }
  };
  
  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <LoadingSpinner size="lg" color="primary" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading events...</p>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="bg-error-100 dark:bg-error-900 text-error-600 dark:text-error-400 p-4 rounded-lg mb-4">
          <p className="font-medium">Error loading events</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
        <button
          className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
          onClick={onRetry || (() => window.location.reload())}
        >
          Try Again
        </button>
      </div>
    );
  }
  
  // Show empty state
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No events found</p>
        <p className="text-gray-500 dark:text-gray-500">Try adjusting your filters or check back later.</p>
      </div>
    );
  }
  
  // Grid view
  if (viewType === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onClick={handleEventClick}
            variant="default"
          />
        ))}
      </div>
    );
  }
  
  // List view
  return (
    <div className="space-y-4">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          onClick={handleEventClick}
          variant="compact"
          className="w-full"
        />
      ))}
    </div>
  );
};

export default EventList; 