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

    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY_ID,
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      name,
      description,
      order_id: orderId,
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.phone || '',
      },
      theme: {
        color: '#3399cc',
      },
      handler: function (response: any) {
        onSuccess({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: function () {
          onError(new Error('Checkout closed without completing payment'));
        },
      },
    };

    try {
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
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