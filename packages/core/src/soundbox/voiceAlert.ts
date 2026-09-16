/**
 * BYAPAR (व्यापार) - Voice Soundbox & Audio Alert System
 * Emulates hardware Soundboxes (like Paytm/PhonePe soundbox) using Web Audio API and SpeechSynthesis
 */

import { toNepaliDigits } from '../calendar/bsCalendar';

class SoundboxService {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Plays a pleasant dual-tone confirmation chime before the voice announcement
   */
  async playChime(): Promise<void> {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Note 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: G5 (783.99 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.18);
      gain2.gain.setValueAtTime(0.2, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.6);

      await new Promise((res) => setTimeout(res, 600));
    } catch {
      // AudioContext might be blocked until user gesture, graceful fallback
    }
  }

  /**
   * Announces payment received via Fonepay in Nepali or English
   */
  async announcePayment(amount: number, provider = 'Fonepay', lang: 'ne' | 'en' = 'ne'): Promise<void> {
    await this.playChime();

    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // cancel any ongoing speech

    let textToSpeak = '';
    let voiceLang = 'en-US';

    if (lang === 'ne') {
      // Nepali voice phrasing: "व्यापार: फोनपे मार्फत रु. [amount] प्राप्त भयो"
      textToSpeak = `व्यापार: ${provider} मार्फत रु ${amount} प्राप्त भयो`;
      voiceLang = 'ne-NP';
    } else {
      textToSpeak = `Byapar: Received ${amount} Rupees via ${provider}`;
      voiceLang = 'en-IN';
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = voiceLang;
    utterance.rate = 0.95; // Clear and measured pace
    utterance.pitch = 1.05;

    // Find suitable voice if available (Hindi/Nepali fallback to Indian English)
    const voices = window.speechSynthesis.getVoices();
    const matchVoice = voices.find(
      (v) => v.lang.startsWith('ne') || v.lang.startsWith('hi') || v.lang.includes('IN')
    );
    if (matchVoice) {
      utterance.voice = matchVoice;
    }

    window.speechSynthesis.speak(utterance);
  }
}

export const soundbox = new SoundboxService();
