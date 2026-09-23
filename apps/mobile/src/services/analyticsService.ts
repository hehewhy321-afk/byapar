/**
 * Analytics Service for Byapar Mobile
 * Integrates Firebase Analytics tracking with Supabase event logging and local metrics.
 */
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

export interface AnalyticsEvent {
  name: string;
  params?: Record<string, any>;
  timestamp?: string;
}

class AnalyticsService {
  private enabled: boolean = true;
  private userId: string | null = null;
  private businessId: string | null = null;

  init(userId?: string, businessId?: string) {
    if (userId) this.userId = userId;
    if (businessId) this.businessId = businessId;
    console.log('[Analytics] Initialized for business:', this.businessId || 'guest');
  }

  setUserId(id: string | null) {
    this.userId = id;
  }

  setBusinessId(id: string | null) {
    this.businessId = id;
  }

  /**
   * Log an event across Firebase tracking and audit table
   */
  async logEvent(eventName: string, params: Record<string, any> = {}): Promise<void> {
    if (!this.enabled) return;

    const payload = {
      event_name: eventName,
      user_id: this.userId,
      business_id: this.businessId,
      platform: Platform.OS,
      params,
      created_at: new Date().toISOString(),
    };

    console.log(`[Firebase Analytics] Event: ${eventName}`, params);

    // Also persist critical events to audit_logs in Supabase for platform telemetry
    try {
      if (['login', 'invoice_created', 'reminder_sent', 'notification_opened'].includes(eventName)) {
        await supabase.from('audit_logs').insert({
          business_id: this.businessId,
          user_id: this.userId,
          action: eventName,
          entity_type: 'analytics_event',
          metadata: payload,
        });
      }
    } catch (err) {
      // Non-fatal telemetry logging
    }
  }

  /**
   * Track screen views
   */
  async logScreenView(screenName: string, screenClass?: string): Promise<void> {
    await this.logEvent('screen_view', {
      firebase_screen: screenName,
      firebase_screen_class: screenClass || screenName,
    });
  }

  /**
   * Track invoice creation
   */
  async logInvoiceCreated(invoiceNumber: string, totalAmount: number, paymentMode: string): Promise<void> {
    await this.logEvent('invoice_created', {
      invoice_number: invoiceNumber,
      value: totalAmount,
      currency: 'NPR',
      payment_type: paymentMode,
    });
  }

  /**
   * Track customer udhar reminder
   */
  async logReminderSent(partyName: string, amount: number, method: 'whatsapp' | 'sms' = 'whatsapp'): Promise<void> {
    await this.logEvent('reminder_sent', {
      party_name: partyName,
      value: amount,
      currency: 'NPR',
      channel: method,
    });
  }

  /**
   * Track notification interactions
   */
  async logNotificationOpened(notificationId: string, type: string): Promise<void> {
    await this.logEvent('notification_opened', {
      notification_id: notificationId,
      notification_type: type,
    });
  }
}

export const analytics = new AnalyticsService();
