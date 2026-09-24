import { Component, createSignal, For, Show } from 'solid-js';
import {
  getMerchantBranding,
  updateMerchantBranding,
  getShopsList,
  MerchantBrandingItem,
  ShopSummary,
} from '../services/adminApi';

export const MerchantBrandingView: Component = () => {
  const [shops, setShops] = createSignal<ShopSummary[]>([]);
  const [brandings, setBrandings] = createSignal<MerchantBrandingItem[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [selectedShopId, setSelectedShopId] = createSignal('');
  const [saving, setSaving] = createSignal(false);
  const [notification, setNotification] = createSignal<string | null>(null);

  // Form Fields
  const [receiptTemplate, setReceiptTemplate] = createSignal('classic_nepali');
  const [accentColor, setAccentColor] = createSignal('#FF4500');
  const [subdomain, setSubdomain] = createSignal('ramaul');
  const [qrHeader, setQrHeader] = createSignal('Scan & Pay with FonePay / eSewa');
  const [footerText, setFooterText] = createSignal('धन्यवाद! फेरी भेटौला। (Thank You, Visit Again)');

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [sData, bData] = await Promise.all([getShopsList(), getMerchantBranding()]);
      setShops(sData);
      setBrandings(bData);

      if (sData.length > 0) {
        selectShop(sData[0].id, bData);
      }
    } catch (err) {
      console.error('Failed to load branding data:', err);
    } finally {
      setLoading(false);
    }
  };

  queueMicrotask(() => loadData());

  const selectShop = (shopId: string, bList = brandings()) => {
    setSelectedShopId(shopId);
    const existing = bList.find((b) => b.businessId === shopId);
    if (existing) {
      setReceiptTemplate(existing.receiptTemplate);
      setAccentColor(existing.accentColor);
      setSubdomain(existing.customSubdomain || '');
      setQrHeader(existing.qrHeaderText || 'Scan & Pay with FonePay');
      setFooterText(existing.receiptFooterText || 'धन्यवाद! फेरी भेटौला।');
    } else {
      const s = shops().find((x) => x.id === shopId);
      setSubdomain(s?.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'kirana');
    }
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    setSaving(true);
    const ok = await updateMerchantBranding({
      businessId: selectedShopId(),
      receiptTemplate: receiptTemplate(),
      accentColor: accentColor(),
      customSubdomain: subdomain().trim().toLowerCase() || undefined,
      qrHeaderText: qrHeader(),
      receiptFooterText: footerText(),
    });
    setSaving(false);

    if (ok) {
      showToast('Merchant receipt branding saved successfully!');
      const updated = await getMerchantBranding();
      setBrandings(updated);
    } else {
      showToast('Failed to save branding.');
    }
  };

  const currentShop = () => shops().find((s) => s.id === selectedShopId());

  return (
    <div class="space-y-6">
      {/* Toast Notification */}
      <Show when={notification()}>
        <div class="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm animate-fade-in border border-gray-700">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{notification()}</span>
        </div>
      </Show>

      {/* Header */}
      <div class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-orange-100 text-[#FF4500] border border-orange-200 uppercase tracking-wider">
              White-Label & Print
            </span>
            <span class="text-xs text-gray-500 font-mono">Phase 3 Engine</span>
          </div>
          <h2 class="text-xl font-bold text-gray-900 mt-2 font-heading">
            White-Label Branding & Thermal Receipts
          </h2>
          <p class="text-sm text-gray-500 mt-1 max-w-2xl">
            Configure custom 58mm / 80mm thermal receipts, Nepali bilingual bill layouts, brand accent styling, and merchant store web slugs.
          </p>
        </div>
      </div>

      {/* Content Layout: Form & Live Thermal Preview */}
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Configuration Form */}
        <div class="lg:col-span-7 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1.5">
              Select Store to Customize
            </label>
            <select
              value={selectedShopId()}
              onChange={(e) => selectShop(e.currentTarget.value)}
              class="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF4500]/20 focus:border-[#FF4500]"
            >
              <For each={shops()}>
                {(s) => (
                  <option value={s.id}>
                    {s.name} ({s.address || 'Nepal'})
                  </option>
                )}
              </For>
            </select>
          </div>

          <form onSubmit={handleSave} class="space-y-4 text-xs">
            {/* Template Selector */}
            <div>
              <label class="block font-semibold text-gray-700 mb-1.5">Receipt Paper & Layout Template</label>
              <div class="grid grid-cols-2 gap-2">
                <For
                  each={[
                    { id: 'classic_nepali', name: 'Classic Nepali Bilingual' },
                    { id: 'thermal_58mm', name: '58mm Thermal (Pocket POS)' },
                    { id: 'thermal_80mm', name: '80mm Thermal (Counter POS)' },
                    { id: 'vat_official', name: 'Official IRD VAT Register' },
                  ]}
                >
                  {(tmpl) => (
                    <button
                      type="button"
                      onClick={() => setReceiptTemplate(tmpl.id)}
                      class={`p-3 rounded-xl border text-left transition ${
                        receiptTemplate() === tmpl.id
                          ? 'border-[#FF4500] bg-orange-50/50 text-[#FF4500] font-bold shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {tmpl.name}
                    </button>
                  )}
                </For>
              </div>
            </div>

            {/* Custom Subdomain Slug */}
            <div>
              <label class="block font-semibold text-gray-700 mb-1">Store Web Catalog Slug</label>
              <div class="flex items-center">
                <span class="px-3 py-2 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-gray-500 font-mono text-xs">
                  https://
                </span>
                <input
                  type="text"
                  placeholder="store-name"
                  value={subdomain()}
                  onInput={(e) => setSubdomain(e.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  class="flex-1 px-3 py-2 border border-gray-200 font-mono text-xs focus:ring-2 focus:ring-[#FF4500]/20 focus:border-[#FF4500]"
                />
                <span class="px-3 py-2 bg-gray-100 border border-l-0 border-gray-200 rounded-r-xl text-gray-500 font-mono text-xs">
                  .byapar.app
                </span>
              </div>
            </div>

            {/* Brand Color */}
            <div>
              <label class="block font-semibold text-gray-700 mb-1">Brand Theme Accent Color</label>
              <div class="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor()}
                  onInput={(e) => setAccentColor(e.currentTarget.value)}
                  class="w-10 h-10 p-1 border border-gray-200 rounded-xl cursor-pointer"
                />
                <input
                  type="text"
                  value={accentColor()}
                  onInput={(e) => setAccentColor(e.currentTarget.value)}
                  class="w-32 px-3 py-2 border border-gray-200 rounded-xl font-mono text-xs"
                />
              </div>
            </div>

            {/* QR Header Text */}
            <div>
              <label class="block font-semibold text-gray-700 mb-1">QR Code Banner Title</label>
              <input
                type="text"
                value={qrHeader()}
                onInput={(e) => setQrHeader(e.currentTarget.value)}
                class="w-full px-3 py-2 border border-gray-200 rounded-xl"
              />
            </div>

            {/* Footer Text */}
            <div>
              <label class="block font-semibold text-gray-700 mb-1">Receipt Footer Note (Bilingual)</label>
              <textarea
                rows="2"
                value={footerText()}
                onInput={(e) => setFooterText(e.currentTarget.value)}
                class="w-full px-3 py-2 border border-gray-200 rounded-xl resize-none"
              />
            </div>

            <div class="pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={saving()}
                class="px-6 py-2.5 font-bold text-white bg-[#FF4500] hover:bg-[#E03E00] rounded-xl transition shadow-md flex items-center gap-2"
              >
                {saving() ? 'Applying...' : 'Save & Deploy Branding ✨'}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Realistic Thermal Receipt Paper Preview */}
        <div class="lg:col-span-5 flex flex-col items-center">
          <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Live Thermal Paper Simulation ({receiptTemplate() === 'thermal_58mm' ? '58mm' : '80mm'})
          </div>

          <div class="w-full max-w-xs bg-[#fdfdfb] border border-gray-300 rounded-lg p-5 shadow-xl font-mono text-[11px] text-gray-800 space-y-3 border-dashed relative">
            <div class="text-center pb-2 border-b border-dashed border-gray-300">
              <div class="font-black text-sm uppercase tracking-wide text-gray-900">
                {currentShop()?.name || 'KIRANA STORE'}
              </div>
              <div class="text-[10px] text-gray-500 mt-0.5">{currentShop()?.address || 'Kathmandu, Nepal'}</div>
              <div class="text-[10px] text-gray-500">PAN: {currentShop()?.panNumber || '302918274'}</div>
              <div class="text-[9px] text-gray-400 mt-1">Tax Invoice • #{Math.floor(1000 + Math.random() * 9000)}</div>
            </div>

            {/* Items Table Mock */}
            <div class="space-y-1 text-[10px]">
              <div class="flex justify-between font-bold border-b border-gray-200 pb-0.5">
                <span>ITEM</span>
                <span>QTY</span>
                <span>TOTAL</span>
              </div>
              <div class="flex justify-between">
                <span>Wai Wai Quick 75g</span>
                <span>2</span>
                <span>Rs. 60</span>
              </div>
              <div class="flex justify-between">
                <span>Aashirvaad Atta 5kg</span>
                <span>1</span>
                <span>Rs. 540</span>
              </div>
              <div class="flex justify-between">
                <span>Dairy Milk 20g</span>
                <span>3</span>
                <span>Rs. 150</span>
              </div>
            </div>

            <div class="border-t border-dashed border-gray-300 pt-2 space-y-0.5 text-[11px]">
              <div class="flex justify-between font-semibold">
                <span>Subtotal:</span>
                <span>Rs. 750</span>
              </div>
              <div class="flex justify-between text-[10px] text-gray-500">
                <span>Discount:</span>
                <span>- Rs. 0</span>
              </div>
              <div class="flex justify-between font-black text-xs text-gray-900 pt-1 border-t border-gray-200">
                <span>GRAND TOTAL:</span>
                <span style={{ color: accentColor() }}>Rs. 750</span>
              </div>
            </div>

            {/* QR Mock */}
            <div class="text-center pt-2 border-t border-dashed border-gray-300">
              <div class="text-[9px] font-bold text-gray-600 mb-1">{qrHeader()}</div>
              <div class="w-20 h-20 bg-gray-900 mx-auto rounded-lg flex items-center justify-center p-1 text-white text-[8px] tracking-tighter text-center">
                [ FONEPAY DYNAMIC QR ]
              </div>
            </div>

            {/* Footer */}
            <div class="text-center text-[10px] text-gray-500 pt-2 border-t border-dashed border-gray-300">
              {footerText()}
              <div class="text-[8px] text-gray-400 mt-1">Powered by Byapar OS</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
