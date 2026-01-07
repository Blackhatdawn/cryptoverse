import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { Button } from '../components/ui/button';

const TradeSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('checking');
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 8;

  const checkPaymentStatus = async () => {
    try {
      const response = await api.get(`/trade/checkout-status/${sessionId}`);
      
      if (response.data.payment_status === 'paid' || response.data.status === 'completed') {
        setStatus('success');
        toast.success('Payment successful! Your crypto has been added to your wallet.');
      } else if (response.data.status === 'expired') {
        setStatus('error');
        toast.error('Payment session expired');
      } else {
        if (attempts < maxAttempts) {
          setTimeout(() => {
            setAttempts(prev => prev + 1);
            checkPaymentStatus();
          }, 2000);
        } else {
          setStatus('timeout');
          toast.warning('Payment status check timed out. Please check your wallet.');
        }
      }
    } catch (error) {
      console.error('Error checking payment:', error);
      setStatus('error');
      toast.error('Failed to verify payment status');
    }
  };

  useEffect(() => {
    if (!sessionId) {
      navigate('/markets');
      return;
    }
    checkPaymentStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl bg-card border border-border/50 p-12 text-center"
          data-testid="trade-success-container"
        >
          {status === 'checking' && (
            <>
              <div className="mb-6 flex justify-center">
                <Loader2 className="text-primary animate-spin" size={64} />
              </div>
              <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
                Processing Payment
              </h1>
              <p className="text-muted-foreground">
                Please wait while we confirm your payment...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="p-4 rounded-full bg-[#00FF94]/10">
                  <CheckCircle className="text-[#00FF94]" size={64} />
                </div>
              </div>
              <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
                Purchase Successful!
              </h1>
              <p className="text-muted-foreground mb-8">
                Your cryptocurrency has been added to your wallet
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => navigate('/wallet')}
                  data-testid="view-wallet-button"
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-8"
                >
                  View Wallet
                </Button>
                <Button
                  onClick={() => navigate('/markets')}
                  data-testid="continue-trading-button"
                  className="rounded-full bg-white/5 text-foreground hover:bg-white/10 px-8"
                >
                  Continue Trading
                </Button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="p-4 rounded-full bg-[#FF3333]/10">
                  <XCircle className="text-[#FF3333]" size={64} />
                </div>
              </div>
              <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
                Payment Failed
              </h1>
              <p className="text-muted-foreground mb-8">
                There was an issue processing your payment
              </p>
              <Button
                onClick={() => navigate('/markets')}
                data-testid="back-to-markets-button"
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-8"
              >
                Back to Markets
              </Button>
            </>
          )}

          {status === 'timeout' && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="p-4 rounded-full bg-[#FFB000]/10">
                  <Loader2 className="text-[#FFB000]" size={64} />
                </div>
              </div>
              <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
                Status Check Timed Out
              </h1>
              <p className="text-muted-foreground mb-8">
                We're still processing your payment. Please check your wallet in a few minutes.
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => navigate('/wallet')}
                  data-testid="check-wallet-button"
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-8"
                >
                  Check Wallet
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  data-testid="retry-button"
                  className="rounded-full bg-white/5 text-foreground hover:bg-white/10 px-8"
                >
                  Retry
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default TradeSuccess;