import { Component, createSignal, For, Show } from 'solid-js';
import { getAdminTeam, AdminRoleMember } from '../services/adminApi';

export const AdminRolesView: Component = () => {
  const [team, setTeam] = createSignal<AdminRoleMember[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [showInviteModal, setShowInviteModal] = createSignal(false);
  const [notification, setNotification] = createSignal<string | null>(null);

  // Invite state
  const [inviteEmail, setInviteEmail] = createSignal('');
  const [inviteRole, setInviteRole] = createSignal<'super_admin' | 'support_agent' | 'finance_billing' | 'operations_manager'>('support_agent');

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAdminTeam();
      setTeam(data);
    } catch (err) {
      console.error('Failed to load admin team:', err);
    } finally {
      setLoading(false);
    }
  };

  queueMicrotask(() => loadData());

  const handleInvite = (e: Event) => {
    e.preventDefault();
    if (!inviteEmail().trim()) return;

    const newMember: AdminRoleMember = {
      id: 'usr_' + Date.now(),
      userId: 'uid_' + Date.now(),
      email: inviteEmail().trim(),
      fullName: inviteEmail().split('@')[0],
      role: inviteRole(),
      permissions:
        inviteRole() === 'super_admin'
          ? ['all']
          : inviteRole() === 'finance_billing'
          ? ['view_analytics', 'manage_subscriptions', 'compliance_exports']
          : inviteRole() === 'support_agent'
          ? ['support_tickets', 'view_merchants']
          : ['manage_merchants', 'feature_flags', 'campaigns'],
      createdAt: new Date().toISOString(),
    };

    setTeam((curr) => [newMember, ...curr]);
    setShowInviteModal(false);
    setInviteEmail('');
    showToast(`Invitation dispatched to ${newMember.email} as ${newMember.role.replace(/_/g, ' ')}!`);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'finance_billing':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'operations_manager':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'support_agent':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

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
            <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
              Governance & Security
            </span>
            <span class="text-xs text-gray-500 font-mono">Phase 3 Engine</span>
          </div>
          <h2 class="text-xl font-bold text-gray-900 mt-2 font-heading">
            Admin Team & Multi-Role RBAC Permissions
          </h2>
          <p class="text-sm text-gray-500 mt-1 max-w-2xl">
            Assign least-privilege administrative access across operations, merchant billing, support triage, and system engineering.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            onClick={() => setShowInviteModal(true)}
            class="px-4 py-2 text-xs font-bold text-white bg-[#FF4500] hover:bg-[#E03E00] rounded-xl shadow-md transition flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Admin Member
          </button>
        </div>
      </div>

      {/* Permissions Matrix Overview */}
      <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div class="text-xs font-bold text-gray-700 uppercase tracking-wider">
          Role Permission Hierarchy Matrix
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div class="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
            <div class="font-bold text-purple-900">👑 Super Admin</div>
            <div class="text-[11px] text-purple-700 mt-1">
              Unrestricted control over all databases, financial GMV, feature rollouts, API keys, and staff roles.
            </div>
          </div>

          <div class="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <div class="font-bold text-emerald-900">💳 Finance & Billing</div>
            <div class="text-[11px] text-emerald-700 mt-1">
              Manages merchant subscription overrides, promo coupons, invoices, GMV revenue analytics, and tax exports.
            </div>
          </div>

          <div class="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
            <div class="font-bold text-blue-900">⚡ Operations Manager</div>
            <div class="text-[11px] text-blue-700 mt-1">
              Controls feature flags, scheduled push notifications, merchant onboarding funnel, and webhooks.
            </div>
          </div>

          <div class="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
            <div class="font-bold text-amber-900">🎧 Support Specialist</div>
            <div class="text-[11px] text-amber-700 mt-1">
              Reviews incoming tickets, responds to merchant inquiries, and troubleshoots Fonepay QR / printer setup.
            </div>
          </div>
        </div>
      </div>

      {/* Admin Team Members Table */}
      <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div class="p-4 border-b border-gray-100 flex items-center justify-between">
          <div class="text-xs font-bold uppercase tracking-wider text-gray-700">
            Active Platform Administrators
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-gray-50 text-gray-500 border-b border-gray-200 font-bold uppercase tracking-wider text-[10px]">
                <th class="py-3 px-4">Admin Member</th>
                <th class="py-3 px-4">Email</th>
                <th class="py-3 px-4">Role Assigned</th>
                <th class="py-3 px-4">Permission Scope</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <Show
                when={!loading()}
                fallback={
                  <tr>
                    <td colspan="6" class="py-8 text-center text-gray-400 animate-pulse">
                      Loading team roles...
                    </td>
                  </tr>
                }
              >
                <For each={team()}>
                  {(m) => (
                    <tr class="hover:bg-gray-50/70 transition">
                      <td class="py-3.5 px-4">
                        <div class="flex items-center gap-2.5">
                          <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-gray-700 to-gray-900 text-white font-bold flex items-center justify-center text-xs">
                            {m.fullName.charAt(0).toUpperCase()}
                          </div>
                          <span class="font-bold text-gray-900">{m.fullName}</span>
                        </div>
                      </td>

                      <td class="py-3.5 px-4 font-mono text-gray-600">
                        {m.email}
                      </td>

                      <td class="py-3.5 px-4">
                        <span class={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getRoleBadge(m.role)}`}>
                          {m.role.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td class="py-3.5 px-4">
                        <div class="flex items-center gap-1 flex-wrap">
                          <For each={m.permissions}>
                            {(p) => (
                              <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-mono">
                                {p}
                              </span>
                            )}
                          </For>
                        </div>
                      </td>

                      <td class="py-3.5 px-4">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          ACTIVE
                        </span>
                      </td>

                      <td class="py-3.5 px-4 text-right">
                        <button
                          onClick={() => showToast(`Permissions refreshed for ${m.fullName}.`)}
                          class="px-2.5 py-1 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition"
                        >
                          Configure ⚙️
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
              </Show>
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Member Modal */}
      <Show when={showInviteModal()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 class="text-base font-bold text-gray-900 font-heading">
                Invite Administrator to Team
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                class="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInvite} class="space-y-3.5 text-xs">
              <div>
                <label class="block font-semibold text-gray-700 mb-1">Work Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@byapar.com"
                  value={inviteEmail()}
                  onInput={(e) => setInviteEmail(e.currentTarget.value)}
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF4500]/20 focus:border-[#FF4500]"
                />
              </div>

              <div>
                <label class="block font-semibold text-gray-700 mb-1">Administrative Role</label>
                <select
                  value={inviteRole()}
                  onChange={(e) => setInviteRole(e.currentTarget.value as any)}
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl"
                >
                  <option value="support_agent">Support Specialist (Tickets & Merchant Care)</option>
                  <option value="finance_billing">Finance & Billing (Subscriptions & Revenue)</option>
                  <option value="operations_manager">Operations Manager (Rollouts & Webhooks)</option>
                  <option value="super_admin">Super Admin (Full Root Permissions)</option>
                </select>
              </div>

              <div class="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  class="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-5 py-2 font-bold text-white bg-[#FF4500] hover:bg-[#E03E00] rounded-xl transition shadow-md"
                >
                  Send Invitation ✉️
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
};
