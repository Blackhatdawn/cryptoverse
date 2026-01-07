import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { TrendingUp, Shield, Zap } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        toast.success('Welcome back!');
      } else {
        await signup(email, password, fullName);
        toast.success('Account created successfully!');
      }
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/20 via-background to-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/8185627/pexels-photo-8185627.jpeg')] bg-cover bg-center opacity-10"></div>
        <div className="relative z-10 flex flex-col justify-center px-16 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-heading text-5xl font-bold text-foreground mb-6 tracking-tight">
              Welcome to<br />
              <span className="text-primary">CryptoNexus</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-12 max-w-md">
              Your gateway to the future of digital assets. Trade with confidence on a platform built for modern investors.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Bank-Level Security</h3>
                  <p className="text-sm text-muted-foreground">Your assets are protected with industry-leading security measures</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Real-Time Trading</h3>
                  <p className="text-sm text-muted-foreground">Execute trades instantly with live market data</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Lightning Fast</h3>
                  <p className="text-sm text-muted-foreground">Experience blazing-fast transactions and updates</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <h2 className="font-heading text-3xl font-bold text-foreground mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-muted-foreground">
              {isLogin ? 'Sign in to your account' : 'Start your crypto journey today'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="auth-form">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  data-testid="input-fullname"
                  className="bg-white/5 border-white/10 focus:border-primary h-12 rounded-xl"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
                className="bg-white/5 border-white/10 focus:border-primary h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
                className="bg-white/5 border-white/10 focus:border-primary h-12 rounded-xl"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="submit-button"
              className="w-full h-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all hover:scale-105"
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              data-testid="toggle-auth-mode"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <span className="font-semibold text-primary">
                {isLogin ? 'Sign Up' : 'Sign In'}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;