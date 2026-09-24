import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { StaffMember } from '../types';
import {
  STAFF_ROLES,
  StaffRole,
  PERMISSION_GROUPS,
  getDefaultRolePermissions,
} from '../db/permissions';
import { SubscriptionModal } from '../components/SubscriptionModal';
import { checkMobileStaffLimit } from '../services/planLimits';

export const StaffScreen: React.FC = () => {
  const { staffList, addStaffMember, updateStaffMember, deleteStaffMember, theme, activeBizId } = useApp();

  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [showSubModal, setShowSubModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('Partner');
  const [permissionsState, setPermissionsState] = useState<Record<string, boolean>>(
    getDefaultRolePermissions('Partner')
  );

  const filteredStaff = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return staffList;
    return staffList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q))
    );
  }, [staffList, search]);

  const openAddModal = async () => {
    // 1. Check Staff Limit
    const limitCheck = await checkMobileStaffLimit(activeBizId, staffList.length);
    if (!limitCheck.allowed) {
      Alert.alert(
        'Staff Account Limit Reached',
        limitCheck.message || 'You have reached the staff account limit for your plan.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade Plan', onPress: () => setShowSubModal(true) },
        ]
      );
      return;
    }

    setEditingStaffId(null);
    setName('');
    setPhone('');
    setEmail('');
    setRole('Partner');
    setPermissionsState(getDefaultRolePermissions('Partner'));
    setModalVisible(true);
  };

  const openEditModal = (member: StaffMember) => {
    setEditingStaffId(member.id);
    setName(member.name);
    setPhone(member.phone || '');
    setEmail(member.email || '');
    setRole(member.role as StaffRole);
    setPermissionsState({ ...member.permissions });
    setModalVisible(true);
  };

  const handleRoleSelect = (newRole: StaffRole) => {
    setRole(newRole);
    setPermissionsState(getDefaultRolePermissions(newRole));
  };

  const togglePermission = (id: string) => {
    setPermissionsState((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleGroupAll = (groupId: string, selectAll: boolean) => {
    const group = PERMISSION_GROUPS.find((g) => g.id === groupId);
    if (!group) return;
    setPermissionsState((prev) => {
      const copy = { ...prev };
      group.permissions.forEach((p) => {
        copy[p.id] = selectAll;
      });
      return copy;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter staff name');
      return;
    }

    if (editingStaffId) {
      await updateStaffMember(editingStaffId, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        role,
        permissions: permissionsState,
      });
    } else {
      await addStaffMember({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        role,
        permissions: permissionsState,
        isActive: true,
      });
    }

    setModalVisible(false);
  };

  const handleDelete = (id: string, staffName: string) => {
    Alert.alert('Delete Staff Member', `Are you sure you want to remove "${staffName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteStaffMember(id);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Header Bar */}
      <View style={[styles.topHeader, { borderBottomColor: theme.colors.borderGlass }]}>
        <View>
          <View style={styles.titleRow}>
            <View style={styles.iconBadge}>
              <Feather name="users" size={16} color="#A855F7" />
            </View>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Staff Management</Text>
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            Assign roles, manage operators & customize granular permissions
          </Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Feather name="user-plus" size={14} color="#FFF" />
          <Text style={styles.addBtnText}>Add Staff</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
          ]}
        >
          <Feather name="search" size={16} color={theme.colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder="Search staff by name, phone or role..."
            placeholderTextColor={theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Staff List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredStaff.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="user-x" size={40} color={theme.colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.colors.textSecondary }]}>
              No Staff Members Found
            </Text>
            <Text style={[styles.emptySub, { color: theme.colors.textMuted }]}>
              Add team members to delegate access with custom permissions
            </Text>
          </View>
        ) : (
          filteredStaff.map((staff) => {
            const activePermCount = Object.values(staff.permissions || {}).filter(Boolean).length;
            return (
              <View
                key={staff.id}
                style={[
                  styles.staffCard,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.avatarRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {staff.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .substring(0, 2)}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.staffName, { color: theme.colors.textPrimary }]}>
                        {staff.name}
                      </Text>
                      <View style={styles.badgeRow}>
                        <View style={styles.roleBadge}>
                          <Text style={styles.roleBadgeText}>{staff.role}</Text>
                        </View>
                        <View style={styles.permPill}>
                          <Feather name="shield" size={10} color="#10B981" />
                          <Text style={styles.permPillText}>{activePermCount} Permissions</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
                      onPress={() => openEditModal(staff)}
                    >
                      <Feather name="edit-2" size={14} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}
                      onPress={() => handleDelete(staff.id, staff.name)}
                    >
                      <Feather name="trash-2" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {(staff.phone || staff.email) && (
                  <View
                    style={[
                      styles.cardContactRow,
                      { borderTopColor: 'rgba(255,255,255,0.05)' },
                    ]}
                  >
                    {staff.phone ? (
                      <View style={styles.contactItem}>
                        <Feather name="phone" size={11} color={theme.colors.textMuted} />
                        <Text style={[styles.contactText, { color: theme.colors.textMuted }]}>
                          {staff.phone}
                        </Text>
                      </View>
                    ) : null}
                    {staff.email ? (
                      <View style={styles.contactItem}>
                        <Feather name="mail" size={11} color={theme.colors.textMuted} />
                        <Text style={[styles.contactText, { color: theme.colors.textMuted }]}>
                          {staff.email}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add / Edit Staff Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: '#09090B', borderColor: theme.colors.borderGlass }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.borderGlass }]}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                  {editingStaffId ? 'Edit Staff Member' : 'Add New Staff'}
                </Text>
                <Text style={[styles.modalSub, { color: theme.colors.textMuted }]}>
                  Configure profile and granular access rights
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Feather name="x" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Staff Name */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Staff Name *</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass, color: theme.colors.textPrimary },
                  ]}
                  placeholder="e.g. Ramesh Sharma"
                  placeholderTextColor={theme.colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Phone & Email */}
              <View style={styles.rowTwo}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Phone Number</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass, color: theme.colors.textPrimary },
                    ]}
                    placeholder="98XXXXXXXX"
                    placeholderTextColor={theme.colors.textMuted}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Email Address</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass, color: theme.colors.textPrimary },
                    ]}
                    placeholder="staff@byapar.com"
                    placeholderTextColor={theme.colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Select Role */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Select Role</Text>
                <View style={styles.roleGrid}>
                  {STAFF_ROLES.map((r) => {
                    const isSelected = role === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[
                          styles.roleSelectChip,
                          {
                            backgroundColor: isSelected ? 'rgba(168, 85, 247, 0.15)' : theme.colors.card,
                            borderColor: isSelected ? '#A855F7' : theme.colors.borderGlass,
                          },
                        ]}
                        onPress={() => handleRoleSelect(r)}
                      >
                        <View style={[styles.roleRadio, isSelected && { borderColor: '#A855F7' }]}>
                          {isSelected && <View style={styles.roleRadioDot} />}
                        </View>
                        <Text
                          style={[
                            styles.roleSelectText,
                            { color: isSelected ? '#A855F7' : theme.colors.textPrimary },
                          ]}
                        >
                          {r}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Permissions Header Notice */}
              <View style={styles.permNoticeCard}>
                <Feather name="shield" size={16} color="#A855F7" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.permNoticeTitle}>You can view or modify the staff permission access</Text>
                  <Text style={styles.permNoticeSub}>
                    Check or uncheck boxes below to grant or restrict specific actions for this operator.
                  </Text>
                </View>
              </View>

              {/* Permissions Groups Accordion / List */}
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Manage Permissions
              </Text>

              {PERMISSION_GROUPS.map((group) => {
                const groupPerms = group.permissions;
                const activeInGroup = groupPerms.filter((p) => permissionsState[p.id]).length;
                const allSelected = activeInGroup === groupPerms.length;

                return (
                  <View
                    key={group.id}
                    style={[
                      styles.groupCard,
                      { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
                    ]}
                  >
                    <View style={styles.groupHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.groupName, { color: theme.colors.textPrimary }]}>
                          {group.name}
                        </Text>
                        <Text style={[styles.groupSub, { color: theme.colors.textMuted }]}>
                          {activeInGroup} of {groupPerms.length} enabled
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.toggleGroupBtn}
                        onPress={() => toggleGroupAll(group.id, !allSelected)}
                      >
                        <Text style={styles.toggleGroupBtnText}>
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.permItemsGrid}>
                      {groupPerms.map((perm) => {
                        const isChecked = !!permissionsState[perm.id];
                        return (
                          <TouchableOpacity
                            key={perm.id}
                            style={styles.permItemRow}
                            onPress={() => togglePermission(perm.id)}
                            activeOpacity={0.7}
                          >
                            <View
                              style={[
                                styles.checkbox,
                                isChecked
                                  ? { backgroundColor: '#A855F7', borderColor: '#A855F7' }
                                  : { borderColor: theme.colors.borderGlass },
                              ]}
                            >
                              {isChecked && <Feather name="check" size={12} color="#FFF" />}
                            </View>
                            <Text
                              style={[
                                styles.permItemLabel,
                                { color: isChecked ? theme.colors.textPrimary : theme.colors.textSecondary },
                              ]}
                            >
                              {perm.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Modal Bottom Actions */}
            <View style={[styles.modalFooter, { borderTopColor: theme.colors.borderGlass }]}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.colors.borderGlass }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Feather name="check-circle" size={16} color="#FFF" />
                <Text style={styles.saveBtnText}>
                  {editingStaffId ? 'Update Staff' : 'Save Staff Member'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SUBSCRIPTION MODAL */}
      <SubscriptionModal
        visible={showSubModal}
        onClose={() => setShowSubModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
    maxWidth: 240,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#A855F7',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    shadowColor: '#A855F7',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 260,
  },
  staffCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  staffName: {
    fontSize: 15,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  roleBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  roleBadgeText: {
    color: '#A855F7',
    fontSize: 10,
    fontWeight: '700',
  },
  permPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  permPillText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  contactText: {
    fontSize: 11,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    padding: 18,
    gap: 14,
  },
  formGroup: {
    gap: 6,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleSelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleRadio: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#71717A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleRadioDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A855F7',
  },
  roleSelectText: {
    fontSize: 12,
    fontWeight: '700',
  },
  permNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: 'rgba(168, 85, 247, 0.25)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  permNoticeTitle: {
    color: '#D8B4FE',
    fontSize: 12,
    fontWeight: '700',
  },
  permNoticeSub: {
    color: '#A1A1AA',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 6,
  },
  groupCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupName: {
    fontSize: 13,
    fontWeight: '700',
  },
  groupSub: {
    fontSize: 10,
    marginTop: 1,
  },
  toggleGroupBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
  },
  toggleGroupBtnText: {
    color: '#A855F7',
    fontSize: 10,
    fontWeight: '700',
  },
  permItemsGrid: {
    gap: 8,
    paddingTop: 4,
  },
  permItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permItemLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#A855F7',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
