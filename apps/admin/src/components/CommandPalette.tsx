import { Component, createSignal, For, Show, createEffect, onSettled } from 'solid-js';
import { supabase } from '../services/adminAuth';

export type AdminTab =
  | 'dashboard'
  | 'shops'
  | 'subscriptions'
  | 'campaigns'
  | 'automations'
  | 'audit'
  | 'settings'
  | 'analytics'
  | 'khata'
  | 'users'
  | 'feature_flags'
  | 'promos'
  | 'tickets'
  | 'system_health'
  | 'webhooks'
  | 'branding'
  | 'compliance'
  | 'roles';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: AdminTab) => void;
}

interface SearchResult {
  id: string;
  type: 'page' | 'shop' | 'user';
  title: string;
  subtitle: string;
  icon: string;
  action: () => void;
}

export const CommandPalette: Component<CommandPaletteProps> = (props) => {
  const [query, setQuery] = createSignal('');
  const [results, setResults] = createSignal<SearchResult[]>([]);
  const [searching, setSearching] = createSignal(false);
  const [selectedIdx, setSelectedIdx] = createSignal(0);
  let inputRef: HTMLInputElement | undefined;

  // Navigation pages — always available
  const pages: SearchResult[] = [
    { id: 'nav_dashboard', type: 'page', title: 'Dashboard', subtitle: 'Platform overview & KPIs', icon: '📊', action: () => { props.onNavigate('dashboard'); props.onClose(); } },
    { id: 'nav_analytics', type: 'page', title: 'Revenue Analytics', subtitle: 'Transaction analytics & trends', icon: '📈', action: () => { props.onNavigate('analytics'); props.onClose(); } },
    { id: 'nav_health', type: 'page', title: 'System Health', subtitle: 'Live infrastructure & API latency', icon: '⚡', action: () => { props.onNavigate('system_health'); props.onClose(); } },
    { id: 'nav_shops', type: 'page', title: 'Merchants & Shops', subtitle: 'Manage stores & subscriptions', icon: '🏪', action: () => { props.onNavigate('shops'); props.onClose(); } },
    { id: 'nav_promos', type: 'page', title: 'Coupons & Promos', subtitle: 'Discount promo codes & redemptions', icon: '🏷️', action: () => { props.onNavigate('promos'); props.onClose(); } },
    { id: 'nav_tickets', type: 'page', title: 'Support Helpdesk', subtitle: 'Merchant issues, billing & QR tickets', icon: '🎧', action: () => { props.onNavigate('tickets'); props.onClose(); } },
    { id: 'nav_flags', type: 'page', title: 'Feature Flags', subtitle: 'Rollouts, AI vision & store overrides', icon: '🚩', action: () => { props.onNavigate('feature_flags'); props.onClose(); } },
    { id: 'nav_branding', type: 'page', title: 'White-Label & Receipts', subtitle: 'Custom thermal bills & store slugs', icon: '🧾', action: () => { props.onNavigate('branding'); props.onClose(); } },
    { id: 'nav_webhooks', type: 'page', title: 'Webhooks & API', subtitle: 'ERP & external event streams', icon: '🔌', action: () => { props.onNavigate('webhooks'); props.onClose(); } },
    { id: 'nav_compliance', type: 'page', title: 'Compliance & Tax Exports', subtitle: 'Legal ZIP archives & IRD VAT books', icon: '📦', action: () => { props.onNavigate('compliance'); props.onClose(); } },
    { id: 'nav_roles', type: 'page', title: 'Admin RBAC Team', subtitle: 'Admin roles & permission matrix', icon: '🛡️', action: () => { props.onNavigate('roles'); props.onClose(); } },
    { id: 'nav_khata', type: 'page', title: 'Khata & Credit Risk', subtitle: 'Outstanding credit & debtors', icon: '📕', action: () => { props.onNavigate('khata'); props.onClose(); } },
    { id: 'nav_users', type: 'page', title: 'Users & Staff', subtitle: 'User directory & role analytics', icon: '👥', action: () => { props.onNavigate('users'); props.onClose(); } },
    { id: 'nav_subs', type: 'page', title: 'Subscriptions', subtitle: 'Billing hub & renewals', icon: '💳', action: () => { props.onNavigate('subscriptions'); props.onClose(); } },
    { id: 'nav_campaigns', type: 'page', title: 'Notifications & Broadcasts', subtitle: 'Push notification campaigns', icon: '🔔', action: () => { props.onNavigate('campaigns'); props.onClose(); } },
    { id: 'nav_automations', type: 'page', title: 'Automation Triggers', subtitle: 'Lifecycle & retention bots', icon: '⚡', action: () => { props.onNavigate('automations'); props.onClose(); } },
    { id: 'nav_audit', type: 'page', title: 'System Logs', subtitle: 'Audit trail & activity stream', icon: '📋', action: () => { props.onNavigate('audit'); props.onClose(); } },
    { id: 'nav_settings', type: 'page', title: 'Firebase & Push Config', subtitle: 'Push notification settings', icon: '⚙️', action: () => { props.onNavigate('settings'); props.onClose(); } },
  ];

  const searchEntities = async (q: string) => {
    if (q.length < 2) {
      // Show all pages filtered
      const filtered = pages.filter(
        (p) => p.title.toLowerCase().includes(q.toLowerCase()) || p.subtitle.toLowerCase().includes(q.toLowerCase())
      );
      setResults(filtered);
      return;
    }

    setSearching(true);
    try {
      const allResults: SearchResult[] = [];

      // Filter pages
      const filteredPages = pages.filter(
        (p) => p.title.toLowerCase().includes(q.toLowerCase()) || p.subtitle.toLowerCase().includes(q.toLowerCase())
      );
      allResults.push(...filteredPages);

      // Search businesses
      const { data: shops } = await supabase
        .from('businesses')
        .select('id, name, phone, business_type')
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%,pan_vat_number.ilike.%${q}%`)
        .limit(5);

      if (shops) {
        shops.forEach((s) => {
          allResults.push({
            id: `shop_${s.id}`,
            type: 'shop',
            title: s.name,
            subtitle: `${s.business_type || 'General'} • ${s.phone || 'No phone'}`,
            icon: '🏪',
            action: () => { props.onNavigate('shops'); props.onClose(); },
          });
        });
      }

      // Search profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number')
        .or(`full_name.ilike.%${q}%,phone_number.ilike.%${q}%`)
        .limit(5);

      if (profiles) {
        profiles.forEach((p) => {
          allResults.push({
            id: `user_${p.id}`,
            type: 'user',
            title: p.full_name || 'Unnamed',
            subtitle: p.phone_number || 'No phone',
            icon: '👤',
            action: () => { props.onNavigate('users'); props.onClose(); },
          });
        });
      }

      setResults(allResults);
      setSelectedIdx(0);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  // Debounced search
  let searchTimeout: ReturnType<typeof setTimeout>;
  const handleInput = (value: string) => {
    setQuery(value);
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => searchEntities(value), 200);
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results().length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = results()[selectedIdx()];
      if (sel) sel.action();
    } else if (e.key === 'Escape') {
      props.onClose();
    }
  };

  // Focus input when opened
  createEffect(
    () => props.isOpen,
    (open) => {
      if (open) {
        setTimeout(() => inputRef?.focus(), 50);
        searchEntities('');
      }
    }
  );

  // Global keyboard shortcut listener
  const globalKeyHandler = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      // This is handled in the parent, but we prevent default here too
    }
  };

  onSettled(() => {
    document.addEventListener('keydown', globalKeyHandler);
    return () => {
      document.removeEventListener('keydown', globalKeyHandler);
      clearTimeout(searchTimeout);
    };
  });

  const typeLabel = (type: string) => {
    const map: Record<string, { text: string; color: string }> = {
      page: { text: 'Page', color: 'bg-blue-100 text-blue-700' },
      shop: { text: 'Shop', color: 'bg-orange-100 text-[#FF4500]' },
      user: { text: 'User', color: 'bg-emerald-100 text-emerald-700' },
    };
    return map[type] || { text: type, color: 'bg-gray-100 text-gray-600' };
  };

  return (
    <Show when={props.isOpen}>
      {/* Backdrop */}
      <div
        class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]"
        onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}
      >
        {/* Palette Container */}
        <div class="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-fade-in">
          {/* Search Input */}
          <div class="flex items-center px-4 py-3 border-b border-gray-100">
            <svg class="w-5 h-5 text-gray-400 shrink-0 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search pages, merchants, users..."
              value={query()}
              onInput={(e) => handleInput(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              class="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
              autofocus
            />
            <Show when={searching()}>
              <div class="w-4 h-4 border-2 border-gray-300 border-t-[#FF4500] rounded-full animate-spin" />
            </Show>
            <kbd class="ml-3 px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-mono border border-gray-200">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div class="max-h-80 overflow-y-auto py-2">
            <Show when={results().length > 0} fallback={
              <div class="py-8 text-center text-gray-400 text-xs">
                {query().length > 0 ? 'No results found' : 'Start typing to search...'}
              </div>
            }>
              <For each={results()}>
                {(result, idx) => {
                  const tl = typeLabel(result.type);
                  return (
                    <button
                      type="button"
                      onClick={() => result.action()}
                      onMouseEnter={() => setSelectedIdx(idx())}
                      class={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        selectedIdx() === idx()
                          ? 'bg-[#FF4500]/5 border-l-2 border-[#FF4500]'
                          : 'hover:bg-gray-50 border-l-2 border-transparent'
                      }`}
                    >
                      <span class="text-lg shrink-0">{result.icon}</span>
                      <div class="flex-1 min-w-0">
                        <p class="text-xs font-semibold text-gray-900 truncate">{result.title}</p>
                        <p class="text-[11px] text-gray-500 truncate">{result.subtitle}</p>
                      </div>
                      <span class={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${tl.color} shrink-0`}>
                        {tl.text}
                      </span>
                    </button>
                  );
                }}
              </For>
            </Show>
          </div>

          {/* Footer Hints */}
          <div class="px-4 py-2 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-[10px] text-gray-400">
            <div class="flex items-center gap-3">
              <span class="flex items-center gap-1">
                <kbd class="px-1 py-0.5 rounded bg-gray-200 text-gray-500 font-mono">↑↓</kbd> navigate
              </span>
              <span class="flex items-center gap-1">
                <kbd class="px-1 py-0.5 rounded bg-gray-200 text-gray-500 font-mono">↵</kbd> select
              </span>
              <span class="flex items-center gap-1">
                <kbd class="px-1 py-0.5 rounded bg-gray-200 text-gray-500 font-mono">esc</kbd> close
              </span>
            </div>
            <span>Byapar Admin</span>
          </div>
        </div>
      </div>
    </Show>
  );
};
