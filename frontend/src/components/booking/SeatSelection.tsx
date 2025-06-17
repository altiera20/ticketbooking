// frontend/src/components/booking/SeatSelection.tsx

import React, { useState, useEffect } from 'react';
import { Seat } from '../../types/event.types';
import { formatCurrency } from '../../utils/formatters';

interface SeatSelectionProps {
  seats: Seat[];
  selectedSeats: Seat[];
  onSeatSelect: (seat: Seat) => void;
}

const SeatSelection: React.FC<SeatSelectionProps> = ({ seats, selectedSeats, onSeatSelect }) => {
  const [seatsBySection, setSeatsBySection] = useState<Record<string, Seat[]>>({});
  const [sections, setSections] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');

  useEffect(() => {
    // Group seats by section
    const groupedSeats: Record<string, Seat[]> = {};
    seats.forEach(seat => {
      if (!groupedSeats[seat.section]) {
        groupedSeats[seat.section] = [];
      }
      groupedSeats[seat.section].push(seat);
    });

    // Sort seats within each section by row and seat number
    Object.keys(groupedSeats).forEach(section => {
      groupedSeats[section].sort((a, b) => {
        if (a.row !== b.row) {
          return a.row.localeCompare(b.row);
        }
        return a.seatNumber.localeCompare(b.seatNumber);
      });
    });

    setSeatsBySection(groupedSeats);
    
    // Get unique sections
    const uniqueSections = Object.keys(groupedSeats);
    setSections(uniqueSections);
    
    // Set default selected section
    if (uniqueSections.length > 0 && !selectedSection) {
      setSelectedSection(uniqueSections[0]);
    }
  }, [seats, selectedSection]);

  const isSeatSelected = (seatId: string): boolean => {
    return selectedSeats.some(seat => seat.id === seatId);
  };

  const getSeatStatusClass = (seat: Seat): string => {
    if (isSeatSelected(seat.id)) {
      return 'bg-blue-500 text-white';
    }
    
    switch (seat.status) {
      case 'available':
        return 'bg-green-100 hover:bg-green-200 text-green-800';
      case 'booked':
        return 'bg-gray-300 text-gray-500 cursor-not-allowed';
      case 'reserved':
        return 'bg-yellow-100 text-yellow-800 cursor-not-allowed';
      default:
        return 'bg-gray-100';
    }
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSection(e.target.value);
  };

  // Group seats by row for the selected section
  const seatsByRow: Record<string, Seat[]> = {};
  if (selectedSection && seatsBySection[selectedSection]) {
    seatsBySection[selectedSection].forEach(seat => {
      if (!seatsByRow[seat.row]) {
        seatsByRow[seat.row] = [];
      }
      seatsByRow[seat.row].push(seat);
    });
  }

  return (
    <div className="seat-selection">
      <div className="mb-4">
        <label htmlFor="section-select" className="block text-sm font-medium text-gray-700 mb-1">
          Select Section
        </label>
        <select
          id="section-select"
          className="w-full p-2 border border-gray-300 rounded-md"
          value={selectedSection}
          onChange={handleSectionChange}
        >
          {sections.map(section => (
            <option key={section} value={section}>
              {section}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 mr-1"></div>
            <span className="text-sm">Available</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 mr-1"></div>
            <span className="text-sm">Selected</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-300 mr-1"></div>
            <span className="text-sm">Booked</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-100 mr-1"></div>
            <span className="text-sm">Reserved</span>
          </div>
        </div>
      </div>

      <div className="mb-8 text-center p-2 bg-gray-800 text-white font-bold rounded">
        STAGE
      </div>

      {Object.keys(seatsByRow).map(row => (
        <div key={row} className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-1">Row {row}</div>
          <div className="flex flex-wrap gap-2">
            {seatsByRow[row].map(seat => (
              <button
                key={seat.id}
                className={`w-12 h-12 rounded-md flex flex-col items-center justify-center text-xs ${getSeatStatusClass(seat)}`}
                onClick={() => seat.status === 'available' && onSeatSelect(seat)}
                disabled={seat.status !== 'available' && !isSeatSelected(seat.id)}
                title={`${seat.section} - Row ${seat.row} - Seat ${seat.seatNumber} - ${formatCurrency(seat.price)}`}
              >
                <span>{seat.seatNumber}</span>
                <span className="text-xs">{formatCurrency(seat.price)}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SeatSelection;