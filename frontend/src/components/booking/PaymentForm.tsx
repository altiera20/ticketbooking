import React, { ChangeEvent } from 'react';
import bookingService from '../../services/booking.service';

export interface PaymentFormProps {
  paymentDetails: {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    cardHolderName: string;
  };
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ paymentDetails, onChange }) => {
  // Format card number with spaces
  const formatCardNumber = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const formattedValue = bookingService.formatCardNumber(value);
    e.target.value = formattedValue;
    onChange(e);
  };

  // Format expiry date with slash
  const formatExpiryDate = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const cleaned = value.replace(/\D/g, '');
    
    if (cleaned.length <= 2) {
      e.target.value = cleaned;
    } else {
      e.target.value = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    
    onChange(e);
  };

  // Get card type for display
  const cardType = paymentDetails.cardNumber ? bookingService.getCardType(paymentDetails.cardNumber) : '';

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="cardHolderName" className="block text-sm font-medium text-gray-700 mb-1">
          Cardholder Name
        </label>
        <input
          type="text"
          id="cardHolderName"
          name="cardHolderName"
          value={paymentDetails.cardHolderName}
          onChange={onChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="John Smith"
          required
        />
      </div>
      
      <div>
        <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
          Card Number {cardType && <span className="text-blue-600 ml-1">({cardType})</span>}
        </label>
        <input
          type="text"
          id="cardNumber"
          name="cardNumber"
          value={paymentDetails.cardNumber}
          onChange={formatCardNumber}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="1234 5678 9012 3456"
          maxLength={19}
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
            Expiry Date
          </label>
          <input
            type="text"
            id="expiryDate"
            name="expiryDate"
            value={paymentDetails.expiryDate}
            onChange={formatExpiryDate}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="MM/YY"
            maxLength={5}
            required
          />
        </div>
        
        <div>
          <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-1">
            CVV
          </label>
          <input
            type="text"
            id="cvv"
            name="cvv"
            value={paymentDetails.cvv}
            onChange={(e) => {
              // Only allow numbers
              const value = e.target.value.replace(/\D/g, '');
              e.target.value = value;
              onChange(e);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="123"
            maxLength={4}
            required
          />
        </div>
      </div>
      
      <div className="text-sm text-gray-600 mt-2">
        <p>Test card: 4242 4242 4242 4242, Exp: 12/25, CVV: 123</p>
      </div>
    </div>
  );
};

export default PaymentForm; 