'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Receipt,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  DollarSign,
  TrendingUp,
  FolderOpen,
  Calendar,
  Filter,
  Download,
} from 'lucide-react';
import {
  api,
  ExpenseCategory,
  ExpenseEntry,
  CreateExpenseEntryInput,
  ExpenseAnalysis,
} from '@/lib/api';
import { cn } from '@/lib/utils';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

type DateRange = 'mtd' | 'last_month' | '3m' | '6m' | 'ytd';

function getDateRange(range: DateRange): { from: string; to: string } {
  const now = new Date();
  switch (range) {
    case 'mtd':
      return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case 'last_month':
      const lastMonth = subMonths(now, 1);
      return {
        from: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        to: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
      };
    case '3m':
      return { from: format(subMonths(now, 3), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case '6m':
      return { from: format(subMonths(now, 6), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case 'ytd':
      return { from: format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
  }
}

// Add Expense Modal
function AddExpenseModal({
  isOpen,
  onClose,
  categories,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  categories: ExpenseCategory[];
  onSubmit: (data: CreateExpenseEntryInput) => void;
}) {
  const [formData, setFormData] = useState<Partial<CreateExpenseEntryInput>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    isRecurring: false,
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId || !formData.amount) {
      toast.error('Please fill in required fields');
      return;
    }
    onSubmit(formData as CreateExpenseEntryInput);
    onClose();
  };

  // Flatten categories for select
  const flatCategories: { id: string; name: string; level: number }[] = [];
  categories.forEach((cat) => {
    flatCategories.push({ id: cat.id, name: cat.name, level: 0 });
    cat.children?.forEach((child) => {
      flatCategories.push({ id: child.id, name: child.name, level: 1 });
    });
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Add Expense</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Category *</label>
            <select
              value={formData.categoryId || ''}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
              required
            >
              <option value="">Select category</option>
              {flatCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.level > 0 ? '  └ ' : ''}{cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Amount *</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Date *</label>
            <input
              type="date"
              value={formData.date || ''}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Description</label>
            <input
              type="text"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Vendor</label>
            <input
              type="text"
              value={formData.vendor || ''}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRecurring"
              checked={formData.isRecurring || false}
              onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
              className="rounded border-slate-700"
            />
            <label htmlFor="isRecurring" className="text-sm text-slate-400">
              Recurring expense
            </label>
          </div>
          {formData.isRecurring && (
            <div>
              <label className="block text-sm text-slate-400 mb-1">Recurring Period</label>
              <select
                value={formData.recurringPeriod || ''}
                onChange={(e) => setFormData({ ...formData, recurringPeriod: e.target.value as 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="ANNUALLY">Annually</option>
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExpenseManagementPage() {
  const [dateRange, setDateRange] = useState<DateRange>('mtd');
  const [showAddModal, setShowAddModal] = useState(false);
  const { from, to } = getDateRange(dateRange);
  const queryClient = useQueryClient();

  const { data: categories, refetch: refetchCategories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => api.getExpenseCategories(),
  });

  const { data: expenses, isLoading: expensesLoading, refetch: refetchExpenses } = useQuery({
    queryKey: ['expense-entries', from, to],
    queryFn: () => api.getExpenseEntries({ from, to, limit: 100 }),
  });

  const { data: analysis } = useQuery({
    queryKey: ['expense-analysis', from, to],
    queryFn: () => api.getExpenseAnalysis(from, to),
  });

  const seedCategoriesMutation = useMutation({
    mutationFn: () => api.seedExpenseCategories(),
    onSuccess: () => {
      toast.success('Default categories created');
      refetchCategories();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to seed categories');
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: CreateExpenseEntryInput) => api.createExpenseEntry(data),
    onSuccess: () => {
      toast.success('Expense added');
      refetchExpenses();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add expense');
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (expenseId: string) => api.deleteExpenseEntry(expenseId),
    onSuccess: () => {
      toast.success('Expense deleted');
      refetchExpenses();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete expense');
    },
  });

  const totalExpenses = expenses?.data.reduce((sum, e) => sum + e.amount, 0) || 0;

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Expense Management</h1>
            <p className="text-slate-400">
              Track and manage business expenses
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex rounded-lg overflow-hidden border border-slate-700">
              {(['mtd', 'last_month', '3m', '6m', 'ytd'] as DateRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={cn(
                    "px-3 py-2 text-sm font-medium transition-colors",
                    dateRange === range
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                  )}
                >
                  {range === 'mtd' ? 'MTD' : range === 'last_month' ? 'Last Mo' : range.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </button>
          </div>
        </div>

        {/* No Categories Warning */}
        {categories && categories.length === 0 && (
          <div className="mb-6 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderOpen className="h-5 w-5 text-yellow-400" />
              <span className="text-yellow-200">No expense categories found. Create default categories to get started.</span>
            </div>
            <button
              onClick={() => seedCategoriesMutation.mutate()}
              disabled={seedCategoriesMutation.isPending}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
            >
              {seedCategoriesMutation.isPending ? 'Creating...' : 'Create Categories'}
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <DollarSign className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Expenses</p>
                <p className="text-2xl font-bold text-red-400">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Receipt className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Entries</p>
                <p className="text-2xl font-bold text-blue-400">{expenses?.pagination.total || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Recurring Monthly</p>
                <p className="text-2xl font-bold text-purple-400">
                  {formatCurrency(analysis?.recurring.monthly || 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-500/20 rounded-lg">
                <FolderOpen className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Categories</p>
                <p className="text-2xl font-bold text-cyan-400">{categories?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Expense by Category */}
        {analysis && analysis.byCategory.length > 0 && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 mb-6 overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-cyan-400" />
                Expenses by Category
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Budgeted</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actual</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Variance</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">% Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {analysis.byCategory.map((cat) => (
                    <tr key={cat.categoryId} className="hover:bg-slate-700/50">
                      <td className="px-4 py-3 font-medium text-white">{cat.category}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(cat.budgeted)}</td>
                      <td className="px-4 py-3 text-right text-red-400">{formatCurrency(cat.actual)}</td>
                      <td className={cn(
                        "px-4 py-3 text-right font-medium",
                        cat.variance <= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {formatCurrency(cat.variance)}
                      </td>
                      <td className={cn(
                        "px-4 py-3 text-right font-medium",
                        cat.variancePercent <= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {cat.variancePercent > 0 ? '+' : ''}{formatPercent(cat.variancePercent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Expense Entries Table */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-400" />
              Expense Entries
            </h3>
            <button
              onClick={() => refetchExpenses()}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Vendor</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Recurring</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {expenses?.data.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-700/50">
                    <td className="px-4 py-3 text-slate-300">
                      {format(new Date(expense.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">
                      {expense.category?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {expense.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {expense.vendor || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-red-400">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {expense.isRecurring ? (
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                          {expense.recurringPeriod}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => deleteExpenseMutation.mutate(expense.id)}
                          className="p-1.5 text-red-400 hover:bg-red-500/20 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!expenses || expenses.data.length === 0) && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No expenses found for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Expense Modal */}
        {categories && (
          <AddExpenseModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            categories={categories}
            onSubmit={(data) => createExpenseMutation.mutate(data)}
          />
        )}
      </div>
    </div>
  );
}
