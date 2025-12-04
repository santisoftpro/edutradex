// Trading sound effects using Web Audio API

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
  try {
    const ctx = getAudioContext();

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (error) {
    console.warn('Audio playback failed:', error);
  }
}

// Buy sound - ascending tone (positive feeling)
export function playBuySound() {
  playTone(880, 0.1, 'sine', 0.2); // A5
  setTimeout(() => playTone(1108.73, 0.1, 'sine', 0.2), 80); // C#6
  setTimeout(() => playTone(1318.51, 0.15, 'sine', 0.25), 160); // E6
}

// Sell sound - descending tone
export function playSellSound() {
  playTone(659.25, 0.1, 'sine', 0.2); // E5
  setTimeout(() => playTone(523.25, 0.1, 'sine', 0.2), 80); // C5
  setTimeout(() => playTone(440, 0.15, 'sine', 0.25), 160); // A4
}

// Win sound - happy jingle
export function playWinSound() {
  playTone(523.25, 0.1, 'sine', 0.25); // C5
  setTimeout(() => playTone(659.25, 0.1, 'sine', 0.25), 100); // E5
  setTimeout(() => playTone(783.99, 0.1, 'sine', 0.25), 200); // G5
  setTimeout(() => playTone(1046.50, 0.2, 'sine', 0.3), 300); // C6
}

// Lose sound - sad tone
export function playLoseSound() {
  playTone(392, 0.15, 'sine', 0.2); // G4
  setTimeout(() => playTone(349.23, 0.15, 'sine', 0.2), 150); // F4
  setTimeout(() => playTone(293.66, 0.25, 'sine', 0.25), 300); // D4
}

// Click sound - simple tick
export function playClickSound() {
  playTone(1000, 0.05, 'square', 0.1);
}

// Notification sound
export function playNotificationSound() {
  playTone(800, 0.1, 'sine', 0.2);
  setTimeout(() => playTone(1000, 0.1, 'sine', 0.2), 100);
}
