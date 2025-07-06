import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';

interface RazorpayCheckoutProps {
  amount: number;
  onSuccess: (paymentData: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => void;
  onError: (error: any) => void;
  orderId: string;
  currency?: string;
  name?: string;
  description?: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const RazorpayCheckout: React.FC<RazorpayCheckoutProps> = ({
  amount,
  onSuccess,
  onError,
  orderId,
  currency = 'INR',
  name = 'Universal Ticket Booking',
  description = 'Ticket Booking Payment'
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const { user } = useAuth();

  // Load Razorpay script
  useEffect(() => {
    const loadScript = () => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        setIsScriptLoaded(true);
        setIsLoading(false);
      };
      script.onerror = () => {
        setIsLoading(false);
        onError(new Error('Failed to load Razorpay checkout'));
      };
      document.body.appendChild(script);
    };

    if (window.Razorpay) {
      setIsScriptLoaded(true);
      setIsLoading(false);
    } else {
      loadScript();
    }

    return () => {
      // Cleanup if needed
    };
  }, [onError]);

  const openRazorpayCheckout = () => {
    if (!isScriptLoaded) {
      onError(new Error('Razorpay script not loaded'));
      return;
    }

    // Get Razorpay key from environment variables
    const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
    
    console.log('Using Razorpay key ID:', razorpayKeyId ? `${razorpayKeyId.substring(0, 8)}...` : 'Not found');
    
    if (!razorpayKeyId) {
      console.error('Razorpay key not found in environment variables');
      onError(new Error('Payment configuration error. Please contact support.'));
      return;
    }

    console.log('Creating Razorpay checkout with order ID:', orderId);
    console.log('Amount:', amount);

    const options = {
      key: razorpayKeyId,
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      name,
      description,
      order_id: orderId,
      prefill: {
        name: user ? `${user.firstName} ${user.lastName}` : '',
        email: user?.email || '',
      },
      theme: {
        color: '#3399cc',
      },
      handler: function (response: any) {
        console.log('Razorpay payment successful:', response);
        onSuccess({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: function () {
          console.log('Razorpay checkout modal dismissed');
          onError(new Error('Checkout closed without completing payment'));
        },
      },
    };

    console.log('Razorpay options:', { 
      ...options, 
      key: options.key ? `${options.key.substring(0, 8)}...` : 'Not found',
      order_id: options.order_id
    });

    try {
      // Check if we're using a mock order ID (for testing/development)
      if (orderId.includes('mock')) {
        console.warn('Using mock order ID. In production, this would fail.');
        // For testing purposes, simulate a successful payment
        setTimeout(() => {
          console.log('Simulating successful payment with mock order');
          onSuccess({
            razorpayOrderId: orderId,
            razorpayPaymentId: `pay_mock_${Date.now()}`,
            razorpaySignature: 'mock_signature',
          });
        }, 2000);
        return;
      }

      const razorpay = new window.Razorpay(options);
      console.log('Razorpay instance created, opening checkout...');
      razorpay.open();
    } catch (error) {
      console.error('Error opening Razorpay checkout:', error);
      onError(error);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="mt-4">
      <Button
        onClick={openRazorpayCheckout}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
      >
        Pay with Razorpay
      </Button>
    </div>
  );
};

export default RazorpayCheckout; 