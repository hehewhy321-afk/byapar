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
  Share,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Theme } from '../theme';
import { useApp } from '../context/AppContext';
import { NoteItem } from '../types';
import { FadeInView } from '../components/common/FadeInView';
import { EmptyState } from '../components/common/EmptyState';

const CATEGORIES = ['All', 'Daily Accounts', 'Supplier Orders', 'Cheque to Clear', 'General'];

const COLORS: { key: string; label: string; bgLight: string; bgDark: string; borderLight: string; borderDark: string; textLight: string; textDark: string; dot: string }[] = [
  {
    key: 'emerald',
    label: 'Emerald',
    bgLight: '#ecfdf5',
    bgDark: '#064e3b25',
    borderLight: '#a7f3d0',
    borderDark: '#065f46',
    textLight: '#065f46',
    textDark: '#6ee7b7',
    dot: '#10b981',
  },
  {
    key: 'amber',
    label: 'Amber',
    bgLight: '#fffbeb',
    bgDark: '#78350f25',
    borderLight: '#fde68a',
    borderDark: '#92400e',
    textLight: '#92400e',
    textDark: '#fcd34d',
    dot: '#f59e0b',
  },
  {
    key: 'blue',
    label: 'Blue',
    bgLight: '#eff6ff',
    bgDark: '#1e3a8a25',
    borderLight: '#bfdbfe',
    borderDark: '#1e40af',
    textLight: '#1e40af',
    textDark: '#93c5fd',
    dot: '#3b82f6',
  },
  {
    key: 'rose',
    label: 'Rose',
    bgLight: '#fff1f2',
    bgDark: '#88133725',
    borderLight: '#fecdd3',
    borderDark: '#9f1239',
    textLight: '#9f1239',
    textDark: '#fda4af',
    dot: '#f43f5e',
  },
  {
    key: 'purple',
    label: 'Purple',
    bgLight: '#faf5ff',
    bgDark: '#581c8725',
    borderLight: '#e9d5ff',
    borderDark: '#6b21a8',
    textLight: '#6b21a8',
    textDark: '#d8b4fe',
    dot: '#a855f7',
  },
];

