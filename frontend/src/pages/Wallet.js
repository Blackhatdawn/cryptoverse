import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Clock, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const Wallet = () => {
  const [portfolio, setPortfolio] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [detailedHoldings, setDetailedHoldings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (showToast = false) => {
    try {
      setRefreshing(true);
      const [portfolioRes, marketsRes, transactionsRes] = await Promise.all([
        api.get('/portfolio'),
        api.get('/crypto/markets'),
        api.get('/transactions')
      ]);
      
      setPortfolio(portfolioRes.data);
      setMarkets(marketsRes.data);
      setTransactions(transactionsRes.data);
      
      // Build detailed holdings
      const holdingsData = [];
      if (portfolioRes.data.holdings && Object.keys(portfolioRes.data.holdings).length > 0) {
        for (const [coinId, amount] of Object.entries(portfolioRes.data.holdings)) {
          const coinData = marketsRes.data.find(m => m.id === coinId);
          if (coinData) {
            holdingsData.push({
              id: coinId,
              name: coinData.name,
              symbol: coinData.symbol,
              amount: amount,
              currentPrice: coinData.current_price,
              change24h: coinData.price_change_percentage_24h || 0,
              total: amount * coinData.current_price,
              image: coinData.image
            });
          }
        }
      }
      setDetailedHoldings(holdingsData);
      
      if (showToast) {
        toast.success('Wallet refreshed');
      }
    } catch (error) {
      toast.error('Failed to load wallet data');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
           ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header with Total Worth */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Total Portfolio Value</p>
              <h1 className="font-mono text-5xl sm:text-6xl font-bold text-foreground tracking-tight">
                ${portfolio?.total_value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h1>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              data-testid="refresh-wallet-button"
              className="p-3 rounded-xl bg-card hover:bg-white/5 transition-colors border border-border/50"
            >
              <RefreshCw className={`text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} size={20} />
            </button>
          </div>
          
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">USD Balance</p>
              <p className="font-mono text-lg font-semibold text-foreground">
                ${portfolio?.usd_balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Crypto Assets</p>
              <p className="font-mono text-lg font-semibold text-foreground">
                {detailedHoldings.length}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Detailed Holdings Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card border border-border/50 p-6"
          data-testid="holdings-section"
        >
          <h2 className="font-heading text-xl font-bold text-foreground mb-6">
            Holdings (${detailedHoldings.reduce((sum, h) => sum + h.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
          </h2>
          
          {detailedHoldings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No crypto holdings yet</p>
              <Link to="/markets" className="text-primary hover:underline">
                Start Trading
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border/30">
                    <th className="pb-4 font-medium">Asset</th>
                    <th className="pb-4 font-medium text-right">Amount</th>
                    <th className="pb-4 font-medium text-right">24h Change</th>
                    <th className="pb-4 font-medium text-right">Price</th>
                    <th className="pb-4 font-medium text-right">Total Value</th>
                    <th className="pb-4 font-medium text-right">P/L (24h)</th>
                    <th className="pb-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedHoldings.map((holding) => {
                    const pl = holding.change24h;
                    const plAmount = (holding.total * holding.change24h) / 100;
                    
                    return (
                      <tr
                        key={holding.id}
                        data-testid={`holding-row-${holding.id}`}
                        className="border-b border-border/10 last:border-0 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <img src={holding.image} alt={holding.name} className="w-10 h-10 rounded-full" />
                            <div>
                              <p className="font-semibold text-foreground">{holding.name}</p>
                              <p className="text-xs text-muted-foreground">{holding.symbol.toUpperCase()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          <p className="font-mono text-foreground">{holding.amount.toFixed(6)}</p>
                          <p className="text-xs text-muted-foreground">{holding.symbol.toUpperCase()}</p>
                        </td>
                        <td className="py-4 text-right">
                          <span className={`flex items-center justify-end gap-1 font-semibold ${
                            holding.change24h >= 0 ? 'text-[#00FF94]' : 'text-[#FF3333]'
                          }`}>
                            {holding.change24h >= 0 ? '▲' : '▼'}
                            {Math.abs(holding.change24h).toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <p className="font-mono text-foreground">
                            ${holding.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </td>
                        <td className="py-4 text-right">
                          <p className="font-mono font-bold text-foreground">
                            ${holding.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </td>
                        <td className="py-4 text-right">
                          <div>
                            <p className={`font-mono font-semibold ${
                              pl >= 0 ? 'text-[#00FF94]' : 'text-[#FF3333]'
                            }`}>
                              {pl >= 0 ? '+' : ''}${Math.abs(plAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className={`text-xs ${
                              pl >= 0 ? 'text-[#00FF94]' : 'text-[#FF3333]'
                            }`}>
                              {pl >= 0 ? '▲' : '▼'} {Math.abs(pl).toFixed(2)}%
                            </p>
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          <Link
                            to={`/trade/${holding.id}`}
                            className="text-sm text-primary hover:underline"
                            data-testid={`trade-link-${holding.id}`}
                          >
                            Trade
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Transaction History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card border border-border/50 p-6"
          data-testid="transactions-section"
        >
          <h2 className="font-heading text-xl font-bold text-foreground mb-6">Transaction History</h2>
          
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  data-testid={`transaction-item-${tx.id}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${
                      tx.transaction_type === 'buy' 
                        ? 'bg-[#00FF94]/10 text-[#00FF94]' 
                        : 'bg-[#FF3333]/10 text-[#FF3333]'
                    }`}>
                      {tx.transaction_type === 'buy' ? (
                        <TrendingUp size={20} />
                      ) : (
                        <TrendingDown size={20} />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {tx.transaction_type === 'buy' ? 'Bought' : 'Sold'} {tx.coin_symbol.toUpperCase()}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={12} className="text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{formatDate(tx.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold text-foreground">
                      {tx.amount.toFixed(8)} {tx.coin_symbol.toUpperCase()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ${tx.total_usd.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Wallet;