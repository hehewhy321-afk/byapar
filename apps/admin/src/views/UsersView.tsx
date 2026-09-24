import { Component, createSignal, For, Show } from 'solid-js';
import {
  getUsersOverview,
  getUsersList,
  getRoleDistribution,
  UsersOverviewMetrics,
  UserProfile,
  RoleCount,
} from '../services/adminApi';
import { exportToCSV } from '../services/exportUtils';

export const UsersView: Component = () => {
  const [overview, setOverview] = createSignal<UsersOverviewMetrics | null>(null);
  const [users, setUsers] = createSignal<UserProfile[]>([]);
  const [roles, setRoles] = createSignal<RoleCount[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [searchQuery, setSearchQuery] = createSignal('');

  const loadData = async () => {
    try {
      const [o, u, r] = await Promise.all([
        getUsersOverview(),
        getUsersList(),
        getRoleDistribution(),
      ]);
      setOverview(o);
      setUsers(u);
      setRoles(r);
    } catch (err) {
      console.error('UsersView load error:', err);
    } finally {
      setLoading(false);
    }
  };

  queueMicrotask(() => loadData());

  const filteredUsers = () => {
    const q = searchQuery().toLowerCase().trim();
    if (!q) return users();
    return users().filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        u.businesses.some((b) => b.toLowerCase().includes(q))
    );
  };

  const multiBusinessUsers = () => users().filter((u) => u.businesses.length > 1);

  const roleColor = (role: string) => {
    const map: Record<string, { bg: string; text: string; border: string }> = {
      owner: { bg: 'bg-orange-50', text: 'text-[#FF4500]', border: 'border-orange-200' },
      manager: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      cashier: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
      stock_keeper: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    };
    return map[role] || { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };
  };

  const roleLabel = (role: string) => {
    const map: Record<string, string> = {
      owner: 'Owner',
      manager: 'Manager',
      cashier: 'Cashier',
      stock_keeper: 'Stock Keeper',
    };
    return map[role] || role;
  };

  const totalRoles = () => roles().reduce((a, r) => a + r.count, 0);

  const handleExport = () => {
    exportToCSV(
      filteredUsers().map((u) => ({
        ...u,
        roles: u.roles.join(', '),
        businesses: u.businesses.join(', '),
        createdAt: new Date(u.createdAt).toLocaleDateString(),
      })),
      'platform_users',
      [
        { key: 'fullName', label: 'Full Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'roles', label: 'Roles' },
        { key: 'businesses', label: 'Businesses' },
        { key: 'createdAt', label: 'Registered' },
        { key: 'isAdmin', label: 'Platform Admin' },
      ]
    );
  };

  return (
    <div class="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold font-heading text-gray-900">Users & Staff Analytics</h2>
          <p class="text-xs text-gray-500 mt-1">Platform-wide user directory, role distribution, and staff insights</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          class="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-semibold transition-all shadow-sm"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export Users CSV</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Profiles</span>
            <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
          </div>
          <div class="mt-3">
            <div class="text-2xl font-bold font-heading text-gray-900">{loading() ? '...' : overview()?.totalProfiles}</div>
            <p class="text-xs text-gray-500 mt-1">Registered accounts</p>
          </div>
        </div>

        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Business Owners</span>
            <div class="w-8 h-8 rounded-lg bg-orange-50 text-[#FF4500] flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
            </div>
          </div>
          <div class="mt-3">
            <div class="text-2xl font-bold font-heading text-gray-900">{loading() ? '...' : overview()?.totalOwners}</div>
            <p class="text-xs text-gray-500 mt-1">Shop owner accounts</p>
          </div>
        </div>

        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Staff Members</span>
            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
          </div>
          <div class="mt-3">
            <div class="text-2xl font-bold font-heading text-gray-900">{loading() ? '...' : overview()?.totalStaff}</div>
            <p class="text-xs text-gray-500 mt-1">Managers, cashiers, stock keepers</p>
          </div>
        </div>

        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Members</span>
            <div class="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <div class="mt-3">
            <div class="text-2xl font-bold font-heading text-gray-900">{loading() ? '...' : overview()?.activeMembers}</div>
            <p class="text-xs text-gray-500 mt-1">Currently active business members</p>
          </div>
        </div>
      </div>

      {/* Role Distribution + Multi-Business Users */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Distribution */}
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100">
            <h3 class="font-heading text-sm font-bold text-gray-900">Role Distribution</h3>
            <p class="text-xs text-gray-500">Breakdown of business member roles across the platform</p>
          </div>
          <div class="p-5 space-y-3">
            <Show when={!loading() && roles().length > 0} fallback={
              <div class="py-8 text-center text-gray-400 text-xs">{loading() ? 'Loading...' : 'No role data'}</div>
            }>
              <For each={roles()}>
                {(r) => {
                  const pct = () => totalRoles() > 0 ? Math.round((r.count / totalRoles()) * 100) : 0;
                  const color = roleColor(r.role);
                  return (
                    <div class="space-y-1.5">
                      <div class="flex items-center justify-between text-xs">
                        <div class="flex items-center gap-2">
                          <span class={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${color.bg} ${color.text} border ${color.border}`}>
                            {roleLabel(r.role)}
                          </span>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="text-gray-500">{r.count} members</span>
                          <span class="font-semibold text-gray-800">{pct()}%</span>
                        </div>
                      </div>
                      <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div class={`h-full rounded-full ${color.bg.replace('50', '400')}`} style={{ width: `${Math.max(pct(), 2)}%` }} />
                      </div>
                    </div>
                  );
                }}
              </For>
            </Show>
          </div>
        </div>

        {/* Multi-Business Users */}
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100">
            <h3 class="font-heading text-sm font-bold text-gray-900">Multi-Business Users</h3>
            <p class="text-xs text-gray-500">Users who are members of more than one business</p>
          </div>
          <div class="p-5">
            <Show when={!loading() && multiBusinessUsers().length > 0} fallback={
              <div class="py-8 text-center text-gray-400 text-xs">
                {loading() ? 'Loading...' : 'No multi-business users found'}
              </div>
            }>
              <div class="space-y-3">
                <For each={multiBusinessUsers()}>
                  {(u) => (
                    <div class="flex items-center gap-3 p-3 rounded-lg bg-amber-50/50 border border-amber-100">
                      <div class="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {u.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-xs font-semibold text-gray-800 truncate">{u.fullName}</p>
                        <p class="text-[10px] text-gray-500 truncate">{u.businesses.join(' • ')}</p>
                      </div>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 shrink-0">
                        {u.businesses.length} shops
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>
      </div>

      {/* Users Directory Table */}
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 class="font-heading text-sm font-bold text-gray-900">Users Directory</h3>
            <p class="text-xs text-gray-500">All registered profiles on the platform</p>
          </div>
          <div class="relative">
            <input
              type="text"
              placeholder="Search by name, phone, business..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              class="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#FF4500]/20 focus:border-[#FF4500] w-64"
            />
            <svg class="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
                <th class="py-2.5 px-5">User</th>
                <th class="py-2.5 px-5">Phone</th>
                <th class="py-2.5 px-5">Roles</th>
                <th class="py-2.5 px-5">Business(es)</th>
                <th class="py-2.5 px-5 text-right">Registered</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <Show when={!loading() && filteredUsers().length > 0} fallback={
                <tr><td colspan="5" class="py-10 text-center text-gray-400">
                  {loading() ? 'Loading users...' : 'No users match your search'}
                </td></tr>
              }>
                <For each={filteredUsers()}>
                  {(u) => (
                    <tr class="hover:bg-gray-50/50 transition-colors">
                      <td class="py-3 px-5">
                        <div class="flex items-center gap-2.5">
                          <div class={`w-7 h-7 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 ${
                            u.isAdmin ? 'bg-[#FF4500] text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span class="font-semibold text-gray-900">{u.fullName}</span>
                            {u.isAdmin && (
                              <span class="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-[#FF4500]">
                                ADMIN
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td class="py-3 px-5 text-gray-600 font-mono">{u.phone || '—'}</td>
                      <td class="py-3 px-5">
                        <div class="flex flex-wrap gap-1">
                          <For each={u.roles}>
                            {(role) => {
                              const c = roleColor(role);
                              return (
                                <span class={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${c.bg} ${c.text} border ${c.border}`}>
                                  {roleLabel(role)}
                                </span>
                              );
                            }}
                          </For>
                          {u.roles.length === 0 && <span class="text-gray-400">—</span>}
                        </div>
                      </td>
                      <td class="py-3 px-5 text-gray-600 max-w-[200px]">
                        <div class="truncate">{u.businesses.length > 0 ? u.businesses.join(', ') : '—'}</div>
                      </td>
                      <td class="py-3 px-5 text-right text-gray-500 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  )}
                </For>
              </Show>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