export const NotesScreen: React.FC = () => {
  const { notes, addNote, editNote, deleteNote, togglePinNote, theme, themeMode, language, refreshData } = useApp();

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (e) {
      console.warn('[NotesScreen] Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const styles = useMemo(() => createStyles(theme, themeMode), [theme, themeMode]);
  const isDark = themeMode === 'dark';
  const ne = language === 'ne';

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Daily Accounts');
  const [color, setColor] = useState('emerald');

  const activeEditingNote = useMemo(() => {
    return editingNoteId ? notes.find((n) => n.id === editingNoteId) : null;
  }, [editingNoteId, notes]);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return [...notes]
      .filter((n) => {
        const matchesCat = selectedCategory === 'All' || n.category === selectedCategory;
        const matchesSearch = !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
        return matchesCat && matchesSearch;
      })
      .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  }, [notes, selectedCategory, searchQuery]);

  const handleOpenAdd = () => {
    setEditingNoteId(null);
    setTitle('');
    setContent('');
    setCategory('Daily Accounts');
    setColor('emerald');
    setModalVisible(true);
  };

  const handleOpenEdit = (n: NoteItem) => {
    setEditingNoteId(n.id);
    setTitle(n.title);
    setContent(n.content);
    setCategory(n.category || 'Daily Accounts');
    setColor(n.color || 'emerald');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(ne ? 'त्रुटि' : 'Error', ne ? 'कृपया नोटको शीर्षक लेख्नुहोस्' : 'Please enter note title');
      return;
    }
    if (!content.trim()) {
      Alert.alert(ne ? 'त्रुटि' : 'Error', ne ? 'कृपया नोटको विवरण लेख्नुहोस्' : 'Please enter note content');
      return;
    }

    try {
      if (editingNoteId) {
        // Creation date/time is immutable, updates only title, content, category, and color
        await editNote(editingNoteId, {
          title: title.trim(),
          content: content.trim(),
          category,
          color,
        });
      } else {
        await addNote({
          title: title.trim(),
          content: content.trim(),
          category,
          color,
          isPinned: false,
        });
      }
      setModalVisible(false);
    } catch {
      Alert.alert(ne ? 'त्रुटि' : 'Error', ne ? 'नोट सुरक्षित गर्न सकिएन' : 'Failed to save note');
    }
  };

  const handleDelete = (n: NoteItem) => {
    Alert.alert(
      ne ? 'नोट मेटाउनुहोस्' : 'Delete Note',
      ne ? `के तपाईं "${n.title}" मेटाउन निश्चित हुनुहुन्छ?` : `Are you sure you want to delete "${n.title}"?`,
      [
        { text: ne ? 'रद्द गर्नुहोस्' : 'Cancel', style: 'cancel' },
        {
          text: ne ? 'मेटाउनुहोस्' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteNote(n.id);
          },
        },
      ]
    );
  };

  const handleShare = async (n: NoteItem) => {
    try {
      await Share.share({
        title: n.title,
        message: `*${n.title}*\n\n${n.content}\n\n[Byapar Daily Notes]`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderNoteCard = ({ item }: { item: NoteItem }) => {
    const colorTheme = COLORS.find((c) => c.key === item.color) || COLORS[0];

    return (
      <FadeInView>
        <View
          style={[
            styles.noteCard,
            {
              backgroundColor: isDark ? colorTheme.bgDark : colorTheme.bgLight,
              borderColor: isDark ? colorTheme.borderDark : colorTheme.borderLight,
            },
          ]}
        >
          {/* Header Row: Category Badge & Pin */}
          <View style={styles.cardHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: isDark ? colorTheme.borderDark : colorTheme.borderLight }]}>
              <Text style={[styles.categoryBadgeText, { color: isDark ? colorTheme.textDark : colorTheme.textLight }]}>
                {item.category}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => togglePinNote(item.id)}
              style={styles.pinBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather
                name="bookmark"
                size={16}
                color={item.isPinned ? '#f59e0b' : theme.colors.textMuted}
                style={item.isPinned ? { transform: [{ rotate: '45deg' }] } : undefined}
              />
            </TouchableOpacity>
          </View>

          {/* Title & Content */}
          <Text style={[styles.noteTitle, { color: theme.colors.textPrimary }]}>{item.title}</Text>
          <Text style={[styles.noteContent, { color: isDark ? '#d1d5db' : '#374151' }]}>{item.content}</Text>

          {/* Locked Creation Date/Time Footer */}
          <View style={[styles.cardFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={styles.lockedTimestampRow}>
              <Feather name="lock" size={12} color="#f59e0b" style={{ marginRight: 4 }} />
              <Text style={[styles.lockedDateText, { color: theme.colors.textMuted }]}>
                {ne ? 'सिर्जना:' : 'Created:'} {formatDateTime(item.createdAt || item.updatedAt)}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={() => handleShare(item)} style={styles.actionIconBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Feather name="share-2" size={15} color={theme.colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleOpenEdit(item)} style={styles.actionIconBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Feather name="edit-2" size={15} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionIconBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Feather name="trash-2" size={15} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </FadeInView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{ne ? 'दैनिक नोट पुस्तिका' : 'Daily Notebook'}</Text>
          <Text style={styles.subtitle}>
            {ne ? 'कामहरू सुरक्षित राख्नुहोस्' : 'Keep tasks organized'}
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.addBtnText}>{ne ? 'नयाँ नोट' : 'New Note'}</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={16} color={theme.colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={ne ? 'नोट खोज्नुहोस्...' : 'Search notes...'}
          placeholderTextColor={theme.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category Pills */}
      <View style={styles.categoriesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillActive,
                ]}
              >
                <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notes List */}
      <FlatList
        data={filteredNotes}
        keyExtractor={(item) => item.id}
        renderItem={renderNoteCard}
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
        ListEmptyComponent={
          <EmptyState
            icon="book-open"
            title={ne ? 'कुनै नोट फेला परेन' : 'No Notes Found'}
            subtitle={
              ne
                ? 'नयाँ नोट थप्न माथिको "नयाँ नोट" बटनमा थिच्नुहोस्।'
                : 'Tap "New Note" to keep your store organized.'
            }
          />
        }
      />

      {/* Create / Edit Note Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingNoteId
                  ? (ne ? 'नोट सम्पादन गर्नुहोस्' : 'Edit Note')
                  : (ne ? 'नयाँ नोट सिर्जना गर्नुहोस्' : 'Create New Note')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              {/* Prominent Locked Timestamp Banner when Editing */}
              {editingNoteId && activeEditingNote ? (
                <View style={styles.lockedBanner}>
                  <Feather name="lock" size={16} color="#d97706" style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lockedBannerTitle}>
                      {ne ? 'सिर्जना गरिएको मिति र समय (लक गरिएको):' : 'Created Date & Time (Locked):'}
                    </Text>
                    <Text style={styles.lockedBannerTimestamp}>
                      {formatDateTime(activeEditingNote.createdAt || activeEditingNote.updatedAt)}
                    </Text>
                  </View>
                  <View style={styles.lockedTag}>
                    <Text style={styles.lockedTagText}>{ne ? 'अपरिवर्तनीय' : 'Immutable'}</Text>
                  </View>
                </View>
              ) : null}

              {/* Title Input */}
              <Text style={styles.inputLabel}>{ne ? 'शीर्षक *' : 'Title *'}</Text>
              <TextInput
                style={styles.input}
                placeholder={ne ? 'उदा. कालिमाटीबाट तरकारी अर्डर' : 'e.g. Kalimati vegetable order'}
                placeholderTextColor={theme.colors.textMuted}
                value={title}
                onChangeText={setTitle}
              />

              {/* Category Selector */}
              <Text style={styles.inputLabel}>{ne ? 'वर्ग (Category)' : 'Category'}</Text>
              <View style={styles.modalCategoryRow}>
                {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[
                      styles.modalCatChip,
                      category === cat && styles.modalCatChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalCatChipText,
                        category === cat && styles.modalCatChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Color Tag Selector */}
              <Text style={styles.inputLabel}>{ne ? 'नोट रङ' : 'Note Color'}</Text>
              <View style={styles.colorPaletteRow}>
                {COLORS.map((c) => {
                  const isSelected = color === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      onPress={() => setColor(c.key)}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: c.dot },
                        isSelected && styles.colorSwatchActive,
                      ]}
                    >
                      {isSelected ? <Feather name="check" size={14} color="#fff" /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Content Textarea */}
              <Text style={styles.inputLabel}>{ne ? 'नोट विवरण *' : 'Note Content *'}</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder={ne ? 'नोटको सम्पूर्ण विवरण यहाँ लेख्नुहोस्...' : 'Write all details here...'}
                placeholderTextColor={theme.colors.textMuted}
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </ScrollView>

            {/* Modal Footer Buttons */}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>{ne ? 'रद्द गर्नुहोस्' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>
                  {editingNoteId ? (ne ? 'परिवर्तन सुरक्षित गर्नुहोस्' : 'Save Changes') : (ne ? 'नोट थप्नुहोस्' : 'Create Note')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: Theme, mode: 'light' | 'dark') => {
  const isDark = mode === 'dark';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      gap: 6,
    },
    addBtnText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '600',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
      marginHorizontal: 16,
      marginBottom: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      height: 40,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.textPrimary,
      paddingVertical: 0,
    },
    categoriesWrapper: {
      marginBottom: 8,
    },
    categoriesContent: {
      paddingHorizontal: 16,
      gap: 8,
    },
    categoryPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#e5e7eb',
    },
    categoryPillActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    categoryPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    categoryPillTextActive: {
      color: '#fff',
    },
    listContent: {
      padding: 16,
      paddingTop: 8,
      gap: 12,
      paddingBottom: 40,
    },
    noteCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    categoryBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    categoryBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    pinBtn: {
      padding: 4,
    },
    noteTitle: {
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 6,
    },
    noteContent: {
      fontSize: 13,
      lineHeight: 19,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
    },
    lockedTimestampRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    lockedDateText: {
      fontSize: 11,
      fontWeight: '500',
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    actionIconBtn: {
      padding: 2,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
      paddingBottom: 24,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    modalBody: {
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    lockedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#78350f30' : '#fffbeb',
      borderWidth: 1,
      borderColor: isDark ? '#b45309' : '#fde68a',
      borderRadius: 10,
      padding: 10,
      marginBottom: 14,
    },
    lockedBannerTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#fcd34d' : '#92400e',
    },
    lockedBannerTimestamp: {
      fontSize: 11,
      fontFamily: 'monospace',
      color: isDark ? '#fbbf24' : '#b45309',
      marginTop: 1,
    },
    lockedTag: {
      backgroundColor: isDark ? '#b4530950' : '#fef3c7',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    lockedTagText: {
      fontSize: 9,
      fontWeight: '700',
      color: isDark ? '#fde68a' : '#92400e',
      textTransform: 'uppercase',
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 6,
      marginTop: 10,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 14,
      color: theme.colors.textPrimary,
      backgroundColor: isDark ? '#111827' : '#fafafa',
    },
    textarea: {
      minHeight: 110,
    },
    modalCategoryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 4,
    },
    modalCatChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#e5e7eb',
    },
    modalCatChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    modalCatChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    modalCatChipTextActive: {
      color: '#fff',
    },
    colorPaletteRow: {
      flexDirection: 'row',
      gap: 12,
      marginVertical: 4,
    },
    colorSwatch: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorSwatchActive: {
      borderWidth: 2,
      borderColor: '#fff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 4,
      transform: [{ scale: 1.15 }],
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cancelBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    saveBtn: {
      flex: 1.5,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
    },
    saveBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
  });
};
