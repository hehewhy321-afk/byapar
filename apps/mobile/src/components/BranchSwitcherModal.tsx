import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

interface BranchSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenSubscription?: () => void;
}

export const BranchSwitcherModal: React.FC<BranchSwitcherModalProps> = ({
  visible,
  onClose,
  onOpenSubscription,
}) => {
  const { theme, store, activeBizId, userStores, switchStore, createStore, user } = useApp();

  const [isCreating, setIsCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pan, setPan] = useState('');
  const [address, setAddress] = useState('');

  const handleSelectStore = async (bizId: string) => {
    if (bizId === activeBizId) {
      onClose();
      return;
    }
    setSwitchingId(bizId);
    try {
      await switchStore(bizId);
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to switch store');
    } finally {
      setSwitchingId(null);
    }
  };

  const handleCreateStore = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter a name for the new branch.');
      return;
    }

    setSubmitting(true);
    const res = await createStore({
      name: name.trim(),
      phone: phone.trim() || undefined,
      pan: pan.trim() || undefined,
      address: address.trim() || undefined,
    });
    setSubmitting(false);

    if (res.success) {
      setIsCreating(false);
      setName('');
      setPhone('');
      setPan('');
      setAddress('');
      Alert.alert('Branch Created', `Successfully switched to "${name.trim()}".`);
      onClose();
    } else {
      if (res.error?.includes('limit reached')) {
        Alert.alert(
          'Store Limit Reached',
          res.error,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Upgrade Plan',
              onPress: () => {
                onClose();
                if (onOpenSubscription) onOpenSubscription();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', res.error || 'Failed to create branch');
      }
    }
  };

  // Compile stores list (fall back to active store if userStores empty)
  const displayStores =
    userStores && userStores.length > 0
      ? userStores
      : [
          {
            businessId: activeBizId,
            businessName: store.name || 'Main Branch',
            role: 'owner',
            phone: store.phone,
            address: store.address,
          },
        ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Feather name="layers" size={20} color="#3B82F6" />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                  {isCreating ? 'Add Store Branch' : 'Store Branches'}
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textMuted }]}>
                  {isCreating
                    ? 'Setup an additional store branch'
                    : `${displayStores.length} store${displayStores.length > 1 ? 's' : ''} in your account`}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {!isCreating ? (
              <>
                <Text style={[styles.sectionHeading, { color: theme.colors.textMuted }]}>
                  SELECT ACTIVE STORE
                </Text>

                {displayStores.map((s) => {
                  const isActive = s.businessId === activeBizId;
                  const isSwitching = switchingId === s.businessId;

                  return (
                    <TouchableOpacity
                      key={s.businessId}
                      style={[
                        styles.storeCard,
                        {
                          backgroundColor: isActive ? 'rgba(59, 130, 246, 0.08)' : theme.colors.surface,
                          borderColor: isActive ? '#3B82F6' : theme.colors.borderGlass,
                        },
                      ]}
                      onPress={() => handleSelectStore(s.businessId)}
                      disabled={isSwitching}
                      activeOpacity={0.7}
                    >
                      <View style={styles.storeCardLeft}>
                        <View
                          style={[
                            styles.storeIconBox,
                            {
                              backgroundColor: isActive ? '#3B82F6' : 'rgba(255,255,255,0.06)',
                            },
                          ]}
                        >
                          <Feather
                            name="shopping-bag"
                            size={18}
                            color={isActive ? '#FFFFFF' : theme.colors.textSecondary}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <View style={styles.storeTitleRow}>
                            <Text
                              style={[
                                styles.storeName,
                                {
                                  color: isActive ? '#3B82F6' : theme.colors.textPrimary,
                                  fontWeight: isActive ? '700' : '600',
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {s.businessName}
                            </Text>
                            {isActive && (
                              <View style={styles.activePill}>
                                <Text style={styles.activePillText}>Active</Text>
                              </View>
                            )}
                          </View>

                          <Text style={[styles.storeMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>
                            Role: {s.role || 'Owner'}
                            {s.address ? ` • ${s.address}` : ''}
                          </Text>
                        </View>
                      </View>

                      {isSwitching ? (
                        <ActivityIndicator size="small" color="#3B82F6" />
                      ) : isActive ? (
                        <Feather name="check-circle" size={20} color="#3B82F6" />
                      ) : (
                        <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  );
                })}

                {/* Add Branch Button */}
                <TouchableOpacity
                  style={[styles.addBranchBtn, { borderColor: theme.colors.borderGlass }]}
                  onPress={() => {
                    if (!user) {
                      Alert.alert('Sign In Required', 'Please sign in to add additional store branches.');
                      return;
                    }
                    setIsCreating(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="plus-circle" size={18} color={theme.colors.primary} />
                  <Text style={[styles.addBranchBtnText, { color: theme.colors.primary }]}>
                    Add New Branch / Store
                  </Text>
                </TouchableOpacity>

                {/* Multi-store plan note */}
                <View
                  style={[
                    styles.planInfoBox,
                    { backgroundColor: 'rgba(59, 130, 246, 0.06)', borderColor: 'rgba(59, 130, 246, 0.2)' },
                  ]}
                >
                  <Feather name="info" size={16} color="#3B82F6" style={{ marginTop: 2 }} />
                  <Text style={[styles.planInfoText, { color: theme.colors.textSecondary }]}>
                    Branch Limits: Free & Starter include 1 store. Pro includes 2 stores. Enterprise includes up to 5 stores with unified analytics.
                  </Text>
                </View>
              </>
            ) : (
              /* Create Store Form */
              <View style={styles.createForm}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Store / Branch Name *
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.borderGlass,
                        color: theme.colors.textPrimary,
                      },
                    ]}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Byapar Mart - New Road Branch"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Store Phone Number
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.borderGlass,
                        color: theme.colors.textPrimary,
                      },
                    ]}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholder="e.g. 9801234567"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    PAN / VAT Number
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.borderGlass,
                        color: theme.colors.textPrimary,
                      },
                    ]}
                    value={pan}
                    onChangeText={setPan}
                    keyboardType="numeric"
                    placeholder="e.g. 601234567"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Address / Location
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.borderGlass,
                        color: theme.colors.textPrimary,
                      },
                    ]}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="e.g. New Road, Ward 22, Kathmandu"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                <View style={styles.formActionsRow}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: theme.colors.borderGlass }]}
                    onPress={() => setIsCreating(false)}
                    disabled={submitting}
                  >
                    <Text style={[styles.cancelBtnText, { color: theme.colors.textSecondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={handleCreateStore}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Create & Switch</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 2,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  storeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  storeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storeName: {
    fontSize: 14,
  },
  activePill: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activePillText: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '700',
  },
  storeMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  addBranchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 6,
    marginBottom: 16,
  },
  addBranchBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  planInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  planInfoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  createForm: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 2,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  formActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
