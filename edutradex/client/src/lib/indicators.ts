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
