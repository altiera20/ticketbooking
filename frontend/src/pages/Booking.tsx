import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import bookingService from '../services/booking.service';
import paymentService, { type PaymentVerificationRequest, type RazorpayResponse } from '../services/payment.service';
import { Event, Seat } from '../types';
import { AlertCircle, Check, ArrowLeft, RefreshCcw } from 'lucide-react';
import RazorpayCheckout from '../components/booking/RazorpayCheckout';
import BookingSummary from '../components/booking/BookingSummary';

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
  const [walletBalance, setWalletBalance] = useState<number>(user?.walletBalance || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingReference, setBookingReference] = useState<string>('');
  const [insufficientBalance, setInsufficientBalance] = useState(false);
  const [showRazorpay, setShowRazorpay] = useState<boolean>(false);
  const [razorpayOrderId, setRazorpayOrderId] = useState<string>('');

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
        console.log('Fetched wallet balance:', balance);
        
        // Ensure balance is properly set in state (default to 0 if undefined)
        setWalletBalance(balance || 0);
        
        // Update user context if needed
        if (updateUser && user && balance !== user.walletBalance) {
          console.log('Updating user wallet balance from', user.walletBalance, 'to', balance);
          updateUser({ ...user, walletBalance: balance });
        }
        
        // Check if wallet balance is sufficient
        if (state?.totalAmount && balance < state.totalAmount) {
          setInsufficientBalance(true);
        } else {
          setInsufficientBalance(false);
        }
      } catch (err: any) {
        console.error('Error fetching wallet balance:', err);
        // Set wallet balance to 0 on error to prevent UI issues
        setWalletBalance(0);
        setInsufficientBalance(true);
        // Non-critical error, don't show to user
      }
    };

    if (user) {
      fetchWalletBalance();
    }
  }, [user, state?.totalAmount, updateUser]);

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

  // Handle booking submission
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      // Check if user is authenticated
      if (!user) {
        setError('Please log in to continue with booking');
        setLoading(false);
        return;
      }

      if (paymentMethod === 'CREDIT_CARD') {
        // For credit card payments, create a Razorpay order
        try {
          console.log('Creating Razorpay order for amount:', state.totalAmount);
          
          // Force refresh token from localStorage for the request
          const token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
          if (!token) {
            throw new Error('Authentication required. Please log in again.');
          }
          
          const order = await paymentService.createOrder(
            state.totalAmount,
            'INR',
            `booking_${Date.now()}`
          );
          
          console.log('Razorpay order created successfully:', order.id);
          
          // Store order ID and show Razorpay checkout
          setRazorpayOrderId(order.id);
          setShowRazorpay(true);
        } catch (orderError: any) {
          console.error('Error creating Razorpay order:', orderError);
          
          // Handle authentication errors
          if (orderError.message.includes('expired') || orderError.message.includes('Authentication')) {
            // Clear tokens to force re-login
            localStorage.removeItem('authToken');
            localStorage.removeItem('accessToken');
            setError('Your session has expired. Please log in again.');
            setTimeout(() => {
              navigate('/login', { state: { from: '/events/' + state.event.id } });
            }, 2000);
          } else {
            setError(orderError.message || 'Failed to create payment order. Please try again.');
          }
          
          setLoading(false);
          return;
        }
      } else {
        // For wallet payments, proceed with booking
        await processBooking();
      }
    } catch (err: any) {
      console.error('Error creating booking:', err);
      if (err.message === 'Failed to create order') {
        setError('Authentication error. Please log in again and try.');
      } else {
        setError(err.message || 'Failed to complete booking. Please try again.');
      }
      setLoading(false);
    }
  };

  // Process booking after payment
  const processBooking = async (paymentResponse?: RazorpayResponse) => {
    try {
      // Check if user is authenticated
      if (!user) {
        setError('Please log in to continue with booking');
        setLoading(false);
        return;
      }
      
      // First, reserve the seats temporarily
      try {
        console.log('Attempting to reserve seats with token before booking');
        // Force refresh token from localStorage for the request
        const token = localStorage.getItem('authToken') || localStorage.getItem('accessToken');
        if (!token) {
          throw new Error('Authentication required. Please log in again.');
        }
        
        await bookingService.reserveSeats({
          eventId: state.event.id,
          seatIds: state.selectedSeats.map(seat => seat.id)
        });
        console.log('Seats reserved successfully');
      } catch (reserveError: any) {
        console.error('Error reserving seats:', reserveError);
        // If it's an authentication error, show a specific message and redirect to login
        if (reserveError.message.includes('expired') || reserveError.message.includes('Authentication')) {
          // Clear tokens to force re-login
          localStorage.removeItem('authToken');
          localStorage.removeItem('accessToken');
          setError('Your session has expired. Please log in again.');
          setTimeout(() => {
            navigate('/login', { state: { from: '/events/' + state.event.id } });
          }, 2000);
        } else {
          setError(reserveError.message || 'Failed to reserve seats. Please try again.');
        }
        setLoading(false);
        return;
      }
      
      const bookingRequest: {
        eventId: string;
        seatIds: string[];
        paymentMethod: 'CREDIT_CARD' | 'WALLET';
        paymentDetails?: any;
      } = {
        eventId: state.event.id,
        seatIds: state.selectedSeats.map(seat => seat.id),
        paymentMethod: paymentMethod,
        paymentDetails: paymentMethod === 'CREDIT_CARD' && paymentResponse ? {
          razorpayOrderId: paymentResponse?.razorpay_order_id,
          razorpayPaymentId: paymentResponse?.razorpay_payment_id,
          razorpaySignature: paymentResponse?.razorpay_signature
        } : undefined
      };

      console.log('Sending booking request:', JSON.stringify(bookingRequest, null, 2));
      
      try {
        const booking = await bookingService.createBooking(bookingRequest);
        console.log('Booking created successfully:', booking);
        
        // If wallet payment, update user's wallet balance
        if (paymentMethod === 'WALLET') {
          const newBalance = walletBalance - state.totalAmount;
          setWalletBalance(newBalance);
          if (updateUser) {
            updateUser({ walletBalance: newBalance });
          }
        }
        
        setBookingConfirmed(true);
        setBookingReference(booking.referenceNumber || booking.id);
      } catch (bookingError: any) {
        console.error('Error creating booking:', bookingError);
        setError(bookingError.message || 'Failed to complete booking. Please try again.');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error in booking process:', err);
      setError(err.message || 'Failed to complete booking. Please try again.');
      setLoading(false);
      setShowRazorpay(false);
    }
  };

  // Handle Razorpay success
  const handleRazorpaySuccess = async (paymentData: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => {
    try {
      console.log('Payment successful:', paymentData);
      
      // Handle mock payments for development/testing
      if (paymentData.razorpayOrderId.includes('mock') || 
          paymentData.razorpayPaymentId.includes('mock') ||
          paymentData.razorpaySignature.includes('mock')) {
        console.log('Mock payment detected, proceeding with booking');
        await processBooking({
          razorpay_order_id: paymentData.razorpayOrderId,
          razorpay_payment_id: paymentData.razorpayPaymentId,
          razorpay_signature: paymentData.razorpaySignature
        });
        return;
      }
      
      // Verify payment
      await paymentService.verifyPayment(paymentData);

      const response: RazorpayResponse = {
        razorpay_payment_id: paymentData.razorpayPaymentId,
        razorpay_order_id: paymentData.razorpayOrderId,
        razorpay_signature: paymentData.razorpaySignature,
      };
      
      // Process booking with payment details
      await processBooking(response);
    } catch (err: any) {
      console.error('Error processing payment:', err);
      setError(err.message || 'Payment verification failed. Please try again.');
      setLoading(false);
      setShowRazorpay(false);
    }
  };

  // Handle Razorpay failure
  const handleRazorpayFailure = (error: Error) => {
    console.error('Razorpay error:', error);
    setError('Payment failed. Please try again.');
    setLoading(false);
    setShowRazorpay(false);
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
                <p>{state.event.eventDate ? new Date(state.event.eventDate).toLocaleString() : 'N/A'}</p>
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
                <p className="font-bold">₹{typeof state.totalAmount === 'number' ? state.totalAmount.toFixed(2) : '0.00'}</p>
              </div>
              {paymentMethod === 'WALLET' && (
                <>
                  <div>
                    <p className="font-medium">Previous Wallet Balance</p>
                    <p className="font-bold">₹{typeof walletBalance === 'number' ? (walletBalance + state.totalAmount).toFixed(2) : '0.00'}</p>
                  </div>
                  <div>
                    <p className="font-medium">Current Wallet Balance</p>
                    <p className="font-bold">₹{typeof walletBalance === 'number' ? walletBalance.toFixed(2) : '0.00'}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard')} 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            View My Bookings
          </button>
        </div>
      </div>
    );
  }

  // If no state, render a loading or redirect message
  if (!state?.event) {
    return <div>Loading booking details...</div>;
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="md:col-span-2">
          <h1 className="text-3xl font-bold mb-6">Confirm Your Booking</h1>

          {/* Payment Method Selection */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handlePaymentMethodChange('CREDIT_CARD')}
                className={`p-4 border rounded-lg text-left transition-colors ${paymentMethod === 'CREDIT_CARD' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
              >
                <h3 className="font-semibold">Credit/Debit Card</h3>
                <p className="text-sm text-gray-500">Pay securely with your card via Razorpay.</p>
              </button>
              <button
                onClick={() => handlePaymentMethodChange('WALLET')}
                className={`p-4 border rounded-lg text-left transition-colors ${paymentMethod === 'WALLET' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                disabled={insufficientBalance}
              >
                <h3 className="font-semibold">Wallet</h3>
                <div className="mt-1">
                  <p className="text-sm">
                    <span className="font-medium">Balance: </span>
                    <span className={`${insufficientBalance ? 'text-red-500' : 'text-green-600'} font-semibold`}>
                      ₹{typeof walletBalance === 'number' ? walletBalance.toFixed(2) : '0.00'}
                    </span>
                  </p>
                  {insufficientBalance && (
                    <p className="text-xs text-red-500 mt-1">Insufficient balance for this purchase</p>
                  )}
                  {!insufficientBalance && paymentMethod === 'WALLET' && (
                    <p className="text-xs text-green-600 mt-1">
                      ₹{typeof walletBalance === 'number' ? (walletBalance - state.totalAmount).toFixed(2) : '0.00'}
                    </p>
                  )}
                </div>
              </button>
            </div>
            {insufficientBalance && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  Your wallet balance is insufficient for this purchase. 
                  <button 
                    onClick={handleTopUpWallet} 
                    className="ml-2 text-blue-600 hover:underline font-medium"
                  >
                    Top-up your wallet
                  </button>
                </p>
              </div>
            )}
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmitBooking}>
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6 flex items-center">
                <AlertCircle size={20} className="mr-3" />
                <span>{error}</span>
              </div>
            )}

            {paymentMethod === 'CREDIT_CARD' && !showRazorpay && (
              <p>You will be redirected to Razorpay to complete your payment.</p>
            )}

            {paymentMethod === 'WALLET' && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-gray-800 mb-2">Wallet Payment</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-600">Current Balance:</p>
                    <p className="font-semibold text-lg">₹{typeof walletBalance === 'number' ? walletBalance.toFixed(2) : '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Amount to Pay:</p>
                    <p className="font-semibold text-lg text-red-600">- ₹{typeof state.totalAmount === 'number' ? state.totalAmount.toFixed(2) : '0.00'}</p>
                  </div>
                  <div className="col-span-2 border-t border-gray-200 pt-2 mt-2">
                    <p className="text-gray-600">Remaining Balance:</p>
                    <p className="font-semibold text-lg text-green-600">
                      ₹{typeof walletBalance === 'number' ? (walletBalance - state.totalAmount).toFixed(2) : '0.00'}
                    </p>
                  </div>
                </div>
                {insufficientBalance ? (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">
                      Your wallet balance is insufficient for this purchase.
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-600">
                    By clicking "Confirm Booking", your wallet will be debited with the amount shown above.
                  </p>
                )}
              </div>
            )}
            
            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors flex items-center"
                disabled={loading || (paymentMethod === 'WALLET' && insufficientBalance)}
              >
                {loading ? (
                  <>
                    <RefreshCcw size={20} className="mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  paymentMethod === 'CREDIT_CARD' ? 'Proceed to Pay' : 'Confirm Booking'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Booking Summary */}
        <div className="md:col-span-1">
          <div className="sticky top-24">
            <BookingSummary
              eventTitle={state.event.title}
              eventDate={state.event.eventDate}
              eventVenue={state.event.venue}
              selectedSeats={state.selectedSeats.map(s => ({...s, eventId: state.event.id, status: 'available' }))}
              totalAmount={state.totalAmount}
              walletBalance={walletBalance}
              paymentMethod={paymentMethod}
            />
            {showRazorpay && razorpayOrderId && (
              <RazorpayCheckout
                amount={state.totalAmount}
                orderId={razorpayOrderId}
                name={user ? `${user.firstName} ${user.lastName}`: 'Customer'}
                onSuccess={handleRazorpaySuccess}
                onError={handleRazorpayFailure}
              />
            )}
            <div className="mt-6">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft size={16} className="mr-2" />
                Back to seat selection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;

