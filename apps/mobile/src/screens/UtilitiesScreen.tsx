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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
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
} from '@byapar/core';

type UtilityTab = 'emi' | 'interest' | 'vat' | 'margin' | 'cash';

export const UtilitiesScreen: React.FC = () => {
  const { theme, themeMode, language } = useApp();
  const styles = useMemo(() => createStyles(theme, themeMode), [theme, themeMode]);
  const isDark = themeMode === 'dark';
  const ne = language === 'ne';

  const [activeTab, setActiveTab] = useState<UtilityTab>('emi');

  // -------------------------------------------------------------
  // 1. EMI Calculator State
  // -------------------------------------------------------------
  const [emiPrincipal, setEmiPrincipal] = useState('500000');
  const [emiRate, setEmiRate] = useState('12');
  const [emiTenureMonths, setEmiTenureMonths] = useState('24');
  const [tenureUnit, setTenureUnit] = useState<'months' | 'years'>('months');
  const [showSchedule, setShowSchedule] = useState(false);

  const emiResult = useMemo(() => {
    const p = parseFloat(emiPrincipal) || 0;
    const r = parseFloat(emiRate) || 0;
    const rawTenure = parseFloat(emiTenureMonths) || 0;
    const months = tenureUnit === 'years' ? Math.round(rawTenure * 12) : Math.round(rawTenure);
    return calculateEmi(p, r, months);
  }, [emiPrincipal, emiRate, emiTenureMonths, tenureUnit]);

  // -------------------------------------------------------------
  // 2. Nepali Khata & Loan Interest State
  // -------------------------------------------------------------
  const [interestPrincipal, setInterestPrincipal] = useState('100000');
  const [interestRate, setInterestRate] = useState('2'); // 2% per month default (Nepali sanykda)
  const [isMonthlyRate, setIsMonthlyRate] = useState(true);
  const [interestDays, setInterestDays] = useState('90');
  const [isCompound, setIsCompound] = useState(false);
  const [compoundFreq, setCompoundFreq] = useState<'monthly' | 'quarterly' | 'annually'>('monthly');

  const interestResult = useMemo(() => {
    const p = parseFloat(interestPrincipal) || 0;
    const r = parseFloat(interestRate) || 0;
    const d = parseFloat(interestDays) || 0;
    return calculateInterest(p, r, d, {
      isMonthlyRate,
      isCompound,
      compoundFrequency: compoundFreq,
    });
  }, [interestPrincipal, interestRate, isMonthlyRate, interestDays, isCompound, compoundFreq]);

  // -------------------------------------------------------------
  // 3. VAT & TDS State
  // -------------------------------------------------------------
  const [taxAmountInput, setTaxAmountInput] = useState('10000');
  const [taxRate, setTaxRate] = useState('13');
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);

  const taxResult = useMemo(() => {
    const amt = parseFloat(taxAmountInput) || 0;
    const rate = parseFloat(taxRate) || 0;
    return calculateTax(amt, rate, isTaxInclusive);
  }, [taxAmountInput, taxRate, isTaxInclusive]);

  // -------------------------------------------------------------
  // 4. Margin & Markup State
  // -------------------------------------------------------------
  const [marginMode, setMarginMode] = useState<'cost_sale' | 'target_margin'>('cost_sale');
  const [marginCost, setMarginCost] = useState('800');
  const [marginSale, setMarginSale] = useState('1000');
  const [targetMarginPercent, setTargetMarginPercent] = useState('20');

  const marginResult = useMemo(() => {
    const cost = parseFloat(marginCost) || 0;
    if (marginMode === 'cost_sale') {
      const sale = parseFloat(marginSale) || 0;
      return calculateMargin(cost, sale);
    } else {
      const targetPct = parseFloat(targetMarginPercent) || 0;
      const targetSale = calculateTargetSellingPrice(cost, targetPct);
      return calculateMargin(cost, targetSale);
    }
  }, [marginMode, marginCost, marginSale, targetMarginPercent]);

  // -------------------------------------------------------------
  // 5. Cash Drawer & Change Calculator State
  // -------------------------------------------------------------
  const [counts, setCounts] = useState<Record<number, number>>({
    1000: 10,
    500: 20,
    100: 50,
    50: 40,
    20: 30,
    10: 25,
    5: 20,
    2: 10,
    1: 10,
  });
  const [expectedCash, setExpectedCash] = useState('25000');

  // Change Return Assistant
  const [billTotal, setBillTotal] = useState('1350');
  const [cashReceived, setCashReceived] = useState('2000');

  const denominationResult = useMemo(() => {
    return calculateDenominations(counts);
  }, [counts]);

  const changeReturnAmount = useMemo(() => {
    const bill = parseFloat(billTotal) || 0;
    const received = parseFloat(cashReceived) || 0;
    return Math.max(0, received - bill);
  }, [billTotal, cashReceived]);

  const changeBreakdown = useMemo(() => {
    let rem = changeReturnAmount;
    const breakdown: { note: number; count: number }[] = [];
    for (const d of NEPAL_DENOMINATIONS) {
      if (rem >= d) {
        const count = Math.floor(rem / d);
        breakdown.push({ note: d, count });
        rem = rem % d;
      }
    }
    return breakdown;
  }, [changeReturnAmount]);

  const handleDenomChange = (denom: number, text: string) => {
    const val = parseInt(text, 10);
    setCounts((prev) => ({
      ...prev,
      [denom]: isNaN(val) ? 0 : Math.max(0, val),
    }));
  };

  const handleQuickAdd = (denom: number, delta: number) => {
    setCounts((prev) => ({
      ...prev,
      [denom]: Math.max(0, (prev[denom] || 0) + delta),
    }));
  };

  const clearAllCounts = () => {
    const cleared: Record<number, number> = {};
    for (const d of NEPAL_DENOMINATIONS) {
      cleared[d] = 0;
    }
    setCounts(cleared);
  };

  const expectedNum = parseFloat(expectedCash) || 0;
  const cashDifference = denominationResult.grandTotal - expectedNum;

  return (
    <View style={styles.container}>
      {/* Segmented Top Navigation Tabs */}
      <View style={styles.tabBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarScroll}
        >
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'emi' && styles.tabButtonActive]}
            onPress={() => setActiveTab('emi')}
            activeOpacity={0.7}
          >
            <Feather
              name="pie-chart"
              size={15}
              color={activeTab === 'emi' ? '#FFFFFF' : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'emi' && styles.tabButtonTextActive,
              ]}
            >
              {ne ? 'EMI कर्जा' : 'EMI Loan'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'interest' && styles.tabButtonActive]}
            onPress={() => setActiveTab('interest')}
            activeOpacity={0.7}
          >
            <Feather
              name="percent"
              size={15}
              color={activeTab === 'interest' ? '#FFFFFF' : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'interest' && styles.tabButtonTextActive,
              ]}
            >
              {ne ? 'खाता ब्याज' : 'Interest / ब्याज'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'vat' && styles.tabButtonActive]}
            onPress={() => setActiveTab('vat')}
            activeOpacity={0.7}
          >
            <Feather
              name="file-text"
              size={15}
              color={activeTab === 'vat' ? '#FFFFFF' : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'vat' && styles.tabButtonTextActive,
              ]}
            >
              {ne ? 'VAT र TDS' : 'VAT & TDS'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'margin' && styles.tabButtonActive]}
            onPress={() => setActiveTab('margin')}
            activeOpacity={0.7}
          >
            <Feather
              name="trending-up"
              size={15}
              color={activeTab === 'margin' ? '#FFFFFF' : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'margin' && styles.tabButtonTextActive,
              ]}
            >
              {ne ? 'मार्जिन र मार्कअप' : 'Margin & Markup'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'cash' && styles.tabButtonActive]}
            onPress={() => setActiveTab('cash')}
            activeOpacity={0.7}
          >
            <Feather
              name="dollar-sign"
              size={15}
              color={activeTab === 'cash' ? '#FFFFFF' : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'cash' && styles.tabButtonTextActive,
              ]}
            >
              {ne ? 'क्यास काउन्टर' : 'Cash Drawer'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================= */}
        {/* TAB 1: EMI LOAN CALCULATOR */}
        {/* ========================================================= */}
        {activeTab === 'emi' && (
          <FadeInView>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: '#3B82F620' }]}>
                  <Feather name="pie-chart" size={18} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {ne ? 'बैंक तथा सहकारी EMI क्यालकुलेटर' : 'Bank & Cooperative EMI Calculator'}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {ne ? 'मासिक किस्ता, कुल ब्याज र कुल भुक्तानी' : 'Monthly installment, total interest & payments'}
                  </Text>
                </View>
              </View>

              {/* Input: Loan Principal */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{ne ? 'कर्जा रकम (रु.)' : 'Loan Principal (Rs.)'}</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputPrefix}>रु.</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={emiPrincipal}
                    onChangeText={setEmiPrincipal}
                    placeholder="500000"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                {/* Quick Principal Presets */}
                <View style={styles.chipRow}>
                  {[100000, 300000, 500000, 1000000, 2500000].map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      style={[
                        styles.chip,
                        emiPrincipal === String(amt) && styles.chipActive,
                      ]}
                      onPress={() => setEmiPrincipal(String(amt))}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          emiPrincipal === String(amt) && styles.chipTextActive,
                        ]}
                      >
                        {amt >= 100000 ? `${amt / 100000}L` : `${amt / 1000}k`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Input: Annual Interest Rate */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{ne ? 'वार्षिक ब्याजदर (%)' : 'Annual Interest Rate (%)'}</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={emiRate}
                    onChangeText={setEmiRate}
                    placeholder="12"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                  <Text style={styles.inputSuffix}>%</Text>
                </View>
                {/* Quick Rate Presets */}
                <View style={styles.chipRow}>
                  {[9.5, 11, 12, 13.5, 15].map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.chip, emiRate === String(r) && styles.chipActive]}
                      onPress={() => setEmiRate(String(r))}
                    >
                      <Text
                        style={[styles.chipText, emiRate === String(r) && styles.chipTextActive]}
                      >
                        {r}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Input: Loan Tenure */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>{ne ? 'कर्जा अवधि' : 'Loan Tenure'}</Text>
                  <View style={styles.togglePill}>
                    <TouchableOpacity
                      style={[
                        styles.togglePillBtn,
                        tenureUnit === 'months' && styles.togglePillBtnActive,
                      ]}
                      onPress={() => setTenureUnit('months')}
                    >
                      <Text
                        style={[
                          styles.togglePillText,
                          tenureUnit === 'months' && styles.togglePillTextActive,
                        ]}
                      >
                        {ne ? 'महिना' : 'Months'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.togglePillBtn,
                        tenureUnit === 'years' && styles.togglePillBtnActive,
                      ]}
                      onPress={() => setTenureUnit('years')}
                    >
                      <Text
                        style={[
                          styles.togglePillText,
                          tenureUnit === 'years' && styles.togglePillTextActive,
                        ]}
                      >
                        {ne ? 'वर्ष' : 'Years'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={emiTenureMonths}
                    onChangeText={setEmiTenureMonths}
                    placeholder={tenureUnit === 'months' ? '24' : '2'}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                  <Text style={styles.inputSuffix}>
                    {tenureUnit === 'months' ? (ne ? 'महिना' : 'Mos') : (ne ? 'वर्ष' : 'Yrs')}
                  </Text>
                </View>

                <View style={styles.chipRow}>
                  {(tenureUnit === 'months' ? [6, 12, 24, 36, 60] : [1, 2, 3, 5, 10]).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.chip,
                        emiTenureMonths === String(t) && styles.chipActive,
                      ]}
                      onPress={() => setEmiTenureMonths(String(t))}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          emiTenureMonths === String(t) && styles.chipTextActive,
                        ]}
                      >
                        {t} {tenureUnit === 'months' ? (ne ? 'महिना' : 'M') : (ne ? 'वर्ष' : 'Y')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* EMI Results Showcase */}
              <View style={styles.resultBanner}>
                <Text style={styles.resultBannerLabel}>{ne ? 'मासिक किस्ता (Monthly EMI)' : 'Monthly EMI'}</Text>
                <Text style={styles.resultBannerAmount}>
                  {formatNepaliCurrency(emiResult.monthlyEmi)}
                </Text>

                <View style={styles.resultBreakdownRow}>
                  <View style={styles.resultCol}>
                    <Text style={styles.resultSubLabel}>{ne ? 'साँवा रकम (Principal)' : 'Principal'}</Text>
                    <Text style={styles.resultSubValue}>
                      {formatNepaliCurrency(parseFloat(emiPrincipal) || 0)}
                    </Text>
                  </View>

                  <View style={styles.resultCol}>
                    <Text style={[styles.resultSubLabel, { color: '#EF4444' }]}>
                      {ne ? 'कुल ब्याज (Interest)' : 'Total Interest'}
                    </Text>
                    <Text style={[styles.resultSubValue, { color: '#EF4444' }]}>
                      {formatNepaliCurrency(emiResult.totalInterest)}
                    </Text>
                  </View>

                  <View style={styles.resultCol}>
                    <Text style={[styles.resultSubLabel, { color: '#10B981' }]}>
                      {ne ? 'जम्मा भुक्तानी (Total)' : 'Total Payable'}
                    </Text>
                    <Text style={[styles.resultSubValue, { color: '#10B981' }]}>
                      {formatNepaliCurrency(emiResult.totalAmount)}
                    </Text>
                  </View>
                </View>

                {/* Visual Ratio Bar */}
                {emiResult.totalAmount > 0 && (
                  <View style={styles.ratioBarContainer}>
                    <View
                      style={[
                        styles.ratioBarPrincipal,
                        {
                          flex: (parseFloat(emiPrincipal) || 0) / emiResult.totalAmount,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.ratioBarInterest,
                        {
                          flex: emiResult.totalInterest / emiResult.totalAmount,
                        },
                      ]}
                    />
                  </View>
                )}

                <View style={styles.ratioLegendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                    <Text style={styles.legendText}>
                      {ne ? 'साँवा' : 'Principal'} (
                      {Math.round(
                        ((parseFloat(emiPrincipal) || 0) / (emiResult.totalAmount || 1)) * 100
                      )}
                      %)
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={styles.legendText}>
                      {ne ? 'ब्याज' : 'Interest'} (
                      {Math.round(
                        (emiResult.totalInterest / (emiResult.totalAmount || 1)) * 100
                      )}
                      %)
                    </Text>
                  </View>
                </View>
              </View>

              {/* Schedule Toggle */}
              {emiResult.schedule.length > 0 && (
                <View style={{ marginTop: 14 }}>
                  <TouchableOpacity
                    style={styles.scheduleToggleBtn}
                    onPress={() => setShowSchedule(!showSchedule)}
                  >
                    <Text style={styles.scheduleToggleText}>
                      {showSchedule
                        ? (ne ? 'तालिका लुकाउनुहोस्' : 'Hide Amortization Schedule')
                        : (ne ? `मासिक तालिका हेर्नुहोस् (${emiResult.schedule.length} किस्ता)` : `View Amortization Schedule (${emiResult.schedule.length} Mos)`)}
                    </Text>
                    <Feather
                      name={showSchedule ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={theme.colors.primary}
                    />
                  </TouchableOpacity>

                  {showSchedule && (
                    <View style={styles.scheduleListContainer}>
                      <View style={styles.scheduleTableHeader}>
                        <Text style={[styles.thCell, { flex: 1 }]}>{ne ? 'महिना' : 'Mo'}</Text>
                        <Text style={[styles.thCell, { flex: 2, textAlign: 'right' }]}>{ne ? 'साँवा' : 'Principal'}</Text>
                        <Text style={[styles.thCell, { flex: 2, textAlign: 'right' }]}>{ne ? 'ब्याज' : 'Interest'}</Text>
                        <Text style={[styles.thCell, { flex: 2, textAlign: 'right' }]}>{ne ? 'बाँकी साँवा' : 'Balance'}</Text>
                      </View>

                      {emiResult.schedule.slice(0, 36).map((item) => (
                        <View key={item.month} style={styles.scheduleRow}>
                          <Text style={[styles.tdCell, { flex: 1 }]}>#{item.month}</Text>
                          <Text style={[styles.tdCell, { flex: 2, textAlign: 'right', color: theme.colors.primary }]}>
                            {formatNepaliCurrency(item.principalPart, false)}
                          </Text>
                          <Text style={[styles.tdCell, { flex: 2, textAlign: 'right', color: '#EF4444' }]}>
                            {formatNepaliCurrency(item.interestPart, false)}
                          </Text>
                          <Text style={[styles.tdCell, { flex: 2, textAlign: 'right' }]}>
                            {formatNepaliCurrency(item.balance, false)}
                          </Text>
                        </View>
                      ))}
                      {emiResult.schedule.length > 36 && (
                        <Text style={styles.scheduleNote}>
                          {ne ? `र बाँकी ${emiResult.schedule.length - 36} किस्ताहरू...` : `And ${emiResult.schedule.length - 36} remaining installments...`}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          </FadeInView>
        )}

        {/* ========================================================= */}
        {/* TAB 2: NEPALI KHATA & LOAN INTEREST CALCULATOR */}
        {/* ========================================================= */}
        {activeTab === 'interest' && (
          <FadeInView>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: '#10B98120' }]}>
                  <Feather name="percent" size={18} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {ne ? 'नेपाली खाता तथा ऋण ब्याज क्यालकुलेटर' : 'Nepali Khata & Loan Interest Calculator'}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {ne ? 'सयकडा/मासिक वा वार्षिक, साधारण तथा चक्रवृद्धि ब्याज' : 'Monthly market / Annual bank, simple & compound'}
                  </Text>
                </View>
              </View>

              {/* Principal */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{ne ? 'साँवा रकम (रु.)' : 'Principal Amount (Rs.)'}</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputPrefix}>रु.</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={interestPrincipal}
                    onChangeText={setInterestPrincipal}
                    placeholder="100000"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
              </View>

              {/* Interest Rate & Basis Toggle */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>{ne ? 'ब्याजदर' : 'Interest Rate'}</Text>
                  <View style={styles.togglePill}>
                    <TouchableOpacity
                      style={[styles.togglePillBtn, isMonthlyRate && styles.togglePillBtnActive]}
                      onPress={() => setIsMonthlyRate(true)}
                    >
                      <Text
                        style={[
                          styles.togglePillText,
                          isMonthlyRate && styles.togglePillTextActive,
                        ]}
                      >
                        {ne ? 'मासिक (सयकडा)' : 'Monthly %'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.togglePillBtn, !isMonthlyRate && styles.togglePillBtnActive]}
                      onPress={() => setIsMonthlyRate(false)}
                    >
                      <Text
                        style={[
                          styles.togglePillText,
                          !isMonthlyRate && styles.togglePillTextActive,
                        ]}
                      >
                        {ne ? 'वार्षिक (Bank)' : 'Annual %'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={interestRate}
                    onChangeText={setInterestRate}
                    placeholder={isMonthlyRate ? '2' : '12'}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                  <Text style={styles.inputSuffix}>
                    {isMonthlyRate ? (ne ? '% / महिना' : '%/mo') : (ne ? '% / वर्ष' : '%/yr')}
                  </Text>
                </View>

                {/* Presets */}
                <View style={styles.chipRow}>
                  {(isMonthlyRate ? [1, 1.5, 2, 2.5, 3] : [8, 10, 12, 14, 16]).map((rate) => (
                    <TouchableOpacity
                      key={rate}
                      style={[styles.chip, interestRate === String(rate) && styles.chipActive]}
                      onPress={() => setInterestRate(String(rate))}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          interestRate === String(rate) && styles.chipTextActive,
                        ]}
                      >
                        {isMonthlyRate
                          ? (ne ? `रु. ${rate} सयकडा` : `${rate}%/mo`)
                          : `${rate}%`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Duration in Days */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{ne ? 'अवधि (दिन)' : 'Duration (Days)'}</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={interestDays}
                    onChangeText={setInterestDays}
                    placeholder="90"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                  <Text style={styles.inputSuffix}>{ne ? 'दिन' : 'Days'}</Text>
                </View>
                <View style={styles.chipRow}>
                  {[
                    { label: ne ? '१ महिना (३०)' : '30d (1m)', val: 30 },
                    { label: ne ? '२ महिना (६०)' : '60d (2m)', val: 60 },
                    { label: ne ? '३ महिना (९०)' : '90d (3m)', val: 90 },
                    { label: ne ? '६ महिना (१८०)' : '180d (6m)', val: 180 },
                    { label: ne ? '१ वर्ष (३६५)' : '365d (1y)', val: 365 },
                  ].map((d) => (
                    <TouchableOpacity
                      key={d.val}
                      style={[styles.chip, interestDays === String(d.val) && styles.chipActive]}
                      onPress={() => setInterestDays(String(d.val))}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          interestDays === String(d.val) && styles.chipTextActive,
                        ]}
                      >
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Simple vs Compound Switch */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>
                    {ne ? 'चक्रवृद्धि ब्याज (Compound Interest)' : 'Compound Interest'}
                  </Text>
                  <Text style={styles.switchDesc}>
                    {ne ? 'ब्याजमा पनि ब्याज गणना गर्ने' : 'Calculate interest on accumulated interest'}
                  </Text>
                </View>
                <Switch
                  value={isCompound}
                  onValueChange={setIsCompound}
                  trackColor={{ false: theme.colors.borderGlass, true: theme.colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {isCompound && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.fieldLabel}>{ne ? 'चक्रवृद्धि अन्तराल' : 'Compounding Frequency'}</Text>
                  <View style={styles.chipRow}>
                    {[
                      { key: 'monthly', label: ne ? 'मासिक (Monthly)' : 'Monthly' },
                      { key: 'quarterly', label: ne ? 'त्रैमासिक (Quarterly)' : 'Quarterly' },
                      { key: 'annually', label: ne ? 'वार्षिक (Annually)' : 'Annually' },
                    ].map((freq) => (
                      <TouchableOpacity
                        key={freq.key}
                        style={[styles.chip, compoundFreq === freq.key && styles.chipActive]}
                        onPress={() => setCompoundFreq(freq.key as any)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            compoundFreq === freq.key && styles.chipTextActive,
                          ]}
                        >
                          {freq.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Interest Results */}
              <View style={[styles.resultBanner, { borderColor: '#10B98150' }]}>
                <Text style={styles.resultBannerLabel}>{ne ? 'कुल ब्याज रकम (Total Interest)' : 'Total Interest'}</Text>
                <Text style={[styles.resultBannerAmount, { color: '#10B981' }]}>
                  {formatNepaliCurrency(interestResult.totalInterest)}
                </Text>

                <View style={styles.resultBreakdownRow}>
                  <View style={styles.resultCol}>
                    <Text style={styles.resultSubLabel}>{ne ? 'साँवा (Principal)' : 'Principal'}</Text>
                    <Text style={styles.resultSubValue}>
                      {formatNepaliCurrency(parseFloat(interestPrincipal) || 0)}
                    </Text>
                  </View>
                  <View style={styles.resultCol}>
                    <Text style={[styles.resultSubLabel, { color: '#3B82F6' }]}>
                      {ne ? 'जम्मा फिर्ता (Total)' : 'Total Payable'}
                    </Text>
                    <Text style={[styles.resultSubValue, { color: '#3B82F6' }]}>
                      {formatNepaliCurrency(interestResult.totalPayable)}
                    </Text>
                  </View>
                  <View style={styles.resultCol}>
                    <Text style={styles.resultSubLabel}>{ne ? 'दैनिक ब्याज (Daily)' : 'Daily Interest'}</Text>
                    <Text style={styles.resultSubValue}>
                      {formatNepaliCurrency(interestResult.days > 0 ? Math.round(interestResult.totalInterest / interestResult.days) : 0)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </FadeInView>
        )}

        {/* ========================================================= */}
        {/* TAB 3: VAT & TDS CALCULATOR */}
        {/* ========================================================= */}
        {activeTab === 'vat' && (
          <FadeInView>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: '#F59E0B20' }]}>
                  <Feather name="file-text" size={18} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {ne ? 'VAT र TDS क्यालकुलेटर (नेपाल)' : 'Nepal VAT & TDS Calculator'}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {ne ? '१३% भ्याट जोड्ने वा समावेश भएको भ्याट छुट्याउने' : 'Tax inclusive / exclusive & TDS deduction'}
                  </Text>
                </View>
              </View>

              {/* Mode Toggle: Exclusive vs Inclusive */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{ne ? 'गणना प्रकार (Calculation Mode)' : 'Mode'}</Text>
                <View style={styles.toggleRowContainer}>
                  <TouchableOpacity
                    style={[styles.modeCard, !isTaxInclusive && styles.modeCardActive]}
                    onPress={() => setIsTaxInclusive(false)}
                  >
                    <Feather
                      name="plus-circle"
                      size={16}
                      color={!isTaxInclusive ? theme.colors.primary : theme.colors.textMuted}
                    />
                    <Text
                      style={[styles.modeCardTitle, !isTaxInclusive && styles.modeCardTitleActive]}
                    >
                      {ne ? 'Tax Exclusive (VAT जोड्ने)' : 'Tax Exclusive (Add VAT)'}
                    </Text>
                    <Text style={styles.modeCardDesc}>
                      {ne ? 'बेस रकममा १३% भ्याट थपिन्छ' : 'VAT added on top of base amount'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeCard, isTaxInclusive && styles.modeCardActive]}
                    onPress={() => setIsTaxInclusive(true)}
                  >
                    <Feather
                      name="check-circle"
                      size={16}
                      color={isTaxInclusive ? theme.colors.primary : theme.colors.textMuted}
                    />
                    <Text
                      style={[styles.modeCardTitle, isTaxInclusive && styles.modeCardTitleActive]}
                    >
                      {ne ? 'Tax Inclusive (भ्याट सहित)' : 'Tax Inclusive (Reverse)'}
                    </Text>
                    <Text style={styles.modeCardDesc}>
                      {ne ? 'कुल बिलबाट बेस र भ्याट छुट्याउने' : 'Extract base & VAT from gross total'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Amount Input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {isTaxInclusive
                    ? (ne ? 'कुल बिल रकम (Gross Total with Tax) (रु.)' : 'Gross Bill Amount (Rs.)')
                    : (ne ? 'कर बाहेकको रकम (Taxable Base Amount) (रु.)' : 'Base Amount before Tax (Rs.)')}
                </Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputPrefix}>रु.</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={taxAmountInput}
                    onChangeText={setTaxAmountInput}
                    placeholder="10000"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
              </View>

              {/* Tax Rate presets */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{ne ? 'कर तथा TDS दर' : 'Tax / TDS Rate'}</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={taxRate}
                    onChangeText={setTaxRate}
                    placeholder="13"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                  <Text style={styles.inputSuffix}>%</Text>
                </View>
                <View style={styles.chipRow}>
                  {[
                    { label: '13% VAT', rate: 13 },
                    { label: '1.5% TDS (Goods)', rate: 1.5 },
                    { label: '10% TDS (Rent)', rate: 10 },
                    { label: '15% TDS (Services)', rate: 15 },
                  ].map((p) => (
                    <TouchableOpacity
                      key={p.rate}
                      style={[styles.chip, taxRate === String(p.rate) && styles.chipActive]}
                      onPress={() => setTaxRate(String(p.rate))}
                    >
                      <Text
                        style={[styles.chipText, taxRate === String(p.rate) && styles.chipTextActive]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Tax Results */}
              <View style={[styles.resultBanner, { borderColor: '#F59E0B50' }]}>
                <Text style={styles.resultBannerLabel}>
                  {isTaxInclusive
                    ? (ne ? 'समावेश कर रकम (Tax Component)' : 'Tax Component')
                    : (ne ? 'थपिने कर रकम (Added Tax)' : 'Added Tax')}
                </Text>
                <Text style={[styles.resultBannerAmount, { color: '#F59E0B' }]}>
                  {formatNepaliCurrency(taxResult.taxAmount)}
                </Text>

                <View style={styles.resultBreakdownRow}>
                  <View style={styles.resultCol}>
                    <Text style={styles.resultSubLabel}>{ne ? 'कर बाहेक (Base Amount)' : 'Base Amount'}</Text>
                    <Text style={styles.resultSubValue}>
                      {formatNepaliCurrency(taxResult.baseAmount)}
                    </Text>
                  </View>

                  <View style={styles.resultCol}>
                    <Text style={[styles.resultSubLabel, { color: '#10B981' }]}>
                      {ne ? 'कुल रकम (Gross Total)' : 'Gross Total'}
                    </Text>
                    <Text style={[styles.resultSubValue, { color: '#10B981' }]}>
                      {formatNepaliCurrency(taxResult.grossAmount)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </FadeInView>
        )}

        {/* ========================================================= */}
        {/* TAB 4: MARGIN & MARKUP CALCULATOR */}
        {/* ========================================================= */}
        {activeTab === 'margin' && (
          <FadeInView>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: '#8B5CF620' }]}>
                  <Feather name="trending-up" size={18} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {ne ? 'नाफा, मार्जिन र मार्कअप क्यालकुलेटर' : 'Margin & Markup Profit Calculator'}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {ne ? 'क्रय र बिक्री मूल्य वा लक्षित नाफा प्रतिशत' : 'Cost/selling price analysis or target margin pricing'}
                  </Text>
                </View>
              </View>

              {/* Margin Mode */}
              <View style={styles.fieldGroup}>
                <View style={styles.toggleRowContainer}>
                  <TouchableOpacity
                    style={[styles.modeCard, marginMode === 'cost_sale' && styles.modeCardActive]}
                    onPress={() => setMarginMode('cost_sale')}
                  >
                    <Text
                      style={[
                        styles.modeCardTitle,
                        marginMode === 'cost_sale' && styles.modeCardTitleActive,
                      ]}
                    >
                      {ne ? 'क्रय र बिक्री मूल्य' : 'Cost & Sale Price'}
                    </Text>
                    <Text style={styles.modeCardDesc}>
                      {ne ? 'नाफा र मार्जिन % पत्ता लगाउन' : 'Calculate Profit & Margin %'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modeCard,
                      marginMode === 'target_margin' && styles.modeCardActive,
                    ]}
                    onPress={() => setMarginMode('target_margin')}
                  >
                    <Text
                      style={[
                        styles.modeCardTitle,
                        marginMode === 'target_margin' && styles.modeCardTitleActive,
                      ]}
                    >
                      {ne ? 'लक्षित मार्जिन %' : 'Target Margin %'}
                    </Text>
                    <Text style={styles.modeCardDesc}>
                      {ne ? 'चाहिएको मार्जिन अनुसार बिक्री मूल्य' : 'Calculate needed Selling Price'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Cost Price */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{ne ? 'क्रय मूल्य / खरिद मूल्य (Cost Price) (रु.)' : 'Cost Price (Rs.)'}</Text>
                <View style={styles.inputBox}>
                  <Text style={styles.inputPrefix}>रु.</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={marginCost}
                    onChangeText={setMarginCost}
                    placeholder="800"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
              </View>

              {marginMode === 'cost_sale' ? (
                /* Selling Price Input */
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{ne ? 'बिक्री मूल्य (Selling Price) (रु.)' : 'Selling Price (Rs.)'}</Text>
                  <View style={styles.inputBox}>
                    <Text style={styles.inputPrefix}>रु.</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="numeric"
                      value={marginSale}
                      onChangeText={setMarginSale}
                      placeholder="1000"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>
                </View>
              ) : (
                /* Target Margin % Input */
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{ne ? 'इच्छित नाफा मार्जिन (Target Margin %)' : 'Target Margin (%)'}</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="numeric"
                      value={targetMarginPercent}
                      onChangeText={setTargetMarginPercent}
                      placeholder="20"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                    <Text style={styles.inputSuffix}>%</Text>
                  </View>
                  <View style={styles.chipRow}>
                    {[10, 15, 20, 25, 30, 40].map((pct) => (
                      <TouchableOpacity
                        key={pct}
                        style={[
                          styles.chip,
                          targetMarginPercent === String(pct) && styles.chipActive,
                        ]}
                        onPress={() => setTargetMarginPercent(String(pct))}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            targetMarginPercent === String(pct) && styles.chipTextActive,
                          ]}
                        >
                          {pct}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Margin Results */}
              <View style={[styles.resultBanner, { borderColor: '#8B5CF650' }]}>
                {marginMode === 'target_margin' && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.resultBannerLabel}>{ne ? 'सिफारिश गरिएको बिक्री मूल्य' : 'Recommended Selling Price'}</Text>
                    <Text style={[styles.resultBannerAmount, { color: '#8B5CF6' }]}>
                      {formatNepaliCurrency(
                        calculateTargetSellingPrice(
                          parseFloat(marginCost) || 0,
                          parseFloat(targetMarginPercent) || 0
                        )
                      )}
                    </Text>
                  </View>
                )}

                <View style={styles.resultBreakdownRow}>
                  <View style={styles.resultCol}>
                    <Text style={[styles.resultSubLabel, { color: '#10B981' }]}>
                      {ne ? 'नाफा रकम (Profit)' : 'Profit (Rs.)'}
                    </Text>
                    <Text style={[styles.resultSubValue, { color: '#10B981' }]}>
                      {formatNepaliCurrency(marginResult.profit)}
                    </Text>
                  </View>

                  <View style={styles.resultCol}>
                    <Text style={[styles.resultSubLabel, { color: '#3B82F6' }]}>
                      {ne ? 'मार्जिन (Margin %)' : 'Gross Margin'}
                    </Text>
                    <Text style={[styles.resultSubValue, { color: '#3B82F6' }]}>
                      {marginResult.marginPercent}%
                    </Text>
                  </View>

                  <View style={styles.resultCol}>
                    <Text style={[styles.resultSubLabel, { color: '#F59E0B' }]}>
                      {ne ? 'मार्कअप (Markup %)' : 'Markup'}
                    </Text>
                    <Text style={[styles.resultSubValue, { color: '#F59E0B' }]}>
                      {marginResult.markupPercent}%
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </FadeInView>
        )}

        {/* ========================================================= */}
        {/* TAB 5: CASH DRAWER COUNTER & CHANGE ASSISTANT */}
        {/* ========================================================= */}
        {activeTab === 'cash' && (
          <FadeInView>
            {/* Sub-Card 1: Quick Change Return Assistant */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: '#10B98120' }]}>
                  <Feather name="refresh-cw" size={18} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {ne ? 'खुद्रा फिर्ता सहायक (Change Assistant)' : 'Cash Change Return Assistant'}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {ne ? 'ग्राहकलाई कति फिर्ता दिने र कुन-कुन नोट दिने' : 'Calculates exact change and optimal note breakdown'}
                  </Text>
                </View>
              </View>

              <View style={styles.twoColRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>{ne ? 'बिल रकम (Bill Total)' : 'Bill Total'}</Text>
                  <View style={styles.inputBox}>
                    <Text style={styles.inputPrefix}>रु.</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="numeric"
                      value={billTotal}
                      onChangeText={setBillTotal}
                      placeholder="1350"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>{ne ? 'बुझेको रकम (Cash Received)' : 'Cash Received'}</Text>
                  <View style={styles.inputBox}>
                    <Text style={styles.inputPrefix}>रु.</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="numeric"
                      value={cashReceived}
                      onChangeText={setCashReceived}
                      placeholder="2000"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>
                </View>
              </View>

              {/* Change Output */}
              <View style={[styles.resultBanner, { marginTop: 12, borderColor: '#10B98150' }]}>
                <Text style={styles.resultBannerLabel}>{ne ? 'ग्राहकलाई फिर्ता दिनुपर्ने खुद्रा' : 'Change to Return'}</Text>
                <Text style={[styles.resultBannerAmount, { color: '#10B981' }]}>
                  {formatNepaliCurrency(changeReturnAmount)}
                </Text>

                {changeBreakdown.length > 0 && (
                  <View style={styles.changeChipsContainer}>
                    <Text style={styles.changeChipsTitle}>{ne ? 'सिफारिश गरिएका नोटहरू:' : 'Suggested Notes:'}</Text>
                    <View style={styles.chipRow}>
                      {changeBreakdown.map((item) => (
                        <View key={item.note} style={styles.noteChip}>
                          <Text style={styles.noteChipText}>
                            रु. {item.note} × {item.count}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Sub-Card 2: Cash Denomination Counter */}
            <View style={[styles.card, { marginTop: 16 }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: '#3B82F620' }]}>
                  <Feather name="dollar-sign" size={18} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {ne ? 'दराज क्यास काउन्टर (Cash Drawer Balance)' : 'Drawer Denomination Counter'}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {ne ? 'नेपाली नोटहरूको संख्या र कुल नगद हिसाब' : 'Calculate drawer cash across Nepali denominations'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={clearAllCounts}
                  activeOpacity={0.7}
                >
                  <Text style={styles.clearBtnText}>{ne ? 'खाली गर्ने' : 'Clear'}</Text>
                </TouchableOpacity>
              </View>

              {/* Denomination Rows */}
              <View style={styles.denomTable}>
                {NEPAL_DENOMINATIONS.map((d) => {
                  const count = counts[d] || 0;
                  const rowTotal = d * count;
                  return (
                    <View key={d} style={styles.denomRow}>
                      <View style={styles.denomNoteBox}>
                        <Text style={styles.denomNoteText}>रु. {d}</Text>
                      </View>

                      <View style={styles.denomStepper}>
                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() => handleQuickAdd(d, -1)}
                        >
                          <Feather name="minus" size={14} color={theme.colors.textPrimary} />
                        </TouchableOpacity>

                        <TextInput
                          style={styles.denomInput}
                          keyboardType="numeric"
                          value={count === 0 ? '' : String(count)}
                          onChangeText={(t) => handleDenomChange(d, t)}
                          placeholder="0"
                          placeholderTextColor={theme.colors.textMuted}
                        />

                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() => handleQuickAdd(d, 1)}
                        >
                          <Feather name="plus" size={14} color={theme.colors.textPrimary} />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.denomRowTotal}>
                        {formatNepaliCurrency(rowTotal, false)}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Grand Total Drawer Banner */}
              <View style={[styles.resultBanner, { marginTop: 14 }]}>
                <Text style={styles.resultBannerLabel}>
                  {ne
                    ? `दराजमा जम्मा नगद (${denominationResult.totalNotes} वटा नोटहरू)`
                    : `Grand Drawer Cash (${denominationResult.totalNotes} Notes)`}
                </Text>
                <Text style={styles.resultBannerAmount}>
                  {formatNepaliCurrency(denominationResult.grandTotal)}
                </Text>

                {/* Compare with Expected Drawer Cash */}
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.borderGlass }}>
                  <View style={styles.twoColRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.fieldLabel}>{ne ? 'हुनुपर्ने नगद (Expected)' : 'Expected Balance'}</Text>
                      <View style={styles.inputBox}>
                        <Text style={styles.inputPrefix}>रु.</Text>
                        <TextInput
                          style={styles.textInput}
                          keyboardType="numeric"
                          value={expectedCash}
                          onChangeText={setExpectedCash}
                          placeholder="25000"
                          placeholderTextColor={theme.colors.textMuted}
                        />
                      </View>
                    </View>

                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.fieldLabel}>{ne ? 'अन्तर (Difference)' : 'Difference'}</Text>
                      <View
                        style={[
                          styles.diffBadge,
                          cashDifference === 0
                            ? { backgroundColor: '#10B98120' }
                            : cashDifference > 0
                            ? { backgroundColor: '#3B82F620' }
                            : { backgroundColor: '#EF444420' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.diffBadgeText,
                            cashDifference === 0
                              ? { color: '#10B981' }
                              : cashDifference > 0
                              ? { color: '#3B82F6' }
                              : { color: '#EF4444' },
                          ]}
                        >
                          {cashDifference === 0
                            ? (ne ? 'सटीक मिलेको ✓' : 'Exact Match ✓')
                            : cashDifference > 0
                            ? `+${formatNepaliCurrency(cashDifference)}`
                            : `-${formatNepaliCurrency(Math.abs(cashDifference))}`}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
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
      backgroundColor: theme.colors.bg,
    },
    tabBarWrapper: {
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderGlass,
      paddingVertical: 8,
    },
    tabBarScroll: {
      paddingHorizontal: 12,
      gap: 8,
    },
    tabButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      gap: 6,
    },
    tabButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    tabButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    tabButtonTextActive: {
      color: '#FFFFFF',
    },
    contentScroll: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
      paddingBottom: 40,
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: 16,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 12,
    },
    cardIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    cardSubtitle: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    fieldGroup: {
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 6,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    inputBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 46,
    },
    inputPrefix: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.primary,
      marginRight: 6,
    },
    inputSuffix: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textMuted,
      marginLeft: 6,
    },
    textInput: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      paddingVertical: 0,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
    },
    chipActive: {
      backgroundColor: isDark ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.15)',
      borderColor: theme.colors.primary,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    chipTextActive: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
    togglePill: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      borderRadius: 8,
      padding: 2,
    },
    togglePillBtn: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 6,
    },
    togglePillBtnActive: {
      backgroundColor: theme.colors.primary,
    },
    togglePillText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    togglePillTextActive: {
      color: '#FFFFFF',
    },
    resultBanner: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.primary + '40',
      padding: 16,
      alignItems: 'center',
    },
    resultBannerLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    resultBannerAmount: {
      fontSize: 26,
      fontWeight: '800',
      color: theme.colors.primary,
      marginVertical: 4,
    },
    resultBreakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderGlass,
    },
    resultCol: {
      alignItems: 'center',
      flex: 1,
    },
    resultSubLabel: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginBottom: 2,
      textAlign: 'center',
    },
    resultSubValue: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    ratioBarContainer: {
      flexDirection: 'row',
      height: 8,
      width: '100%',
      borderRadius: 4,
      overflow: 'hidden',
      marginTop: 14,
    },
    ratioBarPrincipal: {
      backgroundColor: '#3B82F6',
    },
    ratioBarInterest: {
      backgroundColor: '#EF4444',
    },
    ratioLegendRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
      marginTop: 8,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 11,
      color: theme.colors.textMuted,
      fontWeight: '500',
    },
    scheduleToggleBtn: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 10,
      gap: 6,
    },
    scheduleToggleText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    scheduleListContainer: {
      marginTop: 6,
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      overflow: 'hidden',
    },
    scheduleTableHeader: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderGlass,
    },
    thCell: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textMuted,
    },
    scheduleRow: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderGlass,
    },
    tdCell: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.textPrimary,
    },
    scheduleNote: {
      fontSize: 11,
      color: theme.colors.textMuted,
      textAlign: 'center',
      paddingVertical: 8,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderGlass,
      marginTop: 6,
    },
    switchTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    switchDesc: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    toggleRowContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    modeCard: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
    },
    modeCardActive: {
      borderColor: theme.colors.primary,
      backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)',
    },
    modeCardTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginTop: 6,
    },
    modeCardTitleActive: {
      color: theme.colors.primary,
    },
    modeCardDesc: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    twoColRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    changeChipsContainer: {
      marginTop: 12,
      width: '100%',
      alignItems: 'center',
    },
    changeChipsTitle: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textMuted,
      marginBottom: 6,
    },
    noteChip: {
      backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.12)',
      borderColor: '#10B981',
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    noteChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#10B981',
    },
    clearBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)',
    },
    clearBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#EF4444',
    },
    denomTable: {
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      borderRadius: 12,
      overflow: 'hidden',
    },
    denomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderGlass,
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
    },
    denomNoteBox: {
      width: 72,
    },
    denomNoteText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    denomStepper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    stepBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    denomInput: {
      width: 50,
      height: 34,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      borderRadius: 8,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
      paddingVertical: 0,
    },
    denomRowTotal: {
      width: 90,
      textAlign: 'right',
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    diffBadge: {
      height: 46,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    diffBadgeText: {
      fontSize: 14,
      fontWeight: '700',
    },
  });
};
