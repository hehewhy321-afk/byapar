import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Theme } from '../theme';
import { useApp } from '../context/AppContext';
import { ReminderItem } from '../types';
import { FadeInView } from '../components/common/FadeInView';
import { EmptyState } from '../components/common/EmptyState';

export const RemindersScreen: React.FC = () => {
  const {
    reminders,
    addReminder,
    toggleReminderStatus,
    deleteReminder,
    parties,
    theme,
    themeMode,
    language,
    refreshData,
  } = useApp();

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (e) {
      console.warn('[RemindersScreen] Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const styles = useMemo(() => createStyles(theme, themeMode), [theme, themeMode]);
  const isDark = themeMode === 'dark';
  const ne = language === 'ne';

  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [typeFilter, setTypeFilter] = useState<'all' | 'payment_reminder' | 'task_reminder' | 'event_reminder'>('all');
  const [modalVisible, setModalVisible] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [partyId, setPartyId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState('10:00');
  const [reminderType, setReminderType] = useState<'payment_reminder' | 'task_reminder' | 'event_reminder'>('payment_reminder');
  const [frequency, setFrequency] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [note, setNote] = useState('');

  const upcomingReminders = useMemo(() => reminders.filter((r) => r.status === 'upcoming'), [reminders]);
  const completedReminders = useMemo(() => reminders.filter((r) => r.status === 'completed'), [reminders]);

  const displayedReminders = useMemo(() => {
    const list = activeTab === 'upcoming' ? upcomingReminders : completedReminders;
    if (typeFilter === 'all') return list;
    return list.filter((r) => r.reminderType === typeFilter);
  }, [activeTab, upcomingReminders, completedReminders, typeFilter]);

  const handleSelectParty = (id: string) => {
    setPartyId(id);
    if (!id) return;
    const p = parties.find((item) => item.id === id);
    if (p) {
      if (!title) {
        setTitle(ne ? `${p.name} - भुक्तानी रिमाइन्डर` : `Payment reminder for ${p.name}`);
      }
      if (p.balance > 0 && !amount) {
        setAmount(p.balance.toString());
      }
    }
  };

  const handleOpenAddModal = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setTitle('');
    setPartyId('');
    setAmount('');
    setDueDate(tomorrow.toISOString().split('T')[0]);
    setDueTime('10:00');
    setReminderType('payment_reminder');
    setFrequency('once');
    setNote('');
    setModalVisible(true);
  };

  const handleSaveReminder = async () => {
    if (!title.trim()) {
      Alert.alert(ne ? 'आवश्यक' : 'Required', ne ? 'कृपया रिमाइन्डर शीर्षक राख्नुहोस्।' : 'Please enter a reminder title.');
      return;
    }
    if (!dueDate.trim()) {
      Alert.alert(ne ? 'आवश्यक' : 'Required', ne ? 'कृपया मिति राख्नुहोस्।' : 'Please enter a due date.');
      return;
    }

    const selectedParty = parties.find((p) => p.id === partyId);

    try {
      await addReminder({
        title: title.trim(),
        partyId: partyId || undefined,
        partyName: selectedParty?.name,
        amount: amount ? Number(amount) : undefined,
        dueDate: dueDate.trim(),
        dueTime: dueTime.trim() || undefined,
        reminderType,
        frequency,
        note: note.trim() || undefined,
        status: 'upcoming',
      });
      setModalVisible(false);
    } catch {
      Alert.alert(ne ? 'त्रुटि' : 'Error', ne ? 'रिमाइन्डर सेभ गर्न सकिएन।' : 'Failed to save reminder.');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      ne ? 'रिमाइन्डर मेटाउने' : 'Delete Reminder',
      ne ? 'के तपाईं यो रिमाइन्डर हटाउन निश्चित हुनुहुन्छ?' : 'Are you sure you want to delete this reminder?',
      [
        { text: ne ? 'रद्द' : 'Cancel', style: 'cancel' },
        {
          text: ne ? 'मेटाउनुहोस्' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteReminder(id);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Top Header / Actions */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.screenTitle}>{ne ? 'रिमाइन्डरहरू' : 'Reminders'}</Text>
          <Text style={styles.screenSub}>
            {ne
              ? `${upcomingReminders.length} बाँकी रिमाइन्डरहरू`
              : `${upcomingReminders.length} upcoming reminders`}
          </Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddModal} activeOpacity={0.85}>
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>{ne ? 'नयाँ रिमाइन्डर' : 'Add Reminder'}</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'upcoming' && styles.tabBtnActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'upcoming' && styles.tabBtnTextActive]}>
            {ne ? 'आगामी' : 'Upcoming'} ({upcomingReminders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'completed' && styles.tabBtnActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'completed' && styles.tabBtnTextActive]}>
            {ne ? 'सम्पन्न' : 'Completed'} ({completedReminders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Type Filter Pills */}
      <View style={styles.filterPillsRow}>
        {(['all', 'payment_reminder', 'task_reminder', 'event_reminder'] as const).map((t) => {
          const isActive = typeFilter === t;
          const label =
            t === 'all'
              ? (ne ? 'सबै' : 'All')
              : t === 'payment_reminder'
              ? (ne ? 'भुक्तानी' : 'Payment')
              : t === 'task_reminder'
              ? (ne ? 'कार्य' : 'Task')
              : (ne ? 'कार्यक्रम' : 'Event');
          return (
            <TouchableOpacity
              key={t}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => setTypeFilter(t)}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={displayedReminders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        renderItem={({ item, index }) => {
          const isDone = item.status === 'completed';
          return (
            <FadeInView delay={Math.min(index * 30, 200)}>
              <View style={[styles.card, isDone && styles.cardDone]}>
                {/* Toggle Button */}
                <TouchableOpacity
                  style={[styles.checkBtn, isDone && styles.checkBtnDone]}
                  onPress={() => toggleReminderStatus(item.id)}
                  activeOpacity={0.8}
                >
                  {isDone ? (
                    <Feather name="check" size={14} color="#FFFFFF" />
                  ) : (
                    <View style={styles.checkCircle} />
                  )}
                </TouchableOpacity>

                {/* Content */}
                <View style={styles.cardContent}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.cardTitle, isDone && styles.textStrikethrough]}>
                      {item.title}
                    </Text>

                    <View
                      style={[
                        styles.typeBadge,
                        item.reminderType === 'payment_reminder'
                          ? styles.badgePayment
                          : item.reminderType === 'task_reminder'
                          ? styles.badgeTask
                          : styles.badgeEvent,
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeBadgeText,
                          item.reminderType === 'payment_reminder'
                            ? styles.textGreen
                            : item.reminderType === 'task_reminder'
                            ? styles.textBlue
                            : styles.textPurple,
                        ]}
                      >
                        {item.reminderType === 'task_reminder'
                          ? (ne ? 'कार्य' : 'Task')
                          : item.reminderType === 'event_reminder'
                          ? (ne ? 'कार्यक्रम' : 'Event')
                          : (ne ? 'भुक्तानी' : 'Payment')}
                      </Text>
                    </View>
                  </View>

                  {/* Meta details */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Feather name="calendar" size={12} color={theme.colors.textMuted} />
                      <Text style={styles.metaText}>{item.dueDate}</Text>
                    </View>

                    {item.dueTime ? (
                      <View style={styles.metaItem}>
                        <Feather name="clock" size={12} color={theme.colors.textMuted} />
                        <Text style={styles.metaText}>{item.dueTime}</Text>
                      </View>
                    ) : null}

                    {item.partyName ? (
                      <View style={styles.partyTag}>
                        <Feather name="user" size={11} color={theme.colors.primary} />
                        <Text style={styles.partyTagText}>{item.partyName}</Text>
                      </View>
                    ) : null}

                    {item.amount ? (
                      <Text style={styles.amountText}>
                        Rs. {item.amount.toLocaleString()}
                      </Text>
                    ) : null}
                  </View>

                  {item.note ? (
                    <Text style={styles.noteText} numberOfLines={2}>
                      {item.note}
                    </Text>
                  ) : null}
                </View>

                {/* Delete button */}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item.id)}
                  activeOpacity={0.8}
                >
                  <Feather name="trash-2" size={14} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
            </FadeInView>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="bell"
            title={activeTab === 'upcoming' ? (ne ? 'कुनै रिमाइन्डर छैन' : 'No upcoming reminders') : (ne ? 'कुनै सम्पन्न रिमाइन्डर छैन' : 'No completed reminders')}
            subtitle={ne ? 'नयाँ भुक्तानी वा कार्य रिमाइन्डर थप्न माथिको बटन थिच्नुहोस्।' : 'Tap Add Reminder to schedule new tasks or payment alerts.'}
          />
        }
      />

      {/* Add Reminder Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <FadeInView duration={240} translateY={20} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{ne ? 'नयाँ रिमाइन्डर सिर्जना' : 'Create Reminder'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 6 }}>
                <Feather name="x" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Type selector */}
              <Text style={styles.inputLabel}>{ne ? 'रिमाइन्डर प्रकार' : 'Reminder Type'}</Text>
              <View style={styles.typeSelectorRow}>
                <TouchableOpacity
                  style={[styles.typeSelBtn, reminderType === 'payment_reminder' && styles.typeSelBtnPayment]}
                  onPress={() => setReminderType('payment_reminder')}
                >
                  <Feather name="dollar-sign" size={13} color={reminderType === 'payment_reminder' ? '#10B981' : theme.colors.textMuted} />
                  <Text style={[styles.typeSelText, reminderType === 'payment_reminder' && styles.textGreen]}>
                    {ne ? 'भुक्तानी' : 'Payment'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeSelBtn, reminderType === 'task_reminder' && styles.typeSelBtnTask]}
                  onPress={() => setReminderType('task_reminder')}
                >
                  <Feather name="check-square" size={13} color={reminderType === 'task_reminder' ? '#3B82F6' : theme.colors.textMuted} />
                  <Text style={[styles.typeSelText, reminderType === 'task_reminder' && styles.textBlue]}>
                    {ne ? 'कार्य' : 'Task'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeSelBtn, reminderType === 'event_reminder' && styles.typeSelBtnEvent]}
                  onPress={() => setReminderType('event_reminder')}
                >
                  <Feather name="calendar" size={13} color={reminderType === 'event_reminder' ? '#8B5CF6' : theme.colors.textMuted} />
                  <Text style={[styles.typeSelText, reminderType === 'event_reminder' && styles.textPurple]}>
                    {ne ? 'कार्यक्रम' : 'Event'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Title */}
              <Text style={styles.inputLabel}>{ne ? 'शीर्षक *' : 'Title *'}</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={ne ? 'रिमाइन्डर शीर्षक...' : 'Reminder title...'}
                placeholderTextColor={theme.colors.textMuted}
              />

              {/* Party selection */}
              <Text style={styles.inputLabel}>{ne ? 'सम्पर्क छान्नुहोस् (वैकल्पिक)' : 'Select Contact (Optional)'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                <TouchableOpacity
                  style={[styles.partyPill, !partyId && styles.partyPillActive]}
                  onPress={() => handleSelectParty('')}
                >
                  <Text style={[styles.partyPillText, !partyId && styles.partyPillTextActive]}>
                    {ne ? 'कुनै छैन' : 'None'}
                  </Text>
                </TouchableOpacity>
                {parties.map((p) => {
                  const isSelected = partyId === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.partyPill, isSelected && styles.partyPillActive]}
                      onPress={() => handleSelectParty(p.id)}
                    >
                      <Text style={[styles.partyPillText, isSelected && styles.partyPillTextActive]}>
                        {p.name} {p.balance > 0 ? `(Rs. ${p.balance.toLocaleString()})` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Date & Time */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{ne ? 'मिति *' : 'Due Date *'}</Text>
                  <TextInput
                    style={styles.input}
                    value={dueDate}
                    onChangeText={setDueDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{ne ? 'समय' : 'Due Time'}</Text>
                  <TextInput
                    style={styles.input}
                    value={dueTime}
                    onChangeText={setDueTime}
                    placeholder="HH:MM"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
              </View>

              {/* Amount */}
              <Text style={styles.inputLabel}>{ne ? 'रकम (वैकल्पिक रु.)' : 'Amount (Optional NPR)'}</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={theme.colors.textMuted}
              />

              {/* Note */}
              <Text style={styles.inputLabel}>{ne ? 'कैफियत / नोट' : 'Note (Optional)'}</Text>
              <TextInput
                style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={2}
                placeholder={ne ? 'थप विवरण...' : 'Additional details...'}
                placeholderTextColor={theme.colors.textMuted}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>{ne ? 'रद्द' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveReminder}>
                <Text style={styles.modalSaveText}>{ne ? 'सेभ गर्नुहोस्' : 'Save Reminder'}</Text>
              </TouchableOpacity>
            </View>
          </FadeInView>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: Theme, themeMode: 'dark' | 'light') => {
  const isDark = themeMode === 'dark';
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    topHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
    screenTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: theme.colors.textPrimary,
    },
    screenSub: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 12,
    },
    addBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    tabsRow: {
      flexDirection: 'row',
      marginHorizontal: 16,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      padding: 4,
      marginBottom: 10,
    },
    tabBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 9,
    },
    tabBtnActive: {
      backgroundColor: theme.colors.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    tabBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textMuted,
    },
    tabBtnTextActive: {
      color: theme.colors.textPrimary,
      fontWeight: '800',
    },
    filterPillsRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 6,
      marginBottom: 12,
    },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    },
    pillActive: {
      backgroundColor: theme.colors.primary,
    },
    pillText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    pillTextActive: {
      color: '#FFFFFF',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 40,
      gap: 10,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: 14,
      gap: 12,
    },
    cardDone: {
      opacity: 0.6,
    },
    checkBtn: {
      width: 22,
      height: 22,
      borderRadius: 7,
      borderWidth: 1.5,
      borderColor: theme.colors.borderGlass,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    checkBtnDone: {
      backgroundColor: '#10B981',
      borderColor: '#10B981',
    },
    checkCircle: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    cardContent: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      flex: 1,
    },
    textStrikethrough: {
      textDecorationLine: 'line-through',
      color: theme.colors.textMuted,
    },
    typeBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
    },
    badgePayment: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    badgeTask: {
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: 'rgba(59, 130, 246, 0.25)',
    },
    badgeEvent: {
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      borderColor: 'rgba(139, 92, 246, 0.25)',
    },
    typeBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 10,
      marginTop: 4,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 11,
      fontFamily: 'monospace',
      color: theme.colors.textMuted,
    },
    partyTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    partyTagText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    amountText: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.colors.primary,
    },
    noteText: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 6,
      fontStyle: 'italic',
    },
    deleteBtn: {
      padding: 6,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      maxHeight: '85%',
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderGlass,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    modalBody: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 16,
    },
    inputLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      marginBottom: 6,
      marginTop: 10,
    },
    typeSelectorRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 4,
    },
    typeSelBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
    },
    typeSelBtnPayment: {
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    typeSelBtnTask: {
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    typeSelBtnEvent: {
      borderColor: '#8B5CF6',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
    },
    typeSelText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    partyPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      marginRight: 6,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
    },
    partyPillActive: {
      borderColor: theme.colors.primary,
      backgroundColor: 'rgba(255, 69, 0, 0.12)',
    },
    partyPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    partyPillTextActive: {
      color: theme.colors.primary,
      fontWeight: '800',
    },
    input: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      color: theme.colors.textPrimary,
    },
    modalFooter: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderGlass,
      gap: 10,
    },
    modalCancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
    },
    modalCancelText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    modalSaveBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
    },
    modalSaveText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    textGreen: {
      color: '#10B981',
    },
    textBlue: {
      color: '#3B82F6',
    },
    textPurple: {
      color: '#8B5CF6',
    },
  });
};
