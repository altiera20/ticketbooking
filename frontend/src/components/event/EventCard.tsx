import React, { MouseEvent } from 'react';
import { format } from 'date-fns';
import { FaCalendarAlt, FaMapMarkerAlt, FaTicketAlt, FaFilm, FaMusic, FaTrain } from 'react-icons/fa';
import { EventCardProps, EventType } from '../../types/event.types';
import { twMerge } from 'tailwind-merge';
import { formatCurrency } from '../../utils/formatters';

const EventCard: React.FC<EventCardProps> = ({
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

  const handleCardClick = () => {
    onClick?.(event);
  };

  const handleBookNowClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick?.(event);
  };

  const getEventTypeDetails = () => {
    switch (type) {
      case EventType.MOVIE:
        return {
          Icon: FaFilm,
          label: 'Movie',
          borderColor: 'border-neon-pink',
          textColor: 'text-neon-pink',
          shadowColor: 'shadow-neon-glow-pink',
          gradient: 'from-neon-pink to-vibrant-purple',
        };
      case EventType.CONCERT:
        return {
          Icon: FaMusic,
          label: 'Concert',
          borderColor: 'border-neon-green',
          textColor: 'text-neon-green',
          shadowColor: 'shadow-neon-glow-green',
          gradient: 'from-neon-green to-electric-blue',
        };
      case EventType.TRAIN:
        return {
          Icon: FaTrain,
          label: 'Train',
          borderColor: 'border-electric-blue',
          textColor: 'text-electric-blue',
          shadowColor: 'shadow-neon-glow-blue',
          gradient: 'from-electric-blue to-vibrant-purple',
        };
      default:
        return {
          Icon: FaTicketAlt,
          label: 'Event',
          borderColor: 'border-vibrant-purple',
          textColor: 'text-vibrant-purple',
          shadowColor: 'shadow-neon-glow-purple',
          gradient: 'from-vibrant-purple to-neon-pink',
        };
    }
  };

  const eventTypeDetails = getEventTypeDetails();

  const formattedDate = format(new Date(eventDate), 'MMM dd, yyyy');
  const formattedTime = format(new Date(eventDate), 'p');
  const percentageBooked = totalSeats > 0 ? Math.round(((totalSeats - availableSeats) / totalSeats) * 100) : 0;

  const truncateDescription = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
  };

  const descriptionMaxLength = variant === 'compact' ? 150 : 100;

  const cardBaseClasses =
    'group relative w-full h-full flex flex-col rounded-2xl overflow-hidden border-2 bg-dark-bg/50 backdrop-blur-sm transition-all duration-300 ease-in-out';
  const cardHoverClasses =
    'hover:scale-[1.03] hover:shadow-2xl';
  const cardVariantClasses = {
    default: 'flex-col',
    compact: 'sm:flex-row',
  };

  const containerClasses = twMerge(
    cardBaseClasses,
    eventTypeDetails.borderColor,
    eventTypeDetails.shadowColor,
    cardHoverClasses,
    cardVariantClasses[variant],
    className
  );

  const InfoLine: React.FC<{ icon: React.ElementType; text: string; }> = ({ icon: Icon, text }) => (
    <div className="flex items-center gap-3">
      <Icon className={`text-lg ${eventTypeDetails.textColor}`} />
      <span className="font-body text-light-text/80 text-sm">{text}</span>
    </div>
  );

  return (
    <div className={containerClasses} onClick={handleCardClick}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 opacity-50 group-hover:opacity-80 transition-opacity duration-300"></div>
      
      <div className="relative z-10 flex flex-col justify-between h-full p-5 sm:p-6">
        <div>
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-heading text-fluid-xl text-light-text animate-glow-light leading-tight pr-4">
              {title}
            </h3>
            <div className={`flex-shrink-0 flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full border ${eventTypeDetails.borderColor} ${eventTypeDetails.textColor} bg-dark-bg/50`}>
              <eventTypeDetails.Icon />
              <span>{eventTypeDetails.label}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 mb-6">
            <p className="font-body text-light-text/70 leading-relaxed text-sm">
              {truncateDescription(description, descriptionMaxLength)}
            </p>
            <InfoLine icon={FaCalendarAlt} text={`${formattedDate} at ${formattedTime}`} />
            <InfoLine icon={FaMapMarkerAlt} text={venue} />
          </div>
        </div>

        <div className="mt-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <span className={`font-heading text-fluid-lg font-bold ${eventTypeDetails.textColor}`}>
                {formatCurrency(Number(price))}
              </span>
              <span className="text-xs text-light-text/60"> / ticket</span>
            </div>
            <button
              onClick={handleBookNowClick}
              className="font-heading text-fluid-sm w-full sm:w-auto px-5 py-2.5 rounded-md shadow-3d bg-gradient-to-br from-neon-pink to-vibrant-purple text-dark-text font-bold border-2 border-light-text transform transition-all duration-300 hover:scale-105 active:translate-y-1 active:shadow-none flex items-center justify-center gap-2"
            >
              <FaTicketAlt /> Book Now
            </button>
          </div>

          <div className="mt-4">
            <div className="w-full bg-dark-bg/50 rounded-full h-2 border border-light-text/20">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${eventTypeDetails.gradient}`}
                style={{ width: `${percentageBooked}%` }}
              />
            </div>
            <p className="text-xs text-light-text/60 mt-1 text-right">
              {availableSeats} seats left ({percentageBooked}% booked)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCard; 