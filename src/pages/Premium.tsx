import { Navbar } from '@/components/Navbar';
import { PricingCard } from '@/components/PricingCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Crown, Lock, ChevronRight, ShieldAlert, TrendingUp, Wallet, AlertTriangle, BarChart2, Repeat } from 'lucide-react';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const moneyTips = [
  {
    icon: Wallet,
    color: '#facc15',
    bg: 'rgba(250,204,21,0.08)',
    border: 'rgba(250,204,21,0.2)',
    title: 'Start Small',
    tip: 'Never bet more than 2–5% of your total balance on a single round. Small, consistent bets protect your capital.',
  },
  {
    icon: Repeat,
    color: '#34d399',
    bg: 'rgba(52,211,153,0.08)',
    border: 'rgba(52,211,153,0.2)',
    title: 'Flat Betting Only',
    tip: 'Use the same bet size every round. Avoid doubling up after a loss — chasing losses is the fastest way to blow your bankroll.',
  },
  {
    icon: ShieldAlert,
    color: '#f87171',
    bg: 'rgba(248,113,113,0.08)',
    border: 'rgba(248,113,113,0.2)',
    title: 'Set a Daily Loss Limit',
    tip: 'Decide your max daily loss before you start. Once you hit it — stop. No exceptions. Tomorrow is another round.',
  },
  {
    icon: BarChart2,
    color: '#818cf8',
    bg: 'rgba(129,140,248,0.08)',
    border: 'rgba(129,140,248,0.2)',
    title: 'Track Every Bet',
    tip: 'Write down your wins and losses. Seeing the numbers clearly helps you stay rational and avoid emotional decisions.',
  },
  {
    icon: TrendingUp,
    color: '#fb923c',
    bg: 'rgba(251,146,60,0.08)',
    border: 'rgba(251,146,60,0.2)',
    title: 'Take Profit Targets',
    tip: 'Set a daily profit goal — e.g. +20%. Once you hit it, stop for the day. Greedy sessions always give back the gains.',
  },
  {
    icon: AlertTriangle,
    color: '#e879f9',
    bg: 'rgba(232,121,249,0.08)',
    border: 'rgba(232,121,249,0.2)',
    title: 'AI Helps, You Decide',
    tip: 'These tools give smart signals — but no prediction is 100%. Always use your own judgment and never bet money you cannot afford to lose.',
  },
];

const tools = [
  {
    id: 1,
    emoji: '👑',
    name: 'HYDRA KING',
    subtitle: 'WinGo 1M · Multi-Model AI',
    gradient: 'linear-gradient(135deg, #6d28d9, #7c3aed, #8b5cf6)',
    shadow: '0 6px 24px rgba(139,92,246,0.30)',
    border: 'rgba(167,139,250,0.30)',
  },
  {
    id: 2,
    emoji: '⚡',
    name: 'ARDINO MAX',
    subtitle: 'WinGo 1M · Auto Predictor',
    gradient: 'linear-gradient(135deg, #d97706, #eab308, #fb923c)',
    shadow: '0 6px 24px rgba(251,191,36,0.28)',
    border: 'rgba(252,211,77,0.30)',
  },
];

const weeklyFeatures = ['All premium predictions', '7-day access', 'Basic support', 'Community access'];
const monthlyFeatures = ['All premium predictions', '30-day access', 'Priority support', 'VIP community access', 'Exclusive insights', 'Early access to new features'];

