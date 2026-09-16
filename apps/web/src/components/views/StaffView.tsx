import { createSignal, createMemo, For, Show } from 'solid-js';
import {
  staffList,
  addStaffMember,
  updateStaffMember,
  deleteStaffMember,
  StaffMember,
} from '../../db/localDb';
import {
  STAFF_ROLES,
  StaffRole,
  PERMISSION_GROUPS,
  getDefaultRolePermissions,
} from '../../db/permissions';
import {
  IconStaff,
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconCheck,
  IconLock,
} from '../icons';

export function StaffView() {
  const [searchTerm, setSearchTerm] = createSignal('');
  const [showAddModal, setShowAddModal] = createSignal(false);
  const [editingStaffId, setEditingStaffId] = createSignal<string | null>(null);

  // Form State
  const [staffName, setStaffName] = createSignal('');
  const [staffPhone, setStaffPhone] = createSignal('');
  const [staffEmail, setStaffEmail] = createSignal('');
  const [staffRole, setStaffRole] = createSignal<StaffRole>('Partner');
  const [permissionsState, setPermissionsState] = createSignal<Record<string, boolean>>(
    getDefaultRolePermissions('Partner')
  );

  // When role changes in Add modal, pre-populate default permissions
  function handleRoleChange(newRole: StaffRole) {
    setStaffRole(newRole);
    setPermissionsState(getDefaultRolePermissions(newRole));
  }

  function togglePermission(permId: string) {
    setPermissionsState((prev) => ({
      ...prev,
      [permId]: !prev[permId],
    }));
  }

  function toggleGroupAll(groupId: string, selectAll: boolean) {
    const group = PERMISSION_GROUPS.find((g) => g.id === groupId);
    if (!group) return;
    setPermissionsState((prev) => {
      const copy = { ...prev };
      group.permissions.forEach((p) => {
        copy[p.id] = selectAll;
      });
      return copy;
    });
  }

  function openAddModal() {
    setEditingStaffId(null);
    setStaffName('');
    setStaffPhone('');
    setStaffEmail('');
    setStaffRole('Partner');
    setPermissionsState(getDefaultRolePermissions('Partner'));
    setShowAddModal(true);
  }

  function openEditModal(member: StaffMember) {
    setEditingStaffId(member.id);
    setStaffName(member.name);
    setStaffPhone(member.phone || '');
    setStaffEmail(member.email || '');
    setStaffRole(member.role);
    setPermissionsState({ ...member.permissions });
    setShowAddModal(true);
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!staffName().trim()) return;

    if (editingStaffId()) {
      await updateStaffMember(editingStaffId()!, {
        name: staffName(),
        phone: staffPhone() || undefined,
        email: staffEmail() || undefined,
        role: staffRole(),
        permissions: permissionsState(),
      });
    } else {
      await addStaffMember({
        name: staffName(),
        phone: staffPhone() || undefined,
        email: staffEmail() || undefined,
        role: staffRole(),
        permissions: permissionsState(),
        isActive: true,
      });
    }

    setShowAddModal(false);
  }

  const filteredStaff = createMemo(() => {
    const q = searchTerm().toLowerCase().trim();
    if (!q) return staffList;
    return staffList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q))
    );
  });

  return (
    <div class="space-y-6">
      {/* Header Bar */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <div class="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <IconStaff class="w-6 h-6" />
            </div>
            <h1 class="text-2xl font-bold text-white tracking-tight">Staff Management</h1>
          </div>
          <p class="text-sm text-neutral-400 mt-1">
            Manage team members, assign operational roles, and configure granular access permissions.
          </p>
        </div>

        <button
          onClick={openAddModal}
          class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-purple-900/30 flex items-center gap-2"
        >
          <IconPlus class="w-4 h-4" />
          <span>Add New Staff</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div class="relative">
        <IconSearch class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          placeholder="Search staff by name, role, phone..."
          value={searchTerm()}
          onInput={(e) => setSearchTerm(e.currentTarget.value)}
          class="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/50 text-sm transition-all"
        />
      </div>

      {/* Staff Members Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <For
          each={filteredStaff()}
          fallback={
            <div class="col-span-full py-16 text-center text-neutral-500 bg-neutral-950 border border-neutral-800 rounded-2xl">
              <IconStaff class="w-12 h-12 mx-auto text-neutral-600 mb-3" />
              <p class="text-base font-medium text-neutral-400">No staff members found</p>
              <p class="text-xs text-neutral-500 mt-1">
                Click "Add New Staff" to register team members and set permissions.
              </p>
            </div>
          }
        >
          {(member) => {
            const activePermCount = Object.values(member.permissions || {}).filter(Boolean).length;
            return (
              <div class="bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 space-y-4 transition-all flex flex-col justify-between">
                <div>
                  <div class="flex items-start justify-between">
                    <div>
                      <h3 class="text-base font-bold text-white">{member.name}</h3>
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide bg-purple-500/10 text-purple-400 border border-purple-500/20 mt-1.5">
                        {member.role}
                      </span>
                    </div>

                    <div class="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(member)}
                        class="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition-colors"
                        title="Edit Staff & Permissions"
                      >
                        <IconEdit class="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${member.name} from staff?`)) {
                            deleteStaffMember(member.id);
                          }
                        }}
                        class="p-1.5 text-neutral-400 hover:text-rose-400 rounded-lg hover:bg-neutral-900 transition-colors"
                        title="Delete Staff"
                      >
                        <IconTrash class="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div class="space-y-1 mt-3 text-xs text-neutral-400">
                    <Show when={member.phone}>
                      <div>📱 {member.phone}</div>
                    </Show>
                    <Show when={member.email}>
                      <div>✉️ {member.email}</div>
                    </Show>
                  </div>
                </div>

                <div class="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
                  <div class="flex items-center gap-1 text-neutral-400">
                    <IconLock class="w-3.5 h-3.5 text-purple-400" />
                    <span>{activePermCount} permissions enabled</span>
                  </div>
                  <button
                    onClick={() => openEditModal(member)}
                    class="text-purple-400 hover:text-purple-300 font-medium"
                  >
                    Modify
                  </button>
                </div>
              </div>
            );
          }}
        </For>
      </div>

      {/* MODAL: Add / Edit Staff & Granular Permissions */}
      <Show when={showAddModal()}>
        <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h2 class="text-lg font-bold text-white">
                  {editingStaffId() ? 'Edit Staff & Permissions' : 'Add New Staff'}
                </h2>
                <p class="text-xs text-neutral-400">
                  Select role preset or toggle individual permissions across all 14 categories.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                class="text-neutral-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} class="space-y-5">
              {/* Basic Info */}
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs text-neutral-400 mb-1">Staff Name *</label>
                  <input
                    type="text"
                    required
                    value={staffName()}
                    onInput={(e) => setStaffName(e.currentTarget.value)}
                    placeholder="e.g. Ramesh Thapa"
                    class="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label class="block text-xs text-neutral-400 mb-1">Select Role *</label>
                  <select
                    value={staffRole()}
                    onChange={(e) => handleRoleChange(e.currentTarget.value as StaffRole)}
                    class="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    <For each={STAFF_ROLES}>
                      {(r) => <option value={r}>{r}</option>}
                    </For>
                  </select>
                </div>

                <div>
                  <label class="block text-xs text-neutral-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={staffPhone()}
                    onInput={(e) => setStaffPhone(e.currentTarget.value)}
                    placeholder="98XXXXXXXX"
                    class="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label class="block text-xs text-neutral-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={staffEmail()}
                    onInput={(e) => setStaffEmail(e.currentTarget.value)}
                    placeholder="staff@kirana.np"
                    class="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Granular Permissions Section */}
              <div class="space-y-4 pt-2">
                <div class="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <div>
                    <h3 class="text-sm font-bold text-white uppercase tracking-wider">
                      Manage Permissions ({staffRole()} Permissions)
                    </h3>
                    <p class="text-xs text-neutral-400">
                      You can view or modify the staff permission access below:
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const all: Record<string, boolean> = {};
                        PERMISSION_GROUPS.forEach((g) => g.permissions.forEach((p) => (all[p.id] = true)));
                        setPermissionsState(all);
                      }}
                      class="px-2.5 py-1 text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setPermissionsState({})}
                      class="px-2.5 py-1 text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* 14 Permission Groups Accordion / Grid */}
                <div class="space-y-3">
                  <For each={PERMISSION_GROUPS}>
                    {(group) => {
                      const allChecked = group.permissions.every((p) => permissionsState()[p.id]);
                      const someChecked = group.permissions.some((p) => permissionsState()[p.id]);

                      return (
                        <div class="bg-neutral-900/50 border border-neutral-800 rounded-xl p-3.5 space-y-2.5">
                          <div class="flex items-center justify-between">
                            <label class="flex items-center gap-2.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={allChecked}
                                indeterminate={someChecked && !allChecked}
                                onChange={(e) => toggleGroupAll(group.id, e.currentTarget.checked)}
                                class="w-4 h-4 rounded bg-neutral-950 border-neutral-700 text-purple-600 focus:ring-purple-500 focus:ring-offset-neutral-900"
                              />
                              <span class="text-xs font-bold text-neutral-200 tracking-wide">
                                {group.name}
                              </span>
                            </label>

                            <span class="text-xs text-neutral-500 font-mono">
                              {group.permissions.filter((p) => permissionsState()[p.id]).length} / {group.permissions.length}
                            </span>
                          </div>

                          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pl-6 pt-1">
                            <For each={group.permissions}>
                              {(perm) => (
                                <label class="flex items-center gap-2 cursor-pointer select-none py-1 hover:text-white transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={!!permissionsState()[perm.id]}
                                    onChange={() => togglePermission(perm.id)}
                                    class="w-3.5 h-3.5 rounded bg-neutral-950 border-neutral-700 text-purple-600 focus:ring-purple-500 focus:ring-offset-neutral-900"
                                  />
                                  <span class="text-xs text-neutral-300">{perm.label}</span>
                                </label>
                              )}
                            </For>
                          </div>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </div>

              {/* Form Buttons */}
              <div class="flex justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  class="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg text-sm shadow-lg shadow-purple-900/30"
                >
                  {editingStaffId() ? 'Save Changes' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
}
