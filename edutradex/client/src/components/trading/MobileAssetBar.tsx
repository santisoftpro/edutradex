'use client';

import { useState } from 'react';
import { ChevronDown, MoreHorizontal, Trash2 } from 'lucide-react';
import { useTradeStore } from '@/store/trade.store';
import { PriceTick } from '@/lib/api';

interface MobileAssetBarProps {
  selectedAsset: string;
  onSelectAsset: (symbol: string) => void;
  currentPrice: PriceTick | null;
  expirationTime: number;
}

const ASSETS = [
  { symbol: 'EUR/USD', name: 'Euro / US Dollar' },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar' },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen' },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar' },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar' },
  { symbol: 'EUR/GBP', name: 'Euro / British Pound' },
  { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen' },
  { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen' },
  { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar' },
  { symbol: 'ETH/USD', name: 'Ethereum / US Dollar' },
  { symbol: 'XAU/USD', name: 'Gold / US Dollar' },
  { symbol: 'OTC_EUR/USD', name: 'OTC Euro / US Dollar' },
  { symbol: 'OTC_GBP/USD', name: 'OTC British Pound / US Dollar' },
  { symbol: 'VOL_10', name: 'Volatility 10 Index' },
  { symbol: 'VOL_25', name: 'Volatility 25 Index' },
  { symbol: 'VOL_50', name: 'Volatility 50 Index' },
  { symbol: 'VOL_100', name: 'Volatility 100 Index' },
];

export function MobileAssetBar({ selectedAsset, onSelectAsset, currentPrice, expirationTime }: MobileAssetBarProps) {
  const [showAssetMenu, setShowAssetMenu] = useState(false);
  const { activeTrades } = useTradeStore();

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatExpirationTime = () => {
    const now = new Date();
    const expiration = new Date(now.getTime() + expirationTime * 1000);
    return expiration.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="md:hidden bg-[#0d0d1a]">
      {/* Asset Row */}
      <div className="flex items-center justify-between px-3 py-2">
        {/* Left Side - Asset Selector and Buttons */}
        <div className="flex items-center gap-2">
          {/* Asset Selector */}
          <div className="relative">
            <button
              onClick={() => setShowAssetMenu(!showAssetMenu)}
              className="flex items-center gap-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg px-3 py-2"
            >
              <span className="text-white font-semibold text-sm">{selectedAsset}</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {showAssetMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAssetMenu(false)} />
                <div className="absolute left-0 top-full mt-1 w-64 max-h-80 overflow-y-auto bg-[#1a1a2e] border border-[#2d2d44] rounded-xl shadow-2xl z-50">
                  {ASSETS.map((asset) => (
                    <button
                      key={asset.symbol}
                      onClick={() => {
                        onSelectAsset(asset.symbol);
                        setShowAssetMenu(false);
                      }}
                      className={`w-full flex flex-col px-4 py-3 text-left hover:bg-[#252542] transition-colors ${
                        selectedAsset === asset.symbol ? 'bg-[#252542]' : ''
                      }`}
                    >
                      <span className="text-white font-medium text-sm">{asset.symbol}</span>
                      <span className="text-gray-500 text-xs">{asset.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Options Button */}
          <button className="w-10 h-10 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg flex items-center justify-center">
            <MoreHorizontal className="h-5 w-5 text-gray-400" />
          </button>

          {/* Trash with Badge */}
          <div className="relative">
            <button className="w-10 h-10 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-gray-400" />
            </button>
            {activeTrades.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {activeTrades.length}
              </span>
            )}
          </div>
        </div>

        {/* Right Side - Expiration Time */}
        <div className="flex flex-col items-end">
          <span className="text-gray-500 text-[10px]">Expiration time</span>
          <span className="text-white text-sm font-medium">{formatExpirationTime()}</span>
        </div>
      </div>

      {/* Price Display Row */}
      {currentPrice && (
        <div className="flex items-center gap-2 px-3 pb-2">
          <span className="text-gray-400 text-xs font-medium">
            {currentPrice.price.toFixed(currentPrice.price > 100 ? 2 : 5)}
          </span>
          <span className="text-gray-600 text-xs">
            {formatTime(currentPrice.timestamp)} UTC+2
          </span>
        </div>
      )}
    </div>
  );
}
