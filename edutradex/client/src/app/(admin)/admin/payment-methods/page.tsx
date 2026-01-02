'use client';

import { useEffect, useState } from 'react';
import {
  Smartphone,
  Bitcoin,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Power,
  QrCode,
  Copy,
  Check,
  X,
  Star,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type {
  PaymentMethod,
  PaymentMethodStats,
  PaymentMethodType,
  CreateCryptoPaymentMethodInput,
  CreateMobileMoneyPaymentMethodInput,
  UpdatePaymentMethodInput,
} from '@/types';

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-600/20 text-amber-500',
    emerald: 'bg-emerald-600/20 text-emerald-500',
    red: 'bg-red-600/20 text-red-500',
    blue: 'bg-[#1079ff]/20 text-[#1079ff]',
    purple: 'bg-purple-600/20 text-purple-500',
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function QRCodeDisplay({ address, name }: { address: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-slate-700/50 rounded-lg">
      <img src={qrUrl} alt={`QR Code for ${name}`} className="w-32 h-32 rounded-lg bg-white p-2" />
      <div className="flex items-center gap-2 w-full">
        <code className="flex-1 text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded truncate">
          {address}
        </code>
        <button onClick={handleCopy} className="p-1.5 hover:bg-slate-600 rounded transition-colors">
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-slate-400" />}
        </button>
      </div>
    </div>
  );
}

interface PaymentMethodModalProps {
  type: 'crypto' | 'mobile';
  method?: PaymentMethod;
  onSave: () => void;
  onCancel: () => void;
}

function PaymentMethodModal({ type, method, onSave, onCancel }: PaymentMethodModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!method;

  // Form state
  const [name, setName] = useState(method?.name || '');
  const [code, setCode] = useState(method?.code || '');
  const [walletAddress, setWalletAddress] = useState(method?.walletAddress || '');
  const [cryptoCurrency, setCryptoCurrency] = useState(method?.cryptoCurrency || '');
  const [network, setNetwork] = useState(method?.network || '');
  const [mobileProvider, setMobileProvider] = useState(method?.mobileProvider || '');
  const [phoneNumber, setPhoneNumber] = useState(method?.phoneNumber || '');
  const [accountName, setAccountName] = useState(method?.accountName || '');
  const [iconUrl, setIconUrl] = useState(method?.iconUrl || '');
  const [iconBg, setIconBg] = useState(method?.iconBg || 'bg-gray-500/20');
  const [minAmount, setMinAmount] = useState(method?.minAmount?.toString() || '10');
  const [maxAmount, setMaxAmount] = useState(method?.maxAmount?.toString() || '10000');
  const [processingTime, setProcessingTime] = useState(method?.processingTime || '~5 min');
  const [isActive, setIsActive] = useState(method?.isActive ?? true);
  const [isPopular, setIsPopular] = useState(method?.isPopular ?? false);
  const [displayOrder, setDisplayOrder] = useState(method?.displayOrder?.toString() || '0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isEditing && method) {
        const updateData: UpdatePaymentMethodInput = {
          name,
          iconUrl: iconUrl || undefined,
          iconBg,
          minAmount: parseFloat(minAmount),
          maxAmount: parseFloat(maxAmount),
          processingTime,
          isActive,
          isPopular,
          displayOrder: parseInt(displayOrder),
        };

        if (type === 'crypto') {
          updateData.walletAddress = walletAddress;
        } else {
          updateData.phoneNumber = phoneNumber;
          updateData.accountName = accountName;
        }

        await api.updatePaymentMethod(method.id, updateData);
        toast.success('Payment method updated');
      } else {
        if (type === 'crypto') {
          const data: CreateCryptoPaymentMethodInput = {
            name,
            code,
            cryptoCurrency,
            network: network || undefined,
            walletAddress,
            iconUrl: iconUrl || undefined,
            iconBg,
            minAmount: parseFloat(minAmount),
            maxAmount: parseFloat(maxAmount),
            processingTime,
            isActive,
            isPopular,
            displayOrder: parseInt(displayOrder),
          };
          await api.createCryptoPaymentMethod(data);
        } else {
          const data: CreateMobileMoneyPaymentMethodInput = {
            name,
            code,
            mobileProvider,
            phoneNumber,
            accountName: accountName || undefined,
            iconUrl: iconUrl || undefined,
            iconBg,
            minAmount: parseFloat(minAmount),
            maxAmount: parseFloat(maxAmount),
            processingTime,
            isActive,
            isPopular,
            displayOrder: parseInt(displayOrder),
          };
          await api.createMobileMoneyPaymentMethod(data);
        }
        toast.success('Payment method created');
      }
      onSave();
    } catch (error) {
      toast.error(isEditing ? 'Failed to update payment method' : 'Failed to create payment method');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-slate-800 rounded-xl p-6 max-w-2xl w-full mx-4 my-8 border border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">
            {isEditing ? 'Edit' : 'Add'} {type === 'crypto' ? 'Crypto' : 'Mobile Money'} Payment Method
          </h3>
          <button onClick={onCancel} className="p-1 hover:bg-slate-700 rounded">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Display Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={type === 'crypto' ? 'Tether (USDT) TRC20' : 'MTN MoMo'}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                required
              />
            </div>

            {/* Code */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Code * {!isEditing && <span className="text-slate-500">(lowercase, dashes)</span>}
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder={type === 'crypto' ? 'usdt-trc20' : 'mtn-momo'}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                required
                disabled={isEditing}
              />
            </div>
          </div>

          {type === 'crypto' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Cryptocurrency *</label>
                  <input
                    type="text"
                    value={cryptoCurrency}
                    onChange={(e) => setCryptoCurrency(e.target.value.toUpperCase())}
                    placeholder="USDT"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                    required
                    disabled={isEditing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Network</label>
                  <input
                    type="text"
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                    placeholder="TRC20, ERC20, BEP20"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                    disabled={isEditing}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Wallet Address *</label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="Enter your wallet address"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                  required
                />
              </div>

              {walletAddress && (
                <QRCodeDisplay address={walletAddress} name={name || 'Crypto'} />
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Provider *</label>
                  <select
                    value={mobileProvider}
                    onChange={(e) => setMobileProvider(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                    required
                    disabled={isEditing}
                  >
                    <option value="">Select provider</option>
                    <option value="MTN">MTN MoMo</option>
                    <option value="MPESA">M-Pesa</option>
                    <option value="AIRTEL">Airtel Money</option>
                    <option value="VODAFONE">Vodafone Cash</option>
                    <option value="ORANGE">Orange Money</option>
                    <option value="TIGO">Tigo Pesa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+255 123 456 789"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Account Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Account holder name"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Min Amount ($)</label>
              <input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                min="1"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Max Amount ($)</label>
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                min="1"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Processing Time</label>
              <input
                type="text"
                value={processingTime}
                onChange={(e) => setProcessingTime(e.target.value)}
                placeholder="~5 min"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Icon URL</label>
              <input
                type="text"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="https://cryptologos.cc/logos/..."
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
              {/* Icon Preview */}
              {iconUrl && (
                <div className="mt-2 flex items-center gap-3">
                  <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', iconBg)}>
                    <img
                      src={iconUrl}
                      alt="Icon preview"
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">Current icon preview</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Display Order</label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                min="0"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-300">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPopular}
                onChange={(e) => setIsPopular(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-300">Popular (show in Popular tab)</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteModal({
  method,
  onConfirm,
  onCancel,
}: {
  method: PaymentMethod;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-slate-700">
        <h3 className="text-lg font-semibold text-white">Delete Payment Method</h3>
        <p className="mt-2 text-slate-400">
          Are you sure you want to delete <span className="text-white font-medium">{method.name}</span>?
          This action cannot be undone.
        </p>
        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentMethodCard({
  method,
  onEdit,
  onToggle,
  onDelete,
}: {
  method: PaymentMethod;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [showQR, setShowQR] = useState(false);

  return (
    <div className={cn(
      'bg-slate-800 rounded-xl border p-4 transition-all',
      method.isActive ? 'border-slate-700' : 'border-red-900/50 opacity-60'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', method.iconBg)}>
            {method.iconUrl ? (
              <img src={method.iconUrl} alt={method.name} className="w-8 h-8 object-contain" />
            ) : method.type === 'CRYPTO' ? (
              <Bitcoin className="h-6 w-6 text-white" />
            ) : (
              <Smartphone className="h-6 w-6 text-white" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white">{method.name}</h3>
              {method.isPopular && <Star className="h-4 w-4 text-amber-400 fill-amber-400" />}
            </div>
            <p className="text-sm text-slate-400">
              {method.type === 'CRYPTO'
                ? `${method.cryptoCurrency}${method.network ? ` (${method.network})` : ''}`
                : method.mobileProvider}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {method.type === 'CRYPTO' && method.walletAddress && (
            <button
              onClick={() => setShowQR(!showQR)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showQR ? 'bg-emerald-600 text-white' : 'hover:bg-slate-700 text-slate-400'
              )}
              title="Show QR Code"
            >
              <QrCode className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onToggle}
            className={cn(
              'p-2 rounded-lg transition-colors',
              method.isActive
                ? 'hover:bg-slate-700 text-emerald-400'
                : 'hover:bg-slate-700 text-red-400'
            )}
            title={method.isActive ? 'Deactivate' : 'Activate'}
          >
            <Power className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-red-900/50 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm text-slate-400">
        <span>Min: ${method.minAmount}</span>
        <span>Max: ${method.maxAmount}</span>
        <span>{method.processingTime}</span>
      </div>

      {method.type === 'CRYPTO' && method.walletAddress && (
        <div className="mt-2">
          <code className="text-xs text-slate-500 bg-slate-700/50 px-2 py-1 rounded block truncate">
            {method.walletAddress}
          </code>
        </div>
      )}

      {method.type === 'MOBILE_MONEY' && method.phoneNumber && (
        <div className="mt-2">
          <span className="text-sm text-slate-300">{method.phoneNumber}</span>
          {method.accountName && <span className="text-sm text-slate-500 ml-2">({method.accountName})</span>}
        </div>
      )}

      {showQR && method.walletAddress && (
        <div className="mt-4">
          <QRCodeDisplay address={method.walletAddress} name={method.name} />
        </div>
      )}
    </div>
  );
}

export default function AdminPaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [stats, setStats] = useState<PaymentMethodStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<PaymentMethodType | ''>('');

  const [showModal, setShowModal] = useState<{ type: 'crypto' | 'mobile'; method?: PaymentMethod } | null>(null);
  const [deleteModal, setDeleteModal] = useState<PaymentMethod | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [methodsRes, statsRes] = await Promise.all([
        api.getAdminPaymentMethods({ limit: 100 }),
        api.getPaymentMethodStats(),
      ]);
      setMethods(methodsRes.data);
      setStats(statsRes);
    } catch (error) {
      toast.error('Failed to fetch payment methods');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggle = async (method: PaymentMethod) => {
    try {
      await api.togglePaymentMethodStatus(method.id);
      toast.success(`Payment method ${method.isActive ? 'deactivated' : 'activated'}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to toggle status');
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await api.deletePaymentMethod(deleteModal.id);
      toast.success('Payment method deleted');
      setDeleteModal(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete payment method');
      console.error(error);
    }
  };

  const handleSeed = async () => {
    try {
      await api.seedPaymentMethods();
      toast.success('Default payment methods seeded');
      fetchData();
    } catch (error) {
      toast.error('Failed to seed payment methods');
      console.error(error);
    }
  };

  const filteredMethods = methods.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || m.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const cryptoMethods = filteredMethods.filter((m) => m.type === 'CRYPTO');
  const mobileMethods = filteredMethods.filter((m) => m.type === 'MOBILE_MONEY');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-[#1079ff] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Methods</h1>
          <p className="text-slate-400 mt-1">Manage crypto addresses and mobile money details</p>
        </div>
        <div className="flex items-center gap-3">
          {methods.length === 0 && (
            <button
              onClick={handleSeed}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Seed Defaults
            </button>
          )}
          <button
            onClick={() => setShowModal({ type: 'mobile' })}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Smartphone className="h-4 w-4" />
            Add Mobile Money
          </button>
          <button
            onClick={() => setShowModal({ type: 'crypto' })}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            <Bitcoin className="h-4 w-4" />
            Add Crypto
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard title="Total" value={stats.total} icon={Plus} color="blue" />
          <StatCard title="Crypto" value={stats.totalCrypto} icon={Bitcoin} color="amber" />
          <StatCard title="Mobile" value={stats.totalMobile} icon={Smartphone} color="purple" />
          <StatCard title="Active" value={stats.active} icon={Power} color="emerald" />
          <StatCard title="Inactive" value={stats.inactive} icon={Power} color="red" />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payment methods..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as PaymentMethodType | '')}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
        >
          <option value="">All Types</option>
          <option value="CRYPTO">Crypto</option>
          <option value="MOBILE_MONEY">Mobile Money</option>
        </select>
      </div>

      {/* Crypto Section */}
      {(!typeFilter || typeFilter === 'CRYPTO') && cryptoMethods.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Bitcoin className="h-5 w-5 text-amber-400" />
            Crypto Payment Methods ({cryptoMethods.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {cryptoMethods.map((method) => (
              <PaymentMethodCard
                key={method.id}
                method={method}
                onEdit={() => setShowModal({ type: 'crypto', method })}
                onToggle={() => handleToggle(method)}
                onDelete={() => setDeleteModal(method)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Mobile Money Section */}
      {(!typeFilter || typeFilter === 'MOBILE_MONEY') && mobileMethods.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-blue-400" />
            Mobile Money Payment Methods ({mobileMethods.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {mobileMethods.map((method) => (
              <PaymentMethodCard
                key={method.id}
                method={method}
                onEdit={() => setShowModal({ type: 'mobile', method })}
                onToggle={() => handleToggle(method)}
                onDelete={() => setDeleteModal(method)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredMethods.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bitcoin className="h-8 w-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-white">No payment methods found</h3>
          <p className="text-slate-400 mt-1">
            {methods.length === 0
              ? 'Click "Seed Defaults" to add default payment methods, or add your own.'
              : 'Try adjusting your search or filters.'}
          </p>
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <PaymentMethodModal
          type={showModal.type}
          method={showModal.method}
          onSave={() => {
            setShowModal(null);
            fetchData();
          }}
          onCancel={() => setShowModal(null)}
        />
      )}

      {deleteModal && (
        <DeleteModal
          method={deleteModal}
          onConfirm={handleDelete}
          onCancel={() => setDeleteModal(null)}
        />
      )}
    </div>
  );
}
