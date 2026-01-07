import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';

const Wallet = () => {
  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [portfolioRes, transactionsRes] = await Promise.all([
        api.get('/portfolio'),
        api.get('/transactions')
      ]);
      setPortfolio(portfolioRes.data);
      setTransactions(transactionsRes.data);
    } catch (error) {
      toast.error('Failed to load wallet data');
      console.error(error);
    } finally {
      setLoading(false);
    }
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
        {/* Header */}
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-2">
            My Wallet
          </h1>
          <p className="text-muted-foreground">Manage your crypto holdings and view transaction history</p>
        </div>

        {/* Holdings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border/50 p-6"
          data-testid="holdings-section"
        >
          <h2 className="font-heading text-xl font-bold text-foreground mb-6">Holdings</h2>
          
          {Object.keys(portfolio?.holdings || {}).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No crypto holdings yet. Start trading to build your portfolio!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(portfolio.holdings).map(([coinId, amount]) => (
                <div
                  key={coinId}
                  data-testid={`holding-${coinId}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div>
                    <p className="font-heading font-bold text-foreground">{coinId.toUpperCase()}</p>
                    <p className="text-sm text-muted-foreground">{coinId}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-semibold text-foreground">{amount.toFixed(8)}</p>
                    <p className="text-xs text-muted-foreground">coins</p>
                  </div>
                </div>
              ))}
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