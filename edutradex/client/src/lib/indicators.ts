/**
 * Technical Indicator Calculations
 * All functions work with OHLC candle data arrays
 */

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface IndicatorPoint {
  time: number;
  value: number;
}

export interface MACDPoint {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerPoint {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

/**
 * Simple Moving Average (SMA)
 */
export function calculateSMA(candles: CandleData[], period: number): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];

  if (candles.length < period) return result;

  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += candles[i - j].close;
    }
    result.push({
      time: candles[i].time,
      value: sum / period,
    });
  }

  return result;
}

/**
 * Exponential Moving Average (EMA)
 */
export function calculateEMA(candles: CandleData[], period: number): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];

  if (candles.length < period) return result;

  const multiplier = 2 / (period + 1);

  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let ema = sum / period;

  result.push({
    time: candles[period - 1].time,
    value: ema,
  });

  // Calculate subsequent EMAs
  for (let i = period; i < candles.length; i++) {
    ema = (candles[i].close - ema) * multiplier + ema;
    result.push({
      time: candles[i].time,
      value: ema,
    });
  }

  return result;
}

/**
 * Relative Strength Index (RSI)
 */
export function calculateRSI(candles: CandleData[], period: number = 14): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];

  if (candles.length < period + 1) return result;

  const gains: number[] = [];
  const losses: number[] = [];

  // Calculate price changes
  for (let i = 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  // First average gain/loss
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // First RSI
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = 100 - (100 / (1 + rs));

  result.push({
    time: candles[period].time,
    value: rsi,
  });

  // Calculate subsequent RSIs using smoothed averages
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = 100 - (100 / (1 + rs));

    result.push({
      time: candles[i + 1].time,
      value: rsi,
    });
  }

  return result;
}

/**
 * MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  candles: CandleData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDPoint[] {
  const result: MACDPoint[] = [];

  if (candles.length < slowPeriod + signalPeriod) return result;

  const fastEMA = calculateEMA(candles, fastPeriod);
  const slowEMA = calculateEMA(candles, slowPeriod);

  // Calculate MACD line (fast EMA - slow EMA)
  const macdLine: IndicatorPoint[] = [];
  const slowStartIndex = slowPeriod - fastPeriod;

  for (let i = 0; i < slowEMA.length; i++) {
    const fastIndex = i + slowStartIndex;
    if (fastIndex >= 0 && fastIndex < fastEMA.length) {
      macdLine.push({
        time: slowEMA[i].time,
        value: fastEMA[fastIndex].value - slowEMA[i].value,
      });
    }
  }

  if (macdLine.length < signalPeriod) return result;

  // Calculate signal line (EMA of MACD line)
  const multiplier = 2 / (signalPeriod + 1);
  let signalSum = 0;
  for (let i = 0; i < signalPeriod; i++) {
    signalSum += macdLine[i].value;
  }
  let signal = signalSum / signalPeriod;

  result.push({
    time: macdLine[signalPeriod - 1].time,
    macd: macdLine[signalPeriod - 1].value,
    signal: signal,
    histogram: macdLine[signalPeriod - 1].value - signal,
  });

  for (let i = signalPeriod; i < macdLine.length; i++) {
    signal = (macdLine[i].value - signal) * multiplier + signal;
    result.push({
      time: macdLine[i].time,
      macd: macdLine[i].value,
      signal: signal,
      histogram: macdLine[i].value - signal,
    });
  }

  return result;
}

/**
 * Bollinger Bands
 */
export function calculateBollingerBands(
  candles: CandleData[],
  period: number = 20,
  stdDev: number = 2
): BollingerPoint[] {
  const result: BollingerPoint[] = [];

  if (candles.length < period) return result;

  for (let i = period - 1; i < candles.length; i++) {
    // Calculate SMA
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += candles[i - j].close;
    }
    const sma = sum / period;

    // Calculate standard deviation
    let squaredDiffSum = 0;
    for (let j = 0; j < period; j++) {
      const diff = candles[i - j].close - sma;
      squaredDiffSum += diff * diff;
    }
    const standardDeviation = Math.sqrt(squaredDiffSum / period);

    result.push({
      time: candles[i].time,
      upper: sma + stdDev * standardDeviation,
      middle: sma,
      lower: sma - stdDev * standardDeviation,
    });
  }

  return result;
}

