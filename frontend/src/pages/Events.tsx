import React, { useState } from 'react';
import Layout from '../components/common/Layout';
import EventFilters from '../components/event/EventFilters';
import EventList from '../components/event/EventList';
import { Event, EventFilters as EventFiltersType, EventType, EventStatus } from '../types';
import { FaThList, FaThLarge } from 'react-icons/fa';

// Mock data for events
const mockEvents: Event[] = [
  {
    id: '1',
    vendorId: 'vendor1',
    title: 'Avengers: Endgame',
    description: 'The epic conclusion to the Infinity Saga that became a critically acclaimed worldwide phenomenon.',
    type: EventType.MOVIE,
    venue: 'Cineplex Downtown',
    eventDate: new Date(2023, 11, 25, 18, 30).toISOString(),
    price: 15.99,
    totalSeats: 150,
    availableSeats: 75,
    status: EventStatus.PUBLISHED,
    createdAt: new Date(2023, 10, 1).toISOString(),
    updatedAt: new Date(2023, 10, 1).toISOString(),
  },
  {
    id: '2',
    vendorId: 'vendor2',
    title: 'Taylor Swift: The Eras Tour',
    description: 'Experience the music of Taylor Swift\'s journey through the musical eras of her career.',
    type: EventType.CONCERT,
    venue: 'Grand Arena',
    eventDate: new Date(2023, 11, 30, 20, 0).toISOString(),
    price: 89.99,
    totalSeats: 5000,
    availableSeats: 1200,
    status: EventStatus.PUBLISHED,
    createdAt: new Date(2023, 9, 15).toISOString(),
    updatedAt: new Date(2023, 9, 15).toISOString(),
  },
  {
    id: '3',
    vendorId: 'vendor3',
    title: 'Express Train to Chicago',
    description: 'Fast and comfortable train journey from New York to Chicago with scenic views.',
    type: EventType.TRAIN,
    venue: 'Grand Central Station',
    eventDate: new Date(2023, 12, 5, 9, 0).toISOString(),
    price: 120.50,
    totalSeats: 200,
    availableSeats: 42,
    status: EventStatus.PUBLISHED,
    createdAt: new Date(2023, 10, 10).toISOString(),
    updatedAt: new Date(2023, 10, 10).toISOString(),
  },
  {
    id: '4',
    vendorId: 'vendor1',
    title: 'Dune: Part Two',
    description: 'The saga continues as Paul Atreides unites with the Fremen to seek revenge against the conspirators who destroyed his family.',
    type: EventType.MOVIE,
    venue: 'IMAX Theater',
    eventDate: new Date(2023, 12, 10, 19, 0).toISOString(),
    price: 18.99,
    totalSeats: 200,
    availableSeats: 150,
    status: EventStatus.PUBLISHED,
    createdAt: new Date(2023, 10, 20).toISOString(),
    updatedAt: new Date(2023, 10, 20).toISOString(),
  },
  {
    id: '5',
    vendorId: 'vendor2',
    title: 'Jazz Night with Louis Armstrong Tribute Band',
    description: 'A night of classic jazz music celebrating the legacy of Louis Armstrong.',
    type: EventType.CONCERT,
    venue: 'Blue Note Jazz Club',
    eventDate: new Date(2023, 12, 15, 21, 0).toISOString(),
    price: 45.00,
    totalSeats: 120,
    availableSeats: 30,
    status: EventStatus.PUBLISHED,
    createdAt: new Date(2023, 10, 25).toISOString(),
    updatedAt: new Date(2023, 10, 25).toISOString(),
  },
  {
    id: '6',
    vendorId: 'vendor3',
    title: 'Overnight Sleeper to Boston',
    description: 'Comfortable overnight train journey with private cabins and dining service.',
    type: EventType.TRAIN,
    venue: 'Union Station',
    eventDate: new Date(2023, 12, 20, 22, 0).toISOString(),
    price: 175.00,
    totalSeats: 80,
    availableSeats: 15,
    status: EventStatus.PUBLISHED,
    createdAt: new Date(2023, 11, 1).toISOString(),
    updatedAt: new Date(2023, 11, 1).toISOString(),
  },
];

const Events: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<EventFiltersType>({
    sortBy: 'date',
    sortOrder: 'asc',
  });
  const [events, setEvents] = useState<Event[]>(mockEvents);
  
  // Handle filter changes
  const handleFilterChange = (newFilters: EventFiltersType) => {
    setLoading(true);
    setFilters(newFilters);
    
    // Simulate API request delay
    setTimeout(() => {
      try {
        // Apply filters to mock data
        let filteredEvents = [...mockEvents];
        
        // Filter by type
        if (newFilters.type) {
          filteredEvents = filteredEvents.filter(event => event.type === newFilters.type);
        }
        
        // Filter by price range
        if (newFilters.minPrice !== undefined) {
          filteredEvents = filteredEvents.filter(event => event.price >= newFilters.minPrice!);
        }
        
        if (newFilters.maxPrice !== undefined) {
          filteredEvents = filteredEvents.filter(event => event.price <= newFilters.maxPrice!);
        }
        
        // Filter by date
        if (newFilters.date) {
          const filterDate = new Date(newFilters.date);
          filteredEvents = filteredEvents.filter(event => {
            const eventDate = new Date(event.eventDate);
            return eventDate.toDateString() === filterDate.toDateString();
          });
        }
        
        // Filter by venue
        if (newFilters.venue) {
          filteredEvents = filteredEvents.filter(event => 
            event.venue.toLowerCase().includes(newFilters.venue!.toLowerCase())
          );
        }
        
        // Filter by search term
        if (newFilters.search) {
          const searchTerm = newFilters.search.toLowerCase();
          filteredEvents = filteredEvents.filter(event => 
            event.title.toLowerCase().includes(searchTerm) || 
            event.description.toLowerCase().includes(searchTerm)
          );
        }
        
        // Sort events
        if (newFilters.sortBy) {
          filteredEvents.sort((a, b) => {
            const sortOrder = newFilters.sortOrder === 'asc' ? 1 : -1;
            
            switch (newFilters.sortBy) {
              case 'date':
                return (new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()) * sortOrder;
              case 'price':
                return (a.price - b.price) * sortOrder;
              case 'title':
                return a.title.localeCompare(b.title) * sortOrder;
              default:
                return 0;
            }
          });
        }
        
        setEvents(filteredEvents);
        setLoading(false);
      } catch (err) {
        setError('Failed to filter events. Please try again.');
        setLoading(false);
      }
    }, 500);
  };
  
  // Handle event click
  const handleEventClick = (event: Event) => {
    // In a real app, navigate to event details page
    console.log('Event clicked:', event);
  };
  
  // Toggle view type
  const toggleViewType = () => {
    setViewType(viewType === 'grid' ? 'list' : 'grid');
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
              {events.length} events found
            </span>
          </div>
          <div>
            <button
              onClick={toggleViewType}
              className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={viewType === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
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
        />
      </div>
    </div>
  );
};

export default Events;
