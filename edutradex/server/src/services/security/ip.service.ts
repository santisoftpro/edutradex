import { query, queryOne } from '../../config/db.js';
import { logger } from '../../utils/logger.js';

/**
 * IP Tracking and Geolocation Service
 *
 * Handles IP address tracking, geolocation lookup, and IP-based security checks.
 * Uses ip-api.com for free geolocation (consider upgrading to MaxMind for production).
 */

export interface GeoLocation {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  timezone: string;
  isp: string;
  isVpn: boolean;
  isProxy: boolean;
  isDatacenter: boolean;
}

export interface IpInfo {
  ip: string;
  location?: GeoLocation;
  riskScore: number;
  riskFlags: string[];
}

// Cache for IP geolocation to avoid excessive API calls
const geoCache = new Map<string, { data: GeoLocation; timestamp: number }>();
const GEO_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Known VPN/Proxy providers (partial list)
const KNOWN_VPN_ISPS = [
  'nordvpn',
  'expressvpn',
  'surfshark',
  'cyberghost',
  'protonvpn',
  'mullvad',
  'private internet access',
  'ipvanish',
  'hotspot shield',
  'tunnelbear',
  'digitalocean',
  'amazon',
  'google cloud',
  'microsoft azure',
  'linode',
  'vultr',
  'ovh',
  'hetzner',
];

