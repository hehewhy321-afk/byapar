import { Component, createSignal, onSettled, For, Show } from 'solid-js';
import { setCurrentPage } from '../../db/localDb';
import {
  SubscriptionPlan,
  fetchSubscriptionPlans,
  DEFAULT_PLANS,
} from '../../services/subscriptionService';

export const PricingPage: Component = () => {
  const [plans, setPlans] = createSignal<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [billingCycle, setBillingCycle] = createSignal<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = createSignal(true);
  const [activeFaq, setActiveFaq] = createSignal<number | null>(null);

  onSettled(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    loadPlans();
  });

  const loadPlans = async () => {
    try {
      const livePlans = await fetchSubscriptionPlans();
      if (livePlans && livePlans.length > 0) {
        setPlans(livePlans);
      }
    } catch (e) {
      console.warn('Using default plans:', e);
    } finally {
      setLoading(false);
    }
  };

  const getPrice = (plan: SubscriptionPlan) => {
    return billingCycle() === 'annual' ? plan.annual_price : plan.monthly_price;
  };

  const pricingFaqs = [
    {
      q: 'Is the Free Tier really free forever?',
      a: 'Yes, 100% free with zero hidden charges. Single-counter dukans can record unlimited sales, scan barcodes, print receipts, and maintain a full Khata ledger at no cost.',
    },
    {
      q: 'How does WhatsApp Khata reminder billing work?',
      a: 'On Starter, Pro, and Enterprise plans, you can send unlimited 1-click WhatsApp payment reminders with your personalized store Fonepay QR code directly to customers.',
    },
    {
      q: 'Can I pay using eSewa, Khalti, or Nepali Mobile Banking?',
      a: 'Yes. Upgrading to any paid tier takes under 60 seconds with instant online payment via eSewa and Fonepay QR. Your license activates instantly.',
    },
    {
      q: 'Can I switch or cancel my plan anytime?',
      a: 'Absolutely. You can switch between Monthly and Annual billing or upgrade your plan whenever your business expands into multiple branches.',
    },
  ];

  return (
    <div class="min-h-screen bg-[#FDFCF8] text-[#292524] font-sans antialiased selection:bg-[#FFB7B2]/30 softly-page relative overflow-x-hidden">
      
      {/* ─── GRAIN OVERLAY ─── */}
      <div class="softly-grain" aria-hidden="true">
        <svg>
          <filter id="softlyNoisePricing">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#softlyNoisePricing)" />
        </svg>
      </div>

      {/* ─── FLOATING BACKGROUND BLOBS ─── */}
      <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          class="softly-blob absolute top-10 left-1/4 w-[420px] h-[420px] opacity-50"
          style={{ background: '#FFE4E1', filter: 'blur(100px)' }}
        />
        <div
          class="softly-blob-reverse absolute top-80 right-1/4 w-[380px] h-[380px] opacity-40"
          style={{ background: '#E6E6FA', filter: 'blur(100px)' }}
        />
      </div>

      {/* ─── FLOATING PILL HEADER ─── */}
      <header
        class="fixed top-3 left-1/2 -translate-x-1/2 z-40 rounded-full px-4 sm:px-6 py-2.5 bg-white/75 backdrop-blur-[20px] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-stone-200/50"
        style={{ width: 'calc(100% - 32px)', 'max-width': '760px' }}
      >
        <div class="flex items-center justify-between">
          <div 
            class="flex items-center gap-2.5 cursor-pointer select-none"
            onClick={() => setCurrentPage('landing')}
          >
            <div class="w-7 h-7 rounded-full bg-[#FFB7B2] flex items-center justify-center shadow-sm">
              <div class="w-2 h-2 rounded-full bg-white" />
            </div>
            <span class="font-heading font-semibold text-sm text-[#292524] tracking-tight">
              Byapar
            </span>
          </div>

          <div class="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage('landing')}
              class="text-xs sm:text-sm font-heading font-medium text-[#78716C] hover:text-[#292524] transition-colors px-3 py-1.5 rounded-full"
            >
              ← Back to Home
            </button>
            <button
              onClick={() => setCurrentPage('auth')}
              class="text-xs sm:text-sm font-heading font-semibold text-white bg-[#292524] hover:bg-[#1c1917] px-4 sm:px-5 py-2 rounded-full transition-all active:scale-95 softly-cta-scale"
            >
              Start Free
            </button>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main class="relative z-10 max-w-6xl mx-auto px-6 pt-32 pb-24 space-y-20">
        
        {/* Intro */}
        <section class="space-y-5 text-center max-w-2xl mx-auto">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8EFE8] text-[#292524] text-xs font-heading font-medium">
            <span class="w-2 h-2 rounded-full bg-[#FFB7B2] animate-pulse" />
            Transparent Pricing for Nepal MSMEs
          </div>
          <h1 class="text-4xl sm:text-5xl md:text-6xl font-heading font-black tracking-tight text-[#292524] leading-[1.08]">
            Simple plans,{' '}
            <span class="font-cursive font-normal text-[#FFB7B2] inline-block rotate-[-2deg]">honest value</span>.
          </h1>
          <p class="text-base sm:text-lg text-[#78716C] leading-relaxed">
            Free forever for single-counter stores. Scale up to automated WhatsApp reminders, IRD VAT audits, and multi-store management whenever you're ready.
          </p>

          {/* Billing Cycle Switcher */}
          <div class="pt-4 flex items-center justify-center">
            <div class="inline-flex items-center bg-stone-100 p-1 rounded-full text-xs font-heading font-semibold">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                class={`px-5 py-2 rounded-full transition-all ${
                  billingCycle() === 'monthly'
                    ? 'bg-white text-[#292524] shadow-sm font-bold'
                    : 'text-[#78716C] hover:text-[#292524]'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                class={`px-5 py-2 rounded-full transition-all flex items-center gap-1.5 ${
                  billingCycle() === 'annual'
                    ? 'bg-white text-[#292524] shadow-sm font-bold'
                    : 'text-[#78716C] hover:text-[#292524]'
                }`}
              >
                <span>Annual Billing</span>
                <span class="text-[10px] bg-[#E8EFE8] text-[#292524] px-2 py-0.5 rounded-full font-bold">Save 20%</span>
              </button>
            </div>
          </div>
        </section>

        {/* Dynamic Pricing Cards Grid */}
        <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          <For each={plans()}>
            {(plan) => {
              const isPopular = plan.is_popular || plan.id === 'pro_99';
              const price = () => getPrice(plan);

              return (
                <div
                  class={`relative rounded-[2rem] p-7 flex flex-col justify-between transition-all duration-300 softly-card ${
                    isPopular
                      ? 'bg-white border-2 border-[#FFB7B2] shadow-xl shadow-[#FFB7B2]/15 scale-[1.02] z-10'
                      : 'bg-white border border-stone-100 hover:border-stone-200'
                  }`}
                >
                  {isPopular && (
                    <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#FFB7B2] text-white text-[11px] font-heading font-bold px-3.5 py-1 rounded-full shadow-sm uppercase tracking-wider">
                      {plan.badge_text || 'Most Popular'}
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div class="mb-4">
                      <h3 class="text-xl font-heading font-bold text-[#292524]">{plan.name}</h3>
                      <p class="text-xs text-[#78716C] mt-1.5 min-h-[36px] leading-relaxed">
                        {plan.description}
                      </p>
                    </div>

                    {/* Price Tag */}
                    <div class="py-4 border-y border-stone-100 my-4">
                      <div class="flex items-baseline gap-1">
                        <span class="text-3xl font-heading font-black text-[#292524]">
                          {price() === 0 ? 'Free' : `रु ${price()}`}
                        </span>
                        <span class="text-xs text-[#78716C] font-heading font-medium">
                          {price() === 0 ? '' : billingCycle() === 'annual' ? '/year' : '/month'}
                        </span>
                      </div>
                      <div class="text-[11px] text-stone-400 mt-1 font-heading">
                        {price() === 0 ? 'Zero cost forever' : billingCycle() === 'annual' ? 'Billed annually' : 'Billed monthly'}
                      </div>
                    </div>

                    {/* Feature Limits List */}
                    <div class="space-y-3 pt-2 text-xs text-[#78716C]">
                      <div class="flex items-center gap-2">
                        <span class="text-emerald-500 font-bold">✓</span>
                        <span class="text-[#292524] font-medium">Mobile App & Web (100% Free Access)</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-emerald-500 font-bold">✓</span>
                        <span class="text-[#292524] font-medium">App Lock & Biometric Security</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class={plan.id === 'free' ? "text-amber-600 font-bold" : "text-emerald-500 font-bold"}>
                          {plan.id === 'free' ? '−' : '✓'}
                        </span>
                        <span class={plan.id === 'free' ? "text-stone-400" : "text-[#292524] font-medium"}>
                          {plan.id === 'free'
                            ? 'Bill Image Upload: Not included'
                            : `Bill Image Upload: ${plan.daily_bill_upload_limit === -1 ? 'Unlimited' : `${plan.daily_bill_upload_limit}/day`}`}
                        </span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-emerald-500 font-bold">✓</span>
                        <span class="text-[#292524] font-medium">Notes & Reminders (Included Free)</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-emerald-500 font-bold">✓</span>
                        <span class="text-[#292524] font-medium">Automated WhatsApp Messaging</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-emerald-500 font-bold">✓</span>
                        <span class="text-[#292524] font-medium">
                          {plan.max_staff_accounts === -1 ? 'Unlimited' : `${plan.max_staff_accounts}`} Staff Account{plan.max_staff_accounts !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-emerald-500 font-bold">✓</span>
                        <span class="text-[#292524] font-medium">
                          {plan.max_stores_allowed === -1 ? 'Unlimited' : `${plan.max_stores_allowed}`} Store Branch{plan.max_stores_allowed !== 1 ? 'es' : ''}
                        </span>
                      </div>

                      {/* Dynamic Boolean Features */}
                      <div class="pt-2 border-t border-stone-100/60 space-y-2.5">
                        <div class="flex items-center gap-2">
                          <span class="text-emerald-500 font-bold">✓</span>
                          <span>Bluetooth & USB Thermal Printing</span>
                        </div>

                        <div class="flex items-center gap-2">
                          <span class="text-emerald-500 font-bold">✓</span>
                          <span>Customer & Supplier Khata</span>
                        </div>

                        <div class="flex items-center gap-2">
                          <span class="text-emerald-500 font-bold">✓</span>
                          <span>Detailed Sales & Profit Reports (PDF/Excel)</span>
                        </div>

                        <div class="flex items-center gap-2">
                          <span class={plan.features?.ird_vat_audit ? "text-emerald-500 font-bold" : "text-stone-300"}>
                            {plan.features?.ird_vat_audit ? '✓' : '−'}
                          </span>
                          <span class={plan.features?.ird_vat_audit ? "font-medium text-[#292524]" : "text-stone-400"}>
                            IRD VAT Audit & Official Tax Compliance
                          </span>
                        </div>

                        <div class="flex items-center gap-2">
                          <span class={plan.features?.multi_store ? "text-emerald-500 font-bold" : "text-stone-300"}>
                            {plan.features?.multi_store ? '✓' : '−'}
                          </span>
                          <span class={plan.features?.multi_store ? "font-medium text-[#292524]" : "text-stone-400"}>
                            Multi-Store Central View
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div class="pt-6 mt-6 border-t border-stone-100">
                    <button
                      onClick={() => setCurrentPage('auth')}
                      class={`w-full py-3 rounded-full text-xs font-heading font-semibold transition-all active:scale-95 softly-cta-scale ${
                        isPopular
                          ? 'bg-[#FFB7B2] hover:bg-[#E8948E] text-white shadow-md shadow-[#FFB7B2]/30'
                          : plan.id === 'free'
                          ? 'bg-[#292524] hover:bg-[#1c1917] text-white'
                          : 'bg-stone-100 hover:bg-stone-200 text-[#292524]'
                      }`}
                    >
                      {plan.id === 'free' ? 'Get Started Free' : 'Choose Plan'}
                    </button>
                  </div>
                </div>
              );
            }}
          </For>
        </section>

        {/* In-Detail Feature Comparison Table */}
        <section class="border-t border-stone-200/60 pt-16 space-y-8">
          <div class="text-center max-w-xl mx-auto">
            <h2 class="text-2xl sm:text-3xl font-heading font-bold text-[#292524]">
              Compare Features In Detail
            </h2>
            <p class="text-sm text-[#78716C] mt-2">
              Everything included across each tier, designed specifically for Nepali commerce.
            </p>
          </div>

          <div class="bg-white rounded-[2rem] border border-stone-100 overflow-hidden softly-card shadow-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-stone-100 bg-stone-50/60 text-[#292524] font-heading">
                    <th class="py-4 px-6 font-bold text-sm">Features & Capabilities</th>
                    <th class="py-4 px-4 font-bold text-center">Free Tier</th>
                    <th class="py-4 px-4 font-bold text-center">Starter</th>
                    <th class="py-4 px-4 font-bold text-center text-[#E8948E]">Pro Cloud</th>
                    <th class="py-4 px-4 font-bold text-center">Enterprise</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-stone-100/70 text-[#78716C]">
                  {/* Category: Platform Access */}
                  <tr class="bg-stone-50/40">
                    <td colspan="5" class="py-2.5 px-6 font-heading font-bold text-[11px] uppercase tracking-wider text-[#292524]">
                      Platform & Access
                    </td>
                  </tr>
                  <tr>
                    <td class="py-3 px-6 font-medium text-[#292524]">Mobile Android App & Web Access</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                  </tr>
                  <tr>
                    <td class="py-3 px-6 font-medium text-[#292524]">App Security Lock (PIN & Biometric)</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                  </tr>
                  <tr>
                    <td class="py-3 px-6 font-medium text-[#292524]">Real-Time Cloud Synchronization</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓</td>
                  </tr>

                  {/* Category: Uploads & Storage */}
                  <tr class="bg-stone-50/40">
                    <td colspan="5" class="py-2.5 px-6 font-heading font-bold text-[11px] uppercase tracking-wider text-[#292524]">
                      Bill Gallery & Image Uploads
                    </td>
                  </tr>
                  <tr>
                    <td class="py-3 px-6 font-medium text-[#292524]">Physical Bill & Receipt Image Uploads</td>
                    <td class="py-3 px-4 text-center text-stone-400 font-medium">Not Allowed (0)</td>
                    <td class="py-3 px-4 text-center font-bold text-[#292524]">15 bills / day</td>
                    <td class="py-3 px-4 text-center font-bold text-[#292524]">50 bills / day</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">Unlimited</td>
                  </tr>

                  {/* Category: Everyday Operations & Tools */}
                  <tr class="bg-stone-50/40">
                    <td colspan="5" class="py-2.5 px-6 font-heading font-bold text-[11px] uppercase tracking-wider text-[#292524]">
                      Everyday Shop Operations
                    </td>
                  </tr>
                  <tr>
                    <td class="py-3 px-6 font-medium text-[#292524]">Notes Taking & Business Scratchpad</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                  </tr>
                  <tr>
                    <td class="py-3 px-6 font-medium text-[#292524]">Payment & Task Reminders Center</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                  </tr>
                  <tr>
                    <td class="py-3 px-6 font-medium text-[#292524]">Automated WhatsApp Khata Reminder Drafts</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                  </tr>
                  <tr>
                    <td class="py-3 px-6 font-medium text-[#292524]">POS Billing & Thermal Receipt Printing</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓</td>
                  </tr>
                  <tr>
                    <td class="py-3 px-6 font-medium text-[#292524]">Customer & Vendor Khata Ledger</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓</td>
                  </tr>
                  <tr>
                    <td class="py-3 px-6 font-medium text-[#292524]">Personalized Fonepay QR on Bills</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓</td>
                  </tr>

                  {/* Category: Reports & Export */}
                  <tr class="bg-stone-50/40">
                    <td colspan="5" class="py-2.5 px-6 font-heading font-bold text-[11px] uppercase tracking-wider text-[#292524]">
                      Detailed Reports & Export
                    </td>
                  </tr>
                  <tr>
                    <td class="py-3 px-6 font-medium text-[#292524]">Reports in Detail (Sales, Profit/Loss, Daybook)</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                  </tr>
                  <tr>
                    <td class="py-3 px-6 font-medium text-[#292524]">Reports Export (PDF & Excel / CSV)</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓ </td>
                  </tr>

                  {/* Category: Enterprise & Scaling */}
                  <tr class="bg-stone-50/40">
                    <td colspan="5" class="py-2.5 px-6 font-heading font-bold text-[11px] uppercase tracking-wider text-[#292524]">
                      Scaling & Multi-Branch
                    </td>
                  </tr>
                  <tr>
                    <td class="py-3 px-6 font-medium text-[#292524]">Staff Accounts & Role Permissions</td>
                    <td class="py-3 px-4 text-center">1 Account</td>
                    <td class="py-3 px-4 text-center">2 Staff</td>
                    <td class="py-3 px-4 text-center font-bold text-[#292524]">5 Staff</td>
                    <td class="py-3 px-4 text-center">Unlimited</td>
                  </tr>
                  <tr>
                    <td class="py-3 px-6 font-medium text-[#292524]">Store Branches Allowed</td>
                    <td class="py-3 px-4 text-center">1 Store</td>
                    <td class="py-3 px-4 text-center">1 Store</td>
                    <td class="py-3 px-4 text-center font-bold text-[#292524]">2 Stores</td>
                    <td class="py-3 px-4 text-center">Up to 5 Stores</td>
                  </tr>
                  <tr>
                    <td class="py-3 px-6 font-medium text-[#292524]">IRD Compliant 13% VAT & Discounts</td>
                    <td class="py-3 px-4 text-center text-stone-300">−</td>
                    <td class="py-3 px-4 text-center text-stone-300">−</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">✓</td>
                  </tr>
                  <tr>
                    <td class="py-3 px-6 font-medium text-[#292524]">Priority Support Helpline</td>
                    <td class="py-3 px-4 text-center text-stone-400">Standard</td>
                    <td class="py-3 px-4 text-center text-stone-400">Standard</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold"> Priority</td>
                    <td class="py-3 px-4 text-center text-emerald-500 font-bold">Priority</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Pricing FAQs Accordion */}
        <section class="border-t border-stone-200/60 pt-16 space-y-6 max-w-3xl mx-auto">
          <div class="text-center mb-6">
            <h2 class="text-2xl sm:text-3xl font-heading font-bold text-[#292524]">
              Pricing Questions?
            </h2>
            <p class="text-sm text-[#78716C] mt-1 font-heading">
              Common questions from store owners across Nepal.
            </p>
          </div>

          <div class="space-y-3">
            <For each={pricingFaqs}>
              {(faq, idx) => (
                <div class="bg-white rounded-2xl border border-stone-100 overflow-hidden softly-card">
                  <button
                    onClick={() => setActiveFaq(activeFaq() === idx() ? null : idx())}
                    class="w-full text-left px-6 py-5 flex items-center justify-between text-[#292524] hover:text-[#78716C] transition-colors"
                  >
                    <span class="pr-4 font-heading font-medium text-sm sm:text-base">{faq.q}</span>
                    <span class={`softly-faq-icon text-[#FFB7B2] text-xl font-light shrink-0 ${activeFaq() === idx() ? 'is-open' : ''}`}>
                      +
                    </span>
                  </button>

                  <div class={`softly-accordion-body ${activeFaq() === idx() ? 'is-open' : ''}`}>
                    <div class="softly-accordion-inner">
                      <div class="px-6 pb-6 text-sm text-[#78716C] leading-relaxed">
                        {faq.a}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </section>

        {/* Conversion Bottom Card */}
        <section class="bg-white rounded-[2rem] border border-stone-100 p-8 sm:p-12 text-center space-y-4 softly-card max-w-2xl mx-auto">
          <div class="w-12 h-12 bg-[#292524] rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <div class="w-2.5 h-2.5 rounded-full bg-[#FFB7B2]" />
          </div>
          <h3 class="text-2xl sm:text-3xl font-heading font-bold text-[#292524]">
            Start free today, upgrade whenever you need.
          </h3>
          <p class="text-sm text-[#78716C] max-w-md mx-auto">
            No credit card needed. Set up your store in 2 minutes.
          </p>
          <div class="pt-3">
            <button
              onClick={() => setCurrentPage('auth')}
              class="px-8 py-3.5 bg-[#FFB7B2] hover:bg-[#E8948E] text-white font-heading font-semibold text-sm rounded-full transition-all active:scale-95 shadow-md shadow-[#FFB7B2]/30 softly-cta-scale"
            >
              Get Started Free →
            </button>
          </div>
        </section>

      </main>

      {/* ─── FOOTER ─── */}
      <footer class="py-12 px-6 border-t border-stone-100 bg-white/50 text-xs text-[#78716C] font-heading">
        <div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span class="font-bold text-[#292524]">Byapar</span> • Smart Business Management for Nepal MSMEs
          </div>
          <div class="flex items-center gap-6">
            <button onClick={() => setCurrentPage('landing')} class="hover:text-[#292524] transition-colors">Home</button>
            <button onClick={() => setCurrentPage('about')} class="hover:text-[#292524] transition-colors">About Us</button>
            <button onClick={() => setCurrentPage('faq')} class="hover:text-[#292524] transition-colors">FAQ</button>
            <button onClick={() => setCurrentPage('privacy')} class="hover:text-[#292524] transition-colors">Privacy</button>
            <button onClick={() => setCurrentPage('terms')} class="hover:text-[#292524] transition-colors">Terms</button>
          </div>
        </div>
      </footer>

    </div>
  );
};
