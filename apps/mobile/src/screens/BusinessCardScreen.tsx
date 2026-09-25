import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
  Linking,
  Alert,
} from 'react-native';
import { Feather, FontAwesome } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { Theme } from '../theme';
import { useApp } from '../context/AppContext';
import { FadeInView } from '../components/common/FadeInView';

type CardTemplate = 'minimalist' | 'nepali_heritage' | 'glassmorphism' | 'executive' | 'vibrant_retail';
type CardColor = 'emerald' | 'sapphire' | 'violet' | 'ruby' | 'gold' | 'onyx';

interface ColorPreset {
  key: CardColor;
  label: string;
  primary: string;
  secondary: string;
  accent: string;
  bgLight: string;
  bgDark: string;
}

const COLOR_PRESETS: ColorPreset[] = [
  {
    key: 'emerald',
    label: 'Emerald',
    primary: '#059669',
    secondary: '#064e3b',
    accent: '#34d399',
    bgLight: '#ecfdf5',
    bgDark: '#022c22',
  },
  {
    key: 'sapphire',
    label: 'Sapphire',
    primary: '#2563eb',
    secondary: '#1e3a8a',
    accent: '#60a5fa',
    bgLight: '#eff6ff',
    bgDark: '#172554',
  },
  {
    key: 'violet',
    label: 'Violet',
    primary: '#7c3aed',
    secondary: '#4c1d95',
    accent: '#a78bfa',
    bgLight: '#faf5ff',
    bgDark: '#2e1065',
  },
  {
    key: 'ruby',
    label: 'Ruby',
    primary: '#dc2626',
    secondary: '#881337',
    accent: '#f87171',
    bgLight: '#fff1f2',
    bgDark: '#4c0519',
  },
  {
    key: 'gold',
    label: 'Gold',
    primary: '#d97706',
    secondary: '#78350f',
    accent: '#fbbf24',
    bgLight: '#fffbeb',
    bgDark: '#451a03',
  },
  {
    key: 'onyx',
    label: 'Onyx',
    primary: '#27272a',
    secondary: '#09090b',
    accent: '#e4e4e7',
    bgLight: '#f4f4f5',
    bgDark: '#09090b',
  },
];

