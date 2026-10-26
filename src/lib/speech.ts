import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

/**
 * 单词发音
 * 1. 优先：在线词典音频（有道），发音标准
 * 2. 断网回退：系统原生 TTS（Android/iOS）
 * 3. 再回退：浏览器 Web Speech API
 */

let currentAudio: HTMLAudioElement | null = null;
let abortCurrent: (() => void) | null = null;

/** 有道词典音频地址：type=2 美音，type=1 英音 */
function buildAudioUrl(text: string, accent: 'us' | 'uk'): string {
  const type = accent === 'us' ? 2 : 1;
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=${type}`;
}

/** 停止当前播放，避免连续点击叠音 */
function stopCurrent() {
  if (abortCurrent) {
    abortCurrent();
    abortCurrent = null;
  }
  if (currentAudio) {
    try {
      currentAudio.pause();
    } catch {
      // 忽略
    }
    currentAudio = null;
  }
}

/** 播放远程音频；加载失败或超时会 reject */
function playRemoteAudio(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.preload = 'auto';
    currentAudio = audio;

    let settled = false;
    const complete = (err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      abortCurrent = null;
      if (err) {
        try {
          audio.pause();
        } catch {
          // 忽略
        }
        if (currentAudio === audio) currentAudio = null;
        reject(err);
      } else {
        resolve();
      }
    };

    // 5 秒内未开始播放则视为失败，走回退
    const timer = setTimeout(() => complete(new Error('timeout')), 5000);
    abortCurrent = () => complete(new Error('aborted'));

    audio.addEventListener('playing', () => clearTimeout(timer), { once: true });
    audio.addEventListener('ended', () => complete(), { once: true });
    audio.addEventListener('error', () => complete(new Error('load-error')), { once: true });
    audio.play().catch(() => complete(new Error('play-rejected')));
  });
}

/** 系统原生 TTS（仅原生 App 可用） */
async function nativeSpeak(text: string, accent: 'us' | 'uk'): Promise<void> {
  await TextToSpeech.speak({
    text,
    lang: accent === 'us' ? 'en-US' : 'en-GB',
    rate: 0.9,
    pitch: 1.0,
  });
}

/** 浏览器语音合成 */
function webSpeak(text: string, accent: 'us' | 'uk') {
  if (!('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  const lang = accent === 'us' ? 'en-US' : 'en-GB';

  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  utterance.pitch = 1;

  const applyVoice = () => {
    const voices = synth.getVoices();
    const voice =
      voices.find(v => v.lang === lang) || voices.find(v => v.lang.startsWith('en'));
    if (voice) utterance.voice = voice;
  };
  applyVoice();
  if (!synth.getVoices().length) {
    synth.addEventListener('voiceschanged', applyVoice, { once: true });
  }

  synth.speak(utterance);
}

export async function speak(text: string, accent: 'us' | 'uk' = 'us') {
  const word = text?.trim();
  if (!word) return;

  stopCurrent();

  // 1. 在线词典音频
  try {
    await playRemoteAudio(buildAudioUrl(word, accent));
    return;
  } catch (e) {
    // 被新的点击打断，直接返回，不做回退
    if ((e as Error)?.message === 'aborted') return;
  }

  // 2. 系统 TTS
  if (Capacitor.isNativePlatform()) {
    try {
      await nativeSpeak(word, accent);
      return;
    } catch {
      // 忽略，继续回退
    }
  }

  // 3. 浏览器语音合成
  webSpeak(word, accent);
}
