import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const Trade = () => {
  const { coinId } = useParams();
  const navigate = useNavigate();
  const [coin, setCoin] = useState(null);
  const [amount, setAmount] = useState('');
  const [tradeType, setTradeType] = useState('buy');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const loadCoinDetails = async () => {
      try {
        const response = await api.get(`/crypto/coin/${coinId}`);
        setCoin(response.data);
      } catch (error) {
        toast.error('Failed to load coin details');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadCoinDetails();
  }, [coinId]);
    try {
      const response = await api.get(`/crypto/coin/${coinId}`);
      setCoin(response.data);
    } catch (error) {
      toast.error('Failed to load coin details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrade = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setProcessing(true);

    try {
      if (tradeType === 'buy') {
        const hostUrl = window.location.origin;
        const response = await api.post('/trade/create-checkout', {
          coin_id: coinId,
          coin_symbol: coin.symbol,
          amount: parseFloat(amount),
          transaction_type: 'buy',
          host_url: hostUrl
        });
        window.location.href = response.data.url;
      } else {
        const hostUrl = window.location.origin;
        const response = await api.post('/trade/sell', {
          coin_id: coinId,
          coin_symbol: coin.symbol,
          amount: parseFloat(amount),
          transaction_type: 'sell',
          host_url: hostUrl
        });
        toast.success(`Successfully sold ${amount} ${coin.symbol.toUpperCase()}`);
        setAmount('');
        setTimeout(() => navigate('/wallet'), 1500);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${tradeType} crypto`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-primary">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!coin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Coin not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const currentPrice = coin.market_data?.current_price?.usd || 0;
  const priceChange24h = coin.market_data?.price_change_percentage_24h || 0;
  const totalCost = amount ? (parseFloat(amount) * currentPrice).toFixed(2) : '0.00';

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          data-testid="back-button"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        {/* Coin Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border/50 p-8"
          data-testid="coin-header"
        >
          <div className="flex items-start gap-6">
            <img src={coin.image?.large} alt={coin.name} className="w-20 h-20 rounded-full" />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-heading text-3xl font-bold text-foreground">{coin.name}</h1>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  {coin.symbol?.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-mono text-4xl font-bold text-foreground">
                  ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-lg ${priceChange24h >= 0 ? 'bg-[#00FF94]/10 text-[#00FF94]' : 'bg-[#FF3333]/10 text-[#FF3333]'}`}>
                  {priceChange24h >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span className="font-semibold text-sm">
                    {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Trading Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card border border-border/50 p-8"
          data-testid="trade-interface"
        >
          <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Trade</h2>

          {/* Buy/Sell Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setTradeType('buy')}
              data-testid="buy-tab"
              className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${
                tradeType === 'buy'
                  ? 'bg-[#00FF94]/10 text-[#00FF94] border border-[#00FF94]/30'
                  : 'bg-white/5 text-muted-foreground hover:bg-white/10'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setTradeType('sell')}
              data-testid="sell-tab"
              className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${
                tradeType === 'sell'
                  ? 'bg-[#FF3333]/10 text-[#FF3333] border border-[#FF3333]/30'
                  : 'bg-white/5 text-muted-foreground hover:bg-white/10'
              }`}
            >
              Sell
            </button>
          </div>

          {/* Amount Input */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ({coin.symbol?.toUpperCase()})</Label>
              <Input
                id="amount"
                type="number"
                step="0.00000001"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="amount-input"
                className="h-14 text-lg font-mono bg-white/5 border-white/10 focus:border-primary rounded-xl"
              />
            </div>

            {/* Total Cost */}
            <div className="rounded-xl bg-white/5 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Price per coin</span>
                <span className="font-mono font-semibold text-foreground">${currentPrice.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-mono text-2xl font-bold text-foreground" data-testid="total-cost">
                  ${totalCost}
                </span>
              </div>
            </div>

            {/* Trade Button */}
            <Button
              onClick={handleTrade}
              disabled={processing || !amount}
              data-testid="execute-trade-button"
              className={`w-full h-14 rounded-full font-bold text-lg shadow-lg transition-all hover:scale-105 ${
                tradeType === 'buy'
                  ? 'bg-[#00FF94] text-black hover:bg-[#00FF94]/90 shadow-[0_0_20px_rgba(0,255,148,0.3)]'
                  : 'bg-[#FF3333] text-white hover:bg-[#FF3333]/90 shadow-[0_0_20px_rgba(255,51,51,0.3)]'
              }`}
            >
              {processing ? 'Processing...' : `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${coin.symbol?.toUpperCase()}`}
            </Button>
          </div>
        </motion.div>

        {/* Coin Description */}
        {coin.description?.en && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-card border border-border/50 p-8"
          >
            <h2 className="font-heading text-xl font-bold text-foreground mb-4">About {coin.name}</h2>
            <div
              className="text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: coin.description.en.split('. ').slice(0, 3).join('. ') + '.' }}
            />
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Trade;