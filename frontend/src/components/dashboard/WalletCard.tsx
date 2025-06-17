import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import paymentService, { WalletTransaction } from '../../services/payment.service';
import PaymentForm from '../booking/PaymentForm';
import { Wallet, Plus, ArrowDownCircle, ArrowUpCircle, RefreshCcw } from 'lucide-react';

const WalletCard: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [walletBalance, setWalletBalance] = useState<number>(user?.walletBalance || 0);
  const [showTopUp, setShowTopUp] = useState<boolean>(false);
  const [topUpAmount, setTopUpAmount] = useState<string>('');
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardHolderName: '',
  });

  // Fetch wallet transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const transactions = await paymentService.getWalletTransactions();
        setTransactions(transactions);
      } catch (err: any) {
        console.error('Error fetching transactions:', err);
        setError('Failed to load transaction history');
      }
    };

    fetchTransactions();
  }, [walletBalance]);

  // Handle payment details change
  const handlePaymentDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle top up
  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate amount
      const amount = parseFloat(topUpAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      // Validate payment details
      if (!paymentService.validateCardNumber(paymentDetails.cardNumber)) {
        throw new Error('Invalid card number');
      }

      if (!paymentService.validateExpiryDate(paymentDetails.expiryDate)) {
        throw new Error('Invalid expiry date');
      }

      if (!paymentDetails.cvv || !/^\d{3,4}$/.test(paymentDetails.cvv)) {
        throw new Error('Invalid CVV');
      }

      if (!paymentDetails.cardHolderName.trim()) {
        throw new Error('Cardholder name is required');
      }

      // Process top up
      const result = await paymentService.topUpWallet({
        amount,
        paymentMethod: 'CREDIT_CARD',
        paymentDetails,
      });

      // Update wallet balance
      setWalletBalance(result.balance);
      if (updateUser) {
        updateUser({ walletBalance: result.balance });
      }

      // Reset form
      setTopUpAmount('');
      setPaymentDetails({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardHolderName: '',
      });
      setShowTopUp(false);
    } catch (err: any) {
      console.error('Top up error:', err);
      setError(err.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Wallet className="text-blue-600 mr-2" size={24} />
          <h2 className="text-xl font-semibold">My Wallet</h2>
        </div>
        <button
          onClick={() => setShowTopUp(!showTopUp)}
          className="flex items-center text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} className="mr-1" />
          Top Up
        </button>
      </div>
      
      <div className="mb-6">
        <div className="text-gray-600 text-sm mb-1">Current Balance</div>
        <div className="text-3xl font-bold">${walletBalance.toFixed(2)}</div>
      </div>

      {showTopUp && (
        <div className="mb-6 border-t border-b border-gray-200 py-4">
          <h3 className="text-lg font-medium mb-3">Top Up Wallet</h3>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleTopUp}>
            <div className="mb-4">
              <label htmlFor="topUpAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount ($)
              </label>
              <input
                type="number"
                id="topUpAmount"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount"
                min="1"
                step="0.01"
                required
                disabled={loading}
              />
            </div>
            
            <PaymentForm 
              paymentDetails={paymentDetails}
              onChange={handlePaymentDetailsChange}
            />
            
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTopUp(false)}
                className="text-gray-600 mr-2 px-4 py-2"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCcw size={16} className="mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm Payment'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <div>
        <h3 className="text-lg font-medium mb-3">Recent Transactions</h3>
        
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No transactions yet</p>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex justify-between items-center border-b border-gray-100 pb-2">
                <div className="flex items-center">
                  {transaction.type === 'credit' ? (
                    <ArrowDownCircle size={16} className="text-green-500 mr-2" />
                  ) : (
                    <ArrowUpCircle size={16} className="text-red-500 mr-2" />
                  )}
                  <div>
                    <div className="font-medium">{transaction.description}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className={`font-medium ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                  {transaction.type === 'credit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletCard;
