import { Router, Request, Response } from 'express';
import { marketService } from '../services/market/market.service.js';

const router = Router();

router.get('/prices', (_req: Request, res: Response) => {
  const prices = marketService.getAllPrices();
  res.json({
    success: true,
    data: prices,
    timestamp: new Date().toISOString(),
  });
});

router.get('/prices/forex', (_req: Request, res: Response) => {
  const prices = marketService.getForexPrices();
  res.json({
    success: true,
    data: prices,
    timestamp: new Date().toISOString(),
  });
});

router.get('/prices/crypto', (_req: Request, res: Response) => {
  const prices = marketService.getCryptoPrices();
  res.json({
    success: true,
    data: prices,
    timestamp: new Date().toISOString(),
  });
});

router.get('/prices/stocks', (_req: Request, res: Response) => {
  const prices = marketService.getStockPrices();
  res.json({
    success: true,
    data: prices,
    timestamp: new Date().toISOString(),
  });
});

router.get('/prices/indices', (_req: Request, res: Response) => {
  const prices = marketService.getIndexPrices();
  res.json({
    success: true,
    data: prices,
    timestamp: new Date().toISOString(),
  });
});

router.get('/price/:symbol', (req: Request, res: Response) => {
  const { symbol } = req.params;
  const decodedSymbol = decodeURIComponent(symbol);
  const price = marketService.getCurrentPrice(decodedSymbol);

  if (!price) {
    res.status(404).json({
      success: false,
      error: 'Symbol not found',
    });
    return;
  }

  res.json({
    success: true,
    data: price,
  });
});

router.get('/history/:symbol', (req: Request, res: Response) => {
  const { symbol } = req.params;
  const decodedSymbol = decodeURIComponent(symbol);
  const history = marketService.getPriceHistory(decodedSymbol);

  if (!history) {
    res.status(404).json({
      success: false,
      error: 'Symbol not found',
    });
    return;
  }

  res.json({
    success: true,
    data: history,
  });
});

router.get('/bars/:symbol', async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const decodedSymbol = decodeURIComponent(symbol);
  const resolution = parseInt(req.query.resolution as string) || 60;
  const limit = Math.min(parseInt(req.query.limit as string) || 500, 1000);

  try {
    // Use real historical data from Binance for crypto symbols
    const bars = await marketService.getRealHistoricalBars(decodedSymbol, resolution, limit);

    if (bars.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No data available for symbol',
      });
      return;
    }

    res.json({
      success: true,
      data: bars,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch historical data',
    });
  }
});

router.get('/assets', (_req: Request, res: Response) => {
  const assets = marketService.getAllAssets();
  res.json({
    success: true,
    data: assets,
  });
});

router.get('/assets/forex', (_req: Request, res: Response) => {
  const assets = marketService.getForexAssets();
  res.json({
    success: true,
    data: assets,
  });
});

router.get('/assets/crypto', (_req: Request, res: Response) => {
  const assets = marketService.getCryptoAssets();
  res.json({
    success: true,
    data: assets,
  });
});

router.get('/assets/indices', (_req: Request, res: Response) => {
  const assets = marketService.getIndexAssets();
  res.json({
    success: true,
    data: assets,
  });
});

router.get('/assets/stocks', (_req: Request, res: Response) => {
  const assets = marketService.getStockAssets();
  res.json({
    success: true,
    data: assets,
  });
});

router.get('/asset/:symbol', (req: Request, res: Response) => {
  const { symbol } = req.params;
  const decodedSymbol = decodeURIComponent(symbol);
  const asset = marketService.getAsset(decodedSymbol);

  if (!asset) {
    res.status(404).json({
      success: false,
      error: 'Asset not found',
    });
    return;
  }

  res.json({
    success: true,
    data: asset,
  });
});

router.get('/status', (_req: Request, res: Response) => {
  const status = marketService.getMarketStatus();

  res.json({
    success: true,
    data: status,
  });
});

router.get('/symbols/available', (_req: Request, res: Response) => {
  const symbols = marketService.getAvailableSymbols();

  res.json({
    success: true,
    data: symbols,
  });
});

router.get('/symbols/forex', (_req: Request, res: Response) => {
  const symbols = marketService.getAvailableForexSymbols();

  res.json({
    success: true,
    data: symbols,
  });
});

router.get('/symbols/synthetic', (_req: Request, res: Response) => {
  const symbols = marketService.getAvailableSyntheticSymbols();

  res.json({
    success: true,
    data: symbols,
  });
});

export default router;
