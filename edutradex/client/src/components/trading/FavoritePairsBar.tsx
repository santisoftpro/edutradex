'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Star } from 'lucide-react';
import { useChartStore, FavoritePair } from '@/store/chart.store';
import { PriceTick } from '@/lib/api';

interface FavoritePairsBarProps {
  selectedAsset: string;
  onSelectAsset: (symbol: string) => void;
  livePrices: Map<string, PriceTick>;
}

export function FavoritePairsBar({
  selectedAsset,
  onSelectAsset,
  livePrices,
}: FavoritePairsBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { favoritePairs, removeFavoritePair } = useChartStore();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true);
  }, []);

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkScroll);
      }
      window.removeEventListener('resize', checkScroll);
    };
  }, [favoritePairs]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 200;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!hasMounted || favoritePairs.length === 0) {
    return null;
  }

  const leftBtnClass = canScrollLeft
    ? 'text-gray-400 hover:text-white hover:bg-[#1a1a2e]'
    : 'text-gray-700 cursor-not-allowed';

  const rightBtnClass = canScrollRight
    ? 'text-gray-400 hover:text-white hover:bg-[#1a1a2e]'
    : 'text-gray-700 cursor-not-allowed';

  return (
    <div className="hidden md:flex items-center bg-gradient-to-r from-[#0d0d1a] via-[#12122a] to-[#0d0d1a] border-b border-[#1e1e2e]">
      <button
        onClick={() => scroll('left')}
        disabled={!canScrollLeft}
        className={`flex-shrink-0 p-2 transition-all ${leftBtnClass}`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div
        ref={scrollContainerRef}
        className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide py-2 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {favoritePairs.map((pair) => (
          <FavoritePairCard
            key={pair.symbol}
            pair={pair}
            isSelected={selectedAsset === pair.symbol}
            priceData={livePrices.get(pair.symbol)}
            onSelect={() => onSelectAsset(pair.symbol)}
            onRemove={() => removeFavoritePair(pair.symbol)}
          />
        ))}
      </div>

      <button
        onClick={() => scroll('right')}
        disabled={!canScrollRight}
        className={`flex-shrink-0 p-2 transition-all ${rightBtnClass}`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

interface FavoritePairCardProps {
  pair: FavoritePair;
  isSelected: boolean;
  priceData?: PriceTick;
  onSelect: () => void;
  onRemove: () => void;
}

function FavoritePairCard({
  pair,
  isSelected,
  priceData,
  onSelect,
  onRemove,
}: FavoritePairCardProps) {
  const isPositive = priceData?.changePercent !== undefined && priceData.changePercent >= 0;

  const cardClass = isSelected
    ? 'bg-gradient-to-r from-emerald-600/20 to-blue-600/20 border border-emerald-500/50'
    : 'bg-gradient-to-r from-[#1a1a35] to-[#1a1a40] border border-[#2d2d44] hover:border-[#3d3d54]';

  const starClass = isSelected ? 'text-yellow-400 fill-yellow-400' : 'text-yellow-500/50';
  const textClass = isSelected ? 'text-white' : 'text-gray-200';
  const changeClass = isPositive ? 'text-emerald-400' : 'text-red-400';
  const badgeClass = isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-500/10 text-emerald-500';

  return (
    <div
      onClick={onSelect}
      className={`relative flex-shrink-0 flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 group min-w-[160px] ${cardClass}`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute -top-1 -right-1 p-0.5 bg-[#1a1a2e] border border-[#2d2d44] rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:border-red-500/50"
      >
        <X className="w-3 h-3 text-gray-400 hover:text-red-400" />
      </button>

      <Star className={`w-4 h-4 flex-shrink-0 ${starClass}`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold truncate ${textClass}`}>
            {pair.symbol}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {priceData && (
            <span className={`text-xs ${changeClass}`}>
              {isPositive ? '+' : ''}{priceData.changePercent?.toFixed(2)}%
            </span>
          )}
        </div>
      </div>

      <div className={`px-2 py-0.5 rounded text-xs font-bold ${badgeClass}`}>
        +{pair.payout}%
      </div>
    </div>
  );
}
