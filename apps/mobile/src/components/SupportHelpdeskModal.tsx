import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { supabase } from '../config/supabase';

interface SupportHelpdeskModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SupportHelpdeskModal: React.FC<SupportHelpdeskModalProps> = ({ visible, onClose }) => {
  const { theme, activeBizId, user, store } = useApp();
  const [activeTab, setActiveTab] = useState<'faqs' | 'tickets'>('faqs');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // New ticket state
  const [showNewForm, setShowNewForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('fonepay_qr');
  const [priority, setPriority] = useState('normal');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && activeTab === 'tickets') {
      loadTickets();
    }
  }, [visible, activeTab, activeBizId]);

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('business_id', activeBizId)
        .order('created_at', { ascending: false });

      if (!error && data) setTickets(data);
    } catch (err) {
      console.warn('Load tickets error:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const openTicket = async (t: any) => {
    setSelectedTicket(t);
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', t.id)
        .order('created_at', { ascending: true });

      if (!error && data) setMessages(data);
    } catch (err) {
      console.warn('Load messages error:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user?.id || null,
          sender_type: 'merchant',
          sender_name: store.name || 'Merchant',
          message: replyText.trim(),
        })
        .select()
        .single();

      if (!error && data) {
        setMessages((prev) => [...prev, data]);
        setReplyText('');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSendingReply(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Validation Error', 'Please enter subject and description');
      return;
    }
    setSubmitting(true);
    try {
      const ticketNum = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
      const { data: t, error } = await supabase
        .from('support_tickets')
        .insert({
          ticket_number: ticketNum,
          business_id: activeBizId,
          user_id: user?.id || null,
          subject: subject.trim(),
          category,
          priority,
          status: 'open',
        })
        .select()
        .single();

      if (error || !t) throw error || new Error('Failed to create ticket');

      await supabase.from('support_ticket_messages').insert({
        ticket_id: t.id,
        sender_id: user?.id || null,
        sender_type: 'merchant',
        sender_name: store.name || 'Merchant',
        message: message.trim(),
      });

      setShowNewForm(false);
      setSubject('');
      setMessage('');
      await loadTickets();
      openTicket(t);
    } catch (err: any) {
      Alert.alert('Submission Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconBadge, { backgroundColor: 'rgba(255, 69, 0, 0.15)' }]}>
                <Feather name="help-circle" size={20} color="#FF4500" />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                  Help & Support Desk
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                  Hotlines, FAQs, and live admin ticket desk
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Tab Switcher */}
          <View style={[styles.tabBar, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'faqs' && { backgroundColor: theme.colors.card },
              ]}
              onPress={() => setActiveTab('faqs')}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === 'faqs' ? theme.colors.textPrimary : theme.colors.textMuted },
                ]}
              >
                Hotline & FAQs
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'tickets' && { backgroundColor: '#FF4500' },
              ]}
              onPress={() => {
                setActiveTab('tickets');
                loadTickets();
              }}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === 'tickets' ? '#FFFFFF' : theme.colors.textMuted },
                ]}
              >
                Tickets ({tickets.length})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
            {activeTab === 'faqs' ? (
              <View style={styles.faqsTab}>
                {/* Contact Cards */}
                <View style={styles.contactRow}>
                  <TouchableOpacity
                    style={[styles.contactCard, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}
                    onPress={() => Linking.openURL('https://wa.me/9779841234567')}
                  >
                    <Feather name="message-circle" size={20} color="#10B981" />
                    <Text style={[styles.contactTitle, { color: '#10B981' }]}>WhatsApp</Text>
                    <Text style={styles.contactSub}>24/7 Chat</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.contactCard, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}
                    onPress={() => Linking.openURL('tel:9841234567')}
                  >
                    <Feather name="phone-call" size={20} color="#3B82F6" />
                    <Text style={[styles.contactTitle, { color: '#3B82F6' }]}>Helpline</Text>
                    <Text style={styles.contactSub}>Toll Free</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.contactCard, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}
                    onPress={() => Linking.openURL('mailto:support@byapar.com')}
                  >
                    <Feather name="mail" size={20} color="#A855F7" />
                    <Text style={[styles.contactTitle, { color: '#A855F7' }]}>Email</Text>
                    <Text style={styles.contactSub}>Support</Text>
                  </TouchableOpacity>
                </View>

                {/* FAQ List */}
                <View style={styles.faqList}>
                  <View style={[styles.faqItem, { backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.faqQ, { color: theme.colors.textPrimary }]}>
                      How does Fonepay Dynamic QR work?
                    </Text>
                    <Text style={[styles.faqA, { color: theme.colors.textMuted }]}>
                      When a customer pays via QR, the exact invoice amount is locked into the QR code. You can also share the payment link via WhatsApp.
                    </Text>
                  </View>

                  <View style={[styles.faqItem, { backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.faqQ, { color: theme.colors.textPrimary }]}>
                      Is this IRD CBMS compliant?
                    </Text>
                    <Text style={[styles.faqA, { color: theme.colors.textMuted }]}>
                      Yes, Byapar provides Schedule-13 Real-Time Central Billing Monitoring System sync for Nepal IRD tax audits.
                    </Text>
                  </View>
                </View>
              </View>
            ) : selectedTicket ? (
              /* Ticket Chat View */
              <View style={styles.ticketChat}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setSelectedTicket(null)}
                >
                  <Feather name="arrow-left" size={16} color={theme.colors.textPrimary} />
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '600' }}>
                    Back to All Tickets
                  </Text>
                </TouchableOpacity>

                <View style={[styles.ticketHeaderBox, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.ticketSubject, { color: theme.colors.textPrimary }]}>
                    {selectedTicket.subject}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#FF4500', fontWeight: '700', marginTop: 2 }}>
                    {selectedTicket.ticket_number} • {selectedTicket.status.toUpperCase()}
                  </Text>
                </View>

                <View style={[styles.messagesContainer, { backgroundColor: theme.colors.surface }]}>
                  {loadingMessages ? (
                    <ActivityIndicator size="small" color="#FF4500" />
                  ) : (
                    messages.map((m) => {
                      const isMe = m.sender_type === 'merchant';
                      return (
                        <View
                          key={m.id}
                          style={[
                            styles.msgBubble,
                            isMe ? styles.msgBubbleRight : styles.msgBubbleLeft,
                            { backgroundColor: isMe ? '#FF4500' : theme.colors.card },
                          ]}
                        >
                          <Text style={{ fontSize: 10, color: isMe ? 'rgba(255,255,255,0.8)' : theme.colors.textMuted, marginBottom: 2 }}>
                            {isMe ? 'You' : (m.sender_name || 'Support Agent')}
                          </Text>
                          <Text style={{ fontSize: 12, color: isMe ? '#FFFFFF' : theme.colors.textPrimary }}>
                            {m.message}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </View>

                <View style={styles.replyBox}>
                  <TextInput
                    style={[styles.replyInput, { backgroundColor: theme.colors.surface, color: theme.colors.textPrimary, borderColor: theme.colors.borderGlass }]}
                    value={replyText}
                    onChangeText={setReplyText}
                    placeholder="Type a message..."
                    placeholderTextColor={theme.colors.textMuted}
                  />
                  <TouchableOpacity
                    style={styles.sendBtn}
                    onPress={handleSendReply}
                    disabled={sendingReply}
                  >
                    {sendingReply ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Feather name="send" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Tickets List */
              <View>
                <View style={styles.ticketsTopRow}>
                  <Text style={[styles.ticketsTitle, { color: theme.colors.textPrimary }]}>
                    Support Tickets
                  </Text>
                  <TouchableOpacity
                    style={styles.newTicketBtn}
                    onPress={() => setShowNewForm(!showNewForm)}
                  >
                    <Feather name="plus" size={14} color="#FFFFFF" />
                    <Text style={styles.newTicketBtnText}>New Ticket</Text>
                  </TouchableOpacity>
                </View>

                {showNewForm && (
                  <View style={[styles.newFormBox, { backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.formLabel, { color: theme.colors.textPrimary }]}>Issue Subject *</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: theme.colors.card, color: theme.colors.textPrimary, borderColor: theme.colors.borderGlass }]}
                      value={subject}
                      onChangeText={setSubject}
                      placeholder="e.g. Dynamic QR transaction settlement query"
                      placeholderTextColor={theme.colors.textMuted}
                    />

                    <Text style={[styles.formLabel, { color: theme.colors.textPrimary, marginTop: 8 }]}>Details *</Text>
                    <TextInput
                      style={[styles.formInput, { height: 60, backgroundColor: theme.colors.card, color: theme.colors.textPrimary, borderColor: theme.colors.borderGlass }]}
                      value={message}
                      onChangeText={setMessage}
                      placeholder="Provide details of what happened..."
                      placeholderTextColor={theme.colors.textMuted}
                      multiline
                    />

                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                      <TouchableOpacity
                        style={[styles.cancelBtn, { borderColor: theme.colors.borderGlass }]}
                        onPress={() => setShowNewForm(false)}
                      >
                        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={handleCreateTicket}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Submit</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {loadingTickets ? (
                  <ActivityIndicator size="small" color="#FF4500" style={{ marginVertical: 20 }} />
                ) : tickets.length === 0 ? (
                  <Text style={{ textAlign: 'center', color: theme.colors.textMuted, marginVertical: 30, fontSize: 12 }}>
                    No support tickets submitted yet.
                  </Text>
                ) : (
                  tickets.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.ticketItem, { backgroundColor: theme.colors.surface }]}
                      onPress={() => openTicket(t)}
                    >
                      <View>
                        <Text style={{ fontSize: 11, color: '#FF4500', fontWeight: '700' }}>
                          {t.ticket_number} • {t.status.toUpperCase()}
                        </Text>
                        <Text style={[styles.ticketSubject, { color: theme.colors.textPrimary }]}>
                          {t.subject}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  tabBar: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  faqsTab: {
    gap: 14,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 8,
  },
  contactCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    gap: 2,
  },
  contactTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  contactSub: {
    fontSize: 10,
    color: '#6B7280',
  },
  faqList: {
    gap: 8,
  },
  faqItem: {
    padding: 12,
    borderRadius: 12,
  },
  faqQ: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  faqA: {
    fontSize: 11,
    lineHeight: 16,
  },
  ticketsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ticketsTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  newTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF4500',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newTicketBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  newFormBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  formInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  cancelBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  submitBtn: {
    backgroundColor: '#FF4500',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ticketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  ticketSubject: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  ticketChat: {
    gap: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketHeaderBox: {
    padding: 10,
    borderRadius: 10,
  },
  messagesContainer: {
    height: 200,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  msgBubble: {
    padding: 8,
    borderRadius: 12,
    maxWidth: '80%',
  },
  msgBubbleLeft: {
    alignSelf: 'flex-start',
  },
  msgBubbleRight: {
    alignSelf: 'flex-end',
  },
  replyBox: {
    flexDirection: 'row',
    gap: 8,
  },
  replyInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 12,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FF4500',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
