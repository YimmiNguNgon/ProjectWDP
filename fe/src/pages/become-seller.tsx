import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  ShieldCheck,
  BarChart2,
  Users,
  CreditCard,
  Tag,
  CheckCircle,
} from 'lucide-react';

const BENEFITS = [
  {
    icon: TrendingUp,
    title: 'Unlimited earning potential',
    desc: 'Sell to millions of buyers on the platform with no hard revenue cap.',
  },
  {
    icon: ShieldCheck,
    title: 'Seller protection',
    desc: 'Comprehensive policies help you operate with confidence and lower risk.',
  },
  {
    icon: BarChart2,
    title: 'Analytics dashboard',
    desc: 'Track revenue, orders, and buying trends with actionable insights.',
  },
  {
    icon: Users,
    title: 'Reach millions of buyers',
    desc: 'Your products are visible to active shoppers searching every day.',
  },
  {
    icon: CreditCard,
    title: 'Fast payouts',
    desc: 'Receive transparent payouts quickly with detailed transaction history.',
  },
  {
    icon: Tag,
    title: 'Marketing tools',
    desc: 'Create promotions, daily deals, and outlet offers to boost sales.',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Create your seller profile',
    desc: 'Provide your shop information and payout account details.',
  },
  {
    step: '02',
    title: 'Await approval',
    desc: 'Admin reviews your application within 1-3 business days.',
  },
  {
    step: '03',
    title: 'Start selling',
    desc: 'Your account is upgraded and you can publish your first listing.',
  },
];

const STATS = [
  { value: '10M+', label: 'Active buyers' },
  { value: '500K+', label: 'Successful sellers' },
  { value: '98%', label: 'Satisfaction rate' },
  { value: '24/7', label: 'Seller support' },
];

export default function BecomeSellerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBecomeSeller = () => {
    if (!user) {
      navigate('/auth/sign-in');
      return;
    }
    if (user.role === 'seller') {
      navigate('/seller');
      return;
    }
    navigate('/become-seller/apply');
  };

  const ctaLabel = user?.role === 'seller' ? 'Go to Seller Panel' : 'Become a Seller Today';

  return (
    <div className="flex flex-col gap-0 -mx-4 md:-mx-8">
      <section className="bg-primary text-primary-foreground py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-6">
          <Badge variant="secondary" className="text-sm px-4 py-1 rounded-full">
            Join a seller community of 500,000+ members
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Turn your passion into real income
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-xl leading-relaxed">
            Thousands of sellers earn extra income every day. Start your business journey now.
          </p>
          <Button
            id="hero-become-seller-btn"
            size="lg"
            variant="secondary"
            className="font-bold text-base px-8 cursor-pointer"
            onClick={handleBecomeSeller}
          >
            {ctaLabel}
          </Button>
          {!user && <p className="text-primary-foreground/60 text-sm -mt-2">Sign in is required to apply</p>}
        </div>
      </section>

      <section className="bg-muted py-10 px-6 border-y border-border">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold text-foreground">{s.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-6 bg-muted/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">Why sell with us?</h2>
            <p className="text-muted-foreground text-base">Everything you need to run a successful business</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="bg-background rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-background">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">Get started in 3 steps</h2>
            <p className="text-muted-foreground text-base">Simple and fast onboarding</p>
          </div>
          <div className="flex flex-col gap-0">
            {STEPS.map((s, idx) => (
              <div key={s.step}>
                <div className="flex items-start gap-5 py-6">
                  <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
                    {s.step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg mb-1">{s.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
                {idx < STEPS.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-muted/40">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-8">What do you get?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-10">
            {[
              'Full-featured seller dashboard',
              'Order and shipping management',
              'Promotion campaign tools',
              'Detailed revenue reports',
              'Direct support from our team',
              'Comprehensive seller protection',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 bg-background rounded-lg px-4 py-3 border border-border">
                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>
          <Button
            id="cta-become-seller-btn"
            size="lg"
            className="font-bold text-base px-10 cursor-pointer"
            onClick={handleBecomeSeller}
          >
            {ctaLabel}
          </Button>
          {!user && <p className="text-muted-foreground text-sm mt-3">Sign in is required to apply</p>}
        </div>
      </section>
    </div>
  );
}
