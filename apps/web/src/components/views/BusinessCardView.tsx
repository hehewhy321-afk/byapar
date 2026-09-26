import { Component, createSignal, createMemo, Show, For } from 'solid-js';
import { currentBusiness } from '../../db/localDb';
import { currentLang } from '../../services/i18n';
import {
  IconBusinessCard,
  IconMapPin,
  IconPhone,
  IconWhatsApp,
  IconDownload,
  IconShare,
  IconPrint,
  IconCheck,
  IconSparkles,
  IconShield,
} from '../icons';

type CardTemplate = 'minimalist' | 'nepali_heritage' | 'glassmorphism' | 'executive' | 'vibrant_retail';
type CardColor = 'emerald' | 'sapphire' | 'violet' | 'ruby' | 'gold' | 'onyx';

interface ColorPreset {
  key: CardColor;
  label: string;
  primary: string;
  secondary: string;
  accent: string;
  gradient: string;
}

const COLOR_PRESETS: ColorPreset[] = [
  {
    key: 'emerald',
    label: 'Emerald Kirana',
    primary: '#059669',
    secondary: '#064e3b',
    accent: '#34d399',
    gradient: 'from-emerald-700 via-emerald-800 to-emerald-950',
  },
  {
    key: 'sapphire',
    label: 'Sapphire Trust',
    primary: '#2563eb',
    secondary: '#1e3a8a',
    accent: '#60a5fa',
    gradient: 'from-blue-700 via-blue-800 to-blue-950',
  },
  {
    key: 'violet',
    label: 'Imperial Violet',
    primary: '#7c3aed',
    secondary: '#4c1d95',
    accent: '#a78bfa',
    gradient: 'from-purple-700 via-purple-800 to-purple-950',
  },
  {
    key: 'ruby',
    label: 'Ruby Heritage',
    primary: '#dc2626',
    secondary: '#881337',
    accent: '#f87171',
    gradient: 'from-rose-700 via-red-800 to-stone-950',
  },
  {
    key: 'gold',
    label: 'Amber Gold',
    primary: '#d97706',
    secondary: '#78350f',
    accent: '#fbbf24',
    gradient: 'from-amber-600 via-amber-800 to-stone-950',
  },
  {
    key: 'onyx',
    label: 'Onyx Executive',
    primary: '#27272a',
    secondary: '#09090b',
    accent: '#e4e4e7',
    gradient: 'from-neutral-800 via-neutral-900 to-black',
  },
];

