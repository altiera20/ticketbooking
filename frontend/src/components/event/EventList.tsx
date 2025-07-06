import React from 'react';
import { EventListProps, Event } from '../../types';
import EventCard from './EventCard';
import { FaRedo } from 'react-icons/fa';

const NeonLoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-4 py-20">
    <div className="w-24 h-24 border-8 border-vibrant-purple border-t-neon-pink rounded-full animate-spin-slow"></div>
    <p className="font-heading text-fluid-2xl text-neon-pink animate-pulse">Scanning the Cosmos...</p>
  </div>
);

const ActionButton: React.FC<{ onClick: () => void; children: React.ReactNode; }> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className="font-heading text-fluid-base px-6 py-3 rounded-md shadow-3d bg-gradient-to-br from-neon-green to-electric-blue text-dark-text font-bold border-2 border-light-text transform transition-all duration-300 hover:scale-105 active:translate-y-1 active:shadow-none flex items-center justify-center gap-2"
  >
    {children}
  </button>
);

const InfoBox: React.FC<{ title: string; message: string; children?: React.ReactNode }> = ({ title, message, children }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center bg-dark-bg/30 backdrop-blur-sm rounded-2xl border-2 border-vibrant-purple shadow-neon-outline-purple">
    <h3 className="font-heading text-fluid-4xl text-neon-pink animate-glow mb-2">{title}</h3>
    <p className="font-body text-fluid-lg text-light-text/80 max-w-md mb-6">{message}</p>
    {children}
  </div>
);

export const EventList: React.FC<EventListProps> = ({
  events,
  loading = false,
  error,
  viewType = 'grid',
  onEventClick,
  onRetry,
}) => {
  const handleEventClick = (event: Event) => {
    if (onEventClick) {
      onEventClick(event);
    }
  };

  if (loading) {
    return <NeonLoadingSpinner />;
  }

  if (error) {
    return (
      <InfoBox title="Cosmic Anomaly Detected" message={error}>
        <ActionButton onClick={onRetry || (() => window.location.reload())}>
          <FaRedo /> Try Again
        </ActionButton>
      </InfoBox>
    );
  }

  if (events.length === 0) {
    return (
      <InfoBox
        title="Lost in Space"
        message="No events match your query. Try adjusting your filters or exploring a different quadrant."
      />
    );
  }

  const gridClasses = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8";
  const listClasses = "flex flex-col gap-8";

  return (
    <div className={viewType === 'grid' ? gridClasses : listClasses}>
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          onClick={handleEventClick}
          variant={viewType === 'grid' ? 'default' : 'compact'}
        />
      ))}
    </div>
  );
};

export default EventList;