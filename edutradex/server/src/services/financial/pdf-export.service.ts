/**
 * PDF Export Service
 *
 * Generates professional PDF reports using Puppeteer.
 * Renders HTML templates to high-quality PDF documents.
 */

import { logger } from '../../utils/logger.js';

interface PDFExportOptions {
  title: string;
  subtitle?: string;
  generatedAt: Date;
  data: Record<string, unknown>;
}

interface ExecutiveSummaryData {
  healthScore: {
    score: number;
    status: string;
    breakdown: {
      profitMargin: { score: number; value: number };
      cashFlow: { score: number; value: number };
      volumeGrowth: { score: number; percentChange: number };
      retention: { score: number; rate: number };
      riskExposure: { score: number; level: string };
    };
  };
  breakEven: {
    currentProfit: number;
    targetProfit: number;
    daysRemaining: number;
    isOnTrack: boolean;
    projectedEOM: number;
  };
  runway: {
    availableCash: number;
    monthlyBurnRate: number;
    runwayMonths: number;
    status: string;
  };
  keyRatios: {
    roi: number;
    profitFactor: number;
    lifetimeValue: number;
    ltvCacRatio: number;
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    EXCELLENT: '#22c55e',
    GOOD: '#3b82f6',
    FAIR: '#eab308',
    POOR: '#f97316',
    CRITICAL: '#ef4444',
    HEALTHY: '#22c55e',
    MODERATE: '#eab308',
    LOW: '#f97316',
  };
  return colors[status] || '#64748b';
}