export const BusinessCardView: Component = () => {
  // Form State
  const [storeName, setStoreName] = createSignal(currentBusiness.name || 'Apna Kirana Pasal');
  const [ownerName, setOwnerName] = createSignal(currentBusiness.ownerName || 'Ram Bahadur Shrestha');
  const [tagline, setTagline] = createSignal('Wholesale & Retail Groceries at Best Prices');
  const [phone, setPhone] = createSignal(currentBusiness.phone || '9800000000');
  const [whatsapp, setWhatsapp] = createSignal(currentBusiness.phone || '9800000000');
  const [email, setEmail] = createSignal((currentBusiness as any).email || 'contact@kirana.np');
  const [address, setAddress] = createSignal(currentBusiness.address || 'Kathmandu, Nepal');
  const [pan, setPan] = createSignal(currentBusiness.pan || '600000000');

  // Customization State
  const [selectedTemplate, setSelectedTemplate] = createSignal<CardTemplate>('minimalist');
  const [selectedColor, setSelectedColor] = createSignal<CardColor>('emerald');
  const [cardSide, setCardSide] = createSignal<'front' | 'back'>('front');
  const [downloading, setDownloading] = createSignal(false);
  const [downloadSuccess, setDownloadSuccess] = createSignal(false);

  const activeColor = createMemo(() => {
    return COLOR_PRESETS.find((c) => c.key === selectedColor()) || COLOR_PRESETS[0];
  });

  const templates: { id: CardTemplate; title: string; desc: string }[] = [
    {
      id: 'minimalist',
      title: 'Modern Minimalist',
      desc: 'Clean geometric layout with sharp typography and accent stripe',
    },
    {
      id: 'nepali_heritage',
      title: 'Nepali Heritage Kirana',
      desc: 'Traditional motif framing with royal tones & heritage authenticity',
    },
    {
      id: 'glassmorphism',
      title: 'Tech Glassmorphism',
      desc: 'Translucent frosted glass with glowing dual mesh gradients',
    },
    {
      id: 'executive',
      title: 'Corporate Executive',
      desc: 'Prestigious corporate aesthetic with metallic accents and crest badge',
    },
    {
      id: 'vibrant_retail',
      title: 'Vibrant Retailer',
      desc: 'High-contrast retail layout with prominent phone & WhatsApp pills',
    },
  ];

  // Canvas Image Exporter (1050 x 600px - Standard 3.5:2 High-DPI ratio)
  const downloadCardImage = () => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1050;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const c = activeColor();
      const t = selectedTemplate();
      const isFront = cardSide() === 'front';

      // Background
      if (t === 'minimalist') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1050, 600);

        // Accent header stripe
        ctx.fillStyle = c.primary;
        ctx.fillRect(0, 0, 1050, 16);

        // Left accent bar
        ctx.fillStyle = c.primary;
        ctx.fillRect(0, 16, 24, 584);

        // Watermark circle
        ctx.fillStyle = c.primary + '10';
        ctx.beginPath();
        ctx.arc(950, 500, 220, 0, Math.PI * 2);
        ctx.fill();

        // Card typography
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 44px sans-serif';
        ctx.fillText(storeName(), 80, 100);

        ctx.fillStyle = c.primary;
        ctx.font = '600 22px sans-serif';
        ctx.fillText(tagline(), 80, 140);

        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(80, 170);
        ctx.lineTo(970, 170);
        ctx.stroke();

        // Owner Info
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText(ownerName(), 80, 240);

        ctx.fillStyle = '#6b7280';
        ctx.font = '20px sans-serif';
        ctx.fillText('Authorized Proprietor', 80, 275);

        // Contact info table
        ctx.fillStyle = '#374151';
        ctx.font = '500 22px sans-serif';
        ctx.fillText(`📍 Address: ${address()}`, 80, 360);
        ctx.fillText(`📞 Phone: +977 ${phone()}`, 80, 410);
        ctx.fillText(`💬 WhatsApp: +977 ${whatsapp()}`, 80, 460);
        ctx.fillText(`✉️ Email: ${email()}`, 80, 510);

        // PAN Badge
        ctx.fillStyle = c.primary + '15';
        ctx.fillRect(720, 470, 250, 55);
        ctx.fillStyle = c.primary;
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(`PAN: ${pan()}`, 750, 505);
      } else if (t === 'nepali_heritage') {
        // Heritage Gradient
        const grad = ctx.createLinearGradient(0, 0, 1050, 600);
        grad.addColorStop(0, '#500724');
        grad.addColorStop(0.5, '#881337');
        grad.addColorStop(1, '#1c1917');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1050, 600);

        // Golden Double Border
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        ctx.strokeRect(30, 30, 990, 540);
        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(38, 38, 974, 524);

        // Store Header
        ctx.fillStyle = '#fef3c7';
        ctx.font = 'bold 46px serif';
        ctx.fillText(storeName(), 75, 115);

        ctx.fillStyle = '#fcd34d';
        ctx.font = 'italic 24px serif';
        ctx.fillText(tagline(), 75, 160);

        // Owner info
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText(ownerName(), 75, 255);

        ctx.fillStyle = '#fde68a';
        ctx.font = '20px sans-serif';
        ctx.fillText('प्रोप्राइटर / सञ्चालक', 75, 290);

        // Contacts
        ctx.fillStyle = '#f3f4f6';
        ctx.font = '22px sans-serif';
        ctx.fillText(`स्थान: ${address()}`, 75, 370);
        ctx.fillText(`सम्पर्क: ${phone()} / ${whatsapp()}`, 75, 420);
        ctx.fillText(`इमेल: ${email()}`, 75, 470);

        // PAN stamp
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.strokeRect(700, 440, 270, 65);
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 24px monospace';
        ctx.fillText(`PAN/VAT: ${pan()}`, 720, 482);
      } else {
        // Dark & Rich Gradient for Glassmorphism/Executive/Vibrant
        const grad = ctx.createLinearGradient(0, 0, 1050, 600);
        grad.addColorStop(0, c.secondary);
        grad.addColorStop(0.7, '#0f172a');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1050, 600);

        // Decorative Glow Orbs
        ctx.fillStyle = c.primary + '33';
        ctx.beginPath();
        ctx.arc(880, 150, 240, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = c.accent + '66';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, 1010, 560);

        // Content
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 46px sans-serif';
        ctx.fillText(storeName(), 70, 110);

        ctx.fillStyle = c.accent;
        ctx.font = '600 22px sans-serif';
        ctx.fillText(tagline(), 70, 150);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText(ownerName(), 70, 250);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '20px sans-serif';
        ctx.fillText('Authorized Kirana Retailer', 70, 285);

        ctx.fillStyle = '#f1f5f9';
        ctx.font = '22px sans-serif';
        ctx.fillText(`📍 ${address()}`, 70, 370);
        ctx.fillText(`📞 Phone: +977 ${phone()}`, 70, 420);
        ctx.fillText(`💬 WhatsApp: +977 ${whatsapp()}`, 70, 470);

        // PAN Pill
        ctx.fillStyle = c.primary;
        ctx.fillRect(720, 440, 260, 60);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px monospace';
        ctx.fillText(`PAN: ${pan()}`, 750, 478);
      }

      // Convert to PNG Download
      const link = document.createElement('a');
      link.download = `${storeName().replace(/\s+/g, '_')}_Business_Card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to export business card image:', err);
    } finally {
      setDownloading(false);
    }
  };

  // WhatsApp Share Handler
  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(
      `🏪 *${storeName()}*\n` +
        `_${tagline()}_\n\n` +
        `👤 *Contact:* ${ownerName()}\n` +
        `📍 *Location:* ${address()}\n` +
        `📞 *Phone:* +977 ${phone()}\n` +
        `💬 *WhatsApp:* https://wa.me/977${whatsapp().replace(/\D/g, '')}\n` +
        `✉️ *Email:* ${email()}\n` +
        `🏢 *PAN/VAT:* ${pan()}\n\n` +
        `_Digital Business Card powered by Byapar Retail OS_`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div class="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header */}
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-heading font-bold text-gray-900 dark:text-white">
              {currentLang() === 'ne' ? 'डिजिटल भिजिटिङ कार्ड स्टुडियो' : 'Digital Business Card Studio'}
            </h1>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/60">
              5 Templates
            </span>
          </div>
          <p class="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
            {currentLang() === 'ne'
              ? 'आफ्नो पसलको आकर्षक भिजिटिङ कार्ड बनाउनुहोस्, डाउनलोड गर्नुहोस् र ह्वाट्सएपमा सेयर गर्नुहोस्'
              : 'Design premium business cards with 5 customizable templates & instant WhatsApp export'}
          </p>
        </div>

        <div class="flex items-center gap-2.5">
          <button
            class="btn-outline text-xs flex items-center gap-1.5"
            onClick={handlePrint}
            title="Print Card"
          >
            <IconPrint class="w-4 h-4" />
            <span>{currentLang() === 'ne' ? 'प्रिन्ट' : 'Print'}</span>
          </button>

          <button
            class="btn-outline !border-emerald-500 !text-emerald-600 dark:!text-emerald-400 hover:!bg-emerald-50 dark:hover:!bg-emerald-950/30 text-xs flex items-center gap-1.5"
            onClick={shareOnWhatsApp}
            title="Share via WhatsApp"
          >
            <IconWhatsApp class="w-4 h-4" />
            <span>{currentLang() === 'ne' ? 'ह्वाट्सएप सेयर' : 'Share WhatsApp'}</span>
          </button>

          <button
            class="btn-primary text-xs flex items-center gap-1.5"
            onClick={downloadCardImage}
            disabled={downloading()}
          >
            <Show when={downloadSuccess()} fallback={<IconDownload class="w-4 h-4" />}>
              <IconCheck class="w-4 h-4 text-emerald-300" />
            </Show>
            <span>
              {downloading()
                ? (currentLang() === 'ne' ? 'तयार हुँदै...' : 'Generating...')
                : downloadSuccess()
                ? (currentLang() === 'ne' ? 'डाउनलोड भयो!' : 'Downloaded!')
                : (currentLang() === 'ne' ? 'कार्ड डाउनलोड' : 'Download PNG')}
            </span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Editor & Customization Controls */}
        <div class="lg:col-span-5 space-y-6">
          {/* Template Selector */}
          <div class="stat-card space-y-3 !p-5">
            <label class="block text-xs font-bold text-gray-700 dark:text-neutral-200">
              {currentLang() === 'ne' ? '१. कार्ड टेम्प्लेट छान्नुहोस् (५ उत्कृष्ट डिजाइन)' : '1. Select Card Template (5 Unique Designs)'}
            </label>
            <div class="grid grid-cols-1 gap-2">
              <For each={templates}>
                {(t) => (
                  <button
                    type="button"
                    class={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-3 ${
                      selectedTemplate() === t.id
                        ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-900 dark:text-brand-100 ring-2 ring-brand-500/20 shadow-sm'
                        : 'border-gray-200 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900/60'
                    }`}
                    onClick={() => setSelectedTemplate(t.id)}
                  >
                    <div>
                      <p class="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                        {t.title}
                        <Show when={selectedTemplate() === t.id}>
                          <span class="w-1.5 h-1.5 rounded-full bg-brand-500" />
                        </Show>
                      </p>
                      <p class="text-[11px] text-gray-500 dark:text-neutral-400 mt-0.5">{t.desc}</p>
                    </div>
                    <Show when={selectedTemplate() === t.id}>
                      <IconCheck class="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
                    </Show>
                  </button>
                )}
              </For>
            </div>
          </div>

          {/* Color Palettes */}
          <div class="stat-card space-y-3 !p-5">
            <label class="block text-xs font-bold text-gray-700 dark:text-neutral-200">
              {currentLang() === 'ne' ? '२. रङ थिम (Dynamic Palette)' : '2. Dynamic Color Palette'}
            </label>
            <div class="grid grid-cols-3 gap-2.5">
              <For each={COLOR_PRESETS}>
                {(color) => (
                  <button
                    type="button"
                    class={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                      selectedColor() === color.key
                        ? 'border-gray-900 dark:border-white shadow-sm ring-1 ring-gray-900/20'
                        : 'border-gray-200 dark:border-neutral-800 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedColor(color.key)}
                  >
                    <span
                      class="w-4 h-4 rounded-full shrink-0 shadow-sm"
                      style={{ "background-color": color.primary }}
                    />
                    <span class="text-[11px] font-semibold text-gray-800 dark:text-neutral-200 truncate">
                      {color.label.split(' ')[0]}
                    </span>
                  </button>
                )}
              </For>
            </div>
          </div>

          {/* Business Details Form */}
          <div class="stat-card space-y-4 !p-5">
            <h3 class="font-bold text-xs text-gray-900 dark:text-white uppercase tracking-wider">
              {currentLang() === 'ne' ? '३. पसल विवरण सम्पादन' : '3. Edit Business Details'}
            </h3>

            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                  {currentLang() === 'ne' ? 'पसलको नाम' : 'Shop / Business Name *'}
                </label>
                <input
                  type="text"
                  value={storeName()}
                  onInput={(e) => setStoreName(e.currentTarget.value)}
                  class="input-field text-xs"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                  {currentLang() === 'ne' ? 'सञ्चालक / प्रोप्राइटरको नाम' : 'Proprietor / Contact Name'}
                </label>
                <input
                  type="text"
                  value={ownerName()}
                  onInput={(e) => setOwnerName(e.currentTarget.value)}
                  class="input-field text-xs"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                  {currentLang() === 'ne' ? 'ट्यागलाइन / नारा' : 'Tagline / Slogan'}
                </label>
                <input
                  type="text"
                  value={tagline()}
                  onInput={(e) => setTagline(e.currentTarget.value)}
                  placeholder="e.g. Quality Kirana Goods at Fair Prices"
                  class="input-field text-xs"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                    {currentLang() === 'ne' ? 'फोन नम्बर' : 'Phone Number'}
                  </label>
                  <input
                    type="text"
                    value={phone()}
                    onInput={(e) => setPhone(e.currentTarget.value)}
                    class="input-field text-xs"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                    {currentLang() === 'ne' ? 'ह्वाट्सएप नम्बर' : 'WhatsApp Number'}
                  </label>
                  <input
                    type="text"
                    value={whatsapp()}
                    onInput={(e) => setWhatsapp(e.currentTarget.value)}
                    class="input-field text-xs"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                    {currentLang() === 'ne' ? 'इमेल' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    value={email()}
                    onInput={(e) => setEmail(e.currentTarget.value)}
                    class="input-field text-xs"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                    {currentLang() === 'ne' ? 'पान / भ्याट नम्बर' : 'PAN / VAT Number'}
                  </label>
                  <input
                    type="text"
                    value={pan()}
                    onInput={(e) => setPan(e.currentTarget.value)}
                    class="input-field text-xs"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                  {currentLang() === 'ne' ? 'ठेगाना' : 'Store Address'}
                </label>
                <input
                  type="text"
                  value={address()}
                  onInput={(e) => setAddress(e.currentTarget.value)}
                  class="input-field text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Card Canvas Studio */}
        <div class="lg:col-span-7 space-y-6 lg:sticky lg:top-6">
          <div class="stat-card !p-6 space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800">
              <span class="text-xs font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <IconSparkles class="w-4 h-4 text-amber-500" />
                {currentLang() === 'ne' ? 'प्रत्यक्ष कार्ड पूर्वावलोकन' : 'Live Interactive Preview'}
              </span>
              <span class="text-[11px] font-mono text-gray-400 dark:text-neutral-400">
                Standard 3.5" x 2.0" (HD 300 DPI)
              </span>
            </div>

            {/* Business Card Render Component */}
            <div class="py-4 flex justify-center">
              {/* Card Container */}
              <div
                class={`w-full max-w-[520px] aspect-[3.5/2] rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300 flex flex-col justify-between ${
                  selectedTemplate() === 'minimalist'
                    ? 'bg-white dark:bg-neutral-950 text-gray-900 dark:text-white border-2 border-gray-100 dark:border-neutral-800'
                    : selectedTemplate() === 'nepali_heritage'
                    ? 'bg-gradient-to-br from-rose-950 via-red-900 to-stone-950 text-amber-50 border-4 border-amber-500/70 shadow-amber-950/40'
                    : selectedTemplate() === 'glassmorphism'
                    ? `bg-gradient-to-br ${activeColor().gradient} text-white border border-white/20 backdrop-blur-xl shadow-cyan-900/20`
                    : selectedTemplate() === 'executive'
                    ? 'bg-gradient-to-br from-slate-900 via-neutral-950 to-black text-white border border-amber-500/40 shadow-xl'
                    : `bg-gradient-to-br ${activeColor().gradient} text-white border border-white/10 shadow-xl`
                }`}
              >
                {/* Decorative Elements depending on Template */}
                <Show when={selectedTemplate() === 'minimalist'}>
                  <div
                    class="absolute top-0 left-0 right-0 h-2.5"
                    style={{ "background-color": activeColor().primary }}
                  />
                  <div
                    class="absolute top-2.5 left-0 bottom-0 w-2.5"
                    style={{ "background-color": activeColor().primary }}
                  />
                  <div
                    class="absolute -right-16 -bottom-16 w-52 h-52 rounded-full opacity-5 pointer-events-none"
                    style={{ "background-color": activeColor().primary }}
                  />
                </Show>

                <Show when={selectedTemplate() === 'nepali_heritage'}>
                  <div class="absolute inset-1.5 border border-amber-400/40 rounded-xl pointer-events-none" />
                  <div class="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-amber-500/10 pointer-events-none" />
                </Show>

                <Show when={selectedTemplate() === 'glassmorphism'}>
                  <div class="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-cyan-400/20 blur-2xl pointer-events-none" />
                  <div class="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-purple-500/20 blur-2xl pointer-events-none" />
                </Show>

                {/* Card Header */}
                <div class="relative z-10 flex items-start justify-between gap-3">
                  <div>
                    <span
                      class={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full ${
                        selectedTemplate() === 'minimalist'
                          ? 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300'
                          : 'bg-white/15 backdrop-blur-sm text-white'
                      }`}
                    >
                      {selectedTemplate() === 'nepali_heritage'
                        ? 'नेपाली किराना पसल'
                        : 'Certified Retail Store'}
                    </span>
                    <h2 class="text-xl sm:text-2xl font-bold font-heading mt-1 leading-tight tracking-tight">
                      {storeName()}
                    </h2>
                    <p
                      class={`text-[11px] mt-0.5 line-clamp-1 ${
                        selectedTemplate() === 'minimalist'
                          ? 'text-gray-500 dark:text-neutral-400'
                          : 'text-white/80'
                      }`}
                    >
                      {tagline()}
                    </p>
                  </div>

                  <div
                    class="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shadow-md shrink-0"
                    style={{
                      "background-color":
                        selectedTemplate() === 'minimalist' ? activeColor().primary : 'rgba(255,255,255,0.2)',
                      color: '#ffffff',
                    }}
                  >
                    {storeName().slice(0, 2).toUpperCase() || 'BY'}
                  </div>
                </div>

                {/* Card Middle: Owner Details */}
                <div class="relative z-10 my-2">
                  <p class="text-sm font-bold leading-tight">{ownerName()}</p>
                  <p
                    class={`text-[10px] ${
                      selectedTemplate() === 'minimalist'
                        ? 'text-gray-500 dark:text-neutral-400'
                        : 'text-white/70'
                    }`}
                  >
                    Authorized Proprietor / सञ्चालक
                  </p>
                </div>

                {/* Card Footer: Contacts & PAN */}
                <div class="relative z-10 pt-2 border-t border-black/5 dark:border-white/10 flex items-end justify-between gap-2 text-[10px]">
                  <div class="space-y-1">
                    <div class="flex items-center gap-1.5 opacity-90">
                      <IconMapPin class="w-3 h-3 shrink-0" />
                      <span class="line-clamp-1">{address()}</span>
                    </div>
                    <div class="flex items-center gap-3">
                      <div class="flex items-center gap-1.5 opacity-90">
                        <IconPhone class="w-3 h-3 shrink-0" />
                        <span>+977 {phone()}</span>
                      </div>
                      <div class="flex items-center gap-1.5 opacity-90">
                        <IconWhatsApp class="w-3 h-3 shrink-0 text-emerald-400" />
                        <span>{whatsapp()}</span>
                      </div>
                    </div>
                  </div>

                  <Show when={pan()}>
                    <div
                      class={`px-2 py-1 rounded-md font-mono text-[10px] font-bold shrink-0 ${
                        selectedTemplate() === 'minimalist'
                          ? 'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-neutral-200'
                          : 'bg-black/30 backdrop-blur-sm text-white border border-white/10'
                      }`}
                    >
                      PAN: {pan()}
                    </div>
                  </Show>
                </div>
              </div>
            </div>

            {/* Quick Share Banner */}
            <div class="p-3 rounded-xl bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <IconWhatsApp class="w-4 h-4 text-emerald-500" />
                <span class="text-gray-600 dark:text-neutral-300">
                  {currentLang() === 'ne' ? 'ग्राहकहरूलाई ह्वाट्सएपमा तुरुन्त पठाउनुहोस्' : 'Send store card directly to customers on WhatsApp'}
                </span>
              </div>
              <button
                class="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                onClick={shareOnWhatsApp}
              >
                {currentLang() === 'ne' ? 'सेयर गर्नुहोस्' : 'Share Now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