/**
 * Update indicator with new candle (for real-time updates)
 * Returns the latest indicator value
 */
export function updateSMAWithCandle(
  prevSMA: number,
  candles: CandleData[],
  period: number
): number {
  if (candles.length < period) return prevSMA;

  let sum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    sum += candles[i].close;
  }
  return sum / period;
}

export function updateEMAWithCandle(
  prevEMA: number,
  newClose: number,
  period: number
): number {
  const multiplier = 2 / (period + 1);
  return (newClose - prevEMA) * multiplier + prevEMA;
}

/**
 * Stochastic Oscillator
 * %K = 100 × (C - L14) / (H14 - L14)
 * %D = SMA(%K, dSmooth)
 */
export interface StochasticPoint {
  time: number;
  k: number;
  d: number;
}

export function calculateStochastic(
  candles: CandleData[],
  kPeriod: number = 14,
  kSmooth: number = 3,
  dSmooth: number = 3
): StochasticPoint[] {
  const result: StochasticPoint[] = [];
  const minCandles = kPeriod + kSmooth + dSmooth - 2;

  if (candles.length < minCandles) return result;

  // Calculate raw %K values
  const rawK: IndicatorPoint[] = [];
  for (let i = kPeriod - 1; i < candles.length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;

    for (let j = 0; j < kPeriod; j++) {
      const candle = candles[i - j];
      highestHigh = Math.max(highestHigh, candle.high);
      lowestLow = Math.min(lowestLow, candle.low);
    }

    const range = highestHigh - lowestLow;
    const k = range === 0 ? 50 : ((candles[i].close - lowestLow) / range) * 100;

    rawK.push({ time: candles[i].time, value: k });
  }

  // Smooth %K with SMA
  const smoothedK: IndicatorPoint[] = [];
  for (let i = kSmooth - 1; i < rawK.length; i++) {
    let sum = 0;
    for (let j = 0; j < kSmooth; j++) {
      sum += rawK[i - j].value;
    }
    smoothedK.push({ time: rawK[i].time, value: sum / kSmooth });
  }

  // Calculate %D (SMA of smoothed %K)
  for (let i = dSmooth - 1; i < smoothedK.length; i++) {
    let sum = 0;
    for (let j = 0; j < dSmooth; j++) {
      sum += smoothedK[i - j].value;
    }
    const d = sum / dSmooth;

    result.push({
      time: smoothedK[i].time,
      k: smoothedK[i].value,
      d: d,
    });
  }

  return result;
}

/**
 * Average True Range (ATR)
 * TR = max(H-L, |H-Cprev|, |L-Cprev|)
 * ATR = EMA of TR
 */
export function calculateATR(
  candles: CandleData[],
  period: number = 14
): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];

  if (candles.length < period + 1) return result;

  // Calculate True Range for each candle
  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];

    const highLow = current.high - current.low;
    const highClose = Math.abs(current.high - prev.close);
    const lowClose = Math.abs(current.low - prev.close);

    trueRanges.push(Math.max(highLow, highClose, lowClose));
  }

  // First ATR is SMA of first 'period' true ranges
  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;

  result.push({
    time: candles[period].time,
    value: atr,
  });

  // Calculate subsequent ATRs using EMA smoothing
  const multiplier = 2 / (period + 1);
  for (let i = period; i < trueRanges.length; i++) {
    atr = (trueRanges[i] - atr) * multiplier + atr;
    result.push({
      time: candles[i + 1].time,
      value: atr,
    });
  }

  return result;
}

/**
 * Volume Weighted Average Price (VWAP)
 * VWAP = Cumulative(TypicalPrice × Volume) / Cumulative(Volume)
 * TypicalPrice = (High + Low + Close) / 3
 */
export interface CandleDataWithVolume extends CandleData {
  volume: number;
}

export function calculateVWAP(candles: CandleDataWithVolume[]): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];

  if (candles.length === 0) return result;

  let cumulativeTPV = 0; // Cumulative (Typical Price × Volume)
  let cumulativeVolume = 0;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    const volume = candle.volume || 1; // Default to 1 if no volume data

    cumulativeTPV += typicalPrice * volume;
    cumulativeVolume += volume;

    const vwap = cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : typicalPrice;

    result.push({
      time: candle.time,
      value: vwap,
    });
  }

  return result;
}

