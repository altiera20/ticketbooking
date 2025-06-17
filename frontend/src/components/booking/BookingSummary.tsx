import React from 'react';
import { Seat } from '../../types/event.types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface BookingSummaryProps {
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  selectedSeats: Seat[];
  totalAmount: number;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({
  eventTitle,
  eventDate,
  eventVenue,
  selectedSeats,
  totalAmount
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Booking Summary</h2>
      
      <div className="mb-4">
        <h3 className="text-lg font-medium">{eventTitle}</h3>
        <p className="text-gray-600">{formatDate(eventDate)}</p>
        <p className="text-gray-600">{eventVenue}</p>
      </div>
      
      <div className="mb-4">
        <h4 className="font-medium mb-2">Selected Seats ({selectedSeats.length})</h4>
        <div className="grid grid-cols-2 gap-2">
          {selectedSeats.map((seat) => (
            <div key={seat.id} className="bg-gray-100 rounded p-2 flex justify-between">
              <span>
                {seat.section} - Row {seat.row}, Seat {seat.seatNumber}
              </span>
              <span className="font-medium">{formatCurrency(seat.price)}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="border-t border-gray-200 pt-4 mt-4">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Subtotal</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Service Fee</span>
          <span>{formatCurrency(0)}</span>
        </div>
        <div className="flex justify-between font-semibold text-lg">
          <span>Total</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
      </div>
    </div>
  );
};

export default BookingSummary;
