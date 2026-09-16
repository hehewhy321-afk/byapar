import { Component, createSignal, createMemo, For } from 'solid-js';
import { items, setItems, persistState, currentBusiness, categories } from '../db/localDb';
import { formatNepaliCurrency, Item, CATEGORY_PRESETS, BusinessType } from '@byapar/core';
import { supabase } from '../db/auth';
import { IconPlus, IconSearch, IconX } from './icons';

export const InventoryView: Component = () => {
  const [searchQuery, setSearchQuery] = createSignal('');
  const [showAddModal, setShowAddModal] = createSignal(false);

  const [name, setName] = createSignal('');
  const [category, setCategory] = createSignal('General');
  const [barcode, setBarcode] = createSignal('');
  const [mrp, setMrp] = createSignal<number>(0);
  const [sellingPrice, setSellingPrice] = createSignal<number>(0);
  const [wholesalePrice, setWholesalePrice] = createSignal<number>(0);
  const [purchaseCost, setPurchaseCost] = createSignal<number>(0);
  const [currentStock, setCurrentStock] = createSignal<number>(0);
  const [lowStockThreshold, setLowStockThreshold] = createSignal<number>(5);

  const categorySuggestions = createMemo(() => {
    if (categories && categories.length > 0) {
      return categories.map((c) => c.name);
    }
    const bType = (currentBusiness.businessType || 'general') as BusinessType;
    return CATEGORY_PRESETS[bType] || CATEGORY_PRESETS.general;
  });

  const totalStockCount = createMemo(() => items.reduce((acc, i) => acc + i.currentStock, 0));
  const lowStockCount = createMemo(() => items.filter((i) => i.currentStock <= i.lowStockThreshold).length);
  const inventoryValueCost = createMemo(() => items.reduce((acc, i) => acc + (i.purchaseCost || i.sellingPrice * 0.85) * i.currentStock, 0));
  const inventoryValueRetail = createMemo(() => items.reduce((acc, i) => acc + i.sellingPrice * i.currentStock, 0));

  const filteredItems = createMemo(() => {
    const q = searchQuery().toLowerCase().trim();
    return items.filter((i) => !q || i.name.toLowerCase().includes(q) || (i.barcode && i.barcode.includes(q)));
  });

  const handleCreateItem = (e: Event) => {
    e.preventDefault();
    if (!name() || sellingPrice() <= 0) return;

    const matchedCat = categories.find((c) => c.name.toLowerCase() === category().toLowerCase());
    const newItemId = crypto.randomUUID();
    const bizId = currentBusiness.id;

    const newItem: Item = {
      id: newItemId,
      businessId: bizId,
      categoryId: matchedCat?.id,
      name: name(),
      barcode: barcode() || `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      mrp: mrp() || sellingPrice(),
      sellingPrice: sellingPrice(),
      wholesalePrice: wholesalePrice() || sellingPrice(),
      purchaseCost: purchaseCost() || sellingPrice() * 0.85,
      currentStock: currentStock(),
      lowStockThreshold: lowStockThreshold(),
      taxRate: 13.0,
      isTaxInclusive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setItems((draft) => { draft.unshift(newItem); });
    persistState();

    // Cloud insert to Supabase
    supabase
      .from('items')
      .insert({
        id: newItem.id,
        business_id: bizId,
        category_id: matchedCat?.id || null,
        name: newItem.name,
        barcode: newItem.barcode,
        mrp: newItem.mrp,
        selling_price: newItem.sellingPrice,
        wholesale_price: newItem.wholesalePrice,
        purchase_cost: newItem.purchaseCost,
        current_stock: newItem.currentStock,
        low_stock_threshold: newItem.lowStockThreshold,
      })
      .then(({ error }) => {
        if (error) console.error('Cloud item insert error:', error);
      });

    setShowAddModal(false);
    setName('');
    setCategory('General');
    setBarcode('');
    setMrp(0);
    setSellingPrice(0);
    setWholesalePrice(0);
    setPurchaseCost(0);
    setCurrentStock(0);
  };

  const handleQuickAdjustStock = (itemId: string, delta: number) => {
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx >= 0) {
      setItems((draft) => { draft[idx].currentStock = Math.max(0, draft[idx].currentStock + delta); });
      persistState();
    }
  };

  return (
    <div class="p-4 space-y-4 animate-fade-in">
      {/* Top Metrics */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="stat-card">
          <span class="text-xs text-gray-500 dark:text-neutral-400 font-semibold block uppercase">Total Products</span>
          <span class="text-2xl font-black text-gray-900 dark:text-white mt-1 block">{items.length} SKUs</span>
          <span class="text-[11px] text-gray-400 dark:text-neutral-500">Total units: {totalStockCount()}</span>
        </div>
        <div class="stat-card">
          <span class="text-xs text-gray-500 dark:text-neutral-400 font-semibold block uppercase">Low Stock Alerts</span>
          <span class="text-2xl font-black text-amber-500 mt-1 block">{lowStockCount()} Items</span>
          <span class="text-[11px] text-amber-400/80">Reorder recommended</span>
        </div>
        <div class="stat-card">
          <span class="text-xs text-gray-500 dark:text-neutral-400 font-semibold block uppercase">Inventory Cost Value</span>
          <span class="text-2xl font-black text-brand-600 dark:text-brand-400 mt-1 block">{formatNepaliCurrency(inventoryValueCost())}</span>
          <span class="text-[11px] text-gray-400 dark:text-neutral-500">Total capital invested</span>
        </div>
        <div class="stat-card">
          <span class="text-xs text-gray-500 dark:text-neutral-400 font-semibold block uppercase">Retail Sales Value</span>
          <span class="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block">{formatNepaliCurrency(inventoryValueRetail())}</span>
          <span class="text-[11px] text-gray-400 dark:text-neutral-500">Projected gross value</span>
        </div>
      </div>

      {/* Search & Add */}
      <div class="stat-card flex flex-wrap items-center justify-between gap-3 !p-3">
        <div class="w-full sm:w-80 relative">
          <input
            type="text"
            placeholder="Search by product name or barcode..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            class="input-field text-xs pl-8"
          />
          <IconSearch class="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <button onClick={() => setShowAddModal(true)} class="btn-primary text-xs flex items-center gap-1.5">
          <IconPlus class="w-3.5 h-3.5" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Inventory Table */}
      <div class="stat-card overflow-hidden !p-0">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-gray-50 dark:bg-neutral-900 text-gray-500 dark:text-neutral-400 uppercase font-semibold text-[10px] border-b border-gray-100 dark:border-neutral-800">
              <tr>
                <th class="p-3">Product Name</th>
                <th class="p-3">Barcode</th>
                <th class="p-3 text-right">Cost Price</th>
                <th class="p-3 text-right">Wholesale</th>
                <th class="p-3 text-right">Selling Price</th>
                <th class="p-3 text-center">Stock</th>
                <th class="p-3 text-center">Adjust</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 dark:divide-neutral-800/60 text-gray-600 dark:text-neutral-300">
              <For each={filteredItems()}>
                {(item) => {
                  const isLow = item.currentStock <= item.lowStockThreshold;
                  return (
                    <tr class="hover:bg-gray-50 dark:hover:bg-neutral-900/60 transition">
                      <td class="p-3 font-bold text-gray-900 dark:text-white">{item.name}</td>
                      <td class="p-3 font-mono text-gray-400 dark:text-neutral-400 text-[11px]">{item.barcode}</td>
                      <td class="p-3 text-right text-gray-400 dark:text-neutral-500">{formatNepaliCurrency(item.purchaseCost || 0)}</td>
                      <td class="p-3 text-right text-blue-600 dark:text-blue-400 font-medium">{formatNepaliCurrency(item.wholesalePrice || item.sellingPrice)}</td>
                      <td class="p-3 text-right font-black text-brand-600 dark:text-brand-400">{formatNepaliCurrency(item.sellingPrice)}</td>
                      <td class="p-3 text-center">
                        <span class={`font-black px-2 py-0.5 rounded text-[11px] ${
                          isLow ? 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/40' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {item.currentStock}
                        </span>
                      </td>
                      <td class="p-3 text-center">
                        <div class="inline-flex items-center gap-1 bg-gray-50 dark:bg-neutral-900 p-1 rounded-lg border border-gray-100 dark:border-neutral-800">
                          <button onClick={() => handleQuickAdjustStock(item.id, -5)} class="px-1.5 py-0.5 bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 dark:text-neutral-300 rounded font-bold text-[10px] border border-gray-100 dark:border-neutral-800" title="Subtract 5">-5</button>
                          <button onClick={() => handleQuickAdjustStock(item.id, 5)} class="px-1.5 py-0.5 bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 dark:text-neutral-300 rounded font-bold text-[10px] border border-gray-100 dark:border-neutral-800" title="Add 5">+5</button>
                          <button onClick={() => handleQuickAdjustStock(item.id, 20)} class="px-1.5 py-0.5 bg-brand-50 dark:bg-brand-950/50 hover:bg-brand-100 dark:hover:bg-brand-900/50 text-brand-600 dark:text-brand-400 rounded font-bold text-[10px]" title="Add 20">+20</button>
                        </div>
                      </td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal() && (
        <div class="modal-overlay animate-fade-in" onClick={() => setShowAddModal(false)}>
          <div class="modal-content max-w-lg bg-white dark:bg-black border border-gray-200 dark:border-neutral-800" onClick={(e) => e.stopPropagation()}>
            <div class="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center">
              <h3 class="font-bold text-gray-900 dark:text-white text-base">Add New Product</h3>
              <button onClick={() => setShowAddModal(false)} class="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <IconX class="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} class="p-6 space-y-4 text-xs">
              <div>
                <label class="block font-semibold text-gray-500 dark:text-neutral-300 mb-1">Product Full Name:</label>
                <input type="text" required value={name()} onInput={(e) => setName(e.currentTarget.value)} placeholder="e.g. Wai Wai Instant Noodles 75g" class="input-field font-semibold" autofocus />
              </div>

              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="block font-semibold text-gray-500 dark:text-neutral-300">Category:</label>
                  <span class="text-[10px] text-gray-400 dark:text-neutral-500 capitalize">Suggestions for {currentBusiness.businessType || 'General'}</span>
                </div>
                <input
                  type="text"
                  value={category()}
                  onInput={(e) => setCategory(e.currentTarget.value)}
                  placeholder="Select or type category..."
                  class="input-field font-semibold mb-2"
                />
                <div class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  <For each={categorySuggestions()}>
                    {(catName) => {
                      const isSelected = category().toLowerCase() === catName.toLowerCase();
                      return (
                        <button
                          type="button"
                          onClick={() => setCategory(catName)}
                          class={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                            isSelected
                              ? 'bg-brand-500 text-white shadow-sm'
                              : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700'
                          }`}
                        >
                          {catName}
                        </button>
                      );
                    }}
                  </For>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block font-semibold text-gray-500 dark:text-neutral-300 mb-1">Barcode:</label>
                  <input type="text" value={barcode()} onInput={(e) => setBarcode(e.currentTarget.value)} placeholder="Leave blank to auto-generate" class="input-field font-mono" />
                </div>
                <div>
                  <label class="block font-semibold text-gray-500 dark:text-neutral-300 mb-1">Stock Quantity:</label>
                  <input type="number" value={currentStock() || ''} onInput={(e) => setCurrentStock(Number(e.currentTarget.value))} placeholder="0" class="input-field font-bold" />
                </div>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block font-semibold text-gray-500 dark:text-neutral-300 mb-1">Selling Price (MRP):</label>
                  <input type="number" step="0.01" required value={sellingPrice() || ''} onInput={(e) => setSellingPrice(Number(e.currentTarget.value))} placeholder="0.00" class="input-field font-black text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <label class="block font-semibold text-gray-500 dark:text-neutral-300 mb-1">Wholesale Rate:</label>
                  <input type="number" step="0.01" value={wholesalePrice() || ''} onInput={(e) => setWholesalePrice(Number(e.currentTarget.value))} placeholder="0.00" class="input-field font-bold text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <label class="block font-semibold text-gray-500 dark:text-neutral-300 mb-1">Purchase Cost:</label>
                  <input type="number" step="0.01" value={purchaseCost() || ''} onInput={(e) => setPurchaseCost(Number(e.currentTarget.value))} placeholder="0.00" class="input-field font-semibold" />
                </div>
              </div>

              <div class="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} class="btn-outline w-1/2">Cancel</button>
                <button type="submit" class="btn-primary w-1/2">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
