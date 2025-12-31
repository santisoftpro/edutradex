/**
 * Device Fingerprinting Utility
 *
 * Generates a unique device fingerprint based on browser/device characteristics.
 * Uses a combination of techniques to create a stable identifier.
 */

interface FingerprintComponents {
  userAgent: string;
  language: string;
  colorDepth: number;
  deviceMemory: number;
  hardwareConcurrency: number;
  screenResolution: string;
  availableScreenResolution: string;
  timezoneOffset: number;
  timezone: string;
  sessionStorage: boolean;
  localStorage: boolean;
  indexedDB: boolean;
  cookiesEnabled: boolean;
  platform: string;
  plugins: string[];
  canvas: string;
  webgl: string;
  webglVendor: string;
  webglRenderer: string;
  fonts: string[];
  audio: string;
  touchSupport: {
    maxTouchPoints: number;
    touchEvent: boolean;
    touchStart: boolean;
  };
}

class DeviceFingerprint {
  private cachedFingerprint: string | null = null;

  /**
   * Get the device fingerprint (cached after first generation)
   */
  async getFingerprint(): Promise<string> {
    if (this.cachedFingerprint) {
      return this.cachedFingerprint;
    }

    try {
      const components = await this.collectComponents();
      this.cachedFingerprint = await this.hashComponents(components);
      return this.cachedFingerprint;
    } catch (error) {
      console.error('Error generating fingerprint:', error);
      // Fallback to a basic fingerprint
      return this.generateFallbackFingerprint();
    }
  }

  /**
   * Collect all fingerprint components
   */
  private async collectComponents(): Promise<FingerprintComponents> {
    const [canvas, webglInfo, audioFingerprint] = await Promise.all([
      this.getCanvasFingerprint(),
      this.getWebGLInfo(),
      this.getAudioFingerprint(),
    ]);

    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      colorDepth: screen.colorDepth,
      deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 0,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      screenResolution: `${screen.width}x${screen.height}`,
      availableScreenResolution: `${screen.availWidth}x${screen.availHeight}`,
      timezoneOffset: new Date().getTimezoneOffset(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      sessionStorage: this.hasSessionStorage(),
      localStorage: this.hasLocalStorage(),
      indexedDB: this.hasIndexedDB(),
      cookiesEnabled: navigator.cookieEnabled,
      platform: navigator.platform,
      plugins: this.getPlugins(),
      canvas,
      webgl: webglInfo.fingerprint,
      webglVendor: webglInfo.vendor,
      webglRenderer: webglInfo.renderer,
      fonts: await this.detectFonts(),
      audio: audioFingerprint,
      touchSupport: this.getTouchSupport(),
    };
  }

  /**
   * Hash the components into a fingerprint string
   */
  private async hashComponents(components: FingerprintComponents): Promise<string> {
    const str = JSON.stringify(components);

    // Use SubtleCrypto if available (modern browsers)
    if (crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback to simple hash
    return this.simpleHash(str);
  }

  /**
   * Simple hash function as fallback
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  /**
   * Generate a fallback fingerprint when normal collection fails
   */
  private generateFallbackFingerprint(): string {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
      navigator.platform,
    ];
    return this.simpleHash(components.join('|'));
  }

  /**
   * Canvas fingerprinting
   */
  private getCanvasFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      canvas.width = 200;
      canvas.height = 50;