export const BusinessCardScreen: React.FC = () => {
  const { store, theme, themeMode, language } = useApp();
  const styles = useMemo(() => createStyles(theme, themeMode), [theme, themeMode]);
  const isDark = themeMode === 'dark';
  const ne = language === 'ne';

  // Form State initialized from Store Profile
  const [storeName, setStoreName] = useState(store.name || 'Apna Kirana Pasal');
  const [ownerName, setOwnerName] = useState(store.ownerName || 'Proprietor');
  const [tagline, setTagline] = useState('Wholesale & Retail Groceries at Best Prices');
  const [phone, setPhone] = useState(store.phone || '9800000000');
  const [whatsapp, setWhatsapp] = useState(store.phone || '9800000000');
  const [email, setEmail] = useState('contact@kirana.np');
  const [address, setAddress] = useState(store.address || 'Kathmandu, Nepal');
  const [pan, setPan] = useState(store.panNumber || '');

  // Customization
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplate>('minimalist');
  const [selectedColor, setSelectedColor] = useState<CardColor>('emerald');
  const [activeSection, setActiveSection] = useState<'preview' | 'edit'>('preview');

  const activeColor = useMemo(() => {
    return COLOR_PRESETS.find((c) => c.key === selectedColor) || COLOR_PRESETS[0];
  }, [selectedColor]);

  const templates: { id: CardTemplate; title: string; desc: string; icon: string }[] = [
    {
      id: 'minimalist',
      title: 'Modern Minimalist',
      desc: 'Clean geometric lines & dual accents',
      icon: 'layout',
    },
    {
      id: 'nepali_heritage',
      title: 'Nepali Heritage',
      desc: 'Royal crimson & double gold border',
      icon: 'shield',
    },
    {
      id: 'glassmorphism',
      title: 'Tech Glass',
      desc: 'Deep frosted card with mesh glow',
      icon: 'aperture',
    },
    {
      id: 'executive',
      title: 'Corporate Exec',
      desc: 'Obsidian black & gold formal crest',
      icon: 'briefcase',
    },
    {
      id: 'vibrant_retail',
      title: 'Vibrant Retailer',
      desc: 'High contrast dynamic brand gradient',
      icon: 'shopping-bag',
    },
  ];

  // WhatsApp Share
  const handleShareWhatsApp = async () => {
    const text =
      `🏪 *${storeName}*\n` +
      `_${tagline}_\n\n` +
      `👤 *Contact:* ${ownerName}\n` +
      `📍 *Location:* ${address}\n` +
      `📞 *Phone:* +977 ${phone}\n` +
      `💬 *WhatsApp:* https://wa.me/977${whatsapp.replace(/\D/g, '')}\n` +
      (email ? `✉️ *Email:* ${email}\n` : '') +
      (pan ? `🏢 *PAN/VAT:* ${pan}\n` : '') +
      `\n_Digital Business Card powered by Byapar Retail OS_`;

    const cleanNum = whatsapp.replace(/\D/g, '');
    const waUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
    const webWaUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

    try {
      const supported = await Linking.canOpenURL(waUrl);
      if (supported) {
        await Linking.openURL(waUrl);
      } else {
        await Linking.openURL(webWaUrl);
      }
    } catch {
      await Share.share({ title: storeName, message: text });
    }
  };

  // Print / Save Card PDF
  const handlePrintCard = async () => {
    const c = activeColor;
    const t = selectedTemplate;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${storeName} - Business Card</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f3f4f6;
            margin: 0;
            padding: 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .card-container {
            width: 3.5in;
            height: 2.0in;
            border-radius: 12px;
            padding: 18px 20px;
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            background: ${
              t === 'minimalist'
                ? '#ffffff'
                : t === 'nepali_heritage'
                ? 'linear-gradient(135deg, #500724 0%, #881337 50%, #1c1917 100%)'
                : t === 'glassmorphism'
                ? `linear-gradient(135deg, ${c.secondary} 0%, #0f172a 100%)`
                : t === 'executive'
                ? 'linear-gradient(135deg, #0f172a 0%, #020617 100%)'
                : `linear-gradient(135deg, ${c.primary} 0%, ${c.secondary} 100%)`
            };
            color: ${t === 'minimalist' ? '#111827' : '#ffffff'};
            border: ${
              t === 'minimalist'
                ? `2px solid ${c.primary}`
                : t === 'nepali_heritage'
                ? '3px solid #fbbf24'
                : '1px solid rgba(255,255,255,0.2)'
            };
          }
          .store-name {
            font-size: 16px;
            font-weight: 800;
            margin: 0;
            letter-spacing: -0.5px;
          }
          .tagline {
            font-size: 8.5px;
            color: ${t === 'minimalist' ? '#6b7280' : c.accent};
            margin-top: 2px;
          }
          .owner-name {
            font-size: 11px;
            font-weight: 700;
            margin-top: 6px;
          }
          .owner-title {
            font-size: 8px;
            color: ${t === 'minimalist' ? '#9ca3af' : 'rgba(255,255,255,0.7)'};
          }
          .footer {
            font-size: 8px;
            line-height: 1.3;
            border-top: 1px solid ${t === 'minimalist' ? '#e5e7eb' : 'rgba(255,255,255,0.15)'};
            padding-top: 6px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .pan-pill {
            background: ${t === 'minimalist' ? '#f3f4f6' : 'rgba(0,0,0,0.3)'};
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
            font-weight: bold;
            font-size: 7.5px;
          }
          .watermark {
            font-size: 10px;
            color: #9ca3af;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="card-container">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <h1 class="store-name">${storeName}</h1>
                <div class="tagline">${tagline}</div>
              </div>
              <div style="background:${c.primary}; color:#fff; font-weight:bold; font-size:10px; padding:3px 6px; border-radius:4px;">
                ${storeName.slice(0, 2).toUpperCase()}
              </div>
            </div>
            <div class="owner-name">${ownerName}</div>
            <div class="owner-title">Authorized Proprietor / सञ्चालक</div>
          </div>
          <div class="footer">
            <div>
              <div>📍 ${address}</div>
              <div>📞 +977 ${phone} | 💬 ${whatsapp}</div>
            </div>
            ${pan ? `<div class="pan-pill">PAN: ${pan}</div>` : ''}
          </div>
        </div>
        <div class="watermark">Byapar Retail OS • Digital Business Card</div>
      </body>
      </html>
    `;

    try {
      await Print.printAsync({ html });
    } catch {
      Alert.alert(ne ? 'त्रुटि' : 'Error', ne ? 'प्रिन्ट गर्न सकिएन' : 'Could not launch print');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{ne ? 'डिजिटल भिजिटिङ कार्ड' : 'Digital Business Card'}</Text>
          <Text style={styles.subtitle}>
            {ne ? '५ उत्कृष्ट डिजाइन, रङ छनौट र ह्वाट्सएप सेयर' : '5 unique templates'}
          </Text>
        </View>

        <View style={styles.headerBtnRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={handlePrintCard}>
            <Feather name="printer" size={17} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShareWhatsApp}>
            <FontAwesome name="whatsapp" size={16} color="#fff" />
            <Text style={styles.shareBtnText}>{ne ? 'सेयर' : 'Share'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Switcher Tab: Preview vs Edit */}
      <View style={styles.tabToggleRow}>
        <TouchableOpacity
          style={[styles.tabToggleBtn, activeSection === 'preview' && styles.tabToggleBtnActive]}
          onPress={() => setActiveSection('preview')}
        >
          <Feather name="eye" size={14} color={activeSection === 'preview' ? '#fff' : theme.colors.textMuted} />
          <Text style={[styles.tabToggleText, activeSection === 'preview' && styles.tabToggleTextActive]}>
            {ne ? 'कार्ड पूर्वावलोकन' : 'Card Preview'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabToggleBtn, activeSection === 'edit' && styles.tabToggleBtnActive]}
          onPress={() => setActiveSection('edit')}
        >
          <Feather name="edit-3" size={14} color={activeSection === 'edit' ? '#fff' : theme.colors.textMuted} />
          <Text style={[styles.tabToggleText, activeSection === 'edit' && styles.tabToggleTextActive]}>
            {ne ? 'विवरण सम्पादन' : 'Edit Details'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false} contentContainerStyle={styles.bodyContent}>
        {activeSection === 'preview' ? (
          <>
            {/* Live Card Render Container */}
            <FadeInView>
              <View style={styles.cardWrapper}>
                <View
                  style={[
                    styles.card,
                    selectedTemplate === 'minimalist' && {
                      backgroundColor: isDark ? '#111827' : '#ffffff',
                      borderColor: isDark ? '#1F2937' : '#E5E7EB',
                      borderWidth: 1.5,
                    },
                    selectedTemplate === 'nepali_heritage' && {
                      backgroundColor: '#500724',
                      borderColor: '#fbbf24',
                      borderWidth: 3.5,
                    },
                    selectedTemplate === 'glassmorphism' && {
                      backgroundColor: '#0F172A',
                      borderColor: 'rgba(255,255,255,0.22)',
                      borderWidth: 1,
                    },
                    selectedTemplate === 'executive' && {
                      backgroundColor: '#09090b',
                      borderColor: '#d97706',
                      borderWidth: 1.5,
                    },
                    selectedTemplate === 'vibrant_retail' && {
                      backgroundColor: activeColor.primary,
                      borderColor: 'rgba(255,255,255,0.25)',
                      borderWidth: 1,
                    },
                  ]}
                >
                  {/* Minimalist Top & Left Accent Bars + Watermark Orb */}
                  {selectedTemplate === 'minimalist' && (
                    <>
                      <View style={[styles.minimalistTopBar, { backgroundColor: activeColor.primary }]} />
                      <View style={[styles.minimalistLeftBar, { backgroundColor: activeColor.primary }]} />
                      <View style={[styles.cardOrb, { backgroundColor: activeColor.primary, opacity: 0.05 }]} />
                    </>
                  )}

                  {/* Nepali Heritage Double Ornate Border + Corner Orb */}
                  {selectedTemplate === 'nepali_heritage' && (
                    <>
                      <View style={styles.heritageInnerBorder} />
                      <View style={[styles.cardOrb, { backgroundColor: '#fbbf24', opacity: 0.08 }]} />
                    </>
                  )}

                  {/* Glassmorphism Glowing Ambient Orbs */}
                  {selectedTemplate === 'glassmorphism' && (
                    <>
                      <View style={[styles.glassOrbTop, { backgroundColor: '#06b6d4' }]} />
                      <View style={[styles.glassOrbBottom, { backgroundColor: '#a855f7' }]} />
                    </>
                  )}

                  {/* Executive Crest Orb */}
                  {selectedTemplate === 'executive' && (
                    <View style={[styles.cardOrb, { backgroundColor: '#d97706', opacity: 0.08 }]} />
                  )}

                  {/* Card Header Row */}
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <View
                        style={[
                          styles.storeBadge,
                          selectedTemplate === 'minimalist'
                            ? { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }
                            : { backgroundColor: 'rgba(255,255,255,0.18)' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.storeBadgeText,
                            selectedTemplate === 'minimalist' && { color: isDark ? '#D1D5DB' : '#4B5563' },
                            selectedTemplate === 'nepali_heritage' && { color: '#fef3c7' },
                          ]}
                        >
                          {selectedTemplate === 'nepali_heritage' ? 'नेपाली किराना पसल' : 'Certified Retail Store'}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.cardStoreName,
                          {
                            color:
                              selectedTemplate === 'minimalist'
                                ? (isDark ? '#FFFFFF' : '#111827')
                                : selectedTemplate === 'nepali_heritage'
                                ? '#fef3c7'
                                : '#FFFFFF',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {storeName}
                      </Text>
                      <Text
                        style={[
                          styles.cardTagline,
                          {
                            color:
                              selectedTemplate === 'minimalist'
                                ? theme.colors.textMuted
                                : selectedTemplate === 'nepali_heritage'
                                ? '#fcd34d'
                                : 'rgba(255,255,255,0.85)',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {tagline}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.cardLogoBox,
                        {
                          backgroundColor:
                            selectedTemplate === 'minimalist'
                              ? activeColor.primary
                              : selectedTemplate === 'nepali_heritage'
                              ? '#fbbf24'
                              : 'rgba(255,255,255,0.22)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.cardLogoText,
                          selectedTemplate === 'nepali_heritage' && { color: '#500724' },
                        ]}
                      >
                        {storeName.slice(0, 2).toUpperCase() || 'BY'}
                      </Text>
                    </View>
                  </View>

                  {/* Card Middle: Owner Details */}
                  <View style={styles.cardMiddle}>
                    <Text
                      style={[
                        styles.cardOwnerName,
                        {
                          color:
                            selectedTemplate === 'minimalist'
                              ? (isDark ? '#FFFFFF' : '#111827')
                              : '#FFFFFF',
                        },
                      ]}
                    >
                      {ownerName}
                    </Text>
                    <Text
                      style={[
                        styles.cardOwnerSub,
                        {
                          color:
                            selectedTemplate === 'minimalist'
                              ? theme.colors.textMuted
                              : selectedTemplate === 'nepali_heritage'
                              ? '#fde68a'
                              : 'rgba(255,255,255,0.75)',
                        },
                      ]}
                    >
                      {selectedTemplate === 'nepali_heritage'
                        ? 'प्रोप्राइटर / सञ्चालक'
                        : 'Authorized Proprietor / सञ्चालक'}
                    </Text>
                  </View>

                  {/* Card Footer: Contacts & PAN */}
                  <View
                    style={[
                      styles.cardFooter,
                      {
                        borderTopColor:
                          selectedTemplate === 'minimalist'
                            ? (isDark ? '#374151' : '#E5E7EB')
                            : selectedTemplate === 'nepali_heritage'
                            ? 'rgba(251, 191, 36, 0.3)'
                            : 'rgba(255,255,255,0.18)',
                      },
                    ]}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text
                        style={[
                          styles.contactLine,
                          {
                            color:
                              selectedTemplate === 'minimalist'
                                ? (isDark ? '#D1D5DB' : '#374151')
                                : '#F3F4F6',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        📍 {address}
                      </Text>
                      <Text
                        style={[
                          styles.contactLine,
                          {
                            color:
                              selectedTemplate === 'minimalist'
                                ? (isDark ? '#D1D5DB' : '#374151')
                                : '#F3F4F6',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        📞 +977 {phone} • 💬 {whatsapp}
                      </Text>
                    </View>

                    {pan ? (
                      <View
                        style={[
                          styles.panBadge,
                          selectedTemplate === 'minimalist'
                            ? { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }
                            : selectedTemplate === 'nepali_heritage'
                            ? { backgroundColor: 'transparent', borderColor: '#fbbf24', borderWidth: 1 }
                            : { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.panBadgeText,
                            selectedTemplate === 'minimalist' && { color: isDark ? '#E5E7EB' : '#1F2937' },
                            selectedTemplate === 'nepali_heritage' && { color: '#fbbf24' },
                          ]}
                        >
                          PAN: {pan}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            </FadeInView>

            {/* Template Selector Grid */}
            <Text style={styles.sectionHeader}>{ne ? '१. कार्ड टेम्प्लेट छान्नुहोस्' : '1. Choose Card Template'}</Text>
            <View style={styles.templateGrid}>
              {templates.map((tpl) => {
                const isSelected = selectedTemplate === tpl.id;
                return (
                  <TouchableOpacity
                    key={tpl.id}
                    style={[styles.templateGridCard, isSelected && styles.templateGridCardSelected]}
                    onPress={() => setSelectedTemplate(tpl.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.templateGridCardHeader}>
                      <View
                        style={[
                          styles.templateIconCircle,
                          { backgroundColor: isSelected ? 'rgba(255, 69, 0, 0.14)' : (isDark ? '#262626' : '#F1F5F9') },
                        ]}
                      >
                        <Feather
                          name={tpl.icon as any}
                          size={15}
                          color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                        />
                      </View>
                      {isSelected ? (
                        <View style={[styles.checkPill, { backgroundColor: theme.colors.primary }]}>
                          <Feather name="check" size={10} color="#FFFFFF" />
                        </View>
                      ) : null}
                    </View>

                    <Text
                      style={[
                        styles.templateGridTitle,
                        isSelected && { color: theme.colors.primary, fontWeight: '800' },
                      ]}
                      numberOfLines={1}
                    >
                      {tpl.title}
                    </Text>
                    <Text style={styles.templateGridDesc} numberOfLines={2}>
                      {tpl.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Color Selector */}
            <Text style={styles.sectionHeader}>{ne ? '२. रङ थिम (Dynamic Palette)' : '2. Color Theme'}</Text>
            <View style={styles.colorRow}>
              {COLOR_PRESETS.map((col) => {
                const isSelected = selectedColor === col.key;
                return (
                  <TouchableOpacity
                    key={col.key}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: col.primary },
                      isSelected && styles.colorCircleSelected,
                    ]}
                    onPress={() => setSelectedColor(col.key)}
                  >
                    {isSelected ? <Feather name="check" size={16} color="#fff" /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : (
          /* Form Editor */
          <View style={styles.formContainer}>
            <Text style={styles.sectionHeader}>{ne ? 'पसलको विवरण सम्पादन गर्नुहोस्' : 'Edit Business Information'}</Text>

            <Text style={styles.label}>{ne ? 'पसलको नाम *' : 'Shop Name *'}</Text>
            <TextInput
              style={styles.input}
              value={storeName}
              onChangeText={setStoreName}
              placeholder="e.g. Apna Kirana Store"
              placeholderTextColor={theme.colors.textMuted}
            />

            <Text style={styles.label}>{ne ? 'सञ्चालक / प्रोप्राइटरको नाम' : 'Proprietor / Owner Name'}</Text>
            <TextInput
              style={styles.input}
              value={ownerName}
              onChangeText={setOwnerName}
              placeholder="e.g. Ram Bahadur Shrestha"
              placeholderTextColor={theme.colors.textMuted}
            />

            <Text style={styles.label}>{ne ? 'ट्यागलाइन / नारा' : 'Tagline / Slogan'}</Text>
            <TextInput
              style={styles.input}
              value={tagline}
              onChangeText={setTagline}
              placeholder="e.g. Wholesale & Retail Groceries"
              placeholderTextColor={theme.colors.textMuted}
            />

            <View style={styles.twoCol}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>{ne ? 'फोन नम्बर' : 'Phone'}</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{ne ? 'ह्वाट्सएप नम्बर' : 'WhatsApp'}</Text>
                <TextInput
                  style={styles.input}
                  value={whatsapp}
                  onChangeText={setWhatsapp}
                  keyboardType="phone-pad"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>{ne ? 'इमेल' : 'Email'}</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{ne ? 'पान / भ्याट' : 'PAN / VAT'}</Text>
                <TextInput
                  style={styles.input}
                  value={pan}
                  onChangeText={setPan}
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            <Text style={styles.label}>{ne ? 'ठेगाना' : 'Address'}</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholderTextColor={theme.colors.textMuted}
            />

            <TouchableOpacity style={styles.doneBtn} onPress={() => setActiveSection('preview')}>
              <Text style={styles.doneBtnText}>{ne ? 'पूर्वावलोकन हेर्नुहोस्' : 'Preview Changes'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
      paddingBottom: 10,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    headerBtnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#1f2937' : '#f9fafb',
    },
    shareBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#10b981',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      gap: 6,
    },
    shareBtnText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '700',
    },
    tabToggleRow: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginVertical: 8,
      backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
      borderRadius: 10,
      padding: 3,
    },
    tabToggleBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 7,
      borderRadius: 8,
      gap: 6,
    },
    tabToggleBtnActive: {
      backgroundColor: theme.colors.primary,
    },
    tabToggleText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    tabToggleTextActive: {
      color: '#fff',
    },
    body: {
      flex: 1,
    },
    bodyContent: {
      padding: 16,
      paddingTop: 8,
      paddingBottom: 40,
    },
    cardWrapper: {
      alignItems: 'center',
      marginBottom: 20,
    },
    card: {
      width: '100%',
      aspectRatio: 3.5 / 2,
      borderRadius: 16,
      padding: 16,
      justifyContent: 'space-between',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 5,
      position: 'relative',
      overflow: 'hidden',
    },
    minimalistTopBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 5,
    },
    minimalistLeftBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      width: 5,
    },
    cardOrb: {
      position: 'absolute',
      right: -25,
      bottom: -25,
      width: 110,
      height: 110,
      borderRadius: 55,
    },
    heritageInnerBorder: {
      position: 'absolute',
      top: 5,
      left: 5,
      right: 5,
      bottom: 5,
      borderWidth: 1.5,
      borderColor: 'rgba(251, 191, 36, 0.45)',
      borderRadius: 12,
    },
    glassOrbTop: {
      position: 'absolute',
      top: -20,
      left: -20,
      width: 90,
      height: 90,
      borderRadius: 45,
      opacity: 0.25,
    },
    glassOrbBottom: {
      position: 'absolute',
      bottom: -20,
      right: -20,
      width: 90,
      height: 90,
      borderRadius: 45,
      opacity: 0.25,
    },
    minimalistBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 4,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    storeBadge: {
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignSelf: 'flex-start',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginBottom: 4,
    },
    storeBadgeText: {
      fontSize: 8.5,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: '#fff',
    },
    cardStoreName: {
      fontSize: 17,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    cardTagline: {
      fontSize: 10,
      marginTop: 1,
    },
    cardLogoBox: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardLogoText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 13,
    },
    cardMiddle: {
      marginVertical: 4,
    },
    cardOwnerName: {
      fontSize: 12,
      fontWeight: '700',
    },
    cardOwnerSub: {
      fontSize: 9,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      borderTopWidth: 1,
      paddingTop: 8,
    },
    contactLine: {
      fontSize: 9,
      lineHeight: 13,
    },
    panBadge: {
      backgroundColor: 'rgba(0,0,0,0.3)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    panBadgeText: {
      color: '#fff',
      fontSize: 8,
      fontFamily: 'monospace',
      fontWeight: '700',
    },
    sectionHeader: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 10,
      marginTop: 6,
    },
    templateGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 20,
    },
    templateGridCard: {
      width: '48.5%',
      padding: 12,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: isDark ? '#1f2937' : '#f9fafb',
    },
    templateGridCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: isDark ? '#1e3a8a25' : '#eff6ff',
    },
    templateGridCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    templateIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkPill: {
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    templateGridTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    templateGridDesc: {
      fontSize: 10.5,
      color: theme.colors.textMuted,
      lineHeight: 14,
    },
    templateList: {
      gap: 8,
      marginBottom: 20,
    },
    templateCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: isDark ? '#1f2937' : '#f9fafb',
    },
    templateCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: isDark ? '#1e3a8a25' : '#eff6ff',
    },
    templateTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    templateDesc: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    colorRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    colorCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorCircleSelected: {
      borderWidth: 2,
      borderColor: '#fff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 4,
      transform: [{ scale: 1.15 }],
    },
    formContainer: {
      gap: 6,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginTop: 8,
      marginBottom: 4,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 13,
      color: theme.colors.textPrimary,
      backgroundColor: isDark ? '#111827' : '#fafafa',
    },
    twoCol: {
      flexDirection: 'row',
    },
    doneBtn: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 16,
    },
    doneBtnText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
  });
};
