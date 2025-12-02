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

router.get('/prices/otc', (_req: Request, res: Response) => {
  const prices = marketService.getOtcPrices();
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

router.get('/assets/otc', (_req: Request, res: Response) => {
  const assets = marketService.getOtcAssets();
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

export default router;