      // Draw text with various styles
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('OptigoBroker', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('canvas fingerprint', 4, 17);

      // Add some geometric shapes
      ctx.beginPath();
      ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();

      return canvas.toDataURL();
    } catch {
      return '';
    }
  }

  /**
   * Get WebGL info
   */
  private getWebGLInfo(): { fingerprint: string; vendor: string; renderer: string } {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;

      if (!gl) {
        return { fingerprint: '', vendor: '', renderer: '' };
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

      return {
        fingerprint: `${gl.getParameter(gl.VERSION)}|${gl.getParameter(gl.SHADING_LANGUAGE_VERSION)}`,
        vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '',
        renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '',
      };
    } catch {
      return { fingerprint: '', vendor: '', renderer: '' };
    }
  }

  /**
   * Audio fingerprinting using AudioContext
   */
  private async getAudioFingerprint(): Promise<string> {
    try {
      const AudioContext = window.AudioContext || (window as Window & { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioContext) return '';

      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gain = audioContext.createGain();
      const compressor = audioContext.createDynamicsCompressor();

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);

      compressor.threshold.setValueAtTime(-50, audioContext.currentTime);
      compressor.knee.setValueAtTime(40, audioContext.currentTime);
      compressor.ratio.setValueAtTime(12, audioContext.currentTime);
      compressor.attack.setValueAtTime(0, audioContext.currentTime);
      compressor.release.setValueAtTime(0.25, audioContext.currentTime);

      oscillator.connect(compressor);
      compressor.connect(analyser);
      analyser.connect(gain);
      gain.connect(audioContext.destination);
      gain.gain.setValueAtTime(0, audioContext.currentTime);

      oscillator.start(0);

      const fingerprint = `${compressor.threshold.value}|${compressor.knee.value}|${compressor.ratio.value}`;

      oscillator.stop();
      await audioContext.close();

      return fingerprint;
    } catch {
      return '';
    }
  }

  /**
   * Detect available fonts
   */
  private async detectFonts(): Promise<string[]> {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testFonts = [
      'Arial', 'Arial Black', 'Arial Narrow', 'Courier', 'Courier New',
      'Georgia', 'Helvetica', 'Impact', 'Lucida Console', 'Lucida Sans',
      'Microsoft Sans Serif', 'Palatino', 'Tahoma', 'Times', 'Times New Roman',
      'Trebuchet MS', 'Verdana', 'Comic Sans MS', 'Monaco', 'Ubuntu',
    ];

    const detected: string[] = [];
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';

    const span = document.createElement('span');
    span.style.position = 'absolute';
    span.style.left = '-9999px';
    span.style.fontSize = testSize;
    span.innerHTML = testString;
    document.body.appendChild(span);

    const baseWidths: Record<string, number> = {};
    for (const baseFont of baseFonts) {
      span.style.fontFamily = baseFont;
      baseWidths[baseFont] = span.offsetWidth;
    }

    for (const font of testFonts) {
      let isDetected = false;
      for (const baseFont of baseFonts) {
        span.style.fontFamily = `'${font}', ${baseFont}`;
        if (span.offsetWidth !== baseWidths[baseFont]) {
          isDetected = true;
          break;
        }
      }
      if (isDetected) {
        detected.push(font);
      }
    }

    document.body.removeChild(span);
    return detected;
  }

  /**
   * Get browser plugins
   */
  private getPlugins(): string[] {
    const plugins: string[] = [];
    if (navigator.plugins) {
      for (let i = 0; i < navigator.plugins.length; i++) {
        plugins.push(navigator.plugins[i].name);
      }
    }
    return plugins.slice(0, 10); // Limit to first 10
  }

  /**
   * Get touch support info
   */
  private getTouchSupport(): { maxTouchPoints: number; touchEvent: boolean; touchStart: boolean } {
    return {
      maxTouchPoints: navigator.maxTouchPoints || 0,
      touchEvent: 'ontouchstart' in window,
      touchStart: 'TouchEvent' in window,
    };
  }

  /**
   * Check storage availability
   */
  private hasSessionStorage(): boolean {
    try {
      return !!window.sessionStorage;
    } catch {
      return false;
    }
  }

  private hasLocalStorage(): boolean {
    try {
      return !!window.localStorage;
    } catch {
      return false;
    }
  }

  private hasIndexedDB(): boolean {
    try {
      return !!window.indexedDB;
    } catch {
      return false;
    }
  }

  /**
   * Clear cached fingerprint (useful for testing)
   */
  clearCache(): void {
    this.cachedFingerprint = null;
  }
}

// Export singleton instance
export const deviceFingerprint = new DeviceFingerprint();

// Export convenience function
export async function getDeviceFingerprint(): Promise<string> {
  return deviceFingerprint.getFingerprint();
}
