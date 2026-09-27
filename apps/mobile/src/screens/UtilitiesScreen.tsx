import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
  Image,
  Share,
  RefreshControl,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Theme } from '../theme';
import { FadeInView } from '../components/common/FadeInView';
import {
  calculateEmi,
  calculateInterest,
  calculateTax,
  calculateMargin,
  calculateTargetSellingPrice,
  calculateDenominations,
  NEPAL_DENOMINATIONS,
  formatNepaliCurrency,
  adToBs,
} from '@byapar/core';

type UtilityTab =
  | 'units'
  | 'calendar'
  | 'qr'
  | 'fuel'
  | 'discount'
  | 'emi'
  | 'interest'
  | 'vat'
  | 'margin'
  | 'cash';

export const UtilitiesScreen: React.FC = () => {
  const { theme, themeMode, language, refreshData } = useApp();

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (e) {
      console.warn('[UtilitiesScreen] Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const isDark = themeMode === 'dark';
  const ne = language === 'ne';
  const styles = useMemo(() => createStyles(theme, themeMode), [theme, themeMode]);

  const [categoryGroup, setCategoryGroup] = useState<'daily' | 'finance'>('daily');
  const [activeTab, setActiveTab] = useState<UtilityTab>('units');

  // -------------------------------------------------------------
  // 1. UNIT & MEASURE CONVERTER
  // -------------------------------------------------------------
  const [unitType, setUnitType] = useState<'weight' | 'area' | 'volume'>('weight');
  const [unitInput, setUnitInput] = useState('1');
  const [selectedUnit, setSelectedUnit] = useState('kg');

  const weightUnits: Record<string, { label: string; toBase: number }> = {
    kg: { label: 'Kilogram (kg)', toBase: 1000 },
    gram: { label: 'Gram (g)', toBase: 1 },
    dharni: { label: 'Dharni (2.392 kg)', toBase: 2392 },
    pau: { label: 'Standard Pau (200g)', toBase: 200 },
    pau_kirana: { label: 'Kirana Pau (250g)', toBase: 250 },
    tola: { label: 'Tola (11.66g)', toBase: 11.6638 },
    quintal: { label: 'Quintal (100 kg)', toBase: 100000 },
    muri: { label: 'Muri (~80 kg)', toBase: 80000 },
    pathi: { label: 'Pathi (~4 kg)', toBase: 4000 },
    mana: { label: 'Mana (~500g)', toBase: 500 },
  };

  const areaUnits: Record<string, { label: string; toBase: number }> = {
    ropani: { label: 'Ropani (16 Aana)', toBase: 5476 },
    aana: { label: 'Aana (4 Paisa)', toBase: 342.25 },
    paisa: { label: 'Paisa (4 Daam)', toBase: 85.5625 },
    daam: { label: 'Daam (1/4 Paisa)', toBase: 21.3906 },
    bigha: { label: 'Bigha (20 Kattha)', toBase: 72900 },
    kattha: { label: 'Kattha (20 Dhur)', toBase: 3645 },
    dhur: { label: 'Dhur', toBase: 182.25 },
    sqft: { label: 'Square Feet (sq ft)', toBase: 1 },
  };

  const volumeUnits: Record<string, { label: string; toBase: number }> = {
    litre: { label: 'Litre (L)', toBase: 1000 },
    ml: { label: 'Millilitre (mL)', toBase: 1 },
    gallon: { label: 'Gallon (3.785 L)', toBase: 3785.41 },
  };

  const convertedUnits = useMemo(() => {
    const val = parseFloat(unitInput) || 0;
    const map = unitType === 'weight' ? weightUnits : unitType === 'area' ? areaUnits : volumeUnits;
    const currentMeta = map[selectedUnit] || Object.values(map)[0];
    const baseVal = val * currentMeta.toBase;

    return Object.entries(map).map(([k, meta]) => {
      const res = baseVal / meta.toBase;
      const formatted = res >= 1000 ? res.toLocaleString('en-IN', { maximumFractionDigits: 3 }) : res.toFixed(3).replace(/\.?0+$/, '');
      return { key: k, label: meta.label, value: formatted, isCurrent: k === selectedUnit };
    });
  }, [unitInput, unitType, selectedUnit, ne]);

  // -------------------------------------------------------------
  // 2. NEPALI BS ⇄ AD CALENDAR & DATE DIFFERENCE
  // -------------------------------------------------------------
  const [adDateInput, setAdDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [diffDate1, setDiffDate1] = useState(new Date().toISOString().split('T')[0]);
  const [diffDate2, setDiffDate2] = useState('2025-04-13');

  const adBsConverted = useMemo(() => {
    try {
      const d = new Date(adDateInput);
      const bs = adToBs(d);
      return {
        formatted: bs.formatted,
        formattedNp: bs.formattedNp,
        monthName: ne ? bs.monthNameNp : bs.monthName,
      };
    } catch {
      return null;
    }
  }, [adDateInput, ne]);

  const daysDifference = useMemo(() => {
    try {
      const d1 = new Date(diffDate1);
      const d2 = new Date(diffDate2);
      const diffMs = Math.abs(d2.getTime() - d1.getTime());
      const totalDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const months = Math.floor(totalDays / 30);
      const remDays = totalDays % 30;
      return { totalDays, months, remDays };
    } catch {
      return { totalDays: 0, months: 0, remDays: 0 };
    }
  }, [diffDate1, diffDate2]);

  // -------------------------------------------------------------
  // 3. COUNTER QR GENERATOR
  // -------------------------------------------------------------
  const [qrMode, setQrMode] = useState<'wifi' | 'whatsapp' | 'payment'>('wifi');
  const [qrSsid, setQrSsid] = useState('Store_Guest_WiFi');
  const [qrPass, setQrPass] = useState('Welcome@2081');
  const [qrPhone, setQrPhone] = useState('9841234567');
  const [qrMsg, setQrMsg] = useState('Namaste! Inquiring about store inventory.');
  const [qrFonepay, setQrFonepay] = useState('9841234567');

  const qrDataString = useMemo(() => {
    if (qrMode === 'wifi') return `WIFI:S:${qrSsid};T:WPA;P:${qrPass};;`;
    if (qrMode === 'whatsapp') {
      let p = qrPhone.replace(/[^0-9]/g, '');
      if (!p.startsWith('977') && p.length === 10) p = '977' + p;
      return `https://wa.me/${p}?text=${encodeURIComponent(qrMsg)}`;
    }
    return `fonepay://pay?merchant=${qrFonepay}`;
  }, [qrMode, qrSsid, qrPass, qrPhone, qrMsg, qrFonepay]);

  const qrImageUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=6&data=${encodeURIComponent(qrDataString)}`;
  }, [qrDataString]);

  // -------------------------------------------------------------
  // 4. FUEL & DELIVERY LOGISTICS
  // -------------------------------------------------------------
  const [distanceKm, setDistanceKm] = useState('15');
  const [mileage, setMileage] = useState('35');
  const [fuelPrice, setFuelPrice] = useState('170');
  const [ordersCount, setOrdersCount] = useState('5');

  const deliveryResult = useMemo(() => {
    const dist = (parseFloat(distanceKm) || 0) * 2;
    const mil = Math.max(1, parseFloat(mileage) || 1);
    const price = parseFloat(fuelPrice) || 0;
    const orders = Math.max(1, parseFloat(ordersCount) || 1);

    const litres = dist / mil;
    const fuelCost = litres * price;
    const costPerOrder = fuelCost / orders;
    const suggestedRate = Math.ceil((costPerOrder * 1.35) / 10) * 10;

    return {
      roundTripKm: dist,
      litres: litres.toFixed(2),
      fuelCost: Math.round(fuelCost),
      costPerOrder: Math.round(costPerOrder),
      suggestedRate,
    };
  }, [distanceKm, mileage, fuelPrice, ordersCount]);

  // -------------------------------------------------------------
  // 5. DISCOUNT & BILL SPLIT
  // -------------------------------------------------------------
  const [discountMode, setDiscountMode] = useState<'percent' | 'split'>('percent');
  const [billPrice, setBillPrice] = useState('2000');
  const [discPercent, setDiscPercent] = useState('15');
  const [splitBill, setSplitBill] = useState('3200');
  const [splitPeople, setSplitPeople] = useState('4');

  const discountResult = useMemo(() => {
    const p = parseFloat(billPrice) || 0;
    const pct = parseFloat(discPercent) || 0;
    const savings = p * (pct / 100);
    const finalAmt = Math.max(0, p - savings);
    return { finalAmt: Math.round(finalAmt), savings: Math.round(savings) };
  }, [billPrice, discPercent]);

  const splitResult = useMemo(() => {
    const total = parseFloat(splitBill) || 0;
    const count = Math.max(1, parseInt(splitPeople, 10) || 1);
    const perPerson = total / count;
    return { perPerson: Math.ceil(perPerson) };
  }, [splitBill, splitPeople]);

  // -------------------------------------------------------------
  // 6. EMI, INTEREST, VAT, MARGIN, CASH
  // -------------------------------------------------------------
  const [emiPrincipal, setEmiPrincipal] = useState('500000');
  const [emiRate, setEmiRate] = useState('12');
  const [emiMonths, setEmiMonths] = useState('24');
  const emiResult = useMemo(() => {
    return calculateEmi(parseFloat(emiPrincipal) || 0, parseFloat(emiRate) || 0, parseInt(emiMonths, 10) || 1);
  }, [emiPrincipal, emiRate, emiMonths]);

  const [interestPrincipal, setInterestPrincipal] = useState('100000');
  const [interestRate, setInterestRate] = useState('2');
  const [interestDays, setInterestDays] = useState('90');
  const interestResult = useMemo(() => {
    return calculateInterest(parseFloat(interestPrincipal) || 0, parseFloat(interestRate) || 0, parseInt(interestDays, 10) || 1, {
      isMonthlyRate: true,
    });
  }, [interestPrincipal, interestRate, interestDays]);

  const [vatAmount, setVatAmount] = useState('10000');
  const [isVatInclusive, setIsVatInclusive] = useState(false);
  const vatResult = useMemo(() => {
    return calculateTax(parseFloat(vatAmount) || 0, 13, isVatInclusive);
  }, [vatAmount, isVatInclusive]);

  const [marginCost, setMarginCost] = useState('800');
  const [marginSale, setMarginSale] = useState('1000');
  const marginResult = useMemo(() => {
    return calculateMargin(parseFloat(marginCost) || 0, parseFloat(marginSale) || 0);
  }, [marginCost, marginSale]);

  const [counts, setCounts] = useState<Record<number, number>>({
    1000: 5,
    500: 10,
    100: 20,
    50: 10,
    20: 10,
    10: 10,
    5: 10,
  });
  const denominationResult = useMemo(() => calculateDenominations(counts), [counts]);

  return (
    <View style={styles.container}>
      {/* Category Segment Control (Daily vs Finance) */}
      <View style={styles.groupHeader}>
        <View style={styles.groupSegment}>
          <TouchableOpacity
            style={[styles.groupBtn, categoryGroup === 'daily' && styles.groupBtnActive]}
            onPress={() => {
              setCategoryGroup('daily');
              if (['emi', 'interest', 'vat', 'margin', 'cash'].includes(activeTab)) {
                setActiveTab('units');
              }
            }}
          >
            <MaterialCommunityIcons
              name="storefront-outline"
              size={15}
              color={categoryGroup === 'daily' ? (isDark ? '#FFFFFF' : '#1C1917') : (isDark ? '#888888' : '#777777')}
            />
            <Text style={[styles.groupBtnText, categoryGroup === 'daily' && styles.groupBtnTextActive]}>
              Daily Life & Shop
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.groupBtn, categoryGroup === 'finance' && styles.groupBtnActive]}
            onPress={() => {
              setCategoryGroup('finance');
              if (['units', 'calendar', 'qr', 'fuel', 'discount'].includes(activeTab)) {
                setActiveTab('emi');
              }
            }}
          >
            <MaterialCommunityIcons
              name="calculator-variant-outline"
              size={15}
              color={categoryGroup === 'finance' ? (isDark ? '#FFFFFF' : '#1C1917') : (isDark ? '#888888' : '#777777')}
            />
            <Text style={[styles.groupBtnText, categoryGroup === 'finance' && styles.groupBtnTextActive]}>
              Finance & Accounts
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Minimal Tabs Navigation Scroll */}
      <View style={styles.tabScrollWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {categoryGroup === 'daily' ? (
            <>
              <TouchableOpacity
                style={[styles.tabPill, activeTab === 'units' && styles.tabPillActive]}
                onPress={() => setActiveTab('units')}
              >
                <MaterialCommunityIcons
                  name="scale-balance"
                  size={14}
                  color={activeTab === 'units' ? (isDark ? '#1C1917' : '#FFFFFF') : (isDark ? '#AAAAAA' : '#666666')}
                />
                <Text style={[styles.tabPillText, activeTab === 'units' && styles.tabPillTextActive]}>
                  Units
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabPill, activeTab === 'calendar' && styles.tabPillActive]}
                onPress={() => setActiveTab('calendar')}
              >
                <Feather
                  name="calendar"
                  size={13}
                  color={activeTab === 'calendar' ? (isDark ? '#1C1917' : '#FFFFFF') : (isDark ? '#AAAAAA' : '#666666')}
                />
                <Text style={[styles.tabPillText, activeTab === 'calendar' && styles.tabPillTextActive]}>
                  BS Calendar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabPill, activeTab === 'qr' && styles.tabPillActive]}
                onPress={() => setActiveTab('qr')}
              >
                <MaterialCommunityIcons
                  name="qrcode-scan"
                  size={14}
                  color={activeTab === 'qr' ? (isDark ? '#1C1917' : '#FFFFFF') : (isDark ? '#AAAAAA' : '#666666')}
                />
                <Text style={[styles.tabPillText, activeTab === 'qr' && styles.tabPillTextActive]}>
                  QR Standee
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabPill, activeTab === 'fuel' && styles.tabPillActive]}
                onPress={() => setActiveTab('fuel')}
              >
                <MaterialCommunityIcons
                  name="truck-delivery-outline"
                  size={15}
                  color={activeTab === 'fuel' ? (isDark ? '#1C1917' : '#FFFFFF') : (isDark ? '#AAAAAA' : '#666666')}
                />
                <Text style={[styles.tabPillText, activeTab === 'fuel' && styles.tabPillTextActive]}>
                  Fuel & Delivery
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabPill, activeTab === 'discount' && styles.tabPillActive]}
                onPress={() => setActiveTab('discount')}
              >
                <Feather
                  name="tag"
                  size={13}
                  color={activeTab === 'discount' ? (isDark ? '#1C1917' : '#FFFFFF') : (isDark ? '#AAAAAA' : '#666666')}
                />
                <Text style={[styles.tabPillText, activeTab === 'discount' && styles.tabPillTextActive]}>
                  Discounts
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.tabPill, activeTab === 'emi' && styles.tabPillActive]}
                onPress={() => setActiveTab('emi')}
              >
                <MaterialCommunityIcons
                  name="bank-outline"
                  size={14}
                  color={activeTab === 'emi' ? (isDark ? '#1C1917' : '#FFFFFF') : (isDark ? '#AAAAAA' : '#666666')}
                />
                <Text style={[styles.tabPillText, activeTab === 'emi' && styles.tabPillTextActive]}>
                  EMI Loan
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabPill, activeTab === 'interest' && styles.tabPillActive]}
                onPress={() => setActiveTab('interest')}
              >
                <MaterialCommunityIcons
                  name="cash-multiple"
                  size={14}
                  color={activeTab === 'interest' ? (isDark ? '#1C1917' : '#FFFFFF') : (isDark ? '#AAAAAA' : '#666666')}
                />
                <Text style={[styles.tabPillText, activeTab === 'interest' && styles.tabPillTextActive]}>
                  Khata Interest
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabPill, activeTab === 'vat' && styles.tabPillActive]}
                onPress={() => setActiveTab('vat')}
              >
                <Feather
                  name="file-text"
                  size={13}
                  color={activeTab === 'vat' ? (isDark ? '#1C1917' : '#FFFFFF') : (isDark ? '#AAAAAA' : '#666666')}
                />
                <Text style={[styles.tabPillText, activeTab === 'vat' && styles.tabPillTextActive]}>
                  VAT 13%
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabPill, activeTab === 'margin' && styles.tabPillActive]}
                onPress={() => setActiveTab('margin')}
              >
                <Feather
                  name="trending-up"
                  size={13}
                  color={activeTab === 'margin' ? (isDark ? '#1C1917' : '#FFFFFF') : (isDark ? '#AAAAAA' : '#666666')}
                />
                <Text style={[styles.tabPillText, activeTab === 'margin' && styles.tabPillTextActive]}>
                  Margin
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabPill, activeTab === 'cash' && styles.tabPillActive]}
                onPress={() => setActiveTab('cash')}
              >
                <MaterialCommunityIcons
                  name="cash-register"
                  size={14}
                  color={activeTab === 'cash' ? (isDark ? '#1C1917' : '#FFFFFF') : (isDark ? '#AAAAAA' : '#666666')}
                />
                <Text style={[styles.tabPillText, activeTab === 'cash' && styles.tabPillTextActive]}>
                  Cash Drawer
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>

      {/* Main Tool Content Container */}
      <ScrollView
        contentContainerStyle={styles.contentScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* 1. UNITS CONVERTER */}
        {activeTab === 'units' && (
          <FadeInView style={styles.card}>
            <Text style={styles.cardTitle}>Nepali Unit Converter</Text>
            <Text style={styles.cardSubtitle}>Weights, traditional grains, land area & liquids in standard English</Text>

            {/* Sub type pills */}
            <View style={styles.subPillRow}>
              {(['weight', 'area', 'volume'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.subPill, unitType === t && styles.subPillActive]}
                  onPress={() => {
                    setUnitType(t);
                    setSelectedUnit(t === 'weight' ? 'kg' : t === 'area' ? 'ropani' : 'litre');
                  }}
                >
                  {t === 'weight' ? (
                    <MaterialCommunityIcons
                      name="scale"
                      size={13}
                      color={unitType === t ? (isDark ? '#1C1917' : '#FFFFFF') : (isDark ? '#888888' : '#6B7280')}
                    />
                  ) : t === 'area' ? (
                    <MaterialCommunityIcons
                      name="floor-plan"
                      size={13}
                      color={unitType === t ? (isDark ? '#1C1917' : '#FFFFFF') : (isDark ? '#888888' : '#6B7280')}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="cup-water"
                      size={13}
                      color={unitType === t ? (isDark ? '#1C1917' : '#FFFFFF') : (isDark ? '#888888' : '#6B7280')}
                    />
                  )}
                  <Text style={[styles.subPillText, unitType === t && styles.subPillTextActive]}>
                    {t === 'weight' ? 'Weight & Grains' : t === 'area' ? 'Land & Area' : 'Liquid Volume'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Quantity</Text>
                <TextInput
                  style={styles.textInput}
                  value={unitInput}
                  onChangeText={setUnitInput}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Converted values grid */}
            <View style={styles.unitGrid}>
              {convertedUnits.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => setSelectedUnit(item.key)}
                  style={[styles.unitItem, item.isCurrent && styles.unitItemActive]}
                >
                  <Text style={styles.unitItemLabel} numberOfLines={1}>{item.label}</Text>
                  <Text style={styles.unitItemVal} numberOfLines={1}>{item.value}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </FadeInView>
        )}

        {/* 2. CALENDAR BS ⇄ AD */}
        {activeTab === 'calendar' && (
          <FadeInView style={styles.card}>
            <Text style={styles.cardTitle}>{ne ? 'नेपाली क्यालेन्डर र खाता दिन' : 'BS ⇄ AD Calendar'}</Text>
            <Text style={styles.cardSubtitle}>English AD to Bikram Sambat & Credit Days</Text>

            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>Enter English Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                value={adDateInput}
                onChangeText={setAdDateInput}
                placeholder="2024-04-13"
              />
            </View>

            {adBsConverted && (
              <View style={styles.resultBox}>
                <Text style={styles.resultBoxLabel}>Bikram Sambat (वि.सं.)</Text>
                <Text style={styles.resultBoxVal}>{adBsConverted.formattedNp}</Text>
                <Text style={styles.resultBoxSub}>{adBsConverted.monthName} ({adBsConverted.formatted})</Text>
              </View>
            )}

            <View style={[styles.inputBlock, { marginTop: 14 }]}>
              <Text style={styles.inputLabel}>Credit Days Calculator (Start - End)</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={diffDate1}
                  onChangeText={setDiffDate1}
                  placeholder="2024-01-01"
                />
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  value={diffDate2}
                  onChangeText={setDiffDate2}
                  placeholder="2024-04-01"
                />
              </View>
              <Text style={[styles.resultBoxSub, { marginTop: 6 }]}>
                Duration: <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>{daysDifference.totalDays} Days</Text> (≈ {daysDifference.months} mos {daysDifference.remDays} days)
              </Text>
            </View>
          </FadeInView>
        )}

        {/* 3. COUNTER QR */}
        {activeTab === 'qr' && (
          <FadeInView style={styles.card}>
            <Text style={styles.cardTitle}>{ne ? 'काउन्टर क्युआर जेनेरेटर' : 'Counter QR Code'}</Text>
            <Text style={styles.cardSubtitle}>Generate WiFi or WhatsApp QR for shop counter</Text>

            <View style={styles.subPillRow}>
              {(['wifi', 'whatsapp', 'payment'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.subPill, qrMode === m && styles.subPillActive]}
                  onPress={() => setQrMode(m)}
                >
                  {m === 'wifi' ? (
                    <Feather
                      name="wifi"
                      size={13}
                      color={qrMode === m ? (isDark ? '#1C1917' : '#FFFFFF') : (isDark ? '#888888' : '#6B7280')}
                    />
                  ) : m === 'whatsapp' ? (
                    <Feather
                      name="message-circle"
                      size={13}
                      color={qrMode === m ? (isDark ? '#1C1917' : '#FFFFFF') : (isDark ? '#888888' : '#6B7280')}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="credit-card-outline"
                      size={14}
                      color={qrMode === m ? (isDark ? '#1C1917' : '#FFFFFF') : (isDark ? '#888888' : '#6B7280')}
                    />
                  )}
                  <Text style={[styles.subPillText, qrMode === m && styles.subPillTextActive]}>
                    {m === 'wifi' ? 'WiFi Standee' : m === 'whatsapp' ? 'WhatsApp' : 'Fonepay'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {qrMode === 'wifi' && (
              <View style={styles.inputBlock}>
                <Text style={styles.inputLabel}>WiFi Network (SSID)</Text>
                <TextInput style={styles.textInput} value={qrSsid} onChangeText={setQrSsid} />
                <Text style={[styles.inputLabel, { marginTop: 8 }]}>WiFi Password</Text>
                <TextInput style={styles.textInput} value={qrPass} onChangeText={setQrPass} />
              </View>
            )}

            {qrMode === 'whatsapp' && (
              <View style={styles.inputBlock}>
                <Text style={styles.inputLabel}>WhatsApp Mobile Number</Text>
                <TextInput style={styles.textInput} value={qrPhone} onChangeText={setQrPhone} keyboardType="phone-pad" />
              </View>
            )}

            {qrMode === 'payment' && (
              <View style={styles.inputBlock}>
                <Text style={styles.inputLabel}>Merchant Phone / ID</Text>
                <TextInput style={styles.textInput} value={qrFonepay} onChangeText={setQrFonepay} />
              </View>
            )}

            <View style={styles.qrDisplayWrap}>
              <Image source={{ uri: qrImageUrl }} style={styles.qrImg} />
              <Text style={styles.qrScanHint}>Scan with any phone camera</Text>
            </View>
          </FadeInView>
        )}

        {/* 4. FUEL & DELIVERY */}
        {activeTab === 'fuel' && (
          <FadeInView style={styles.card}>
            <Text style={styles.cardTitle}>{ne ? 'ढुवानी तथा इन्धन खर्च' : 'Delivery & Fuel Calculator'}</Text>
            <Text style={styles.cardSubtitle}>Roundtrip fuel cost & customer delivery fee</Text>

            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Distance (1-Way km)</Text>
                <TextInput style={styles.textInput} value={distanceKm} onChangeText={setDistanceKm} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Mileage (km/L)</Text>
                <TextInput style={styles.textInput} value={mileage} onChangeText={setMileage} keyboardType="numeric" />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Fuel Price (रु/L)</Text>
                <TextInput style={styles.textInput} value={fuelPrice} onChangeText={setFuelPrice} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>No. of Orders</Text>
                <TextInput style={styles.textInput} value={ordersCount} onChangeText={setOrdersCount} keyboardType="numeric" />
              </View>
            </View>

            <View style={styles.resultBox}>
              <Text style={styles.resultBoxLabel}>Total Roundtrip Fuel Cost</Text>
              <Text style={styles.resultBoxVal}>रु {deliveryResult.fuelCost}</Text>
              <Text style={styles.resultBoxSub}>
                Suggested Fee: <Text style={{ color: '#059669', fontWeight: '700' }}>रु {deliveryResult.suggestedRate}</Text> / order
              </Text>
            </View>
          </FadeInView>
        )}

        {/* 5. DISCOUNT & SPLIT */}
        {activeTab === 'discount' && (
          <FadeInView style={styles.card}>
            <Text style={styles.cardTitle}>{ne ? 'छुट तथा बिल बाँडफाँड' : 'Discounts & Split Bill'}</Text>
            <Text style={styles.cardSubtitle}>Calculate customer discount or split food/khata bill</Text>

            <View style={styles.subPillRow}>
              <TouchableOpacity
                style={[styles.subPill, discountMode === 'percent' && styles.subPillActive]}
                onPress={() => setDiscountMode('percent')}
              >
                <Feather
                  name="percent"
                  size={12}
                  color={discountMode === 'percent' ? (isDark ? '#1C1917' : '#FFFFFF') : (isDark ? '#888888' : '#6B7280')}
                />
                <Text style={[styles.subPillText, discountMode === 'percent' && styles.subPillTextActive]}>
                  % Discount
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subPill, discountMode === 'split' && styles.subPillActive]}
                onPress={() => setDiscountMode('split')}
              >
                <Feather
                  name="users"
                  size={12}
                  color={discountMode === 'split' ? (isDark ? '#1C1917' : '#FFFFFF') : (isDark ? '#888888' : '#6B7280')}
                />
                <Text style={[styles.subPillText, discountMode === 'split' && styles.subPillTextActive]}>
                  Split Bill
                </Text>
              </TouchableOpacity>
            </View>

            {discountMode === 'percent' ? (
              <>
                <View style={styles.inputRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Bill Price (रु)</Text>
                    <TextInput style={styles.textInput} value={billPrice} onChangeText={setBillPrice} keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Discount (%)</Text>
                    <TextInput style={styles.textInput} value={discPercent} onChangeText={setDiscPercent} keyboardType="numeric" />
                  </View>
                </View>
                <View style={styles.resultBox}>
                  <Text style={styles.resultBoxLabel}>Payable Amount</Text>
                  <Text style={styles.resultBoxVal}>रु {discountResult.finalAmt}</Text>
                  <Text style={[styles.resultBoxSub, { color: '#059669' }]}>Customer Saves रु {discountResult.savings}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.inputRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Total Bill (रु)</Text>
                    <TextInput style={styles.textInput} value={splitBill} onChangeText={setSplitBill} keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>People Count</Text>
                    <TextInput style={styles.textInput} value={splitPeople} onChangeText={setSplitPeople} keyboardType="numeric" />
                  </View>
                </View>
                <View style={styles.resultBox}>
                  <Text style={styles.resultBoxLabel}>Each Person Pays</Text>
                  <Text style={styles.resultBoxVal}>रु {splitResult.perPerson}</Text>
                </View>
              </>
            )}
          </FadeInView>
        )}

        {/* 6. LOAN EMI */}
        {activeTab === 'emi' && (
          <FadeInView style={styles.card}>
            <Text style={styles.cardTitle}>{ne ? 'ऋण किस्ता (EMI)' : 'Loan EMI'}</Text>
            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>Principal Amount (रु)</Text>
              <TextInput style={styles.textInput} value={emiPrincipal} onChangeText={setEmiPrincipal} keyboardType="numeric" />
            </View>
            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Rate (% p.a.)</Text>
                <TextInput style={styles.textInput} value={emiRate} onChangeText={setEmiRate} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Tenure (Months)</Text>
                <TextInput style={styles.textInput} value={emiMonths} onChangeText={setEmiMonths} keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.resultBox}>
              <Text style={styles.resultBoxLabel}>Monthly Installment</Text>
              <Text style={styles.resultBoxVal}>रु {emiResult.monthlyEmi.toLocaleString()}</Text>
              <Text style={styles.resultBoxSub}>Total Repayment: रु {emiResult.totalAmount.toLocaleString()}</Text>
            </View>
          </FadeInView>
        )}

        {/* 7. KHATA INTEREST */}
        {activeTab === 'interest' && (
          <FadeInView style={styles.card}>
            <Text style={styles.cardTitle}>{ne ? 'नेपाली खाता ब्याज' : 'Khata Interest'}</Text>
            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>Principal (रु)</Text>
              <TextInput style={styles.textInput} value={interestPrincipal} onChangeText={setInterestPrincipal} keyboardType="numeric" />
            </View>
            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Rate (% / Month)</Text>
                <TextInput style={styles.textInput} value={interestRate} onChangeText={setInterestRate} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Days</Text>
                <TextInput style={styles.textInput} value={interestDays} onChangeText={setInterestDays} keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.resultBox}>
              <Text style={styles.resultBoxLabel}>Total Interest Accrued</Text>
              <Text style={styles.resultBoxVal}>रु {interestResult.totalInterest.toLocaleString()}</Text>
              <Text style={styles.resultBoxSub}>Total Receivable: रु {interestResult.totalPayable.toLocaleString()}</Text>
            </View>
          </FadeInView>
        )}

        {/* 8. VAT 13% */}
        {activeTab === 'vat' && (
          <FadeInView style={styles.card}>
            <Text style={styles.cardTitle}>{ne ? '१३% भ्याट क्यालकुलेटर' : '13% VAT Calculator'}</Text>
            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>Amount (रु)</Text>
              <TextInput style={styles.textInput} value={vatAmount} onChangeText={setVatAmount} keyboardType="numeric" />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Inclusive of VAT</Text>
              <Switch value={isVatInclusive} onValueChange={setIsVatInclusive} />
            </View>
            <View style={styles.resultBox}>
              <Text style={styles.resultBoxLabel}>{isVatInclusive ? 'Base Taxable Amount' : 'Final Gross Amount'}</Text>
              <Text style={styles.resultBoxVal}>रु {(isVatInclusive ? vatResult.baseAmount : vatResult.grossAmount).toLocaleString()}</Text>
              <Text style={styles.resultBoxSub}>13% VAT Component: रु {vatResult.taxAmount.toLocaleString()}</Text>
            </View>
          </FadeInView>
        )}

        {/* 9. MARGIN */}
        {activeTab === 'margin' && (
          <FadeInView style={styles.card}>
            <Text style={styles.cardTitle}>{ne ? 'नाफा मार्जिन' : 'Margin & Markup'}</Text>
            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Cost (रु)</Text>
                <TextInput style={styles.textInput} value={marginCost} onChangeText={setMarginCost} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Selling Price (रु)</Text>
                <TextInput style={styles.textInput} value={marginSale} onChangeText={setMarginSale} keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.resultBox}>
              <Text style={styles.resultBoxLabel}>Net Profit</Text>
              <Text style={[styles.resultBoxVal, { color: '#059669' }]}>रु {marginResult.profit.toLocaleString()}</Text>
              <Text style={styles.resultBoxSub}>Margin: {marginResult.marginPercent.toFixed(1)}% • Markup: {marginResult.markupPercent.toFixed(1)}%</Text>
            </View>
          </FadeInView>
        )}

        {/* 10. CASH DRAWER */}
        {activeTab === 'cash' && (
          <FadeInView style={styles.card}>
            <Text style={styles.cardTitle}>{ne ? 'गल्ला नगद काउन्टर' : 'Cash Drawer Counter'}</Text>
            <Text style={styles.cardSubtitle}>Count physical banknotes</Text>

            <View style={{ marginTop: 8 }}>
              {NEPAL_DENOMINATIONS.map((d) => (
                <View key={d} style={styles.cashRow}>
                  <Text style={styles.cashDenom}>रु {d}</Text>
                  <TextInput
                    style={styles.cashInput}
                    value={String(counts[d] || 0)}
                    onChangeText={(t) => setCounts({ ...counts, [d]: parseInt(t, 10) || 0 })}
                    keyboardType="numeric"
                  />
                  <Text style={styles.cashTotal}>= रु {((counts[d] || 0) * d).toLocaleString()}</Text>
                </View>
              ))}
            </View>

            <View style={styles.resultBox}>
              <Text style={styles.resultBoxLabel}>Grand Total in Drawer</Text>
              <Text style={styles.resultBoxVal}>रु {denominationResult.grandTotal.toLocaleString()}</Text>
              <Text style={styles.resultBoxSub}>({denominationResult.totalNotes} Banknotes counted)</Text>
            </View>
          </FadeInView>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: Theme, themeMode: 'light' | 'dark') => {
  const isDark = themeMode === 'dark';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#121212' : '#F9F9F8',
    },
    groupHeader: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
    },
    groupSegment: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1E1E1E' : '#EFEFEF',
      borderRadius: 12,
      padding: 3,
    },
    groupBtn: {
      flex: 1,
      paddingVertical: 7,
      alignItems: 'center',
      borderRadius: 9,
    },
    groupBtnActive: {
      backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF',
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    groupBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#888888' : '#777777',
    },
    groupBtnTextActive: {
      color: isDark ? '#FFFFFF' : '#1C1917',
      fontWeight: '700',
    },
    tabScrollWrapper: {
      paddingVertical: 8,
    },
    tabScroll: {
      paddingHorizontal: 16,
      gap: 6,
    },
    tabPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? '#2E2E2E' : '#E5E5E5',
    },
    tabPillActive: {
      backgroundColor: isDark ? '#FFFFFF' : '#1C1917',
      borderColor: isDark ? '#FFFFFF' : '#1C1917',
    },
    tabPillText: {
      fontSize: 12,
      fontWeight: '500',
      color: isDark ? '#AAAAAA' : '#555555',
    },
    tabPillTextActive: {
      color: isDark ? '#1C1917' : '#FFFFFF',
      fontWeight: '700',
    },
    contentScroll: {
      padding: 16,
      paddingBottom: 40,
    },
    card: {
      backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark ? '#262626' : '#EAEAEA',
      shadowColor: '#000',
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: isDark ? '#FFFFFF' : '#1C1917',
    },
    cardSubtitle: {
      fontSize: 11,
      color: isDark ? '#777777' : '#888888',
      marginTop: 2,
      marginBottom: 12,
    },
    subPillRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 12,
    },
    subPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: isDark ? '#262626' : '#F3F3F3',
    },
    subPillActive: {
      backgroundColor: isDark ? '#3A3A3A' : '#E0E0E0',
    },
    subPillText: {
      fontSize: 11,
      fontWeight: '500',
      color: isDark ? '#AAAAAA' : '#666666',
    },
    subPillTextActive: {
      color: isDark ? '#FFFFFF' : '#1C1917',
      fontWeight: '700',
    },
    inputBlock: {
      marginBottom: 10,
    },
    inputRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    inputLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: isDark ? '#AAAAAA' : '#666666',
      marginBottom: 4,
    },
    textInput: {
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? '#333333' : '#DCDCDC',
      backgroundColor: isDark ? '#222222' : '#FAFAFA',
      paddingHorizontal: 12,
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#1C1917',
    },
    unitGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    unitItem: {
      width: '48%',
      padding: 8,
      borderRadius: 10,
      backgroundColor: isDark ? '#222222' : '#F8F8F8',
      borderWidth: 1,
      borderColor: isDark ? '#2E2E2E' : '#EAEAEA',
    },
    unitItemActive: {
      borderColor: isDark ? '#FFFFFF' : '#1C1917',
      backgroundColor: isDark ? '#2A2A2A' : '#EEEEEE',
    },
    unitItemLabel: {
      fontSize: 10,
      color: isDark ? '#888888' : '#777777',
    },
    unitItemVal: {
      fontSize: 13,
      fontWeight: '700',
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      color: isDark ? '#FFFFFF' : '#1C1917',
      marginTop: 2,
    },
    resultBox: {
      marginTop: 14,
      padding: 14,
      borderRadius: 12,
      backgroundColor: isDark ? '#222222' : '#F5F5F4',
      borderWidth: 1,
      borderColor: isDark ? '#2E2E2E' : '#E7E5E4',
      alignItems: 'center',
    },
    resultBoxLabel: {
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: isDark ? '#888888' : '#78716C',
    },
    resultBoxVal: {
      fontSize: 22,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#1C1917',
      marginVertical: 2,
    },
    resultBoxSub: {
      fontSize: 11,
      color: isDark ? '#999999' : '#78716C',
    },
    qrDisplayWrap: {
      alignItems: 'center',
      marginTop: 12,
    },
    qrImg: {
      width: 180,
      height: 180,
      borderRadius: 12,
      backgroundColor: '#FFFFFF',
    },
    qrScanHint: {
      fontSize: 10,
      color: isDark ? '#777777' : '#999999',
      marginTop: 6,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: 8,
    },
    switchLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#CCCCCC' : '#444444',
    },
    cashRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    cashDenom: {
      width: 60,
      fontSize: 12,
      fontWeight: '700',
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      color: isDark ? '#CCCCCC' : '#333333',
    },
    cashInput: {
      width: 65,
      height: 32,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: isDark ? '#333333' : '#D0D0D0',
      backgroundColor: isDark ? '#222222' : '#FFFFFF',
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#FFFFFF' : '#1C1917',
    },
    cashTotal: {
      width: 90,
      textAlign: 'right',
      fontSize: 11,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      color: isDark ? '#888888' : '#777777',
    },
  });
};
