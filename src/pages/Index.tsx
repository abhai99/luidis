import { Navbar } from '@/components/Navbar';
import { PricingCard } from '@/components/PricingCard';
import { FeatureCard } from '@/components/FeatureCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Crown,
  Zap,
  Shield,
  TrendingUp,
  Clock,
  Users,
  ArrowRight,
  Star,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const Index = () => {
  const { user, signIn, subscription } = useAuth();
  const navigate = useNavigate();

  const features = [
    { icon: Zap, title: 'Lightning Fast', description: 'Get instant access to premium predictions and insights with real-time updates.' },
    { icon: Shield, title: 'Secure & Reliable', description: 'Your data is protected with enterprise-grade security and encryption.' },
    { icon: TrendingUp, title: 'Accurate Predictions', description: 'Access our AI-powered prediction engine with 95%+ accuracy rate.' },
    { icon: Clock, title: '24/7 Support', description: 'Round-the-clock customer support to help you whenever you need.' },
    { icon: Users, title: 'Active Community', description: 'Join thousands of premium members sharing insights and strategies.' },
    { icon: Star, title: 'Exclusive Content', description: 'Get access to premium content not available to free users.' },
  ];

  const weeklyFeatures = ['All premium predictions', '7-day access', 'Basic support', 'Community access'];
  const monthlyFeatures = ['All premium predictions', '30-day access', 'Priority support', 'VIP community access', 'Exclusive insights', 'Early access to new features'];

  const [prices, setPrices] = useState({ weekly: 99, monthly: 299 });

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const priceDoc = await getDoc(doc(db, 'config', 'prices'));
        if (priceDoc.exists()) setPrices(priceDoc.data() as any);
      } catch (error) {
        console.error('Error fetching prices:', error);
      }
    };
    fetchContent();
  }, []);

  // Only 2 active tools
  const tools = [
    {
      id: 1,
      emoji: '👑',
      name: 'HYDRA KING',
      subtitle: 'WinGo 1M · Multi-Model AI',
      gradient: 'from-purple-700 via-violet-600 to-purple-500',
      shadow: '0 8px 32px rgba(139,92,246,0.35)',
      accent: 'rgba(167,139,250,0.25)',
    },
    {
      id: 2,
      emoji: '⚡',
      name: 'ARDINO MAX',
      subtitle: 'WinGo 1M · Auto Predictor',
      gradient: 'from-amber-600 via-yellow-500 to-orange-400',
      shadow: '0 8px 32px rgba(251,191,36,0.30)',
      accent: 'rgba(252,211,77,0.25)',
    },
  ];

  const handleToolClick = (toolId: number) => {
    if (!subscription.isSubscribed) {
      toast.info('Please subscribe to access this tool.');
      navigate('/premium');
      return;
    }
    navigate(`/content/${toolId}`);
  };

  return (
    <div className="min-h-screen gradient-hero">
      <Navbar />

      {/* Main Section */}
      <section className="pt-20 pb-28 px-4">
        <div className="container mx-auto max-w-lg">

          {user ? (
            /* ── LOGGED IN: Mobile App Dashboard ── */
            <div className="space-y-5 pt-2">

              {/* Welcome Header — slides down */}
              <div className="animate-slide-down delay-0 flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">Welcome back</p>
                  <h1 className="text-2xl font-bold text-foreground mt-0.5">
                    {user.displayName?.split(' ')[0] || 'Boss'} 👋
                  </h1>
                </div>
                <div className="animate-pop-in delay-160 w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 animate-glow-pulse">
                  <Crown className={`w-5 h-5 ${subscription.isSubscribed ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                </div>
              </div>

              {/* Plan Status Card — rises up + shimmer sweep */}
              <div className={`animate-rise delay-80 animate-shimmer-once p-4 rounded-2xl border relative overflow-hidden shadow-lg ${
                subscription.isSubscribed
                  ? 'bg-gradient-to-br from-primary/20 to-purple-500/10 border-primary/40'
                  : 'bg-card border-border'
              }`}>
                <div className="absolute top-0 right-0 p-4 opacity-[0.06] pointer-events-none">
                  <Crown className="w-24 h-24" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${subscription.isSubscribed ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                      <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">Current Plan</span>
                    </div>
                    {subscription.isSubscribed && (
                      <span className="text-[9px] font-black uppercase bg-green-400/15 text-green-400 px-2 py-0.5 rounded-full border border-green-400/20 tracking-wide">
                        ✓ Active
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold">
                    {subscription.isSubscribed
                      ? (subscription.plan === 'weekly' ? 'Weekly VIP' : 'Monthly Boss')
                      : 'Free Guest'}
                  </h2>
                  {subscription.isSubscribed ? (
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs opacity-60">Valid until {subscription.expiresAt?.toLocaleDateString()}</p>
                      <button
                        onClick={() => navigate('/premium')}
                        className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full transition-all active:scale-95"
                        style={{
                          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                          color: 'white',
                          boxShadow: '0 3px 12px rgba(139,92,246,0.4)',
                        }}
                      >
                        <Zap className="w-3 h-3" />
                        Recharge Plan
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-col gap-2">
                      <Button size="sm" variant="premium" className="w-full"
                        onClick={() => navigate('/premium')}>
                        <Zap className="w-3.5 h-3.5 mr-1.5" />
                        Get a Plan — Upgrade Now
                      </Button>
                      <p className="text-center text-[10px] text-muted-foreground/50">
                        Starting from ₹99/week
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Prediction Tools label — fades in */}
              <div className="animate-fade-in delay-240">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 bg-primary rounded-full" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/80">Prediction Tools</h3>
                </div>

                {/* Tool Cards — each rises with delay */}
                <div className="flex flex-col gap-3">
                  {tools.map((tool, idx) => (
                    <button
                      key={tool.id}
                      onClick={() => handleToolClick(tool.id)}
                      className={`animate-rise w-full text-left rounded-2xl bg-gradient-to-r ${tool.gradient} p-4 active:scale-[0.98] transition-transform duration-100 relative overflow-hidden animate-shimmer-once`}
                      style={{
                        boxShadow: tool.shadow,
                        border: `1px solid ${tool.accent}`,
                        animationDelay: `${320 + idx * 100}ms`,
                      }}
                    >
                      {/* Shine overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-2xl" />

                      <div className="relative z-10 flex items-center justify-between gap-3">
                        {/* Left: icon + text */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                            {tool.emoji}
                          </div>
                          <div className="min-w-0">
                            <div className="font-black text-white text-base tracking-wide leading-tight truncate">
                              {tool.name}
                            </div>
                            <div className="text-white/70 text-xs font-medium mt-0.5 truncate">
                              {tool.subtitle}
                            </div>
                          </div>
                        </div>

                        {/* Right: badge */}
                        <div className="shrink-0">
                          {subscription.isSubscribed ? (
                            <span className="text-[10px] font-black uppercase tracking-wide bg-white/20 text-white px-2.5 py-1 rounded-full whitespace-nowrap">
                              TAP TO OPEN
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-white/10 text-white/80 px-2.5 py-1 rounded-full whitespace-nowrap">
                              <Lock className="w-2.5 h-2.5" /> Locked
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer hint — fades last */}
              <p className="animate-fade-in delay-500 text-center text-[10px] text-muted-foreground/40 uppercase tracking-widest pb-2">
                More tools coming soon
              </p>

            </div>

          ) : (
            /* ── GUEST / LANDING ── */
            <div className="animate-fade-in pt-10 space-y-8">

              {/* Hero text */}
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 gradient-accent px-4 py-2 rounded-full text-accent-foreground text-sm font-semibold shadow-gold">
                  <Crown className="w-4 h-4" />
                  Premium Predictions Platform
                </div>

                <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground leading-tight">
                  Unlock Your Winning
                  <span className="text-gradient-primary"> Potential</span>
                </h1>

                <p className="text-base text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Join thousands of winners who trust WingoBoss for live AI-powered predictions.
                </p>
              </div>

              {/* Google Sign-in button */}
              <div className="flex justify-center">
                <Button id="google-btn" variant="google" size="lg" onClick={signIn} className="w-full">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </Button>
              </div>

              {/* ── Product Showcase ── */}
              <div className="space-y-3">
                <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground/50 font-bold">
                  ✦ Exclusive Tools Inside ✦
                </p>

                {/* Tool Preview Cards */}
                <div className="flex flex-col gap-3">
                  {/* HYDRA KING preview */}
                  <div className="relative rounded-2xl p-4 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #3b1a6b, #4c1d95, #5b21b6)', border: '1px solid rgba(167,139,250,0.3)', boxShadow: '0 6px 24px rgba(109,40,217,0.3)' }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                    {/* Lock overlay */}
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] rounded-2xl flex items-center justify-center">
                      <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/10">
                        <Lock className="w-3.5 h-3.5 text-purple-300" />
                        <span className="text-xs font-black text-purple-200 uppercase tracking-wider">Login to Unlock</span>
                      </div>
                    </div>
                    <div className="relative z-10 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-xl shrink-0">👑</div>
                      <div>
                        <div className="font-black text-white text-sm tracking-wide">HYDRA KING</div>
                        <div className="text-purple-300/80 text-xs mt-0.5">WinGo 1M · Multi-Model AI · Live Signals</div>
                      </div>
                      <div className="ml-auto shrink-0">
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full border border-green-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" /> LIVE
                        </span>
                      </div>
                    </div>
                    {/* Fake stat bar */}
                    <div className="relative z-10 mt-3 grid grid-cols-3 gap-2 text-center">
                      {[['73%', 'Accuracy'], ['N-Gram AI', 'Model'], ['Live', 'Status']].map(([val, label], i) => (
                        <div key={i} className="bg-white/5 rounded-xl py-1.5">
                          <div className="text-white text-xs font-black">{val}</div>
                          <div className="text-purple-300/60 text-[9px]">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ARDINO MAX preview */}
                  <div className="relative rounded-2xl p-4 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #78350f, #92400e, #b45309)', border: '1px solid rgba(252,211,77,0.3)', boxShadow: '0 6px 24px rgba(217,119,6,0.28)' }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                    {/* Lock overlay */}
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] rounded-2xl flex items-center justify-center">
                      <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/10">
                        <Lock className="w-3.5 h-3.5 text-yellow-300" />
                        <span className="text-xs font-black text-yellow-200 uppercase tracking-wider">Login to Unlock</span>
                      </div>
                    </div>
                    <div className="relative z-10 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-xl shrink-0">⚡</div>
                      <div>
                        <div className="font-black text-white text-sm tracking-wide">ARDINO MAX</div>
                        <div className="text-yellow-300/80 text-xs mt-0.5">WinGo 1M · Auto Predictor · Smart Logic</div>
                      </div>
                      <div className="ml-auto shrink-0">
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full border border-green-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" /> LIVE
                        </span>
                      </div>
                    </div>
                    {/* Fake stat bar */}
                    <div className="relative z-10 mt-3 grid grid-cols-3 gap-2 text-center">
                      {[['Big/Small', 'Prediction'], ['Auto', 'Updates'], ['🔊 Beep', 'On Signal']].map(([val, label], i) => (
                        <div key={i} className="bg-white/5 rounded-xl py-1.5">
                          <div className="text-white text-xs font-black">{val}</div>
                          <div className="text-yellow-300/60 text-[9px]">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stats strip */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { value: '2', label: 'AI Tools', icon: '🤖' },
                    { value: '24/7', label: 'Live Data', icon: '📡' },
                    { value: '1M', label: 'WinGo Game', icon: '🎯' },
                  ].map((stat, i) => (
                    <div key={i} className="rounded-2xl py-3 px-2 border border-border/50 bg-card/50">
                      <div className="text-lg mb-0.5">{stat.icon}</div>
                      <div className="text-base font-black text-foreground">{stat.value}</div>
                      <div className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Feature list */}
                <div className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-2.5">
                  {[
                    { icon: '⚡', text: 'Real-time predictions before every round' },
                    { icon: '🧠', text: 'Multi-model AI — streak, chop & N-gram analysis' },
                    { icon: '🔊', text: 'Audio alerts so you never miss a signal' },
                    { icon: '📊', text: 'Win/loss history with accuracy tracking' },
                    { icon: '🔒', text: 'Exclusive — subscribers only' },
                  ].map((f, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-base shrink-0 mt-0.5">{f.icon}</span>
                      <span className="text-xs text-muted-foreground leading-relaxed">{f.text}</span>
                    </div>
                  ))}
                </div>

                {/* Bottom CTA nudge */}
                <button onClick={signIn}
                  className="w-full py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
                  Sign in free → Explore tools
                </button>
              </div>

            </div>

          )}
        </div>
      </section>

      {/* Guest-only sections */}
      {!user && (
        <>
          {/* Features */}
          <section id="features" className="py-20 px-4">
            <div className="container mx-auto">
              <div className="text-center mb-16">
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Why Choose <span className="text-gradient-primary">WingoBoss</span>?
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Experience the difference with our premium features designed to maximize your success.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature, index) => (
                  <div key={index} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                    <FeatureCard {...feature} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section id="pricing" className="py-20 px-4 bg-secondary/50">
            <div className="container mx-auto">
              <div className="text-center mb-16">
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Simple, Transparent <span className="text-gradient-accent">Pricing</span>
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Choose the plan that works best for you. Cancel anytime.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <PricingCard plan="weekly" price={prices.weekly || 99} features={weeklyFeatures} />
                <PricingCard plan="monthly" price={prices.monthly || 299} features={monthlyFeatures} popular />
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-20 px-4">
            <div className="container mx-auto">
              <div className="gradient-premium rounded-3xl p-12 text-center shadow-elevated">
                <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                  Ready to Start Winning?
                </h2>
                <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
                  Join thousands of winners and get access to premium predictions today.
                </p>
                <Button variant="premium" size="lg" onClick={signIn}>
                  Sign Up & Get Started
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-8 px-4 border-t border-border">
            <div className="container mx-auto text-center">
              <p className="text-muted-foreground text-sm">© 2024 WingoBoss. All rights reserved.</p>
            </div>
          </footer>
        </>
      )}
    </div>
  );
};

export default Index;