function generateExecutiveSummaryHTML(data: ExecutiveSummaryData, generatedAt: Date): string {
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Executive Summary Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      line-height: 1.6;
      padding: 40px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
    }
    .header h1 {
      font-size: 28px;
      color: #0f172a;
      margin-bottom: 8px;
    }
    .header .subtitle {
      color: #64748b;
      font-size: 14px;
    }
    .section {
      background: white;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 16px;
    }
    .metric-card {
      background: #f8fafc;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    .metric-label {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .metric-value {
      font-size: 24px;
      font-weight: 700;
    }
    .health-score {
      display: flex;
      align-items: center;
      gap: 32px;
    }
    .score-circle {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      border: 8px solid;
    }
    .score-value {
      font-size: 36px;
      font-weight: 700;
    }
    .score-max {
      font-size: 14px;
      color: #64748b;
    }
    .breakdown-list {
      flex: 1;
    }
    .breakdown-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .breakdown-item:last-child {
      border-bottom: none;
    }
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 8px;
    }
    .progress-fill {
      height: 100%;
      border-radius: 4px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 12px;
    }
    .positive { color: #22c55e; }
    .negative { color: #ef4444; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Executive Summary Report</h1>
    <p class="subtitle">Generated on ${formatDate(generatedAt)}</p>
  </div>

  <div class="section">
    <div class="section-title">
      Business Health Score
    </div>
    <div class="health-score">
      <div class="score-circle" style="border-color: ${getStatusColor(data.healthScore.status)}">
        <span class="score-value">${data.healthScore.score}</span>
        <span class="score-max">/ 100</span>
      </div>
      <div class="breakdown-list">
        <div class="breakdown-item">
          <span>Profit Margin</span>
          <span>${formatPercent(data.healthScore.breakdown.profitMargin.value)}</span>
        </div>
        <div class="breakdown-item">
          <span>Cash Flow</span>
          <span>${formatCurrency(data.healthScore.breakdown.cashFlow.value)}</span>
        </div>
        <div class="breakdown-item">
          <span>Volume Growth</span>
          <span>${data.healthScore.breakdown.volumeGrowth.percentChange >= 0 ? '+' : ''}${formatPercent(data.healthScore.breakdown.volumeGrowth.percentChange)}</span>
        </div>
        <div class="breakdown-item">
          <span>Retention Rate</span>
          <span>${formatPercent(data.healthScore.breakdown.retention.rate)}</span>
        </div>
        <div class="breakdown-item">
          <span>Risk Level</span>
          <span>${data.healthScore.breakdown.riskExposure.level}</span>
        </div>
      </div>
    </div>
    <div style="text-align: right; margin-top: 16px;">
      <span class="status-badge" style="background: ${getStatusColor(data.healthScore.status)}20; color: ${getStatusColor(data.healthScore.status)}">
        ${data.healthScore.status}
      </span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Key Financial Ratios</div>
    <div class="grid-4">
      <div class="metric-card">
        <div class="metric-label">ROI</div>
        <div class="metric-value ${data.keyRatios.roi >= 0 ? 'positive' : 'negative'}">
          ${formatPercent(data.keyRatios.roi)}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Profit Factor</div>
        <div class="metric-value ${data.keyRatios.profitFactor >= 1 ? 'positive' : 'negative'}">
          ${data.keyRatios.profitFactor.toFixed(2)}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Lifetime Value</div>
        <div class="metric-value positive">
          ${formatCurrency(data.keyRatios.lifetimeValue)}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">LTV/CAC Ratio</div>
        <div class="metric-value ${data.keyRatios.ltvCacRatio >= 3 ? 'positive' : 'negative'}">
          ${data.keyRatios.ltvCacRatio.toFixed(2)}x
        </div>
      </div>
    </div>
  </div>

  <div class="grid-2">
    <div class="section">
      <div class="section-title">Break-Even Tracking</div>
      <div class="metric-card">
        <div class="metric-label">Current vs Target</div>
        <div class="metric-value">
          ${formatCurrency(data.breakEven.currentProfit)} / ${formatCurrency(data.breakEven.targetProfit)}
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${Math.min((data.breakEven.currentProfit / data.breakEven.targetProfit) * 100, 100)}%; background: ${data.breakEven.isOnTrack ? '#22c55e' : '#f97316'}"></div>
        </div>
      </div>
      <div style="margin-top: 16px; display: flex; justify-content: space-between;">
        <span>Days Remaining: <strong>${data.breakEven.daysRemaining}</strong></span>
        <span class="status-badge" style="background: ${data.breakEven.isOnTrack ? '#22c55e20' : '#ef444420'}; color: ${data.breakEven.isOnTrack ? '#22c55e' : '#ef4444'}">
          ${data.breakEven.isOnTrack ? 'On Track' : 'Behind'}
        </span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Cash Runway</div>
      <div class="metric-card">
        <div class="metric-label">Months Remaining</div>
        <div class="metric-value" style="color: ${getStatusColor(data.runway.status)}">
          ${data.runway.runwayMonths.toFixed(1)}
        </div>
      </div>
      <div style="margin-top: 16px; display: flex; justify-content: space-between; font-size: 14px;">
        <div>
          <span style="color: #64748b;">Available:</span>
          <strong>${formatCurrency(data.runway.availableCash)}</strong>
        </div>
        <div>
          <span style="color: #64748b;">Burn Rate:</span>
          <strong style="color: #ef4444;">${formatCurrency(data.runway.monthlyBurnRate)}/mo</strong>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>This report was automatically generated by EduTradeX Financial Analytics</p>
    <p style="margin-top: 4px;">Confidential - For Internal Use Only</p>
  </div>
</body>
</html>
  `;
}

class PDFExportService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private puppeteerModule: any = null;

  private async getPuppeteer() {
    if (!this.puppeteerModule) {
      try {
        this.puppeteerModule = await import('puppeteer');
      } catch (error) {
        logger.error('Puppeteer is not installed. Run: npm install puppeteer');
        throw new Error('PDF export is not available. Puppeteer is not installed.');
      }
    }
    return this.puppeteerModule;
  }

  async generateExecutiveSummaryPDF(data: ExecutiveSummaryData): Promise<Buffer> {
    const puppeteer = await this.getPuppeteer();

    logger.info('Generating Executive Summary PDF');

    const html = generateExecutiveSummaryHTML(data, new Date());

    let browser;
    try {
      browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });

      logger.info('Executive Summary PDF generated successfully');
      return Buffer.from(pdf);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async generatePLStatementPDF(data: unknown): Promise<Buffer> {
    const puppeteer = await this.getPuppeteer();

    logger.info('Generating P&L Statement PDF');

    // Placeholder HTML - would be more detailed in production
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>P&L Statement</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; padding: 40px; }
    h1 { text-align: center; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    th { text-align: left; background: #f8fafc; }
    .amount { text-align: right; font-family: monospace; }
  </style>
</head>
<body>
  <h1>Profit & Loss Statement</h1>
  <p style="text-align: center; color: #64748b;">Generated on ${new Date().toLocaleDateString()}</p>
  <pre style="margin-top: 40px; background: #f8fafc; padding: 20px; border-radius: 8px;">
${JSON.stringify(data, null, 2)}
  </pre>
</body>
</html>
    `;

    let browser;
    try {
      browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      });

      return Buffer.from(pdf);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

export const pdfExportService = new PDFExportService();
