import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Input } from '../components/ui/input';

const Markets = () => {
  const [markets, setMarkets] = useState([]);
  const [filteredMarkets, setFilteredMarkets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkets();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = markets.filter(
        (coin) =>
          coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMarkets(filtered);
    } else {
      setFilteredMarkets(markets);
    }
  }, [searchQuery, markets]);

  const fetchMarkets = async () => {
    try {
      const response = await api.get('/crypto/markets');
      setMarkets(response.data);
      setFilteredMarkets(response.data);
    } catch (error) {
      toast.error('Failed to load markets');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-primary">Loading markets...</div>
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
            Markets
          </h1>
          <p className="text-muted-foreground">Explore and trade top cryptocurrencies</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            type="text"
            placeholder="Search cryptocurrencies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="search-input"
            className="pl-12 h-12 rounded-xl bg-white/5 border-white/10 focus:border-primary"
          />
        </div>

        {/* Markets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMarkets.map((coin, index) => (
            <motion.div
              key={coin.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <Link
                to={`/trade/${coin.id}`}
                data-testid={`coin-card-${coin.id}`}
                className="block rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all p-6 group hover:scale-105"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img src={coin.image} alt={coin.name} className="w-12 h-12 rounded-full" />
                    <div>
                      <p className="font-heading font-bold text-foreground">{coin.symbol.toUpperCase()}</p>
                      <p className="text-sm text-muted-foreground">{coin.name}</p>
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg ${coin.price_change_percentage_24h >= 0 ? 'bg-[#00FF94]/10' : 'bg-[#FF3333]/10'}`}>
                    {coin.price_change_percentage_24h >= 0 ? (
                      <TrendingUp size={20} className="text-[#00FF94]" />
                    ) : (
                      <TrendingDown size={20} className="text-[#FF3333]" />
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                    <p className="font-mono text-2xl font-bold text-foreground">
                      ${coin.current_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">24h Change</p>
                      <p className={`font-mono text-sm font-semibold ${coin.price_change_percentage_24h >= 0 ? 'text-[#00FF94]' : 'text-[#FF3333]'}`}>
                        {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h?.toFixed(2)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">Market Cap</p>
                      <p className="font-mono text-sm font-semibold text-foreground">
                        ${(coin.market_cap / 1e9).toFixed(2)}B
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {filteredMarkets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No cryptocurrencies found</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Markets;