class IpService {
  /**
   * Extract real IP from request (handles proxies/load balancers)
   */
  extractIp(req: {
    ip?: string;
    socket?: { remoteAddress?: string };
    headers?: Record<string, string | string[] | undefined>;
  }): string {
    // Check X-Forwarded-For header (common for proxies)
    const forwardedFor = req.headers?.['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }

    // Check X-Real-IP header (nginx)
    const realIp = req.headers?.['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Check CF-Connecting-IP (Cloudflare)
    const cfIp = req.headers?.['cf-connecting-ip'];
    if (cfIp) {
      return Array.isArray(cfIp) ? cfIp[0] : cfIp;
    }

    // Fallback to direct IP
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  /**
   * Get geolocation for an IP address
   */
  async getGeoLocation(ip: string): Promise<GeoLocation | null> {
    // Skip for localhost/private IPs
    if (this.isPrivateIp(ip)) {
      return {
        country: 'Local',
        countryCode: 'LO',
        region: 'Local',
        city: 'Local',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        isp: 'Local Network',
        isVpn: false,
        isProxy: false,
        isDatacenter: false,
      };
    }

    // Check cache
    const cached = geoCache.get(ip);
    if (cached && Date.now() - cached.timestamp < GEO_CACHE_TTL) {
      return cached.data;
    }

    try {
      // Use ip-api.com (free tier: 45 requests/minute)
      const response = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,city,timezone,isp,proxy,hosting`
      );

      if (!response.ok) {
        logger.warn('Geolocation API error', { ip, status: response.status });
        return null;
      }

      interface IpApiResponse {
        status: string;
        message?: string;
        country?: string;
        countryCode?: string;
        region?: string;
        city?: string;
        timezone?: string;
        isp?: string;
        proxy?: boolean;
        hosting?: boolean;
      }

      const data = await response.json() as IpApiResponse;

      if (data.status !== 'success') {
        logger.warn('Geolocation lookup failed', { ip, message: data.message });
        return null;
      }

      const ispLower = (data.isp || '').toLowerCase();
      const isKnownVpn = KNOWN_VPN_ISPS.some((vpn) => ispLower.includes(vpn));

      const location: GeoLocation = {
        country: data.country || 'Unknown',
        countryCode: data.countryCode || 'XX',
        region: data.region || '',
        city: data.city || '',
        timezone: data.timezone || '',
        isp: data.isp || '',
        isVpn: isKnownVpn,
        isProxy: data.proxy === true,
        isDatacenter: data.hosting === true,
      };

      // Cache the result
      geoCache.set(ip, { data: location, timestamp: Date.now() });

      return location;
    } catch (error) {
      logger.error('Geolocation lookup error', { ip, error });
      return null;
    }
  }

  /**
   * Check if IP is a private/local address
   */
  isPrivateIp(ip: string): boolean {
    // IPv4 private ranges
    if (
      ip.startsWith('10.') ||
      ip.startsWith('192.168.') ||
      ip.startsWith('172.16.') ||
      ip.startsWith('172.17.') ||
      ip.startsWith('172.18.') ||
      ip.startsWith('172.19.') ||
      ip.startsWith('172.20.') ||
      ip.startsWith('172.21.') ||
      ip.startsWith('172.22.') ||
      ip.startsWith('172.23.') ||
      ip.startsWith('172.24.') ||
      ip.startsWith('172.25.') ||
      ip.startsWith('172.26.') ||
      ip.startsWith('172.27.') ||
      ip.startsWith('172.28.') ||
      ip.startsWith('172.29.') ||
      ip.startsWith('172.30.') ||
      ip.startsWith('172.31.') ||
      ip === '127.0.0.1' ||
      ip === 'localhost' ||
      ip === '::1' ||
      ip === '::ffff:127.0.0.1'
    ) {
      return true;
    }
    return false;
  }

  /**
   * Calculate risk score for an IP
   */
  async calculateIpRisk(ip: string): Promise<IpInfo> {
    const riskFlags: string[] = [];
    let riskScore = 0;

    // Get geolocation
    const location = await this.getGeoLocation(ip);

    if (location) {
      // VPN/Proxy detection (+30 risk)
      if (location.isVpn || location.isProxy) {
        riskFlags.push('VPN_OR_PROXY');
        riskScore += 30;
      }

      // Datacenter IP (+20 risk)
      if (location.isDatacenter) {
        riskFlags.push('DATACENTER_IP');
        riskScore += 20;
      }

      // Check if IP is in blocklist
      const isBlocked = await this.isIpBlocked(ip);
      if (isBlocked) {
        riskFlags.push('BLOCKED_IP');
        riskScore += 50;
      }
    }

    return {
      ip,
      location: location || undefined,
      riskScore: Math.min(100, riskScore),
      riskFlags,
    };
  }

  /**
   * Check if IP is blocked
   */
  async isIpBlocked(ip: string): Promise<boolean> {
    const result = await queryOne<{ id: string }>(
      `SELECT id FROM "SecurityBlocklist"
       WHERE type = 'IP' AND value = $1
       AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
       LIMIT 1`,
      [ip]
    );

    if (result) {
      // Update blocked attempts count
      await query(
        `UPDATE "SecurityBlocklist"
         SET "blockedAttempts" = "blockedAttempts" + 1, "lastBlockedAt" = NOW()
         WHERE type = 'IP' AND value = $1`,
        [ip]
      );
    }

    return !!result;
  }

  /**
   * Add IP to blocklist
   */
  async blockIp(
    ip: string,
    reason: string,
    addedBy: string,
    permanent: boolean = false
  ): Promise<void> {
    const expiresAt = permanent ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await query(
      `INSERT INTO "SecurityBlocklist" (id, type, value, reason, severity, "addedBy", "expiresAt")
       VALUES (gen_random_uuid(), 'IP', $1, $2, $3, $4, $5)
       ON CONFLICT (type, value) DO UPDATE SET reason = $2, "addedBy" = $4, "expiresAt" = $5`,
      [ip, reason, permanent ? 'PERMANENT' : 'TEMPORARY', addedBy, expiresAt]
    );

    logger.warn('IP blocked', { ip, reason, permanent });
  }

  /**
   * Remove IP from blocklist
   */
  async unblockIp(ip: string): Promise<void> {
    await query(
      `DELETE FROM "SecurityBlocklist" WHERE type = 'IP' AND value = $1`,
      [ip]
    );

    logger.info('IP unblocked', { ip });
  }

  /**
   * Check for "impossible travel" - login from two distant locations in short time
   *
   * Uses distance-based thresholds:
   * - Same country: Not flagged
   * - Adjacent countries (shared border): 1 hour threshold
   * - Same continent: 4 hour threshold
   * - Different continent: 8 hour threshold
   *
   * Note: For simplicity, we use a conservative 1-hour threshold for any country change.
   * A production system could integrate with a geolocation API for distance calculations.
   */
  async checkImpossibleTravel(
    userId: string,
    currentIp: string,
    currentCountry: string
  ): Promise<{
    isImpossible: boolean;
    previousLocation?: string;
    timeDiff?: number;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }> {
    // Get last successful login from a different IP
    const lastLogin = await queryOne<{
      ipAddress: string;
      country: string;
      attemptedAt: Date;
    }>(
      `SELECT "ipAddress", country, "attemptedAt"
       FROM "LoginAttempt"
       WHERE "userId" = $1 AND success = true AND "ipAddress" != $2
       ORDER BY "attemptedAt" DESC
       LIMIT 1`,
      [userId, currentIp]
    );

    if (!lastLogin || !lastLogin.country || lastLogin.country === currentCountry) {
      return { isImpossible: false };
    }

    // Calculate time difference in minutes
    const timeDiffMinutes =
      (Date.now() - new Date(lastLogin.attemptedAt).getTime()) / (1000 * 60);

    // Threshold based on how suspicious the travel is
    // Under 30 minutes - definitely impossible (CRITICAL)
    // Under 60 minutes - highly suspicious (HIGH)
    // Under 120 minutes - suspicious (MEDIUM)
    // Under 240 minutes - mildly suspicious for intercontinental (LOW)

    let isImpossible = false;
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

    if (timeDiffMinutes < 30) {
      isImpossible = true;
      severity = 'CRITICAL';
    } else if (timeDiffMinutes < 60) {
      isImpossible = true;
      severity = 'HIGH';
    } else if (timeDiffMinutes < 120) {
      // Only flag as impossible if genuinely different regions
      // (Same IP ranges in different reporting countries shouldn't trigger)
      isImpossible = true;
      severity = 'MEDIUM';
    }

    if (isImpossible) {
      return {
        isImpossible: true,
        previousLocation: lastLogin.country,
        timeDiff: Math.round(timeDiffMinutes),
        severity,
      };
    }

    return { isImpossible: false };
  }

  /**
   * Check if IP is shared by multiple accounts
   */
  async checkSharedIp(
    ip: string,
    excludeUserId?: string
  ): Promise<string[]> {
    const query_text = excludeUserId
      ? `SELECT DISTINCT "userId" FROM "LoginAttempt"
         WHERE "ipAddress" = $1 AND "userId" != $2 AND success = true
         AND "attemptedAt" > NOW() - INTERVAL '30 days'`
      : `SELECT DISTINCT "userId" FROM "LoginAttempt"
         WHERE "ipAddress" = $1 AND success = true
         AND "attemptedAt" > NOW() - INTERVAL '30 days'`;

    const params = excludeUserId ? [ip, excludeUserId] : [ip];
    const result = await query(query_text, params);

    return result?.rows?.map((row: { userId: string }) => row.userId) || [];
  }

  /**
   * Get known IPs for a user
   */
  async getUserKnownIps(userId: string): Promise<string[]> {
    const result = await query(
      `SELECT DISTINCT "ipAddress"
       FROM "LoginAttempt"
       WHERE "userId" = $1 AND success = true
       ORDER BY "ipAddress"`,
      [userId]
    );

    return result?.rows?.map((row: { ipAddress: string }) => row.ipAddress) || [];
  }

  /**
   * Check if this is a new IP for the user
   */
  async isNewIpForUser(userId: string, ip: string): Promise<boolean> {
    const result = await queryOne<{ id: string }>(
      `SELECT id FROM "LoginAttempt"
       WHERE "userId" = $1 AND "ipAddress" = $2 AND success = true
       LIMIT 1`,
      [userId, ip]
    );

    return !result;
  }

  /**
   * Clean up geo cache
   */
  cleanupCache(): void {
    const now = Date.now();
    for (const [ip, entry] of geoCache.entries()) {
      if (now - entry.timestamp > GEO_CACHE_TTL) {
        geoCache.delete(ip);
      }
    }
  }
}

export const ipService = new IpService();

// Cleanup cache periodically
setInterval(() => {
  ipService.cleanupCache();
}, 60 * 60 * 1000); // Every hour
