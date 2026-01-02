'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  Activity,
  Settings2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Shield,
  Plus,
  Pencil,
  Trash2,
  Power,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Check,
  History,
  BarChart3,
  Zap,
  Crosshair,
  Users,
  Target,
  Clock,
  ArrowUp,
  ArrowDown,
  Database,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  api,
  OTCConfig,
  OTCStats,
  OTCExposure,
  OTCActivityLog,
  CreateOTCConfigInput,
  UpdateOTCConfigInput,
  ManualControl,
  ActiveTradeInfo,
  UserTargeting,
  ManualIntervention,
  SeedResult,
  SeedAllResult,
} from '@/lib/api';
import toast from 'react-hot-toast';

type TabType = 'configs' | 'exposures' | 'activity' | 'controls';

export default function OTCAdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('configs');
  const [stats, setStats] = useState<OTCStats | null>(null);
  const [configs, setConfigs] = useState<OTCConfig[]>([]);
  const [exposures, setExposures] = useState<OTCExposure[]>([]);
  const [activityLogs, setActivityLogs] = useState<OTCActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Filters
  const [marketTypeFilter, setMarketTypeFilter] = useState<'all' | 'FOREX' | 'CRYPTO'>('all');
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<OTCConfig | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingConfig, setDeletingConfig] = useState<OTCConfig | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // History seeding state
  const [isSeedingModalOpen, setIsSeedingModalOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedingResults, setSeedingResults] = useState<SeedAllResult | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getOTCStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch OTC stats:', error);
    }
  }, []);

  const fetchConfigs = useCallback(async () => {
    try {
      const response = await api.getOTCConfigs({
        marketType: marketTypeFilter === 'all' ? undefined : marketTypeFilter,
        isEnabled: enabledFilter === 'all' ? undefined : enabledFilter === 'enabled',
        page: pagination.page,
        limit: pagination.limit,
      });
      setConfigs(response.data);
      setPagination(prev => ({ ...prev, total: response.pagination.total, totalPages: response.pagination.totalPages }));
    } catch (error) {
      console.error('Failed to fetch OTC configs:', error);
      toast.error('Failed to load OTC configurations');
    }
  }, [marketTypeFilter, enabledFilter, pagination.page, pagination.limit]);

  const fetchExposures = useCallback(async () => {
    try {
      const data = await api.getOTCExposures();
      setExposures(data);
    } catch (error) {
      console.error('Failed to fetch OTC exposures:', error);
    }
  }, []);

  // Activity log pagination
  const [activityPagination, setActivityPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const fetchActivityLogs = useCallback(async (page: number = 1) => {
    try {
      const response = await api.getOTCActivityLog({ limit: activityPagination.limit, page });
      setActivityLogs(response.data);
      if (response.pagination) {
        setActivityPagination({
          page: response.pagination.page,
          limit: response.pagination.limit,
          total: response.pagination.total,
          totalPages: response.pagination.totalPages
        });
      }
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
    }
  }, [activityPagination.limit]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await Promise.all([fetchStats(), fetchConfigs(), fetchExposures(), fetchActivityLogs()]);
      setIsLoading(false);
    };
    fetchData();
  }, [fetchStats, fetchConfigs, fetchExposures, fetchActivityLogs]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleToggleEnabled = async (config: OTCConfig) => {
    try {
      await api.updateOTCConfig(config.id, { isEnabled: !config.isEnabled });
      toast.success(`${config.symbol} ${config.isEnabled ? 'disabled' : 'enabled'}`);
      fetchConfigs();
      fetchStats();
    } catch (error) {
      toast.error('Failed to update config');
    }
  };

  const handleToggleRisk = async (config: OTCConfig) => {
    try {
      await api.updateOTCConfig(config.id, { riskEnabled: !config.riskEnabled });
      toast.success(`Risk engine ${config.riskEnabled ? 'disabled' : 'enabled'} for ${config.symbol}`);
      fetchConfigs();
    } catch (error) {
      toast.error('Failed to update risk setting');
    }
  };

  const handleDelete = async () => {
    if (!deletingConfig) return;
    try {
      await api.deleteOTCConfig(deletingConfig.id);
      toast.success(`${deletingConfig.symbol} deleted`);
      setIsDeleteModalOpen(false);
      setDeletingConfig(null);
      fetchConfigs();
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete config');
    }
  };

  const handleBulkToggleEnabled = async (enabled: boolean) => {
    if (selectedIds.size === 0) return;
    try {
      const result = await api.bulkToggleOTCConfigs(Array.from(selectedIds), enabled);
      toast.success(`${result.affected} config(s) ${enabled ? 'enabled' : 'disabled'}`);
      setSelectedIds(new Set());
      fetchConfigs();
      fetchStats();
    } catch (error) {
      toast.error('Failed to update configs');
    }
  };

  const handleBulkToggleRisk = async (riskEnabled: boolean) => {
    if (selectedIds.size === 0) return;
    try {
      const result = await api.bulkToggleOTCRisk(Array.from(selectedIds), riskEnabled);
      toast.success(`Risk engine ${riskEnabled ? 'enabled' : 'disabled'} for ${result.affected} config(s)`);
      setSelectedIds(new Set());
      fetchConfigs();
    } catch (error) {
      toast.error('Failed to update risk settings');
    }
  };

  const handleResetExposure = async (symbol: string) => {
    try {
      await api.resetOTCExposure(symbol);
      toast.success(`Exposure reset for ${symbol}`);
      fetchExposures();
    } catch (error) {
      toast.error('Failed to reset exposure');
    }
  };

  // History seeding handlers
  const handleSeedAllHistory = async () => {
    setIsSeeding(true);
    setSeedingResults(null);
    try {
      const result = await api.seedAllOTCHistory({ count: 500, resolution: 60 });
      setSeedingResults(result);
      toast.success(`Seeded ${result.totalSeeded} candles across ${result.successful} symbols`);
    } catch (error) {
      toast.error('Failed to seed history');
      console.error('Seeding error:', error);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSeedByType = async (marketType: 'FOREX' | 'CRYPTO') => {
    setIsSeeding(true);
    setSeedingResults(null);
    try {
      const result = await api.seedOTCHistoryByType(marketType, { count: 500, resolution: 60 });
      setSeedingResults(result);
      toast.success(`Seeded ${result.totalSeeded} candles for ${result.successful} ${marketType} symbols`);
    } catch (error) {
      toast.error(`Failed to seed ${marketType} history`);
      console.error('Seeding error:', error);
    } finally {
      setIsSeeding(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === configs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(configs.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const filteredConfigs = configs.filter(config =>
    config.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    config.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1079ff]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">OTC Markets</h1>
          <p className="text-slate-400 mt-1">Manage synthetic OTC market configurations and risk settings</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Seed History feature hidden - causes chart discontinuity issues
              Uncomment to re-enable in the future if needed
          <button
            onClick={() => setIsSeedingModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Database className="h-4 w-4" />
            <span>Seed History</span>
          </button>
          */}
          <button
            onClick={() => { setEditingConfig(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white rounded-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add OTC Pair</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={Activity}
          label="Total Configs"
          value={stats?.totalConfigs || 0}
          color="blue"
        />
        <StatCard
          icon={Power}
          label="Enabled"
          value={stats?.enabledConfigs || 0}
          color="emerald"
        />
        <StatCard
          icon={TrendingUp}
          label="Forex Pairs"
          value={stats?.forexConfigs || 0}
          color="purple"
        />
        <StatCard
          icon={BarChart3}
          label="Crypto Pairs"
          value={stats?.cryptoConfigs || 0}
          color="amber"
        />
        <StatCard
          icon={AlertTriangle}
          label="Total Exposure"
          value={`$${(stats?.totalExposure || 0).toFixed(2)}`}
          color="red"
        />
        <StatCard
          icon={Zap}
          label="Interventions Today"
          value={stats?.interventionsToday || 0}
          color="cyan"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700">
        <nav className="flex gap-4">
          {[
            { id: 'configs', label: 'Configurations', icon: Settings2 },
            { id: 'exposures', label: 'Risk Exposure', icon: AlertTriangle },
            { id: 'activity', label: 'Activity Log', icon: History },
            { id: 'controls', label: 'Manual Controls', icon: Crosshair },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-[#1079ff] text-[#1079ff]'
                  : 'border-transparent text-slate-400 hover:text-white'
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'configs' && (
        <ConfigsTab
          configs={filteredConfigs}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          marketTypeFilter={marketTypeFilter}
          setMarketTypeFilter={setMarketTypeFilter}
          enabledFilter={enabledFilter}
          setEnabledFilter={setEnabledFilter}
          selectedIds={selectedIds}
          toggleSelectAll={toggleSelectAll}
          toggleSelect={toggleSelect}
          onEdit={(config) => { setEditingConfig(config); setIsModalOpen(true); }}
          onDelete={(config) => { setDeletingConfig(config); setIsDeleteModalOpen(true); }}
          onToggleEnabled={handleToggleEnabled}
          onToggleRisk={handleToggleRisk}
          onBulkToggleEnabled={handleBulkToggleEnabled}
          onBulkToggleRisk={handleBulkToggleRisk}
          pagination={pagination}
          onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
        />
      )}

      {activeTab === 'exposures' && (
        <ExposuresTab exposures={exposures} onResetExposure={handleResetExposure} onRefresh={fetchExposures} />
      )}

      {activeTab === 'activity' && (
        <ActivityTab
          logs={activityLogs}
          onRefresh={() => fetchActivityLogs(activityPagination.page)}
          pagination={activityPagination}
          onPageChange={(page) => fetchActivityLogs(page)}
        />
      )}

      {activeTab === 'controls' && (
        <ManualControlsTab configs={configs.filter(c => c.isEnabled)} />
      )}

      {/* Config Modal */}
      {isModalOpen && (
        <ConfigModal
          config={editingConfig}
          onClose={() => { setIsModalOpen(false); setEditingConfig(null); }}
          onSave={async (data) => {
            try {
              if (editingConfig) {
                await api.updateOTCConfig(editingConfig.id, data as UpdateOTCConfigInput);
                toast.success('Configuration updated');
              } else {
                await api.createOTCConfig(data as CreateOTCConfigInput);
                toast.success('OTC pair created');
              }
              setIsModalOpen(false);
              setEditingConfig(null);
              fetchConfigs();
              fetchStats();
            } catch (error: any) {
              toast.error(error?.response?.data?.error || 'Failed to save configuration');
            }
          }}
        />
      )}

      {/* Delete Confirmation */}
      {isDeleteModalOpen && deletingConfig && (
        <ConfirmDialog
          title="Delete OTC Configuration"
          message={`Are you sure you want to delete ${deletingConfig.symbol}? This action cannot be undone.`}
          confirmText="Delete"
          confirmColor="red"
          onConfirm={handleDelete}
          onCancel={() => { setIsDeleteModalOpen(false); setDeletingConfig(null); }}
        />
      )}

      {/* History Seeding Modal - Hidden (causes chart discontinuity issues)
         To re-enable, uncomment the button above and this modal block
      */}
      {false && isSeedingModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-400" />
                Seed Historical Data
              </h2>
              <button
                onClick={() => { setIsSeedingModalOpen(false); setSeedingResults(null); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-slate-400 text-sm mb-6">
              Fetch real historical candles from Binance (crypto) or Deriv (forex) and store them as OTC chart history.
              This provides realistic charts that the OTC price generator continues from.
            </p>

            <div className="space-y-3 mb-6">
              <button
                onClick={handleSeedAllHistory}
                disabled={isSeeding}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-colors"
              >
                {isSeeding ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Seeding...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Seed All OTC Pairs</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSeedByType('FOREX')}
                  disabled={isSeeding}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Forex Only</span>
                </button>
                <button
                  onClick={() => handleSeedByType('CRYPTO')}
                  disabled={isSeeding}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 text-white rounded-lg transition-colors"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Crypto Only</span>
                </button>
              </div>
            </div>

            {/* Seeding Results */}
            {seedingResults && (
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-medium text-white mb-3">Seeding Results</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-400">{seedingResults?.totalSeeded}</p>
                    <p className="text-xs text-slate-400">Candles Seeded</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-400">{seedingResults?.successful}</p>
                    <p className="text-xs text-slate-400">Successful</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-400">{seedingResults?.total}</p>
                    <p className="text-xs text-slate-400">Total Pairs</p>
                  </div>
                </div>

                {/* Individual results */}
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {seedingResults?.results.map((result, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-700/50 last:border-0">
                      <span className="text-slate-300">{result.symbol}</span>
                      <span className={cn(
                        result.candlesSeeded > 0 ? 'text-emerald-400' : 'text-red-400'
                      )}>
                        {result.candlesSeeded > 0 ? `${result.candlesSeeded} candles (${result.source})` : 'No data'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button
                onClick={() => { setIsSeedingModalOpen(false); setSeedingResults(null); }}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, color }: {
  icon: any;
  label: string;
  value: string | number;
  color: 'blue' | 'emerald' | 'purple' | 'amber' | 'red' | 'cyan';
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  };

  return (
    <div className={cn('rounded-xl p-4 border', colorClasses[color])}>
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5" />
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

// Configs Tab Component
function ConfigsTab({
  configs,
  searchTerm,
  setSearchTerm,
  marketTypeFilter,
  setMarketTypeFilter,
  enabledFilter,
  setEnabledFilter,
  selectedIds,
  toggleSelectAll,
  toggleSelect,
  onEdit,
  onDelete,
  onToggleEnabled,
  onToggleRisk,
  onBulkToggleEnabled,
  onBulkToggleRisk,
  pagination,
  onPageChange,
}: {
  configs: OTCConfig[];
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  marketTypeFilter: 'all' | 'FOREX' | 'CRYPTO';
  setMarketTypeFilter: (v: 'all' | 'FOREX' | 'CRYPTO') => void;
  enabledFilter: 'all' | 'enabled' | 'disabled';
  setEnabledFilter: (v: 'all' | 'enabled' | 'disabled') => void;
  selectedIds: Set<string>;
  toggleSelectAll: () => void;
  toggleSelect: (id: string) => void;
  onEdit: (config: OTCConfig) => void;
  onDelete: (config: OTCConfig) => void;
  onToggleEnabled: (config: OTCConfig) => void;
  onToggleRisk: (config: OTCConfig) => void;
  onBulkToggleEnabled: (enabled: boolean) => void;
  onBulkToggleRisk: (riskEnabled: boolean) => void;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by symbol or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
          />
        </div>
        <select
          value={marketTypeFilter}
          onChange={(e) => setMarketTypeFilter(e.target.value as any)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
        >
          <option value="all">All Markets</option>
          <option value="FOREX">Forex</option>
          <option value="CRYPTO">Crypto</option>
        </select>
        <select
          value={enabledFilter}
          onChange={(e) => setEnabledFilter(e.target.value as any)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
        >
          <option value="all">All Status</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
          <span className="text-sm text-slate-400">{selectedIds.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => onBulkToggleEnabled(true)}
              className="px-3 py-1 text-sm bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white rounded-lg transition-all"
            >
              Enable All
            </button>
            <button
              onClick={() => onBulkToggleEnabled(false)}
              className="px-3 py-1 text-sm bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Disable All
            </button>
            <button
              onClick={() => onBulkToggleRisk(true)}
              className="px-3 py-1 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
            >
              Enable Risk
            </button>
            <button
              onClick={() => onBulkToggleRisk(false)}
              className="px-3 py-1 text-sm bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Disable Risk
            </button>
          </div>
        </div>
      )}

      {/* Table (Desktop) */}
      <div className="hidden lg:block bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-800">
            <tr className="border-b border-slate-700">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === configs.length && configs.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-600 text-[#1079ff] focus:ring-[#1079ff]"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Symbol</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Market</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Payout</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Risk</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {configs.map((config) => (
              <tr key={config.id} className="hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(config.id)}
                    onChange={() => toggleSelect(config.id)}
                    className="rounded border-slate-600 text-[#1079ff] focus:ring-[#1079ff]"
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-white">{config.symbol}</span>
                </td>
                <td className="px-4 py-3 text-slate-300">{config.name}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'px-2 py-1 text-xs font-medium rounded-full',
                    config.marketType === 'FOREX'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-amber-500/20 text-amber-400'
                  )}>
                    {config.marketType}
                  </span>
                </td>
                <td className="px-4 py-3 text-white">{config.payoutPercent}%</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggleRisk(config)}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full transition-colors',
                      config.riskEnabled
                        ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                        : 'bg-slate-500/20 text-slate-400 hover:bg-slate-500/30'
                    )}
                  >
                    <Shield className="h-3 w-3" />
                    {config.riskEnabled ? 'ON' : 'OFF'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggleEnabled(config)}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full transition-colors',
                      config.isEnabled
                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    )}
                  >
                    <Power className="h-3 w-3" />
                    {config.isEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(config)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(config)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {configs.map((config) => (
          <div key={config.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(config.id)}
                  onChange={() => toggleSelect(config.id)}
                  className="rounded border-slate-600 text-[#1079ff] focus:ring-[#1079ff]"
                />
                <div>
                  <p className="font-mono text-white font-medium">{config.symbol}</p>
                  <p className="text-sm text-slate-400">{config.name}</p>
                </div>
              </div>
              <span className={cn(
                'px-2 py-1 text-xs font-medium rounded-full',
                config.marketType === 'FOREX'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-amber-500/20 text-amber-400'
              )}>
                {config.marketType}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center p-2 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400">Payout</p>
                <p className="text-sm font-medium text-white">{config.payoutPercent}%</p>
              </div>
              <div className="text-center p-2 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400">Risk</p>
                <p className={cn('text-sm font-medium', config.riskEnabled ? 'text-amber-400' : 'text-slate-400')}>
                  {config.riskEnabled ? 'ON' : 'OFF'}
                </p>
              </div>
              <div className="text-center p-2 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400">Status</p>
                <p className={cn('text-sm font-medium', config.isEnabled ? 'text-emerald-400' : 'text-red-400')}>
                  {config.isEnabled ? 'ON' : 'OFF'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-slate-700/50">
              <button
                onClick={() => onToggleEnabled(config)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
                  config.isEnabled
                    ? 'bg-slate-600 hover:bg-slate-700 text-white'
                    : 'bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white'
                )}
              >
                <Power className="h-4 w-4" />
                {config.isEnabled ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => onEdit(config)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(config)}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {configs.length === 0 && (
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No OTC configurations found</p>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-white">Page {pagination.page} of {pagination.totalPages}</span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Exposures Tab Component
function ExposuresTab({ exposures, onResetExposure, onRefresh }: {
  exposures: OTCExposure[];
  onResetExposure: (symbol: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Real-Time Risk Exposure</h3>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {exposures.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
          <Shield className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No active exposure data</p>
          <p className="text-sm text-slate-500 mt-1">Exposure will appear when trades are placed on OTC pairs</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exposures.map((exposure) => (
            <div key={exposure.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-white font-medium">{exposure.symbol}</span>
                <span className={cn(
                  'px-2 py-1 text-xs font-medium rounded-full',
                  exposure.exposureRatio > 0.5
                    ? 'bg-red-500/20 text-red-400'
                    : exposure.exposureRatio > 0.3
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                )}>
                  {(exposure.exposureRatio * 100).toFixed(1)}% Imbalance
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-emerald-400 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs">UP Trades</span>
                  </div>
                  <p className="text-lg font-bold text-white">${exposure.totalUpAmount.toFixed(2)}</p>
                  <p className="text-xs text-slate-400">{exposure.activeUpTrades} trades</p>
                </div>
                <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-red-400 mb-1">
                    <TrendingDown className="h-4 w-4" />
                    <span className="text-xs">DOWN Trades</span>
                  </div>
                  <p className="text-lg font-bold text-white">${exposure.totalDownAmount.toFixed(2)}</p>
                  <p className="text-xs text-slate-400">{exposure.activeDownTrades} trades</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-slate-400 mb-3">
                <span>Net Exposure:</span>
                <span className={cn(
                  'font-medium',
                  exposure.netExposure > 0 ? 'text-emerald-400' : exposure.netExposure < 0 ? 'text-red-400' : 'text-white'
                )}>
                  ${Math.abs(exposure.netExposure).toFixed(2)} {exposure.netExposure > 0 ? 'UP' : exposure.netExposure < 0 ? 'DOWN' : ''}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-slate-400 mb-3">
                <span>Interventions:</span>
                <span className="text-white">{exposure.successfulInterventions}/{exposure.totalInterventions}</span>
              </div>

              <button
                onClick={() => onResetExposure(exposure.symbol)}
                className="w-full px-3 py-2 text-sm text-slate-400 hover:text-white border border-slate-600 hover:border-slate-500 rounded-lg transition-colors"
              >
                Reset Exposure
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Activity Tab Component
function ActivityTab({ logs, onRefresh, pagination, onPageChange }: {
  logs: OTCActivityLog[];
  onRefresh: () => void;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">
          Activity Log
          <span className="ml-2 text-sm font-normal text-slate-400">
            ({pagination.total} total)
          </span>
        </h3>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
          <History className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No activity logs yet</p>
        </div>
      ) : (
        <>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="divide-y divide-slate-700">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-2 rounded-lg',
                        log.eventType === 'RISK_INTERVENTION' ? 'bg-amber-500/20 text-amber-400' :
                        log.eventType === 'CONFIG_CREATED' ? 'bg-emerald-500/20 text-emerald-400' :
                        log.eventType === 'CONFIG_UPDATED' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-slate-500/20 text-slate-400'
                      )}>
                        {log.eventType === 'RISK_INTERVENTION' ? <AlertTriangle className="h-4 w-4" /> :
                         log.eventType === 'CONFIG_CREATED' ? <Plus className="h-4 w-4" /> :
                         log.eventType === 'CONFIG_UPDATED' ? <Pencil className="h-4 w-4" /> :
                         <Activity className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-white font-medium">{log.eventType.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-slate-400">{log.symbol}</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-slate-400">
                Showing {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-white text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Define MarketAsset interface for available symbols
interface MarketAssetOption {
  symbol: string;
  name: string;
  marketType: string;
  pipSize: number;
}

// Config Modal Component
function ConfigModal({ config, onClose, onSave }: {
  config: OTCConfig | null;
  onClose: () => void;
  onSave: (data: CreateOTCConfigInput | UpdateOTCConfigInput) => void;
}) {
  const isEditing = !!config;
  const [formData, setFormData] = useState({
    symbol: config?.symbol || '',
    baseSymbol: config?.baseSymbol || '',
    marketType: config?.marketType || 'FOREX' as 'FOREX' | 'CRYPTO',
    name: config?.name || '',
    pipSize: config?.pipSize || 0.0001,
    isEnabled: config?.isEnabled ?? true,
    riskEnabled: config?.riskEnabled ?? true,
    payoutPercent: config?.payoutPercent || 85,
    minTradeAmount: config?.minTradeAmount || 1,
    maxTradeAmount: config?.maxTradeAmount || 1000,
    baseVolatility: config?.baseVolatility || 0.0003,
    volatilityMultiplier: config?.volatilityMultiplier || 1.0,
    meanReversionStrength: config?.meanReversionStrength || 0.0015,
    maxDeviationPercent: config?.maxDeviationPercent || 1.5,
    exposureThreshold: config?.exposureThreshold || 0.35,
    minInterventionRate: config?.minInterventionRate || 0.25,
    maxInterventionRate: config?.maxInterventionRate || 0.40,
    anchoringDurationMins: config?.anchoringDurationMins || 15,
  });

  const [activeSection, setActiveSection] = useState<'basic' | 'price' | 'risk'>('basic');
  const [availableAssets, setAvailableAssets] = useState<MarketAssetOption[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);

  // Fetch available market assets on mount
  useEffect(() => {
    const fetchAssets = async () => {
      setIsLoadingAssets(true);
      try {
        const [forexAssets, cryptoAssets] = await Promise.all([
          api.getForexAssets(),
          api.getCryptoAssets(),
        ]);
        const allAssets: MarketAssetOption[] = [
          ...forexAssets.map(a => ({ symbol: a.symbol, name: a.name, marketType: 'FOREX', pipSize: a.pipSize })),
          ...cryptoAssets.map(a => ({ symbol: a.symbol, name: a.name, marketType: 'CRYPTO', pipSize: a.pipSize })),
        ];
        setAvailableAssets(allAssets);
      } catch (error) {
        console.error('Failed to fetch market assets:', error);
      } finally {
        setIsLoadingAssets(false);
      }
    };
    fetchAssets();
  }, []);

  // Filter assets by selected market type
  const filteredAssets = availableAssets.filter(a => a.marketType === formData.marketType);

  // Auto-fill fields when base symbol is selected
  const handleBaseSymbolChange = (symbol: string) => {
    const asset = availableAssets.find(a => a.symbol === symbol);
    if (asset) {
      setFormData({
        ...formData,
        baseSymbol: symbol,
        symbol: `${symbol}-OTC`,
        name: `${asset.name} (OTC)`,
        pipSize: asset.pipSize,
      });
    } else {
      setFormData({ ...formData, baseSymbol: symbol });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing && (!formData.symbol || !formData.baseSymbol || !formData.name)) {
      toast.error('Please fill in all required fields');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-700">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">
            {isEditing ? `Edit ${config.symbol}` : 'Add New OTC Pair'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-slate-700">
          {[
            { id: 'basic', label: 'Basic Settings' },
            { id: 'price', label: 'Price Generation' },
            { id: 'risk', label: 'Risk Engine' },
          ].map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                activeSection === section.id
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              {section.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Basic Settings */}
          {activeSection === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Symbol <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    placeholder="EUR/USD-OTC"
                    disabled={isEditing}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Base Symbol <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.baseSymbol}
                    onChange={(e) => handleBaseSymbolChange(e.target.value)}
                    disabled={isEditing || isLoadingAssets}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  >
                    <option value="">Select base symbol...</option>
                    {filteredAssets.map(asset => (
                      <option key={asset.symbol} value={asset.symbol}>
                        {asset.symbol} - {asset.name}
                      </option>
                    ))}
                  </select>
                  {isLoadingAssets && (
                    <p className="text-xs text-slate-500 mt-1">Loading available symbols...</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Display Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Euro / US Dollar (OTC)"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Market Type</label>
                  <select
                    value={formData.marketType}
                    onChange={(e) => setFormData({
                      ...formData,
                      marketType: e.target.value as 'FOREX' | 'CRYPTO',
                      baseSymbol: '', // Reset base symbol when market type changes
                      symbol: '',
                      name: '',
                      pipSize: e.target.value === 'FOREX' ? 0.0001 : 0.01,
                    })}
                    disabled={isEditing}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  >
                    <option value="FOREX">Forex</option>
                    <option value="CRYPTO">Crypto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Pip Size</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.pipSize}
                    onChange={(e) => setFormData({ ...formData, pipSize: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Payout %</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={formData.payoutPercent}
                    onChange={(e) => setFormData({ ...formData, payoutPercent: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Min Trade $</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.minTradeAmount}
                    onChange={(e) => setFormData({ ...formData, minTradeAmount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Max Trade $</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxTradeAmount}
                    onChange={(e) => setFormData({ ...formData, maxTradeAmount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isEnabled}
                    onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                    className="rounded border-slate-600 text-[#1079ff] focus:ring-[#1079ff]"
                  />
                  <span className="text-white">Enabled</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.riskEnabled}
                    onChange={(e) => setFormData({ ...formData, riskEnabled: e.target.checked })}
                    className="rounded border-slate-600 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-white">Risk Engine</span>
                </label>
              </div>
            </div>
          )}

          {/* Price Generation Settings */}
          {activeSection === 'price' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400 mb-4">
                Configure how synthetic prices are generated using Brownian motion and GARCH volatility clustering.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Base Volatility
                    <span className="text-xs text-slate-500 ml-1">(0.01% - 10%)</span>
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    max="0.1"
                    value={formData.baseVolatility}
                    onChange={(e) => setFormData({ ...formData, baseVolatility: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Volatility Multiplier
                    <span className="text-xs text-slate-500 ml-1">(0.1 - 5x)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5"
                    value={formData.volatilityMultiplier}
                    onChange={(e) => setFormData({ ...formData, volatilityMultiplier: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Mean Reversion Strength
                    <span className="text-xs text-slate-500 ml-1">(0 - 0.1)</span>
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="0.1"
                    value={formData.meanReversionStrength}
                    onChange={(e) => setFormData({ ...formData, meanReversionStrength: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Max Deviation %
                    <span className="text-xs text-slate-500 ml-1">(0.1 - 10%)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={formData.maxDeviationPercent}
                    onChange={(e) => setFormData({ ...formData, maxDeviationPercent: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Anchoring Duration (mins)
                  <span className="text-xs text-slate-500 ml-1">(1 - 60 mins)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={formData.anchoringDurationMins}
                  onChange={(e) => setFormData({ ...formData, anchoringDurationMins: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                />
                <p className="text-xs text-slate-500 mt-1">Time to smoothly transition from OTC to real prices when markets reopen</p>
              </div>
            </div>
          )}

          {/* Risk Engine Settings */}
          {activeSection === 'risk' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400 mb-4">
                Configure the risk engine intervention parameters. Higher values mean more intervention.
              </p>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-400">Risk Engine Overview</p>
                    <p className="text-xs text-amber-300/70 mt-1">
                      The risk engine monitors trade imbalance (UP vs DOWN) and subtly adjusts exit prices
                      to maintain broker profitability while keeping outcomes natural-looking.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Exposure Threshold
                  <span className="text-xs text-slate-500 ml-1">(10% - 90%)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="0.9"
                  value={formData.exposureThreshold}
                  onChange={(e) => setFormData({ ...formData, exposureThreshold: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                />
                <p className="text-xs text-slate-500 mt-1">Trade imbalance ratio that triggers risk review</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Min Intervention Rate
                    <span className="text-xs text-slate-500 ml-1">(0 - 100%)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.minInterventionRate}
                    onChange={(e) => setFormData({ ...formData, minInterventionRate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Max Intervention Rate
                    <span className="text-xs text-slate-500 ml-1">(0 - 100%)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.maxInterventionRate}
                    onChange={(e) => setFormData({ ...formData, maxInterventionRate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-700/50 rounded-lg">
                <p className="text-sm text-slate-300">
                  Current setting: <span className="text-amber-400 font-medium">{(formData.minInterventionRate * 100).toFixed(0)}% - {(formData.maxInterventionRate * 100).toFixed(0)}%</span> intervention rate
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {formData.maxInterventionRate <= 0.25 ? 'Low (natural outcomes)' :
                   formData.maxInterventionRate <= 0.4 ? 'Moderate (balanced)' :
                   formData.maxInterventionRate <= 0.6 ? 'High (more control)' :
                   'Very High (aggressive)'}
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white rounded-lg transition-all"
            >
              <Check className="h-4 w-4" />
              {isEditing ? 'Save Changes' : 'Create OTC Pair'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Confirm Dialog Component
function ConfirmDialog({ title, message, confirmText, confirmColor, onConfirm, onCancel }: {
  title: string;
  message: string;
  confirmText: string;
  confirmColor: 'red' | 'emerald';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-700">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-slate-400">{message}</p>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'px-4 py-2 rounded-lg font-medium text-white transition-colors',
              confirmColor === 'red'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to check if forex market is open
function isForexMarketOpen(): boolean {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const utcHour = now.getUTCHours();

  // Forex closed: Friday 22:00 UTC to Sunday 22:00 UTC
  // Saturday (day 6): Always closed
  if (utcDay === 6) return false;
  // Friday (day 5) after 22:00: Closed
  if (utcDay === 5 && utcHour >= 22) return false;
  // Sunday (day 0) before 22:00: Closed
  if (utcDay === 0 && utcHour < 22) return false;

  return true;
}

// Manual Controls Tab Component
function ManualControlsTab({ configs }: { configs: OTCConfig[] }) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [control, setControl] = useState<ManualControl | null>(null);
  const [activeTrades, setActiveTrades] = useState<ActiveTradeInfo[]>([]);
  const [userTargets, setUserTargets] = useState<UserTargeting[]>([]);
  const [interventions, setInterventions] = useState<ManualIntervention[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // WebSocket for live prices
  const { latestPrices, subscribe, unsubscribe, subscribeAll, isConnected } = useWebSocket();

  // Polled real prices (fallback when WebSocket doesn't provide them)
  const [polledRealPrices, setPolledRealPrices] = useState<Map<string, { price: number; timestamp: Date }>>(new Map());

  // Form states
  const [directionBias, setDirectionBias] = useState(0);
  const [directionStrength, setDirectionStrength] = useState(0.5);
  const [directionBiasDuration, setDirectionBiasDuration] = useState<number | null>(null); // null = permanent
  const [volatilityMultiplier, setVolatilityMultiplier] = useState(1.0);
  const [volatilityDuration, setVolatilityDuration] = useState<number | null>(null); // null = permanent
  const [priceOverride, setPriceOverride] = useState('');
  const [priceOverrideExpiry, setPriceOverrideExpiry] = useState(15);

  // User targeting modal
  const [showUserTargetModal, setShowUserTargetModal] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [targetWinRate, setTargetWinRate] = useState<number | ''>('');
  const [forceNextWin, setForceNextWin] = useState(0);
  const [forceNextLose, setForceNextLose] = useState(0);

  // User search for targeting
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<{ id: string; email: string; name: string }[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [selectedUserDisplay, setSelectedUserDisplay] = useState<string | null>(null);

  // Force trade confirmation modal
  const [forceTradeConfirm, setForceTradeConfirm] = useState<{
    show: boolean;
    trade: ActiveTradeInfo | null;
    outcome: 'WIN' | 'LOSE' | null;
  }>({ show: false, trade: null, outcome: null });

  // Real-time countdown tick
  const [, setTick] = useState(0);

  // Subscribe to all OTC symbols AND their base symbols for live prices
  useEffect(() => {
    if (configs.length > 0 && isConnected) {
      // Subscribe to OTC symbols
      const otcSymbols = configs.map(c => c.symbol);
      // Subscribe to base symbols (real market prices)
      const baseSymbols = configs.map(c => c.baseSymbol);
      // Combine and dedupe
      const allSymbols = [...new Set([...otcSymbols, ...baseSymbols])];
      subscribeAll(allSymbols);
    }
  }, [configs, isConnected, subscribeAll]);

  // Poll real market prices as fallback (every 2 seconds)
  useEffect(() => {
    if (configs.length === 0) return;

    const fetchRealPrices = async () => {
      const baseSymbols = [...new Set(configs.map(c => c.baseSymbol))];
      const newPrices = new Map<string, { price: number; timestamp: Date }>();

      await Promise.all(
        baseSymbols.map(async (symbol) => {
          try {
            const priceData = await api.getCurrentPrice(symbol);
            if (priceData) {
              newPrices.set(symbol, { price: priceData.price, timestamp: new Date(priceData.timestamp) });
            }
          } catch (error) {
            // Silently fail - price might not be available
          }
        })
      );

      if (newPrices.size > 0) {
        setPolledRealPrices(newPrices);
      }
    };

    // Fetch immediately
    fetchRealPrices();

    // Then poll every 2 seconds
    const interval = setInterval(fetchRealPrices, 2000);
    return () => clearInterval(interval);
  }, [configs]);

  useEffect(() => {
    if (configs.length > 0 && !selectedSymbol) {
      setSelectedSymbol(configs[0].symbol);
    }
  }, [configs, selectedSymbol]);

  useEffect(() => {
    if (selectedSymbol) {
      fetchControlData();
    }
  }, [selectedSymbol]);

  // Auto-refresh active trades every 3 seconds
  useEffect(() => {
    if (!selectedSymbol) return;

    const refreshActiveTrades = async () => {
      try {
        const tradesData = await api.getActiveOTCTrades(selectedSymbol);
        setActiveTrades(tradesData);
      } catch (error) {
        // Silent fail - don't spam errors
      }
    };

    const interval = setInterval(refreshActiveTrades, 3000);
    return () => clearInterval(interval);
  }, [selectedSymbol]);

  // Real-time countdown timer - updates every second
  useEffect(() => {
    if (activeTrades.length === 0) return;

    const interval = setInterval(() => {
      setTick(t => t + 1);
      // Update trade times in memory (decrement by 1000ms)
      setActiveTrades(prev => prev.map(trade => ({
        ...trade,
        timeLeftMs: Math.max(0, trade.timeLeftMs - 1000)
      })));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTrades.length]);

  // Get current OTC price for selected symbol
  const currentPrice = useMemo(() => {
    if (!selectedSymbol) return null;
    return latestPrices.get(selectedSymbol) || null;
  }, [selectedSymbol, latestPrices]);

  // Get current real market price for selected symbol's base
  const selectedConfig = useMemo(() => {
    return configs.find(c => c.symbol === selectedSymbol);
  }, [configs, selectedSymbol]);

  const realPrice = useMemo(() => {
    if (!selectedConfig) return null;
    // First try WebSocket price
    const wsPrice = latestPrices.get(selectedConfig.baseSymbol);
    if (wsPrice) return wsPrice;
    // Fallback to polled price
    const polledPrice = polledRealPrices.get(selectedConfig.baseSymbol);
    if (polledPrice) {
      return {
        symbol: selectedConfig.baseSymbol,
        price: polledPrice.price,
        bid: polledPrice.price,
        ask: polledPrice.price,
        timestamp: polledPrice.timestamp.toISOString(),
        change: 0,
        changePercent: 0,
      };
    }
    return null;
  }, [selectedConfig, latestPrices, polledRealPrices]);

  // Calculate price gap between OTC and real
  const priceGap = useMemo(() => {
    if (!currentPrice || !realPrice) return null;
    const gap = currentPrice.price - realPrice.price;
    const gapPercent = (gap / realPrice.price) * 100;
    const gapPips = selectedConfig ? Math.abs(gap / selectedConfig.pipSize) : 0;
    const isCrypto = selectedConfig?.marketType === 'CRYPTO';
    // For crypto, show gap in dollars; for forex, show in pips
    const displayGap = isCrypto ? Math.abs(gap).toFixed(2) : gapPips.toFixed(1);
    const displayUnit = isCrypto ? '$' : ' pips';
    return { gap, gapPercent, gapPips, displayGap, displayUnit, isCrypto };
  }, [currentPrice, realPrice, selectedConfig]);

  // Get all prices for the price overview (OTC and real)
  const allPrices = useMemo(() => {
    return configs.map(config => {
      // Try WebSocket price first, then fall back to polled price
      let realPrice = latestPrices.get(config.baseSymbol) || null;
      if (!realPrice) {
        const polledPrice = polledRealPrices.get(config.baseSymbol);
        if (polledPrice) {
          realPrice = {
            symbol: config.baseSymbol,
            price: polledPrice.price,
            bid: polledPrice.price,
            ask: polledPrice.price,
            timestamp: polledPrice.timestamp.toISOString(),
            change: 0,
            changePercent: 0,
          };
        }
      }
      return {
        ...config,
        otcPrice: latestPrices.get(config.symbol) || null,
        realPrice
      };
    });
  }, [configs, latestPrices, polledRealPrices]);

  const fetchControlData = async () => {
    if (!selectedSymbol) return;
    setIsLoading(true);
    try {
      const [controlData, tradesData, targetsData, interventionsData] = await Promise.all([
        api.getManualControl(selectedSymbol),
        api.getActiveOTCTrades(selectedSymbol),
        api.getAllUserTargets(),
        api.getInterventionLog({ limit: 20 }),
      ]);
      setControl(controlData);
      setActiveTrades(tradesData);
      setUserTargets(targetsData);
      setInterventions(interventionsData.data);

      // Update form with current values
      setDirectionBias(controlData.directionBias);
      setDirectionStrength(controlData.directionStrength);
      setVolatilityMultiplier(controlData.volatilityMultiplier);
    } catch (error) {
      console.error('Failed to fetch control data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDirectionBias = async () => {
    try {
      await api.setDirectionBias(selectedSymbol, directionBias, directionStrength, directionBiasDuration || undefined);
      const durationText = directionBiasDuration ? ` for ${directionBiasDuration} minutes` : ' (permanent)';
      toast.success(`Direction bias set to ${directionBias > 0 ? '+' : ''}${directionBias} at ${(directionStrength * 100).toFixed(0)}% strength${durationText}`);
      fetchControlData();
    } catch (error) {
      toast.error('Failed to set direction bias');
    }
  };

  const handleClearDirectionBias = async () => {
    try {
      await api.clearDirectionBias(selectedSymbol);
      toast.success('Direction bias cleared');
      setDirectionBias(0);
      setDirectionStrength(0.5);
      fetchControlData();
    } catch (error) {
      toast.error('Failed to clear direction bias');
    }
  };

  const handleSetVolatility = async () => {
    try {
      await api.setVolatilityMultiplier(selectedSymbol, volatilityMultiplier, volatilityDuration || undefined);
      const durationText = volatilityDuration ? ` for ${volatilityDuration} minutes` : ' (permanent)';
      toast.success(`Volatility multiplier set to ${volatilityMultiplier}x${durationText}`);
      fetchControlData();
    } catch (error) {
      toast.error('Failed to set volatility');
    }
  };

  const handleClearVolatility = async () => {
    try {
      await api.clearVolatilityMultiplier(selectedSymbol);
      toast.success('Volatility reset to 1.0x');
      setVolatilityMultiplier(1.0);
      fetchControlData();
    } catch (error) {
      toast.error('Failed to clear volatility');
    }
  };

  const handleSetPriceOverride = async () => {
    const price = parseFloat(priceOverride);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    try {
      await api.setPriceOverride(selectedSymbol, price, priceOverrideExpiry);
      toast.success(`Price override set to ${price} for ${priceOverrideExpiry} minutes`);
      setPriceOverride('');
      fetchControlData();
    } catch (error) {
      toast.error('Failed to set price override');
    }
  };

  const handleClearPriceOverride = async () => {
    try {
      await api.clearPriceOverride(selectedSymbol);
      toast.success('Price override cleared');
      fetchControlData();
    } catch (error) {
      toast.error('Failed to clear price override');
    }
  };

  // Show confirmation before forcing trade outcome
  const showForceTradeConfirm = (trade: ActiveTradeInfo, outcome: 'WIN' | 'LOSE') => {
    setForceTradeConfirm({ show: true, trade, outcome });
  };

  // Execute the force trade after confirmation
  const handleForceTradeOutcome = async () => {
    if (!forceTradeConfirm.trade || !forceTradeConfirm.outcome) return;

    try {
      await api.forceTradeOutcome(forceTradeConfirm.trade.id, forceTradeConfirm.outcome);
      toast.success(`Trade forced to ${forceTradeConfirm.outcome}`);
      setForceTradeConfirm({ show: false, trade: null, outcome: null });
      fetchControlData();
    } catch (error) {
      toast.error('Failed to force trade outcome');
    }
  };

  const handleSetUserTarget = async () => {
    if (!targetUserId) {
      toast.error('Please enter a user ID');
      return;
    }
    try {
      await api.setUserTargeting(targetUserId, {
        targetWinRate: targetWinRate === '' ? undefined : targetWinRate,
        forceNextWin,
        forceNextLose,
      });
      toast.success('User targeting set');
      setShowUserTargetModal(false);
      setTargetUserId('');
      setTargetWinRate('');
      setForceNextWin(0);
      setForceNextLose(0);
      fetchControlData();
    } catch (error) {
      toast.error('Failed to set user targeting');
    }
  };

  const handleRemoveUserTarget = async (userId: string) => {
    try {
      await api.removeUserTargeting(userId);
      toast.success('User targeting removed');
      fetchControlData();
    } catch (error) {
      toast.error('Failed to remove user targeting');
    }
  };

  // Search for users to target
  const handleUserSearch = async (query: string) => {
    setUserSearchQuery(query);
    if (query.length < 2) {
      setUserSearchResults([]);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const response = await api.getAdminUsers({ search: query, limit: 10 });
      setUserSearchResults(response.data.map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name || 'Unknown'
      })));
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  // Select a user from search results
  const handleSelectUser = (user: { id: string; email: string; name: string }) => {
    setTargetUserId(user.id);
    setSelectedUserDisplay(`${user.name} (${user.email})`);
    setUserSearchResults([]);
    setUserSearchQuery('');
  };

  if (isLoading && !control) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1079ff]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live Price Overview - All Pairs with OTC vs Real comparison */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-300">Live Prices: OTC vs Real Market</h3>
          <div className="flex items-center gap-2">
            <span className={cn(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
            )} />
            <span className="text-xs text-slate-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {allPrices.map((item) => {
            const isCrypto = item.marketType === 'CRYPTO';
            const decimals = isCrypto ? 2 : (item.symbol.includes('JPY') ? 3 : 5);
            const gap = item.otcPrice && item.realPrice
              ? item.otcPrice.price - item.realPrice.price
              : null;
            const gapPips = gap !== null && item.pipSize
              ? Math.abs(gap / item.pipSize)
              : null;
            // For crypto show in dollars, for forex show in pips
            const gapDisplay = isCrypto
              ? `$${Math.abs(gap || 0).toFixed(2)}`
              : `${gapPips?.toFixed(1)} pips`;

            return (
              <button
                key={item.id}
                onClick={() => setSelectedSymbol(item.symbol)}
                className={cn(
                  'p-3 rounded-lg border transition-all text-left',
                  selectedSymbol === item.symbol
                    ? 'bg-emerald-500/20 border-emerald-500/50'
                    : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-medium">{item.symbol.replace('-OTC', '')}</span>
                  <div className="flex items-center gap-1.5">
                    {isCrypto && <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">CRYPTO</span>}
                    {!isCrypto && !isForexMarketOpen() && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">CLOSED</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* OTC Price */}
                  <div>
                    <div className="text-[10px] text-amber-400 uppercase tracking-wide mb-0.5">OTC</div>
                    {item.otcPrice ? (
                      <div className="text-sm font-mono font-semibold text-white">
                        {isCrypto && '$'}{item.otcPrice.price.toFixed(decimals)}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">--</div>
                    )}
                  </div>
                  {/* Real Price */}
                  <div>
                    <div className="text-[10px] text-blue-400 uppercase tracking-wide mb-0.5">Real</div>
                    {item.realPrice ? (
                      <div className="text-sm font-mono font-semibold text-white">
                        {isCrypto && '$'}{item.realPrice.price.toFixed(decimals)}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">
                        {!isCrypto && !isForexMarketOpen() ? 'Closed' : '--'}
                      </div>
                    )}
                  </div>
                </div>
                {/* Gap indicator */}
                {gap !== null && gapPips !== null && (
                  <div className={cn(
                    'mt-2 pt-2 border-t border-slate-600/50 text-xs font-medium',
                    Math.abs(gap) > 0 ? (gap > 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-400'
                  )}>
                    Gap: {gap > 0 ? '+' : '-'}{gapDisplay}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Symbol Selector & Current Price Display */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-400">Control Symbol:</label>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
            >
              {configs.map((config) => (
                <option key={config.id} value={config.symbol}>
                  {config.symbol} ({config.name})
                </option>
              ))}
            </select>
            <button
              onClick={fetchControlData}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            {/* 24/7 Mode Indicator */}
            {selectedConfig?.is24Hours && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                <Clock className="h-3 w-3 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">24/7 Active</span>
              </div>
            )}
            {/* Market Closed Indicator for Forex */}
            {selectedConfig?.marketType === 'FOREX' && !isForexMarketOpen() && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-lg">
                <Clock className="h-3 w-3 text-red-400" />
                <span className="text-xs font-medium text-red-400">Market Closed</span>
              </div>
            )}
          </div>

          {/* Live Price Display - OTC vs Real */}
          <div className="flex items-center gap-6 ml-auto flex-wrap">
            {/* OTC Price */}
            {currentPrice && (
              <div className="text-right">
                <div className="text-xs text-amber-400 uppercase tracking-wide font-medium">OTC Price</div>
                <div className="text-2xl font-mono font-bold text-white">
                  {selectedConfig?.marketType === 'CRYPTO' && '$'}
                  {currentPrice.price.toFixed(selectedConfig?.marketType === 'CRYPTO' ? 2 : (selectedSymbol.includes('JPY') ? 3 : 5))}
                </div>
                <div className={cn(
                  'text-xs font-medium',
                  currentPrice.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {currentPrice.change >= 0 ? '+' : ''}{currentPrice.changePercent.toFixed(2)}%
                </div>
              </div>
            )}

            {/* Real Price */}
            {realPrice && (
              <div className="text-right">
                <div className="text-xs text-blue-400 uppercase tracking-wide font-medium">Real Market</div>
                <div className="text-2xl font-mono font-bold text-white">
                  {selectedConfig?.marketType === 'CRYPTO' && '$'}
                  {realPrice.price.toFixed(selectedConfig?.marketType === 'CRYPTO' ? 2 : (selectedSymbol.includes('JPY') ? 3 : 5))}
                </div>
                <div className={cn(
                  'text-xs font-medium',
                  realPrice.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {realPrice.change >= 0 ? '+' : ''}{realPrice.changePercent.toFixed(2)}%
                </div>
              </div>
            )}

            {/* Gap Indicator */}
            {priceGap && (
              <div className={cn(
                'px-4 py-3 rounded-lg border text-center min-w-[120px]',
                priceGap.isCrypto
                  ? Math.abs(priceGap.gap) > 500
                    ? 'bg-red-500/20 border-red-500/50 text-red-400'
                    : Math.abs(priceGap.gap) > 100
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                    : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : Math.abs(priceGap.gapPips) > 50
                    ? 'bg-red-500/20 border-red-500/50 text-red-400'
                    : Math.abs(priceGap.gapPips) > 20
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                    : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
              )}>
                <div className="text-xs uppercase tracking-wide opacity-75 mb-1">Gap</div>
                <div className="text-xl font-mono font-bold">
                  {priceGap.isCrypto ? priceGap.displayUnit : ''}{priceGap.displayGap}{!priceGap.isCrypto ? priceGap.displayUnit : ''}
                </div>
                <div className="text-xs mt-1">
                  {priceGap.gap > 0 ? '+' : ''}{priceGap.gapPercent.toFixed(2)}%
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Controls Status - Shows what controls are affecting the price */}
      {control && (control.directionBias !== 0 || control.volatilityMultiplier !== 1 || control.priceOverride) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-400">Active Controls Affecting Price</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {control.directionBias !== 0 && (
              <div className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg',
                control.directionBias > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              )}>
                {control.directionBias > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                <span className="text-sm font-medium">
                  Direction Bias: {control.directionBias > 0 ? '+' : ''}{control.directionBias} at {(control.directionStrength * 100).toFixed(0)}%
                </span>
                {control.directionBiasExpiry && (
                  <span className="text-xs opacity-75">
                    (expires {new Date(control.directionBiasExpiry).toLocaleTimeString()})
                  </span>
                )}
              </div>
            )}
            {control.volatilityMultiplier !== 1 && (
              <div className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg',
                control.volatilityMultiplier > 1 ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
              )}>
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Volatility: {control.volatilityMultiplier.toFixed(1)}x
                </span>
                {control.volatilityExpiry && (
                  <span className="text-xs opacity-75">
                    (expires {new Date(control.volatilityExpiry).toLocaleTimeString()})
                  </span>
                )}
              </div>
            )}
            {control.priceOverride && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/20 text-purple-400">
                <Target className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Price Override: {control.priceOverride.toFixed(selectedSymbol.includes('JPY') ? 3 : 5)}
                </span>
                {control.priceOverrideExpiry && (
                  <span className="text-xs opacity-75">
                    (expires {new Date(control.priceOverrideExpiry).toLocaleTimeString()})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Direction Bias Card */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Direction Bias</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">Push the price in a specific direction</p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-red-400">DOWN (-100)</span>
                <span className="text-slate-300">{directionBias > 0 ? '+' : ''}{directionBias}</span>
                <span className="text-emerald-400">UP (+100)</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={directionBias}
                onChange={(e) => setDirectionBias(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Strength: {(directionStrength * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={directionStrength}
                onChange={(e) => setDirectionStrength(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">
                <Clock className="inline h-3 w-3 mr-1" />
                Duration
              </label>
              <select
                value={directionBiasDuration || 'permanent'}
                onChange={(e) => setDirectionBiasDuration(e.target.value === 'permanent' ? null : parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
              >
                <option value="permanent">Permanent (until cleared)</option>
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={360}>6 hours</option>
                <option value={720}>12 hours</option>
                <option value={1440}>24 hours</option>
              </select>
            </div>

            <button
              onClick={handleSetDirectionBias}
              className="w-full px-4 py-2 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white rounded-lg transition-all"
            >
              Apply Direction Bias
            </button>
          </div>

          {control && control.directionBias !== 0 && (
            <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">
                    Current: <span className={cn('font-medium', control.directionBias > 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {control.directionBias > 0 ? '+' : ''}{control.directionBias}
                    </span> at {(control.directionStrength * 100).toFixed(0)}% strength
                  </p>
                  {control.directionBiasExpiry && (
                    <p className="text-xs text-slate-400 mt-1">
                      <Clock className="inline h-3 w-3 mr-1" />
                      Expires: {new Date(control.directionBiasExpiry).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleClearDirectionBias}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Clear direction bias"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Volatility Card */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-white">Volatility Override</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">Multiply the base volatility for bigger price swings</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Multiplier: {volatilityMultiplier.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={volatilityMultiplier}
                onChange={(e) => setVolatilityMultiplier(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0.1x (Calm)</span>
                <span>1x (Normal)</span>
                <span>5x (Wild)</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">
                <Clock className="inline h-3 w-3 mr-1" />
                Duration
              </label>
              <select
                value={volatilityDuration || 'permanent'}
                onChange={(e) => setVolatilityDuration(e.target.value === 'permanent' ? null : parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="permanent">Permanent (until cleared)</option>
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={360}>6 hours</option>
                <option value={720}>12 hours</option>
                <option value={1440}>24 hours</option>
              </select>
            </div>

            <button
              onClick={handleSetVolatility}
              className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
            >
              Apply Volatility
            </button>
          </div>

          {control && control.volatilityMultiplier !== 1.0 && (
            <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">
                    Current: <span className="text-amber-400 font-medium">{control.volatilityMultiplier.toFixed(1)}x</span>
                  </p>
                  {control.volatilityExpiry && (
                    <p className="text-xs text-slate-400 mt-1">
                      <Clock className="inline h-3 w-3 mr-1" />
                      Expires: {new Date(control.volatilityExpiry).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleClearVolatility}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Reset volatility to 1.0x"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Price Override Card */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Price Override</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">Force a specific price for a limited time</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Target Price</label>
              <input
                type="number"
                step="0.00001"
                value={priceOverride}
                onChange={(e) => setPriceOverride(e.target.value)}
                placeholder="e.g., 1.08500"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Duration: {priceOverrideExpiry} minutes</label>
              <select
                value={priceOverrideExpiry}
                onChange={(e) => setPriceOverrideExpiry(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
              </select>
            </div>

            <button
              onClick={handleSetPriceOverride}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Set Price Override
            </button>
          </div>

          {control && control.priceOverride && (
            <div className="mt-4 p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-300">Active Override</p>
                  <p className="text-lg font-mono text-white">{control.priceOverride}</p>
                  <p className="text-xs text-slate-400">
                    Expires: {new Date(control.priceOverrideExpiry!).toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={handleClearPriceOverride}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Targeting Card */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">User Targeting</h3>
            </div>
            <button
              onClick={() => setShowUserTargetModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add Target
            </button>
          </div>

          {userTargets.length === 0 ? (
            <p className="text-sm text-slate-400">No user targets configured</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {userTargets.map((target) => (
                <div key={target.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div>
                    <p className="text-sm text-white font-mono">{target.userId.slice(0, 8)}...</p>
                    <div className="flex gap-3 text-xs text-slate-400">
                      {target.targetWinRate !== null && (
                        <span>Win Rate: <span className="text-cyan-400">{target.targetWinRate}%</span></span>
                      )}
                      {target.forceNextWin > 0 && (
                        <span>Force Win: <span className="text-emerald-400">{target.forceNextWin}</span></span>
                      )}
                      {target.forceNextLose > 0 && (
                        <span>Force Lose: <span className="text-red-400">{target.forceNextLose}</span></span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveUserTarget(target.userId)}
                    className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Trades Section */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Active OTC Trades</h3>
          <span className="px-2 py-0.5 bg-slate-700 rounded-full text-xs text-slate-300">
            {activeTrades.length}
          </span>
        </div>

        {activeTrades.length === 0 ? (
          <p className="text-sm text-slate-400">No active trades for this symbol</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">User</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Direction</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Amount</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Entry</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Time Left</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeTrades.map((trade) => (
                  <tr key={trade.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm text-white">{trade.userName}</p>
                        <p className="text-xs text-slate-400">{trade.userEmail}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                        trade.direction === 'UP'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      )}>
                        {trade.direction === 'UP' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {trade.direction}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-white font-mono">
                      ${trade.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-slate-300 font-mono">
                      {trade.entryPrice.toFixed(5)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={cn(
                        'text-sm font-medium',
                        trade.timeLeftMs < 10000 ? 'text-red-400' : 'text-slate-300'
                      )}>
                        {Math.max(0, Math.floor(trade.timeLeftMs / 1000))}s
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => showForceTradeConfirm(trade, 'WIN')}
                          className="px-2 py-1 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white text-xs rounded transition-all"
                        >
                          Win
                        </button>
                        <button
                          onClick={() => showForceTradeConfirm(trade, 'LOSE')}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                        >
                          Lose
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Interventions */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-white">Recent Manual Interventions</h3>
        </div>

        {interventions.length === 0 ? (
          <p className="text-sm text-slate-400">No recent interventions</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {interventions.map((intervention) => (
              <div key={intervention.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'px-2 py-0.5 text-xs rounded font-medium',
                    intervention.actionType === 'PRICE_BIAS' && 'bg-emerald-500/20 text-emerald-400',
                    intervention.actionType === 'VOLATILITY' && 'bg-amber-500/20 text-amber-400',
                    intervention.actionType === 'PRICE_OVERRIDE' && 'bg-purple-500/20 text-purple-400',
                    intervention.actionType === 'TRADE_FORCE' && 'bg-yellow-500/20 text-yellow-400',
                    intervention.actionType === 'USER_TARGET' && 'bg-cyan-500/20 text-cyan-400',
                  )}>
                    {intervention.actionType.replace('_', ' ')}
                  </span>
                  <div>
                    <p className="text-sm text-white">{intervention.targetId}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(intervention.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {intervention.reason && (
                  <p className="text-xs text-slate-400 max-w-[200px] truncate">{intervention.reason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Target Modal */}
      {showUserTargetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {
            setShowUserTargetModal(false);
            setUserSearchQuery('');
            setUserSearchResults([]);
            setSelectedUserDisplay(null);
          }} />
          <div className="relative bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Set User Targeting</h3>

            <div className="space-y-4">
              {/* User Search */}
              <div className="relative">
                <label className="block text-sm text-slate-400 mb-2">
                  <Search className="inline h-3 w-3 mr-1" />
                  Search User by Email or Name
                </label>
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => handleUserSearch(e.target.value)}
                  placeholder="Type to search users..."
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                {isSearchingUsers && (
                  <div className="absolute right-3 top-9">
                    <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />
                  </div>
                )}
                {/* Search Results Dropdown */}
                {userSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {userSearchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className="w-full px-4 py-2 text-left hover:bg-slate-600 transition-colors first:rounded-t-lg last:rounded-b-lg"
                      >
                        <p className="text-white text-sm">{user.name}</p>
                        <p className="text-slate-400 text-xs">{user.email}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected User Display */}
              {selectedUserDisplay && (
                <div className="p-3 bg-cyan-500/20 border border-cyan-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-cyan-400">Selected User</p>
                      <p className="text-white text-sm">{selectedUserDisplay}</p>
                    </div>
                    <button
                      onClick={() => {
                        setTargetUserId('');
                        setSelectedUserDisplay(null);
                      }}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Manual User ID Input */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Or Enter User ID Manually</label>
                <input
                  type="text"
                  value={targetUserId}
                  onChange={(e) => {
                    setTargetUserId(e.target.value);
                    setSelectedUserDisplay(null);
                  }}
                  placeholder="Enter user UUID"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Target Win Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={targetWinRate}
                  onChange={(e) => setTargetWinRate(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="Leave empty for normal"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Force Next Wins</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={forceNextWin}
                    onChange={(e) => setForceNextWin(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Force Next Losses</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={forceNextLose}
                    onChange={(e) => setForceNextLose(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowUserTargetModal(false);
                  setUserSearchQuery('');
                  setUserSearchResults([]);
                  setSelectedUserDisplay(null);
                }}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSetUserTarget}
                disabled={!targetUserId}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Set Target
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Force Trade Confirmation Modal */}
      {forceTradeConfirm.show && forceTradeConfirm.trade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setForceTradeConfirm({ show: false, trade: null, outcome: null })} />
          <div className="relative bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-700">
            <div className={cn(
              'flex items-center gap-3 p-4 rounded-lg mb-4',
              forceTradeConfirm.outcome === 'WIN'
                ? 'bg-emerald-500/20 border border-emerald-500/30'
                : 'bg-red-500/20 border border-red-500/30'
            )}>
              <AlertTriangle className={cn(
                'h-6 w-6',
                forceTradeConfirm.outcome === 'WIN' ? 'text-emerald-400' : 'text-red-400'
              )} />
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Force Trade to {forceTradeConfirm.outcome}?
                </h3>
                <p className="text-sm text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">User:</span>
                <span className="text-white">{forceTradeConfirm.trade.userName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Email:</span>
                <span className="text-white">{forceTradeConfirm.trade.userEmail}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Direction:</span>
                <span className={cn(
                  'font-medium',
                  forceTradeConfirm.trade.direction === 'UP' ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {forceTradeConfirm.trade.direction}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Amount:</span>
                <span className="text-white font-mono">${forceTradeConfirm.trade.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Entry Price:</span>
                <span className="text-white font-mono">{forceTradeConfirm.trade.entryPrice.toFixed(5)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Outcome:</span>
                <span className={cn(
                  'font-bold',
                  forceTradeConfirm.outcome === 'WIN' ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {forceTradeConfirm.outcome === 'WIN'
                    ? `+$${(forceTradeConfirm.trade.amount * 0.85).toFixed(2)} (Win)`
                    : `-$${forceTradeConfirm.trade.amount.toFixed(2)} (Loss)`
                  }
                </span>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setForceTradeConfirm({ show: false, trade: null, outcome: null })}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleForceTradeOutcome}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium text-white transition-colors',
                  forceTradeConfirm.outcome === 'WIN'
                    ? 'bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff]'
                    : 'bg-red-600 hover:bg-red-700'
                )}
              >
                Confirm Force {forceTradeConfirm.outcome}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
