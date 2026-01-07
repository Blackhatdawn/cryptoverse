import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [portfolio, setPortfolio] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [detailedHoldings, setDetailedHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (showToast = false) => {
    try {
      setRefreshing(true);
      const [portfolioRes, marketsRes] = await Promise.all([
        api.get('/portfolio'),
        api.get('/crypto/markets')
      ]);
      
      setPortfolio(portfolioRes.data);
      setMarkets(marketsRes.data);
      
      // Build detailed holdings with current prices
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
        toast.success('Portfolio refreshed');
      }
    } catch (error) {
      toast.error('Failed to load portfolio data');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  // Mock historical data for line chart
  const generateHistoricalData = () => {
    const data = [];
    const baseValue = portfolio?.total_value || 10000;
    const points = 20;
    
    for (let i = 0; i < points; i++) {
      const variance = (Math.random() - 0.5) * 2000;
      data.push({
        time: i,
        value: Math.max(baseValue + variance - (points - i) * 100, 0)
      });
    }
    return data;
  };

  const chartData = portfolio ? generateHistoricalData() : [];
  
  // Calculate portfolio change
  const portfolioChange = 0; // Would be calculated from historical data
  const isPositive = portfolioChange >= 0;

  // Pie chart data
  const pieData = detailedHoldings.map(h => ({
    name: h.symbol.toUpperCase(),
    value: h.total
  }));

  const COLORS = ['#F7931A', '#627EEA', '#00D395', '#8247E5', '#FF6B6B'];

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
        {/* Total Worth Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
          data-testid="total-worth-section"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Total Worth</p>
              <h1 className="font-mono text-5xl sm:text-6xl font-bold text-foreground tracking-tight">
                ${portfolio?.total_value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h1>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              data-testid="refresh-button"
              className="p-3 rounded-xl bg-card hover:bg-white/5 transition-colors border border-border/50"
            >
              <RefreshCw className={`text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} size={20} />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`font-mono text-lg font-semibold ${isPositive ? 'text-[#00FF94]' : 'text-[#FF3333]'}`}>
              ${portfolio?.total_value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? 'text-[#00FF94]' : 'text-[#FF3333]'}`}>
              {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {isPositive ? '+' : ''}{portfolioChange.toFixed(2)}%
            </span>
            <span className="text-sm text-muted-foreground">24H</span>
          </div>
        </motion.div>

        {/* Assets Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card border border-border/50 p-6"
          data-testid="assets-section"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Assets ${portfolio?.total_value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            {detailedHoldings.length > 3 && (
              <Link to="/wallet" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                See More Assets
              </Link>
            )}
          </div>

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
                    <th className="pb-4 font-medium">Name</th>
                    <th className="pb-4 font-medium text-right">Amount</th>
                    <th className="pb-4 font-medium text-right">24h Change</th>
                    <th className="pb-4 font-medium text-right">Price</th>
                    <th className="pb-4 font-medium text-right">Total</th>
                    <th className="pb-4 font-medium text-right">P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedHoldings.slice(0, 5).map((holding, index) => {
                    const pl = holding.change24h;
                    const plAmount = (holding.total * holding.change24h) / 100;
                    
                    return (
                      <tr
                        key={holding.id}
                        data-testid={`asset-row-${holding.id}`}
                        className="border-b border-border/10 last:border-0 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-4">
                          <Link to={`/trade/${holding.id}`} className="flex items-center gap-3">
                            <img src={holding.image} alt={holding.name} className="w-8 h-8 rounded-full" />
                            <div>
                              <p className="font-semibold text-foreground">{holding.name}</p>
                              <p className="text-xs text-muted-foreground">{holding.symbol.toUpperCase()}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="py-4 text-right">
                          <p className="font-mono text-sm text-foreground">{holding.amount.toFixed(4)}</p>
                        </td>
                        <td className="py-4 text-right">
                          <span className={`flex items-center justify-end gap-1 font-semibold text-sm ${
                            holding.change24h >= 0 ? 'text-[#00FF94]' : 'text-[#FF3333]'
                          }`}>
                            {holding.change24h >= 0 ? '▲' : '▼'}
                            {Math.abs(holding.change24h).toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <p className="font-mono text-sm text-foreground">
                            ${holding.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </td>
                        <td className="py-4 text-right">
                          <p className="font-mono font-semibold text-foreground">
                            ${holding.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </td>
                        <td className="py-4 text-right">
                          <div>
                            <p className={`font-mono font-semibold text-sm ${
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Charts Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-card border border-border/50 p-6"
          data-testid="charts-section"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-xl font-bold text-foreground">Charts</h2>
            <button className="text-sm text-muted-foreground hover:text-primary transition-colors">
              See More Charts
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Line Chart */}
            <div className="lg:col-span-2">
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-1">High: ${Math.max(...chartData.map(d => d.value)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <defs>
                    <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(260, 100%, 65%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(260, 100%, 65%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis hide />
                  <YAxis hide domain={['dataMin', 'dataMax']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(240, 25%, 10%)',
                      border: '1px solid hsl(240, 20%, 18%)',
                      borderRadius: '8px',
                      color: 'hsl(210, 40%, 98%)'
                    }}
                    formatter={(value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(260, 100%, 65%)"
                    strokeWidth={2}
                    fill="url(#portfolioGradient)"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="flex flex-col items-center justify-center">
              {detailedHoldings.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(240, 25%, 10%)',
                        border: '1px solid hsl(240, 20%, 18%)',
                        borderRadius: '8px',
                        color: 'hsl(210, 40%, 98%)'
                      }}
                      formatter={(value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-sm">No assets to display</p>
                </div>
              )}
              {detailedHoldings.length > 0 && (
                <div className="mt-4 text-center">
                  {detailedHoldings.slice(0, 3).map((holding, index) => (
                    <div key={holding.id} className="flex items-center gap-2 justify-center mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {holding.symbol.toUpperCase()}: {((holding.total / portfolio.total_value) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;