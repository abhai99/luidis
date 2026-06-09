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
  Brain,
  Moon
} from 'lucide-react';
import { defaultPages } from '@/lib/defaultContent';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const Index = () => {
  const { user, signIn, subscription } = useAuth();

  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Get instant access to premium predictions and insights with real-time updates.'
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Your data is protected with enterprise-grade security and encryption.'
    },
    {
      icon: TrendingUp,
      title: 'Accurate Predictions',
      description: 'Access our AI-powered prediction engine with 95%+ accuracy rate.'
    },
    {
      icon: Clock,
      title: '24/7 Support',
      description: 'Round-the-clock customer support to help you whenever you need.'
    },
    {
      icon: Users,
      title: 'Active Community',
      description: 'Join thousands of premium members sharing insights and strategies.'
    },
    {
      icon: Star,
      title: 'Exclusive Content',
      description: 'Get access to premium content not available to free users.'
    }
  ];

  const weeklyFeatures = [
    'All premium predictions',
    '7-day access',
    'Basic support',
    'Community access'
  ];

  const monthlyFeatures = [
    'All premium predictions',
    '30-day access',
    'Priority support',
    'VIP community access',
    'Exclusive insights',
    'Early access to new features'
  ];

  // CMS State
  const [pages, setPages] = useState<{ [key: string]: { title: string, content: string } }>({});

  // Price State
  const [prices, setPrices] = useState({ weekly: 99, monthly: 299 });

  useEffect(() => {
    const fetchContent = async () => {
      try {
        // Fetch CMS Content
        const cmsDoc = await getDoc(doc(db, 'content', 'pages'));
        if (cmsDoc.exists()) {
          setPages(cmsDoc.data() as any);
        }

        // Fetch Prices (Added)
        const priceDoc = await getDoc(doc(db, 'config', 'prices'));
        if (priceDoc.exists()) {
          setPrices(priceDoc.data() as any);
        }

      } catch (error) {
        console.error("Error fetching content/prices:", error);
      }
    };
    fetchContent();
  }, []);

  return (
    <div className="min-h-screen gradient-hero">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-24 pb-32 px-4 md:pt-32"> {/* Added padding for bottom nav */}
        <div className="container mx-auto max-w-lg">

          {user ? (
            /* --- LOGGED IN APP DASHBOARD --- */
            <div className="animate-fade-in space-y-6 text-left">
              {/* 1. Header Card */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Welcome back,</p>
                  <h1 className="text-2xl font-bold text-foreground">{user.displayName?.split(' ')[0] || 'Boss'}</h1>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Crown className={`w-5 h-5 ${subscription.isSubscribed ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                </div>
              </div>

              {/* 2. Status Card */}
              <div className={`p-4 rounded-2xl border ${subscription.isSubscribed ? 'bg-gradient-to-br from-primary/20 to-purple-500/10 border-primary/50' : 'bg-card border-border'} shadow-soft relative overflow-hidden`}>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Crown className="w-24 h-24" />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${subscription.isSubscribed ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                    <span className="text-xs font-bold tracking-wider uppercase opacity-70">Current Plan</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-1">
                    {subscription.isSubscribed
                      ? (subscription.plan === 'weekly' ? 'Weekly VIP' : 'Monthly Boss')
                      : 'Free Guest'
                    }
                  </h2>
                  {subscription.isSubscribed ? (
                    <p className="text-sm opacity-80">Valid until {subscription.expiresAt?.toLocaleDateString()}</p>
                  ) : (
                    <div className="mt-3">
                      <Button size="sm" variant="premium" className="w-full" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
                        Upgrade Now
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Quick Actions / Tools Grid */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <div className="w-1 h-5 bg-primary rounded-full" />
                  Prediction Tools
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* We will render the buttons here instead of valid section */}
                  {/* Note: In a real refactor we should move the buttons logic here, but for now 
                            I will just let the user scroll down or I'll Move the logic up.
                            Actually, let's keep the logic below but LINK to it or duplicate?
                            Better: Move the CMS Buttons logic UP here for logged in users.
                        */}
                  <Button variant="outline" className="h-24 flex flex-col gap-2 rounded-2xl border-dashed" onClick={() => document.getElementById('resources')?.scrollIntoView({ behavior: 'smooth' })}>
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <ArrowRight className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <span>Open Tools Grid</span>
                  </Button>
                </div>
              </div>

            </div>
          ) : (
            /* --- GUEST/FREE VIEW (Keep Landing Page style but cleaner) --- */
            <div className="text-center animate-fade-in">
              <div className="inline-flex items-center gap-2 gradient-accent px-4 py-2 rounded-full text-accent-foreground text-sm font-semibold mb-6 shadow-gold">
                <Crown className="w-4 h-4" />
                Premium Predictions Platform
              </div>

              <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
                Unlock Your Winning
                <span className="text-gradient-primary"> Potential</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                Join thousands of winners who trust WingoBoss.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button id="google-btn" variant="google" size="lg" onClick={signIn} className="w-full sm:w-auto">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
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

      {/* CMS Content Buttons Section */}
      <section id="resources" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-12">
            Exclusive <span className="text-gradient-primary">Resources</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((num) => {
              const key = `page${num}`;
              // Fallback Logic: Check CMS, then Default
              const cmsPage = pages[key as keyof typeof pages];
              const defPage = defaultPages[key as keyof typeof defaultPages];

              // Merge: CMS takes priority, but fallback to default if missing/empty
              const pageData = {
                title: cmsPage?.title || defPage?.title,
                content: cmsPage?.content || defPage?.content
              };

              // Logic: If title exists AND content exists -> Active.
              // Pages 1-5 are native built-in secure prediction tools, so they are always active.
              const isNativeTool = [1, 2, 3, 4, 5].includes(num);
              const isActive = isNativeTool || !!(pageData?.title && pageData?.content);
              const title = pageData?.title || `Tool ${num}`;

              return (
                <div key={num} className="animate-fade-in">
                  <Button
                    variant={isActive ? "default" : "secondary"}
                    className={`w-full h-24 text-lg font-bold shadow-lg transition-all hover:scale-105 ${isActive ? 'bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90' : 'opacity-80'
                      }`}
                    onClick={() => {
                      if (!subscription.isSubscribed) {
                        // Scroll to pricing if not subscribed
                        toast.info("Please subscribe to access this content.");
                        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                        return;
                      }

                      if (isActive) {
                        window.open(`/content/${num}`, '_self'); // Or navigate using hook
                      } else {
                        toast.info('Coming Soon! Stay tuned.');
                      }
                    }}
                  >
                    {isActive ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2">
                          <span>{title}</span>
                          {!subscription.isSubscribed && <Lock className="w-3 h-3 text-white/70" />}
                        </div>
                        <span className="text-xs font-normal opacity-80">
                          {subscription.isSubscribed ? 'Click to Access' : 'Subscribe to Unlock'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-muted-foreground">{title}</span>
                        <span className="text-xs font-normal opacity-50">Coming Soon</span>
                      </div>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
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
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="gradient-premium rounded-3xl p-12 text-center shadow-elevated">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Ready to Start Winning?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Join thousands of winners and get access to premium predictions today.
            </p>
            <Button variant="premium" size="lg" onClick={() => !user ? signIn() : document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>
              {user ? 'Get Premium Now' : 'Sign Up & Get Started'}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground text-sm">
            © 2024 WingoBoss. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
