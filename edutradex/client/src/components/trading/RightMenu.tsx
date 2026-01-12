'use client';

import { useState } from 'react';
import {
  Clock,
  Maximize2,
  Minimize2,
  Users,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTradeStore } from '@/store/trade.store';
import { DesktopCopyTradingPanel } from './DesktopCopyTradingPanel';

interface RightMenuProps {
  isTradesPanelOpen: boolean;
  onToggleTradesPanel: () => void;
}

export function RightMenu({ isTradesPanelOpen, onToggleTradesPanel }: RightMenuProps) {
  const { activeTrades } = useTradeStore();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCopyTradingOpen, setIsCopyTradingOpen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const menuItems = [
    {
      id: 'trades',
      icon: Clock,
      label: 'Trades',
      badge: activeTrades.length > 0 ? activeTrades.length : null,
      isActive: isTradesPanelOpen,
      onClick: onToggleTradesPanel,
    },
    {
      id: 'copy-trading',
      icon: Users,
      label: 'Copy',
      badge: null,
      isActive: isCopyTradingOpen,
      onClick: () => setIsCopyTradingOpen(!isCopyTradingOpen),
    },
    {
      id: 'help',
      icon: HelpCircle,
      label: 'Help',
      badge: null,
      isActive: false,
      onClick: () => window.open('/dashboard/help', '_blank'),
    },
  ];

  return (
    <>
      <div className="hidden md:flex fixed right-0 top-16 z-30 flex-col bg-[#1a1a2e]/95 backdrop-blur-sm border border-[#2d2d44] border-r-0 rounded-l-xl shadow-xl w-[68px]">
        {/* Menu Items */}
        <div className="py-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id}>
                <button
                  onClick={item.onClick}
                  className={cn(
                    'w-full flex flex-col items-center gap-1 px-3 py-2.5 transition-all group relative',
                    item.isActive
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-gray-400 hover:text-white hover:bg-[#252542]'
                  )}
                  title={item.label}
                >
                  <div className="relative">
                    <Icon className={cn(
                      'h-5 w-5 transition-transform group-hover:scale-110',
                      item.isActive && 'text-blue-400'
                    )} />
                    {item.badge && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium">{item.label}</span>

                  {/* Active indicator */}
                  {item.isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-blue-500 rounded-r" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Fullscreen Toggle - At bottom */}
        <div className="border-t border-[#2d2d44] py-2">
          <button
            onClick={toggleFullscreen}
            className="w-full flex flex-col items-center gap-1 px-3 py-2.5 text-gray-400 hover:text-white hover:bg-[#252542] transition-all group"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
            ) : (
              <Maximize2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
            )}
            <span className="text-[10px] font-medium">
              {isFullscreen ? 'Exit' : 'Fullscreen'}
            </span>
          </button>
        </div>
      </div>

      {/* Copy Trading Panel - Rendered outside the menu container */}
      <DesktopCopyTradingPanel
        isOpen={isCopyTradingOpen}
        onClose={() => setIsCopyTradingOpen(false)}
      />
    </>
  );
}
