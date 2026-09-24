import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import {
  items,
  parties,
  cart,
  addToCart,
  updateCartQuantity,
  clearCart,
  cartSubtotal,
  cartDiscount,
  cartTaxAmount,
  cartTotal,
  pricingTier,
  setPricingTier,
  checkoutInvoice,
  settings,
} from '../db/localDb';
import { formatNepaliCurrency, Item, Invoice } from '@byapar/core';
import { currentLang } from '../services/i18n';
import { FonepayModal } from './FonepayModal';
import { ReceiptModal } from './ReceiptModal';
import { IconSearch, IconX, IconPos, IconAccounts, IconQrCode, IconNotebook, IconPlus } from './icons';

export const PosView: Component = () => {
  const [searchQuery, setSearchQuery] = createSignal('');
  const [selectedCategory, setSelectedCategory] = createSignal<string>('all');
  const [selectedPartyId, setSelectedPartyId] = createSignal<string>('');
  const [tenderCash, setTenderCash] = createSignal<number>(0);
  const [activeInvoice, setActiveInvoice] = createSignal<Invoice | null>(null);
  const [showFonepayModal, setShowFonepayModal] = createSignal(false);

  const filteredItems = createMemo(() => {
    const q = searchQuery().toLowerCase().trim();
    return items.filter((item) => {
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.barcode && item.barcode.includes(q));
      return matchSearch;
    });
  });

  const handleSearchKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const matches = filteredItems();
      if (matches.length > 0) {
        addToCart(matches[0]);
        setSearchQuery('');
      }
    }
  };

  const changeDue = createMemo(() => {
    const total = cartTotal();
    const tendered = tenderCash();
    return tendered > total ? tendered - total : 0;
  });

  const setExactTender = () => setTenderCash(cartTotal());
  const addTender = (amt: number) => setTenderCash((c) => c + amt);

  const handleCashCheckout = async () => {
    if (cart.length === 0) return;
    const inv = await checkoutInvoice({
      paymentMode: 'cash',
      partyId: selectedPartyId() || undefined,
      paidAmount: cartTotal(),
    });
    setActiveInvoice(inv);
    setTenderCash(0);
  };

  const handleCreditCheckout = async () => {
    if (cart.length === 0) return;
    if (!selectedPartyId()) {
      alert('Please select a customer for credit sales!');
      return;
    }
    const inv = await checkoutInvoice({
      paymentMode: 'credit',
      partyId: selectedPartyId(),
      paidAmount: 0,
    });
    setActiveInvoice(inv);
    setTenderCash(0);
  };

  const handleFonepayTrigger = () => {
    if (cart.length === 0) return;
    setShowFonepayModal(true);
  };

  const handleFonepaySuccess = async () => {
    setShowFonepayModal(false);
    const inv = await checkoutInvoice({
      paymentMode: 'fonepay_qr',
      partyId: selectedPartyId() || undefined,
      paidAmount: cartTotal(),
    });
    setActiveInvoice(inv);
    setTenderCash(0);
  };

  return (
    <div class="p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fade-in">
      {/* LEFT: Product Catalog */}
      <div class="lg:col-span-7 flex flex-col gap-4">
        {/* Search Bar */}
        <div class="stat-card flex items-center gap-3 !p-3">
          <IconSearch class="w-4 h-4 text-gray-400 dark:text-neutral-500 shrink-0 ml-1" />
          <input
            type="text"
            placeholder={currentLang() === 'ne' ? 'सामान खोज्नुहोस् वा बारकोड स्क्यान गर्नुहोस्...' : 'Search product or scan barcode (Enter to add)...'}
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            onKeyDown={handleSearchKeyDown}
            class="w-full bg-transparent border-none text-gray-900 dark:text-white text-sm focus:outline-none placeholder:text-gray-400 dark:placeholder:text-neutral-500 font-medium"
            autofocus
          />
          {searchQuery() && (
            <button
              onClick={() => setSearchQuery('')}
              class="text-gray-400 hover:text-gray-600 dark:hover:text-white px-2"
            >
              <IconX class="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Pricing Tier */}
        <div class="flex items-center justify-between bg-white dark:bg-black p-2.5 rounded-xl border border-gray-100 dark:border-neutral-800">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-gray-500 dark:text-neutral-400">{currentLang() === 'ne' ? 'मूल्य दर:' : 'Price Tier:'}</span>
            <div class="flex bg-gray-100 dark:bg-neutral-900 p-0.5 rounded-lg">
              <button
                onClick={() => setPricingTier('retail')}
                class={`px-3 py-1 rounded-md text-xs font-bold transition ${
                  pricingTier() === 'retail'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-white'
                }`}
              >
                Retail MRP
              </button>
              <button
                onClick={() => setPricingTier('wholesale')}
                class={`px-3 py-1 rounded-md text-xs font-bold transition ${
                  pricingTier() === 'wholesale'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-white'
                }`}
              >
                Wholesale
              </button>
            </div>
          </div>
          <span class="text-xs text-gray-500 dark:text-neutral-400">
            {currentLang() === 'ne' ? 'कुल सामान:' : 'Total Items:'} <span class="font-bold text-gray-900 dark:text-white">{filteredItems().length}</span>
          </span>
        </div>

        {/* Items Grid */}
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
          <For each={filteredItems()}>
            {(item) => {
              const activePrice =
                pricingTier() === 'wholesale' && item.wholesalePrice
                  ? item.wholesalePrice
                  : item.sellingPrice;
              const isLow = item.currentStock <= item.lowStockThreshold;

              return (
                <div
                  onClick={() => addToCart(item)}
                  class="group stat-card hover:border-brand-400/50 cursor-pointer transition-all duration-150 flex flex-col justify-between active:scale-[0.98]"
                >
                  <div>
                    <div class="flex justify-between items-start gap-1 mb-1">
                      <span class="text-[10px] font-mono text-gray-400 dark:text-neutral-400 bg-gray-50 dark:bg-neutral-900 px-1.5 py-0.5 rounded border border-transparent dark:border-neutral-800">
                        {item.barcode || 'NO-BARCODE'}
                      </span>
                      <span
                        class={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isLow
                            ? 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/40'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {currentLang() === 'ne' ? 'स्टक:' : 'Stock:'} {item.currentStock}
                      </span>
                    </div>
                    <h4 class="font-bold text-xs text-gray-800 dark:text-neutral-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 line-clamp-2 leading-tight">
                      {item.name}
                    </h4>
                  </div>

                  <div class="mt-3 pt-2 border-t border-gray-50 dark:border-neutral-800 flex items-baseline justify-between">
                    <div>
                      <span class="text-sm font-extrabold text-brand-600 dark:text-brand-400">
                        {formatNepaliCurrency(activePrice)}
                      </span>
                      {pricingTier() === 'wholesale' && (
                        <span class="block text-[9px] text-gray-400 dark:text-neutral-500 line-through">
                          MRP: {item.mrp}
                        </span>
                      )}
                    </div>
                    <span class="text-xs bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 w-6 h-6 rounded-full flex items-center justify-center font-bold">
                      +
                    </span>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>

      {/* RIGHT: Cart */}
      <div class="lg:col-span-5 flex flex-col gap-4">
        <div class="stat-card flex flex-col h-full justify-between !p-4">
          <div>
            <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800 mb-3">
              <div class="flex items-center gap-2">
                <IconPos class="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <h3 class="font-bold text-sm text-gray-900 dark:text-white">{currentLang() === 'ne' ? 'कार्ट' : 'Current Cart'}</h3>
                <span class="text-xs bg-brand-600 text-white font-bold px-2 py-0.5 rounded-full">
                  {cart.length}
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  class="text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 transition font-medium"
                >
                  {currentLang() === 'ne' ? 'खाली गर्नुहोस्' : 'Clear Cart'}
                </button>
              )}
            </div>

            {/* Customer Selector */}
            <div class="mb-3">
              <label class="block text-[11px] font-semibold text-gray-500 dark:text-neutral-400 mb-1">
                {currentLang() === 'ne' ? 'ग्राहक / खाता:' : 'Customer / Account:'}
              </label>
              <select
                value={selectedPartyId()}
                onChange={(e) => setSelectedPartyId(e.currentTarget.value)}
                class="input-field text-xs"
              >
                <option value="">{currentLang() === 'ne' ? '-- नगद बिक्री (गल्ली ग्राहक) --' : '-- Walk-in Customer (Cash Sale) --'}</option>
                <For each={parties.filter((p) => p.partyType !== 'supplier')}>
                  {(party) => (
                    <option value={party.id}>
                      {party.name} {party.currentBalance > 0 ? `(Balance: Rs. ${party.currentBalance})` : ''}
                    </option>
                  )}
                </For>
              </select>
            </div>

            {/* Cart Items */}
            <div class="space-y-2 max-h-[220px] overflow-y-auto pr-1 mb-4 divide-y divide-gray-50 dark:divide-neutral-800/60">
              <For each={cart}>
                {(item) => (
                  <div class="pt-2 flex items-center justify-between gap-2">
                    <div class="flex-1">
                      <h5 class="text-xs font-semibold text-gray-900 dark:text-white leading-tight">{item.name}</h5>
                      <span class="text-[10px] text-gray-400 dark:text-neutral-400">
                        {formatNepaliCurrency(item.selectedPrice)} × {item.cartQuantity}
                      </span>
                    </div>
                    <div class="flex items-center gap-1.5 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 px-2 py-1 rounded-lg">
                      <button
                        onClick={() => updateCartQuantity(item.id, -1)}
                        class="text-gray-400 hover:text-gray-700 dark:hover:text-white font-bold text-xs px-1"
                      >
                        -
                      </button>
                      <span class="text-xs font-bold text-gray-900 dark:text-white px-1 font-mono">
                        {item.cartQuantity}
                      </span>
                      <button
                        onClick={() => updateCartQuantity(item.id, 1)}
                        class="text-gray-400 hover:text-gray-700 dark:hover:text-white font-bold text-xs px-1"
                      >
                        +
                      </button>
                    </div>
                    <span class="text-xs font-bold text-brand-600 dark:text-brand-400 min-w-[65px] text-right">
                      {formatNepaliCurrency(item.lineTotal)}
                    </span>
                  </div>
                )}
              </For>

              {cart.length === 0 && (
                <div class="py-8 text-center text-gray-400 dark:text-neutral-500 text-xs">
                  Cart is empty. Select products from the left to add.
                </div>
              )}
            </div>
          </div>

          {/* Bill Summary & Checkout */}
          <div class="border-t border-gray-100 dark:border-neutral-800 pt-3 space-y-3">
            <div class="space-y-1 text-xs">
              <div class="flex justify-between text-gray-500 dark:text-neutral-400">
                <span>{currentLang() === 'ne' ? 'जोडफल:' : 'Subtotal:'}</span>
                <span class="text-gray-800 dark:text-neutral-200">{formatNepaliCurrency(cartSubtotal())}</span>
              </div>
              {cartTaxAmount() > 0 && (
                <div class="flex justify-between text-gray-500 dark:text-neutral-400">
                  <span>{currentLang() === 'ne' ? '१३% भ्याट:' : '13% VAT Included:'}</span>
                  <span class="text-gray-800 dark:text-neutral-200">{formatNepaliCurrency(cartTaxAmount())}</span>
                </div>
              )}
              <div class="flex justify-between text-sm font-black text-gray-900 dark:text-white pt-1 border-t border-gray-100 dark:border-neutral-800">
                <span>{currentLang() === 'ne' ? 'जम्मा रकम:' : 'Total Payable:'}</span>
                <span class="text-brand-600 dark:text-brand-400 text-base">{formatNepaliCurrency(cartTotal())}</span>
              </div>
            </div>

            {/* Cash Tender */}
            {cart.length > 0 && (
              <div class="bg-gray-50 dark:bg-neutral-900 p-2.5 rounded-xl border border-gray-100 dark:border-neutral-800 space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-gray-500 dark:text-neutral-400 font-semibold">{currentLang() === 'ne' ? 'नगद पाइयो:' : 'Cash Tendered:'}</span>
                  <div class="flex items-center gap-1">
                    <span class="text-gray-400 dark:text-neutral-500">Rs.</span>
                    <input
                      type="number"
                      value={tenderCash() || ''}
                      onInput={(e) => setTenderCash(Number(e.currentTarget.value))}
                      placeholder={cartTotal().toString()}
                      class="w-24 bg-white dark:bg-black border border-gray-200 dark:border-neutral-800 text-right text-gray-900 dark:text-white font-bold text-xs rounded px-1.5 py-1 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-4 gap-1.5 text-[10px] font-bold">
                  <button onClick={() => addTender(100)} class="bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-600 dark:text-neutral-200 py-1 rounded transition">+100</button>
                  <button onClick={() => addTender(500)} class="bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-600 dark:text-neutral-200 py-1 rounded transition">+500</button>
                  <button onClick={() => addTender(1000)} class="bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-600 dark:text-neutral-200 py-1 rounded transition">+1000</button>
                  <button onClick={setExactTender} class="bg-brand-50 dark:bg-brand-950/50 hover:bg-brand-100 dark:hover:bg-brand-900/50 text-brand-600 dark:text-brand-400 py-1 rounded transition">{currentLang() === 'ne' ? 'ठ्याक्कै' : 'Exact'}</button>
                </div>

                {changeDue() > 0 && (
                  <div class="flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span>{currentLang() === 'ne' ? 'फिर्ता रकम:' : 'Change Return:'}</span>
                    <span>{formatNepaliCurrency(changeDue())}</span>
                  </div>
                )}
              </div>
            )}

            {/* Checkout Buttons */}
            <div class="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={handleCashCheckout}
                disabled={cart.length === 0}
                class="py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs shadow-sm flex flex-col items-center justify-center transition active:scale-95"
              >
                <div class="flex items-center gap-1">
                  <IconAccounts class="w-3.5 h-3.5" />
                  <span>{currentLang() === 'ne' ? 'नगद' : 'Cash'}</span>
                </div>
                <span class="text-[10px] font-normal opacity-80">{currentLang() === 'ne' ? 'तुरुन्तै भुक्तानी' : 'Instant Pay'}</span>
              </button>
              <button
                onClick={handleFonepayTrigger}
                disabled={cart.length === 0}
                class="py-2.5 bg-red-500 hover:bg-red-400 disabled:opacity-40 text-white font-bold rounded-xl text-xs shadow-sm flex flex-col items-center justify-center transition active:scale-95"
              >
                <div class="flex items-center gap-1">
                  <IconQrCode class="w-3.5 h-3.5" />
                  <span>Fonepay</span>
                </div>
                <span class="text-[10px] font-normal opacity-80">{currentLang() === 'ne' ? 'QR भुक्तानी' : 'Dynamic QR'}</span>
              </button>
              <button
                onClick={handleCreditCheckout}
                disabled={cart.length === 0}
                class="py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white font-bold rounded-xl text-xs shadow-sm flex flex-col items-center justify-center transition active:scale-95"
              >
                <div class="flex items-center gap-1">
                  <IconNotebook class="w-3.5 h-3.5" />
                  <span>{currentLang() === 'ne' ? 'उधारो' : 'Credit'}</span>
                </div>
                <span class="text-[10px] font-normal opacity-80">{currentLang() === 'ne' ? 'खाता बाँकी' : 'Khata Due'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Show when={showFonepayModal()}>
        <FonepayModal
          amount={cartTotal()}
          invoiceNumber={`INV-TEMP-${Date.now().toString().slice(-4)}`}
          onSuccess={handleFonepaySuccess}
          onClose={() => setShowFonepayModal(false)}
        />
      </Show>
      <Show when={activeInvoice()}>
        {(inv) => (
          <ReceiptModal
            invoice={inv()}
            onClose={() => setActiveInvoice(null)}
          />
        )}
      </Show>
    </div>
  );
};
