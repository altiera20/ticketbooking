import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import bookingService, { CreateBookingRequest, Seat } from '../services/booking.service';
import paymentService, { RazorpayResponse } from '../services/payment.service';
import { Event } from '../types';
import PaymentForm from '../components/booking/PaymentForm';
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

    // For credit card, we'll use Razorpay so no validation needed here
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
      if (paymentMethod === 'CREDIT_CARD') {
        // For credit card payments, create a Razorpay order
        const order = await paymentService.createOrder(
          state.totalAmount,
          'INR',
          `booking_${Date.now()}`,
          { eventId: state.event.id }
        );
        
        // Store order ID and show Razorpay checkout
        setRazorpayOrderId(order.id);
        setShowRazorpay(true);
      } else {
        // For wallet payments, proceed with booking
        await processBooking();
      }
    } catch (err: any) {
      console.error('Error creating booking:', err);
      setError(err.message || 'Failed to complete booking. Please try again.');
      setLoading(false);
    }
  };

  // Process booking after payment
  const processBooking = async (paymentResponse?: RazorpayResponse) => {
    try {
      const bookingRequest: CreateBookingRequest = {
        eventId: state.event.id,
        seatIds: state.selectedSeats.map(seat => seat.id),
        paymentMethod: paymentMethod,
        paymentDetails: paymentMethod === 'CREDIT_CARD' ? {
          ...paymentDetails,
          razorpayOrderId: paymentResponse?.razorpay_order_id,
          razorpayPaymentId: paymentResponse?.razorpay_payment_id,
          razorpaySignature: paymentResponse?.razorpay_signature
        } : undefined
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
      setShowRazorpay(false);
    }
  };

  // Handle Razorpay success
  const handleRazorpaySuccess = async (response: RazorpayResponse) => {
    try {
      // Verify payment
      await paymentService.verifyPayment(
        response.razorpay_payment_id,
        response.razorpay_order_id,
        response.razorpay_signature
      );
      
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Complete Your Booking</h1>
      
      {bookingConfirmed ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-semibold text-green-700 mb-4">Booking Confirmed!</h2>
          <p className="text-lg mb-4">Your booking reference number is: <span className="font-bold">{bookingReference}</span></p>
          <p className="mb-6">A confirmation email has been sent to your registered email address.</p>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            View My Bookings
          </button>
        </div>
      ) : (
        <div>
          {showRazorpay && razorpayOrderId && (
            <RazorpayCheckout
              orderId={razorpayOrderId}
              amount={state.totalAmount}
              name={state.event.title}
              description={`Booking for ${state.selectedSeats.length} seats`}
              prefill={{
                name: user?.name,
                email: user?.email,
                contact: user?.phone
              }}
              onSuccess={handleRazorpaySuccess}
              onFailure={handleRazorpayFailure}
            />
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
                      Credit Card / UPI / Wallet
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
                </div>
                
                {insufficientBalance && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-yellow-700">
                      Your wallet balance is insufficient for this booking. 
                      <button 
                        onClick={handleTopUpWallet}
                        className="ml-2 text-blue-600 underline"
                      >
                        Top up your wallet
                      </button>
                    </p>
                  </div>
                )}
                
                {paymentMethod === 'CREDIT_CARD' && (
                  <div className="mt-6">
                    <p className="text-gray-700 mb-4">
                      You'll be redirected to our secure payment gateway to complete your payment.
                    </p>
                  </div>
                )}
              </div>
              
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-700">{error}</p>
                </div>
              )}
              
              <button
                onClick={handleSubmitBooking}
                disabled={loading || insufficientBalance || state.selectedSeats.length === 0}
                className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
                  loading || insufficientBalance || state.selectedSeats.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? 'Processing...' : `Pay $${state.totalAmount.toFixed(2)}`}
              </button>
            </div>
            
            <div>
              <BookingSummary
                event={state.event}
                selectedSeats={state.selectedSeats}
                totalAmount={state.totalAmount}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Booking;
