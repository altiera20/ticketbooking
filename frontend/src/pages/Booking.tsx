import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import bookingService, { CreateBookingRequest, Seat } from '../services/booking.service';
import paymentService from '../services/payment.service';
import { Event } from '../types';
import PaymentForm from '../components/booking/PaymentForm';
import { AlertCircle, Check, ArrowLeft, RefreshCcw } from 'lucide-react';

interface BookingLocationState {
  event: Event;
  selectedSeats: Seat[];
  totalAmount: number;
}

const Booking: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const state = location.state as BookingLocationState;
  
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'WALLET'>('CREDIT_CARD');
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardHolderName: '',
  });
  const [walletBalance, setWalletBalance] = useState<number>(user?.walletBalance || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingReference, setBookingReference] = useState<string>('');
  const [insufficientBalance, setInsufficientBalance] = useState(false);

  // Redirect if no event or seats are selected
  useEffect(() => {
    if (!state?.event || !state?.selectedSeats || state.selectedSeats.length === 0) {
      navigate('/events');
    }
  }, [state, navigate]);

  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        const balance = await bookingService.getWalletBalance();
        setWalletBalance(balance);
        
        // Check if wallet balance is sufficient
        if (state?.totalAmount && balance < state.totalAmount) {
          setInsufficientBalance(true);
        } else {
          setInsufficientBalance(false);
        }
      } catch (err: any) {
        console.error('Error fetching wallet balance:', err);
        // Non-critical error, don't show to user
      }
    };

    if (user) {
      fetchWalletBalance();
    }
  }, [user, state?.totalAmount]);

  // Handle payment method change
  const handlePaymentMethodChange = (method: 'CREDIT_CARD' | 'WALLET') => {
    setPaymentMethod(method);
    setError(null);
    
    // Check if wallet balance is sufficient
    if (method === 'WALLET' && walletBalance < state.totalAmount) {
      setInsufficientBalance(true);
    } else {
      setInsufficientBalance(false);
    }
  };

  // Handle payment details change
  const handlePaymentDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validate payment form
  const validatePaymentForm = (): boolean => {
    if (paymentMethod === 'WALLET') {
      if (walletBalance < state.totalAmount) {
        setError('Insufficient wallet balance. Please add funds or use a credit card.');
        return false;
      }
      return true;
    }

    // Validate credit card details
    if (!paymentDetails.cardNumber.trim()) {
      setError('Please enter a valid card number');
      return false;
    }

    if (!paymentService.validateCardNumber(paymentDetails.cardNumber)) {
      setError('Invalid card number');
      return false;
    }

    if (!paymentDetails.expiryDate.trim() || !paymentService.validateExpiryDate(paymentDetails.expiryDate)) {
      setError('Please enter a valid expiry date (MM/YY)');
      return false;
    }

    if (!paymentDetails.cvv.trim() || !/^\d{3,4}$/.test(paymentDetails.cvv)) {
      setError('Please enter a valid CVV');
      return false;
    }

    if (!paymentDetails.cardHolderName.trim()) {
      setError('Please enter the cardholder name');
      return false;
    }

    return true;
  };

  // Handle booking submission
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePaymentForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bookingRequest: CreateBookingRequest = {
        eventId: state.event.id,
        seatIds: state.selectedSeats.map(seat => seat.id),
        paymentMethod: paymentMethod,
        paymentDetails: paymentMethod === 'CREDIT_CARD' ? paymentDetails : undefined
      };

      const booking = await bookingService.createBooking(bookingRequest);
      
      // If wallet payment, update user's wallet balance
      if (paymentMethod === 'WALLET') {
        const newBalance = walletBalance - state.totalAmount;
        setWalletBalance(newBalance);
        if (updateUser) {
          updateUser({ walletBalance: newBalance });
        }
      }
      
      setBookingConfirmed(true);
      setBookingReference(booking.referenceNumber);
    } catch (err: any) {
      console.error('Error creating booking:', err);
      setError(err.message || 'Failed to complete booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle wallet top-up navigation
  const handleTopUpWallet = () => {
    navigate('/dashboard', { state: { showWalletTopUp: true } });
  };

  if (bookingConfirmed) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 rounded-full p-3">
              <Check size={48} className="text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-green-800 mb-2">Booking Confirmed!</h1>
          <p className="text-green-700 mb-6">Your booking reference number is: <span className="font-bold">{bookingReference}</span></p>
          
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">{state.event.title}</h2>
            <div className="grid grid-cols-2 gap-4 text-gray-600">
              <div>
                <p className="font-medium">Date & Time</p>
                <p>{new Date(state.event.eventDate).toLocaleString()}</p>
              </div>
              <div>
                <p className="font-medium">Venue</p>
                <p>{state.event.venue}</p>
              </div>
              <div>
                <p className="font-medium">Seats</p>
                <p>{state.selectedSeats.map(seat => `${seat.section}-${seat.row}-${seat.seatNumber}`).join(', ')}</p>
              </div>
              <div>
                <p className="font-medium">Payment Method</p>
                <p>{paymentMethod === 'CREDIT_CARD' ? 'Credit Card' : 'Wallet'}</p>
              </div>
              <div>
                <p className="font-medium">Total Amount</p>
                <p className="font-bold">${state.totalAmount.toFixed(2)}</p>
              </div>
              {paymentMethod === 'WALLET' && (
                <div>
                  <p className="font-medium">Updated Wallet Balance</p>
                  <p className="font-bold">${walletBalance.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-center space-x-4">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              View My Bookings
            </button>
            <button 
              onClick={() => navigate('/events')} 
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Book Another Event
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!state?.event) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center text-blue-600 mb-6 hover:text-blue-800"
      >
        <ArrowLeft size={16} className="mr-1" />
        Back to Seat Selection
      </button>
      
      <h1 className="text-2xl font-bold mb-6">Complete Your Booking</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 flex items-start">
          <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="credit-card"
                  name="paymentMethod"
                  checked={paymentMethod === 'CREDIT_CARD'}
                  onChange={() => handlePaymentMethodChange('CREDIT_CARD')}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="credit-card" className="ml-2 block">
                  Credit Card
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="radio"
                  id="wallet"
                  name="paymentMethod"
                  checked={paymentMethod === 'WALLET'}
                  onChange={() => handlePaymentMethodChange('WALLET')}
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="wallet" className="ml-2 block">
                  Wallet (Balance: ${walletBalance.toFixed(2)})
                </label>
              </div>
              
              {insufficientBalance && paymentMethod === 'WALLET' && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md mt-2">
                  <p className="font-medium">Insufficient wallet balance</p>
                  <p className="text-sm">Your current balance (${walletBalance.toFixed(2)}) is less than the required amount (${state.totalAmount.toFixed(2)}).</p>
                  <button
                    type="button"
                    onClick={handleTopUpWallet}
                    className="mt-2 text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors"
                  >
                    Top Up Wallet
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {paymentMethod === 'CREDIT_CARD' && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
              <PaymentForm 
                paymentDetails={paymentDetails}
                onChange={handlePaymentDetailsChange}
              />
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              onClick={handleSubmitBooking}
              disabled={loading || (paymentMethod === 'WALLET' && insufficientBalance)}
              className={`
                px-6 py-3 rounded-md text-white font-medium flex items-center
                ${loading || (paymentMethod === 'WALLET' && insufficientBalance) 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'}
              `}
            >
              {loading ? (
                <>
                  <RefreshCcw size={18} className="mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Complete Booking'
              )}
            </button>
          </div>
        </div>
        
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
            <h2 className="text-xl font-semibold mb-4">Booking Summary</h2>
            
            <div className="mb-4">
              <h3 className="font-medium">{state.event.title}</h3>
              <p className="text-gray-600 text-sm">
                {new Date(state.event.eventDate).toLocaleDateString()} at {new Date(state.event.eventDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
              <p className="text-gray-600 text-sm">{state.event.venue}</p>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Selected Seats</span>
                <span className="font-medium">{state.selectedSeats.length}</span>
              </div>
              <div className="text-sm text-gray-600 mb-4">
                {state.selectedSeats.map(seat => `${seat.section}-${seat.row}-${seat.seatNumber}`).join(', ')}
              </div>
              
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>${state.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;