const Premium = () => {
  const { user, subscription, loading } = useAuth();
  const navigate = useNavigate();
  const [prices, setPrices] = useState({ weekly: 99, monthly: 299 });

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const priceDoc = await getDoc(doc(db, 'config', 'prices'));
        if (priceDoc.exists()) setPrices(priceDoc.data() as any);
      } catch (e) { /* ignore */ }
    };
    fetchPrices();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  const isSubscribed = subscription.isSubscribed;

  return (
    <div className="min-h-screen bg-background pb-28">
      <Navbar />

      <div className="container mx-auto px-4 max-w-lg pt-24 space-y-6">

        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400 uppercase tracking-widest">
            {isSubscribed ? 'Prediction Tools' : 'Get a Plan'}
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            {isSubscribed ? 'Tap a tool below to open it.' : 'Choose a plan to unlock all prediction tools.'}
          </p>
        </div>

        {/* ── PRICING CARDS (shown when NOT subscribed) ── */}
        {!isSubscribed && (
          <div className="space-y-4">
            {/* Crown banner */}
            <div className="flex items-center justify-center gap-2 py-2">
              <Crown className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-black uppercase tracking-widest text-foreground/70">Unlock Full Access</span>
            </div>

            {/* Actual payment cards */}
            <div className="grid grid-cols-1 gap-4">
              <PricingCard
                plan="weekly"
                price={prices.weekly || 99}
                features={weeklyFeatures}
              />
              <PricingCard
                plan="monthly"
                price={prices.monthly || 299}
                features={monthlyFeatures}
                popular
              />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold">Preview</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>
          </div>
        )}

        {/* Tool Cards */}
        <div className="flex flex-col gap-3">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => {
                if (!isSubscribed) return; // already showing pricing above
                navigate(`/content/${tool.id}`);
              }}
              className="w-full text-left rounded-2xl p-4 active:scale-[0.98] transition-transform duration-100 relative overflow-hidden"
              style={{
                background: isSubscribed ? tool.gradient : 'rgba(30,30,50,0.5)',
                boxShadow: isSubscribed ? tool.shadow : 'none',
                border: `1px solid ${isSubscribed ? tool.border : 'rgba(255,255,255,0.05)'}`,
              }}
            >
              {isSubscribed && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-2xl" />
              )}

              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: isSubscribed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)' }}
                  >
                    {isSubscribed ? tool.emoji : <Lock className="w-5 h-5 text-muted-foreground/40" />}
                  </div>
                  <div className="min-w-0">
                    <div className={`font-black text-base tracking-wide leading-tight truncate ${isSubscribed ? 'text-white' : 'text-muted-foreground/50'}`}>
                      {tool.name}
                    </div>
                    <div className={`text-xs font-medium mt-0.5 truncate ${isSubscribed ? 'text-white/70' : 'text-muted-foreground/30'}`}>
                      {tool.subtitle}
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  {isSubscribed ? (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-white/20 text-white px-2.5 py-1 rounded-full">
                      Open <ChevronRight className="w-3 h-3" />
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-white/5 text-muted-foreground/40 px-2.5 py-1 rounded-full border border-white/8">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}

          {/* Coming Soon */}
          <div className="rounded-2xl p-3 text-center border border-dashed border-white/8"
            style={{ background: 'rgba(255,255,255,0.02)' }}>
            <p className="text-xs text-muted-foreground/40 uppercase tracking-widest font-bold">
              ✦ More tools coming soon ✦
            </p>
          </div>
        </div>

        {/* ── Money Management Section ── */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full" style={{ background: '#facc15' }} />
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground/80">
              💰 Money Management Tips
            </h2>
          </div>
          <p className="text-xs text-muted-foreground/60 leading-relaxed">
            Smart predictions alone won't keep you profitable. How you manage your money matters even more.
          </p>

          <div className="flex flex-col gap-3">
            {moneyTips.map((tip, i) => {
              const Icon = tip.icon;
              return (
                <div
                  key={i}
                  className="rounded-2xl p-4 flex gap-3"
                  style={{ background: tip.bg, border: `1px solid ${tip.border}` }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${tip.color}18` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: tip.color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-sm leading-tight mb-0.5" style={{ color: tip.color }}>
                      {tip.title}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {tip.tip}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Disclaimer */}
          <div className="rounded-2xl p-4 text-center"
            style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
            <p className="text-[11px] text-red-400/80 leading-relaxed font-medium">
              ⚠️ <strong className="text-red-400">Disclaimer:</strong> These tools are for entertainment and educational purposes only.
              Never invest money you cannot afford to lose. Gambling carries financial risk.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Premium;
