// frontend/src/components/booking/SeatSelection.tsx

import React from 'react';
import { Seat } from '../../services/booking.service';

interface SeatSelectionProps {
  seats: Seat[];
  selectedSeats: Seat[];
  onSeatSelect: (seat: Seat) => void;
}

const SeatSelection: React.FC<SeatSelectionProps> = ({
  seats,
  selectedSeats,
  onSeatSelect,
}) => {
  // Group seats by section and row
  const groupedSeats = seats.reduce((acc, seat) => {
    const sectionKey = seat.section;
    const rowKey = seat.row;
    
    if (!acc[sectionKey]) {
      acc[sectionKey] = {};
    }
    
    if (!acc[sectionKey][rowKey]) {
      acc[sectionKey][rowKey] = [];
    }
    
    acc[sectionKey][rowKey].push(seat);
    return acc;
  }, {} as Record<string, Record<string, Seat[]>>);

  // Sort sections and rows
  const sections = Object.keys(groupedSeats).sort();
  
  // Check if seat is selected
  const isSeatSelected = (seat: Seat): boolean => {
    return selectedSeats.some(s => s.id === seat.id);
  };

  // Get seat status class
  const getSeatStatusClass = (seat: Seat): string => {
    if (seat.status === 'booked') {
      return 'bg-gray-400 cursor-not-allowed';
    }
    
    if (seat.status === 'reserved') {
      return 'bg-yellow-400 cursor-not-allowed';
    }
    
    if (isSeatSelected(seat)) {
      return 'bg-blue-600 text-white hover:bg-blue-700';
    }
    
    return 'bg-green-100 hover:bg-green-200';
  };

  return (
    <div className="mb-6">
      <div className="mb-4">
        <div className="flex items-center justify-center space-x-8 mb-6">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 border border-gray-300 rounded-sm mr-2"></div>
            <span className="text-sm">Available</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-600 rounded-sm mr-2"></div>
            <span className="text-sm">Selected</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-400 rounded-sm mr-2"></div>
            <span className="text-sm">Booked</span>
          </div>
        <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-400 rounded-sm mr-2"></div>
            <span className="text-sm">Reserved</span>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 p-2 text-center mb-6 rounded">
          <div className="text-sm font-medium">SCREEN</div>
        </div>
      </div>
      
      {sections.map(section => (
        <div key={section} className="mb-8">
          <h3 className="text-lg font-medium mb-2">Section {section}</h3>
          
          {Object.keys(groupedSeats[section]).sort().map(row => (
            <div key={`${section}-${row}`} className="mb-3">
              <div className="flex items-center mb-1">
                <span className="text-sm font-medium w-8">Row {row}</span>
                <div className="flex flex-wrap gap-1">
                  {groupedSeats[section][row].sort((a, b) => 
                    parseInt(a.seatNumber) - parseInt(b.seatNumber)
                  ).map(seat => (
                    <button
                      key={seat.id}
                      onClick={() => seat.status === 'available' && onSeatSelect(seat)}
                      disabled={seat.status !== 'available'}
                      className={`
                        w-8 h-8 rounded-sm text-xs font-medium flex items-center justify-center
                        transition-colors border border-gray-300
                        ${getSeatStatusClass(seat)}
                      `}
                      title={`Section ${seat.section}, Row ${seat.row}, Seat ${seat.seatNumber} - $${seat.price}`}
                    >
                      {seat.seatNumber}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default SeatSelection;