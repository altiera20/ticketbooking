import React from 'react';
import { format } from 'date-fns';
import { FaCalendarAlt, FaMapMarkerAlt, FaTicketAlt } from 'react-icons/fa';
import { EventCardProps, EventType } from '../../types';
import { twMerge } from 'tailwind-merge';
import Button from '../common/Button';

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onClick,
  variant = 'default',
  className,
}) => {
  const {
    title,
    description,
    type,
    venue,
    eventDate,
    price,
    availableSeats,
    totalSeats,
  } = event;
  
  const formattedDate = format(new Date(eventDate), 'PPP');
  const formattedTime = format(new Date(eventDate), 'p');
  const percentageBooked = Math.round(((totalSeats - availableSeats) / totalSeats) * 100);
  
  // Get event type icon and color
  const getEventTypeDetails = () => {
    switch (type) {
      case EventType.MOVIE:
        return {
          label: 'Movie',
          bgColor: 'bg-primary-100 dark:bg-primary-900',
          textColor: 'text-primary-800 dark:text-primary-300',
        };
      case EventType.CONCERT:
        return {
          label: 'Concert',
          bgColor: 'bg-secondary-100 dark:bg-secondary-900',
          textColor: 'text-secondary-800 dark:text-secondary-300',
        };
      case EventType.TRAIN:
        return {
          label: 'Train',
          bgColor: 'bg-accent-100 dark:bg-accent-900',
          textColor: 'text-accent-800 dark:text-accent-300',
        };
      default:
        return {
          label: 'Event',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          textColor: 'text-gray-800 dark:text-gray-300',
        };
    }
  };
  
  const eventTypeDetails = getEventTypeDetails();
  
  // Truncate description based on variant
  const truncateDescription = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };
  
  const descriptionMaxLength = variant === 'compact' ? 60 : variant === 'detailed' ? 200 : 100;
  
  // Handle click event
  const handleClick = () => {
    if (onClick) {
      onClick(event);
    }
  };
  
  // Card styles based on variant
  const cardStyles = {
    default: 'flex flex-col h-full',
    compact: 'flex flex-row h-32',
    detailed: 'flex flex-col h-full',
  };
  
  // Combine all styles
  const containerStyles = twMerge(
    'bg-white dark:bg-dark-700 rounded-lg shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden',
    cardStyles[variant],
    className
  );
  
  if (variant === 'compact') {
    return (
      <div className={containerStyles} onClick={handleClick} role="button" tabIndex={0}>
        {/* Image */}
        <div className="w-32 h-full bg-gray-200 dark:bg-gray-800 relative">
          <span className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${eventTypeDetails.bgColor} ${eventTypeDetails.textColor}`}>
            {eventTypeDetails.label}
          </span>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
              {title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
              {truncateDescription(description, descriptionMaxLength)}
            </p>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <div className="text-primary-600 dark:text-primary-400 font-bold">
              ${price.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
              <FaCalendarAlt className="mr-1" />
              {formattedDate}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (variant === 'detailed') {
    return (
      <div className={containerStyles}>
        {/* Image */}
        <div className="h-48 bg-gray-200 dark:bg-gray-800 relative">
          <span className={`absolute top-4 left-4 px-2 py-1 rounded-full text-xs font-medium ${eventTypeDetails.bgColor} ${eventTypeDetails.textColor}`}>
            {eventTypeDetails.label}
          </span>
        </div>
        
        {/* Content */}
        <div className="p-6 flex-1 flex flex-col">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {title}
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {truncateDescription(description, descriptionMaxLength)}
          </p>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <FaCalendarAlt className="mr-2" />
              <span>{formattedDate} at {formattedTime}</span>
            </div>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <FaMapMarkerAlt className="mr-2" />
              <span>{venue}</span>
            </div>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <FaTicketAlt className="mr-2" />
              <span>{availableSeats} seats available</span>
            </div>
          </div>
          
          <div className="mt-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {percentageBooked}% Booked
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {availableSeats}/{totalSeats} available
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full"
                style={{ width: `${percentageBooked}%` }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between mt-6">
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                ${price.toFixed(2)}
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={handleClick}
              >
                Book Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Default variant
  return (
    <div className={containerStyles} onClick={handleClick} role="button" tabIndex={0}>
      {/* Image */}
      <div className="h-40 bg-gray-200 dark:bg-gray-800 relative">
        <span className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${eventTypeDetails.bgColor} ${eventTypeDetails.textColor}`}>
          {eventTypeDetails.label}
        </span>
      </div>
      
      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {truncateDescription(description, descriptionMaxLength)}
        </p>
        
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
          <FaCalendarAlt className="mr-1" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-3">
          <FaMapMarkerAlt className="mr-1" />
          <span className="truncate">{venue}</span>
        </div>
        
        <div className="mt-auto flex items-center justify-between">
          <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
            ${price.toFixed(2)}
          </div>
          <div className="text-xs bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-300 px-2 py-1 rounded">
            {availableSeats} seats left
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCard; 