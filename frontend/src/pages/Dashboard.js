import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const [portfolio, setPortfolio] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [portfolioRes, marketsRes, transactionsRes] = await Promise.all([
        api.get('/portfolio'),
        api.get('/crypto/markets'),
        api.get('/transactions')
      ]);
      setPortfolio(portfolioRes.data);
      setMarkets(marketsRes.data.slice(0, 6));
      setTransactions(transactionsRes.data.slice(0, 5));
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const mockChartData = [
    { time: '00:00', value: 9800 },
    { time: '04:00', value: 10200 },
    { time: '08:00', value: 9900 },
    { time: '12:00', value: 10500 },
    { time: '16:00', value: 10300 },
    { time: '20:00', value: portfolio?.total_value || 10000 },
  ];

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
            Portfolio Overview
          </h1>
          <p className="text-muted-foreground">Track your crypto investments in real-time</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-colors p-6"
            data-testid="total-balance-card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Wallet className="text-primary" size={24} />
              </div>
              <TrendingUp className="text-[#00FF94]" size={20} />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className="font-mono text-3xl font-bold text-foreground">
                ${portfolio?.total_value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-colors p-6"
            data-testid="usd-balance-card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-secondary/10">
                <span className="text-secondary text-xl font-bold">$</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">USD Balance</p>
              <p className="font-mono text-3xl font-bold text-foreground">
                ${portfolio?.usd_balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-colors p-6"
            data-testid="crypto-holdings-card"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <TrendingUp className="text-primary" size={24} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Crypto Holdings</p>
              <p className="font-mono text-3xl font-bold text-foreground">
                {Object.keys(portfolio?.holdings || {}).length}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Portfolio Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-2xl bg-card border border-border/50 p-6"
          data-testid="portfolio-chart"
        >
          <h2 className="font-heading text-xl font-bold text-foreground mb-6">Portfolio Value</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={mockChartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(190, 100%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(190, 100%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="hsl(215, 20%, 65%)" style={{ fontSize: '12px' }} />
              <YAxis stroke="hsl(215, 20%, 65%)" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(240, 25%, 10%)',
                  border: '1px solid hsl(240, 20%, 18%)',
                  borderRadius: '8px',
                  color: 'hsl(210, 40%, 98%)'
                }}
              />
              <Area type="monotone" dataKey="value" stroke="hsl(190, 100%, 50%)" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Markets & Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Markets */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="rounded-2xl bg-card border border-border/50 p-6"
            data-testid="top-markets-section"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-bold text-foreground">Top Markets</h2>
              <Link to="/markets" className="text-sm text-primary hover:underline" data-testid="view-all-markets-link">
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {markets.map((coin) => (
                <Link
                  key={coin.id}
                  to={`/trade/${coin.id}`}
                  data-testid={`market-coin-${coin.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                    <div>
                      <p className="font-semibold text-foreground">{coin.symbol.toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">{coin.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold text-foreground">
                      ${coin.current_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className={`text-xs font-medium ${coin.price_change_percentage_24h >= 0 ? 'text-[#00FF94]' : 'text-[#FF3333]'}`}>
                      {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h?.toFixed(2)}%
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Recent Transactions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="rounded-2xl bg-card border border-border/50 p-6"
            data-testid="recent-transactions-section"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-bold text-foreground">Recent Activity</h2>
              <Link to="/wallet" className="text-sm text-primary hover:underline" data-testid="view-all-transactions-link">
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} data-testid={`transaction-${tx.id}`} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${tx.transaction_type === 'buy' ? 'bg-[#00FF94]/10 text-[#00FF94]' : 'bg-[#FF3333]/10 text-[#FF3333]'}`}>
                        {tx.transaction_type === 'buy' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">
                          {tx.transaction_type === 'buy' ? 'Bought' : 'Sold'} {tx.coin_symbol.toUpperCase()}
                        </p>
                        <p className="text-xs text-muted-foreground">{tx.amount} coins</p>
                      </div>
                    </div>
                    <p className="font-mono text-sm font-semibold text-foreground">
                      ${tx.total_usd.toFixed(2)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;