/**
 * Ichimoku Cloud (Ichimoku Kinko Hyo)
 *
 * Components:
 * - Tenkan-sen (Conversion Line): (9-period high + 9-period low) / 2
 * - Kijun-sen (Base Line): (26-period high + 26-period low) / 2
 * - Senkou Span A (Leading Span A): (Tenkan + Kijun) / 2, plotted 26 periods ahead
 * - Senkou Span B (Leading Span B): (52-period high + 52-period low) / 2, plotted 26 periods ahead
 * - Chikou Span (Lagging Span): Close plotted 26 periods behind
 */
export interface IchimokuPoint {
  time: number;
  tenkan: number;
  kijun: number;
  senkouA: number;
  senkouB: number;
  chikou: number;
}

function getHighLowAverage(candles: CandleData[], endIndex: number, period: number): number {
  let highest = -Infinity;
  let lowest = Infinity;

  const startIndex = Math.max(0, endIndex - period + 1);
  for (let i = startIndex; i <= endIndex; i++) {
    highest = Math.max(highest, candles[i].high);
    lowest = Math.min(lowest, candles[i].low);
  }

  return (highest + lowest) / 2;
}

export function calculateIchimoku(
  candles: CandleData[],
  tenkanPeriod: number = 9,
  kijunPeriod: number = 26,
  senkouPeriod: number = 52
): IchimokuPoint[] {
  const result: IchimokuPoint[] = [];

  // Need at least senkouPeriod candles to calculate all components
  if (candles.length < senkouPeriod) return result;

  // Calculate from senkouPeriod - 1 onwards
  for (let i = senkouPeriod - 1; i < candles.length; i++) {
    const tenkan = getHighLowAverage(candles, i, tenkanPeriod);
    const kijun = getHighLowAverage(candles, i, kijunPeriod);
    const senkouB = getHighLowAverage(candles, i, senkouPeriod);
    const senkouA = (tenkan + kijun) / 2;

    // Chikou is the current close (will be plotted 26 periods behind in the chart)
    const chikou = candles[i].close;

    result.push({
      time: candles[i].time,
      tenkan,
      kijun,
      senkouA,
      senkouB,
      chikou,
    });
  }

  return result;
}

/**
 * Get Ichimoku cloud data shifted for Senkou spans (plotted 26 periods ahead)
 * Returns separate arrays for current display and future projection
 */
export interface IchimokuCloudData {
  tenkan: IndicatorPoint[];
  kijun: IndicatorPoint[];
  senkouA: IndicatorPoint[];
  senkouB: IndicatorPoint[];
  chikou: IndicatorPoint[];
}

export function getIchimokuCloudData(
  candles: CandleData[],
  tenkanPeriod: number = 9,
  kijunPeriod: number = 26,
  senkouPeriod: number = 52,
  displacement: number = 26
): IchimokuCloudData {
  const ichimoku = calculateIchimoku(candles, tenkanPeriod, kijunPeriod, senkouPeriod);

  const tenkan: IndicatorPoint[] = [];
  const kijun: IndicatorPoint[] = [];
  const senkouA: IndicatorPoint[] = [];
  const senkouB: IndicatorPoint[] = [];
  const chikou: IndicatorPoint[] = [];

  // Calculate the time interval between candles
  const timeInterval = candles.length >= 2 ? candles[1].time - candles[0].time : 60;

  for (let i = 0; i < ichimoku.length; i++) {
    const point = ichimoku[i];

    // Tenkan and Kijun at current time
    tenkan.push({ time: point.time, value: point.tenkan });
    kijun.push({ time: point.time, value: point.kijun });

    // Senkou spans shifted forward by displacement periods
    const futureTime = point.time + (displacement * timeInterval);
    senkouA.push({ time: futureTime, value: point.senkouA });
    senkouB.push({ time: futureTime, value: point.senkouB });

    // Chikou shifted backward by displacement periods
    const pastTime = point.time - (displacement * timeInterval);
    chikou.push({ time: pastTime, value: point.chikou });
  }

  return { tenkan, kijun, senkouA, senkouB, chikou };
}
