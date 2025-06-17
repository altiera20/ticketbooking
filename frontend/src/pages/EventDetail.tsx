// frontend/src/pages/EventDetail.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Users, Star, ArrowLeft, AlertCircle } from 'lucide-react';
import { eventService } from '../services/event.service';
import bookingService, { Seat } from '../services/booking.service';
import SeatSelection from '../components/booking/SeatSelection';
import { Event } from '../types';

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seatError, setSeatError] = useState<string | null>(null);
  const [showSeatSelection, setShowSeatSelection] = useState(false);
  const [reservingSeats, setReservingSeats] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEventDetails();
    }
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch event details
      const eventData = await eventService.getEventById(id!);
      setEvent(eventData);

      // Fetch seats
      await fetchEventSeats();
    } catch (err: any) {
      console.error('Error loading event details:', err);
      setError(err.message || 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchEventSeats = async () => {
    if (!id) return;
    
    try {
      setSeatsLoading(true);
      setSeatError(null);
      const seatsData = await bookingService.getEventSeats(id);
      setSeats(seatsData);
    } catch (err: any) {
      console.error('Error loading seats:', err);
      setSeatError(err.message || 'Failed to load seat information');
      setSeats([]);
    } finally {
      setSeatsLoading(false);
    }
  };

  const handleSeatSelect = (seat: Seat) => {
    setSelectedSeats(prev => {
      const isSelected = prev.find(s => s.id === seat.id);
      if (isSelected) {
        return prev.filter(s => s.id !== seat.id);
      } else {
        return [...prev, seat];
      }
    });
  };

  const handleProceedToBooking = async () => {
    if (selectedSeats.length === 0) {
      alert('Please select at least one seat');
      return;
    }

    try {
      setReservingSeats(true);
      
      // Reserve seats temporarily
      await bookingService.reserveSeats({
        eventId: id!,
        seatIds: selectedSeats.map(seat => seat.id)
      });

      // Navigate to booking page with selected seats
      navigate('/booking', {
        state: {
          event,
          selectedSeats,
          totalAmount: selectedSeats.reduce((sum, seat) => sum + seat.price, 0)
        }
      });
    } catch (err: any) {
      console.error('Error reserving seats:', err);
      alert(err.message || 'Failed to reserve seats. Please try again.');
    } finally {
      setReservingSeats(false);
    }
  };

  const handleRetry = () => {
    fetchEventDetails();
  };
  
  const handleRetrySeats = () => {
    fetchEventSeats();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error || 'Event not found'}</span>
          </div>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={handleRetry}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/events')}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition"
            >
              Back to Events
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/events')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Events
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Event Image Placeholder */}
              <div className="h-64 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <div className="text-center text-white">
                  <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
                  <p className="text-blue-100">{event.type}</p>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-5 w-5 mr-3" />
                    <div>
                      <p className="font-semibold text-gray-900">{formatDate(event.eventDate)}</p>
                      <p className="text-sm">{formatTime(event.eventDate)}</p>
                    </div>
                  </div>

                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-5 w-5 mr-3" />
                    <div>
                      <p className="font-semibold text-gray-900">{event.venue}</p>
                    </div>
                  </div>

                  <div className="flex items-center text-gray-600">
                    <Users className="h-5 w-5 mr-3" />
                    <div>
                      <p className="font-semibold text-gray-900">{event.availableSeats} seats available</p>
                      <p className="text-sm">of {event.totalSeats} total</p>
                    </div>
                  </div>

                  <div className="flex items-center text-gray-600">
                    <Star className="h-5 w-5 mr-3" />
                    <div>
                      <p className="font-semibold text-gray-900">Starting from ${event.price}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-3">About this event</h3>
                  <p className="text-gray-600 leading-relaxed">{event.description}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h3 className="text-xl font-semibold mb-4">Book Your Tickets</h3>
              
              {!showSeatSelection ? (
                <div>
                  <div className="border rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">General Admission</span>
                      <span className="font-bold">${event.price}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {event.availableSeats} seats available
                    </p>
                  </div>

                  <button
                    onClick={() => setShowSeatSelection(true)}
                    disabled={event.availableSeats === 0}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {event.availableSeats === 0 ? 'Sold Out' : 'Select Seats'}
                  </button>
                </div>
              ) : (
                <div>
                  {seatError ? (
                    <div className="mb-4">
                      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        <p>{seatError}</p>
                      </div>
                      <button
                        onClick={handleRetrySeats}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition"
                      >
                        Retry Loading Seats
                      </button>
                    </div>
                  ) : seatsLoading ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                      <p className="text-gray-600">Loading seats...</p>
                    </div>
                  ) : (
                    <>
                      <SeatSelection 
                        seats={seats} 
                        selectedSeats={selectedSeats} 
                        onSeatSelect={handleSeatSelect} 
                      />
                      
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Selected Seats</span>
                          <span className="font-bold">
                            {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {selectedSeats.length > 0 && (
                          <div className="text-sm text-gray-600 mb-2">
                            {selectedSeats.map(seat => `${seat.section}-${seat.row}-${seat.seatNumber}`).join(', ')}
                          </div>
                        )}
                        <div className="text-lg font-bold">
                          Total: ${selectedSeats.reduce((sum, seat) => sum + seat.price, 0).toFixed(2)}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-3 mt-4">
                    <button
                      onClick={handleProceedToBooking}
                      disabled={selectedSeats.length === 0 || seatsLoading || !!seatError || reservingSeats}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {reservingSeats ? 'Processing...' : 'Proceed to Booking'}
                    </button>
                    <button
                      onClick={() => setShowSeatSelection(false)}
                      className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 transition"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;