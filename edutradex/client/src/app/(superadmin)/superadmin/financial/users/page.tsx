'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Users,
  UserCheck,
  UserX,
  UserCog,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { api, UserType, UserWithType } from '@/lib/api';
import { cn } from '@/lib/utils';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    if (typeof err.message === 'string') return err.message;
    if (typeof err.error === 'string') return err.error;
    if (err.response && typeof err.response === 'object') {
      const response = err.response as Record<string, unknown>;
      if (response.data && typeof response.data === 'object') {
        const data = response.data as Record<string, unknown>;
        if (typeof data.message === 'string') return data.message;
        if (typeof data.error === 'string') return data.error;
      }
    }
  }
  return 'An unexpected error occurred';
}

const USER_TYPES: { value: UserType; label: string; description: string; color: string }[] = [
  { value: 'REAL', label: 'Real Users', description: 'Actual customers - included in financial reports', color: 'green' },
  { value: 'TEST', label: 'Test Users', description: 'Internal testing accounts - excluded from financials', color: 'amber' },
  { value: 'DEMO_ONLY', label: 'Demo Only', description: 'Users who never deposited real money', color: 'blue' },
  { value: 'AFFILIATE_TEST', label: 'Affiliate Test', description: 'Affiliate testing accounts - excluded from financials', color: 'purple' },
];

export default function UserTypeManagementPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<UserType>('REAL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showAutoClassifyModal, setShowAutoClassifyModal] = useState(false);
  const [targetUser, setTargetUser] = useState<UserWithType | null>(null);
  const [newUserType, setNewUserType] = useState<UserType>('REAL');
  const [adminPassword, setAdminPassword] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Fetch users by type
  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['users-by-type', activeTab, page, search],
    queryFn: () => api.getUsersByType(activeTab, { page, limit: 20, search: search || undefined }),
  });

  // Preview demo-only classification
  const { data: demoPreview, isLoading: previewLoading, refetch: refetchPreview } = useQuery({
    queryKey: ['demo-only-preview'],
    queryFn: () => api.previewDemoOnlyClassification(),
    enabled: showAutoClassifyModal,
  });

  // Update single user type mutation
  const updateTypeMutation = useMutation({
    mutationFn: ({ userId, userType, password }: { userId: string; userType: UserType; password: string }) =>
      api.updateUserType(userId, userType, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-by-type'] });
      setShowChangeModal(false);
      setTargetUser(null);
      setAdminPassword('');
      setMutationError(null);
      toast.success(`User type updated successfully to ${newUserType}`);
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setMutationError(message);
      toast.error(message);
    },
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: ({ userIds, userType, password }: { userIds: string[]; userType: UserType; password: string }) =>
      api.bulkUpdateUserTypes(userIds, userType, password),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users-by-type'] });
      setShowBulkModal(false);
      setSelectedUsers(new Set());
      setAdminPassword('');
      setMutationError(null);
      toast.success(`Successfully updated ${selectedUsers.size} user(s) to ${newUserType}`);
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setMutationError(message);
      toast.error(message);
    },
  });

  // Auto-classify demo-only users mutation
  const autoClassifyMutation = useMutation({
    mutationFn: (password: string) => api.autoClassifyDemoOnlyUsers(password),
    onSuccess: (data: { success: boolean; classified: number; message: string }) => {
      queryClient.invalidateQueries({ queryKey: ['users-by-type'] });
      queryClient.invalidateQueries({ queryKey: ['demo-only-preview'] });
      setShowAutoClassifyModal(false);
      setAdminPassword('');
      setMutationError(null);
      toast.success(data.message);
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setMutationError(message);
      toast.error(message);
    },
  });

  const users = usersData?.data || [];
  const pagination = usersData?.pagination;

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  const handleChangeType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser || !adminPassword) return;
    setMutationError(null);
    updateTypeMutation.mutate({
      userId: targetUser.id,
      userType: newUserType,
      password: adminPassword,
    });
  };

  const handleBulkChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsers.size === 0 || !adminPassword) return;
    setMutationError(null);
    bulkUpdateMutation.mutate({
      userIds: Array.from(selectedUsers),
      userType: newUserType,
      password: adminPassword,
    });
  };

  const openChangeModal = (user: UserWithType) => {
    setTargetUser(user);
    setNewUserType(user.userType === 'REAL' ? 'TEST' : 'REAL');
    setShowChangeModal(true);
    setMutationError(null);
    setAdminPassword('');
  };

  const closeChangeModal = () => {
    setShowChangeModal(false);
    setTargetUser(null);
    setAdminPassword('');
    setMutationError(null);
  };

  const openBulkModal = () => {
    setShowBulkModal(true);
    setMutationError(null);
    setAdminPassword('');
  };

  const closeBulkModal = () => {
    setShowBulkModal(false);
    setAdminPassword('');
    setMutationError(null);
  };

  const openAutoClassifyModal = () => {
    setShowAutoClassifyModal(true);
    setMutationError(null);
    setAdminPassword('');
    refetchPreview();
  };

  const closeAutoClassifyModal = () => {
    setShowAutoClassifyModal(false);
    setAdminPassword('');
    setMutationError(null);
  };

  const handleAutoClassify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) return;
    setMutationError(null);
    autoClassifyMutation.mutate(adminPassword);
  };

  const activeTypeConfig = USER_TYPES.find(t => t.value === activeTab)!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Type Management</h1>
          <p className="text-slate-400 mt-1">Segregate users for accurate financial reporting</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openAutoClassifyModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
          >
            <UserCog className="h-4 w-4" />
            Auto-Classify Demo Users
          </button>
          <button
            onClick={() => refetch()}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-400 font-medium">User Segregation for Financial Accuracy</p>
          <p className="text-blue-300/80 text-sm mt-1">
            Only users marked as "REAL" are included in financial P&L calculations.
            Test, Demo-Only, and Affiliate Test accounts are excluded to ensure accurate business metrics.
          </p>
        </div>
      </div>

      {/* Type Tabs */}
      <div className="flex flex-wrap gap-2">
        {USER_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => {
              setActiveTab(type.value);
              setPage(1);
              setSearch('');
              setSelectedUsers(new Set());
            }}
            className={cn(
              "px-4 py-2 rounded-lg transition-colors flex items-center gap-2",
              activeTab === type.value
                ? type.color === 'green' ? "bg-green-600 text-white"
                  : type.color === 'amber' ? "bg-amber-600 text-white"
                  : type.color === 'blue' ? "bg-blue-600 text-white"
                  : "bg-purple-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            )}
          >
            {type.value === 'REAL' ? <UserCheck className="h-4 w-4" /> :
             type.value === 'TEST' ? <UserCog className="h-4 w-4" /> :
             type.value === 'DEMO_ONLY' ? <Users className="h-4 w-4" /> :
             <UserX className="h-4 w-4" />}
            {type.label}
          </button>
        ))}
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder:text-slate-500"
            />
          </div>
          {selectedUsers.size > 0 && (
            <button
              onClick={openBulkModal}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
            >
              Change {selectedUsers.size} User{selectedUsers.size > 1 ? 's' : ''} Type
            </button>
          )}
        </div>
      </div>

      {/* Type Description */}
      <div className={cn(
        "rounded-lg p-4 border",
        activeTypeConfig.color === 'green' ? "bg-green-500/10 border-green-500/30"
          : activeTypeConfig.color === 'amber' ? "bg-amber-500/10 border-amber-500/30"
          : activeTypeConfig.color === 'blue' ? "bg-blue-500/10 border-blue-500/30"
          : "bg-purple-500/10 border-purple-500/30"
      )}>
        <p className={cn(
          "font-medium",
          activeTypeConfig.color === 'green' ? "text-green-400"
            : activeTypeConfig.color === 'amber' ? "text-amber-400"
            : activeTypeConfig.color === 'blue' ? "text-blue-400"
            : "text-purple-400"
        )}>
          {activeTypeConfig.label}
        </p>
        <p className={cn(
          "text-sm mt-1",
          activeTypeConfig.color === 'green' ? "text-green-300/80"
            : activeTypeConfig.color === 'amber' ? "text-amber-300/80"
            : activeTypeConfig.color === 'blue' ? "text-blue-300/80"
            : "text-purple-300/80"
        )}>
          {activeTypeConfig.description}
        </p>
      </div>

      {/* Users Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No users found in this category</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === users.length && users.length > 0}
                      onChange={handleSelectAll}
                      className="rounded bg-slate-600 border-slate-500 text-green-500 focus:ring-green-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="rounded bg-slate-600 border-slate-500 text-green-500 focus:ring-green-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-white font-medium">{user.name}</p>
                      <p className="text-slate-500 text-xs">{user.id.slice(0, 8)}...</p>
                    </td>
                    <td className="px-4 py-4 text-slate-300">{user.email}</td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded",
                        user.userType === 'REAL' ? "bg-green-500/20 text-green-400"
                          : user.userType === 'TEST' ? "bg-amber-500/20 text-amber-400"
                          : user.userType === 'DEMO_ONLY' ? "bg-blue-500/20 text-blue-400"
                          : "bg-purple-500/20 text-purple-400"
                      )}>
                        {user.userType}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-400 text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => openChangeModal(user)}
                        className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                      >
                        Change Type
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-slate-400 text-sm">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Change Type Modal */}
      {showChangeModal && targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-800 rounded-lg w-full max-w-md m-4 border border-slate-700">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Change User Type</h2>
              <p className="text-slate-400 text-sm mt-1">
                {targetUser.name} ({targetUser.email})
              </p>
            </div>
            <form onSubmit={handleChangeType} className="p-6 space-y-4">
              {/* Error Message */}
              {mutationError && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium text-sm">Error</p>
                    <p className="text-red-300 text-sm">{mutationError}</p>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-400 mb-2">New User Type</label>
                <select
                  value={newUserType}
                  onChange={(e) => setNewUserType(e.target.value as UserType)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  {USER_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Admin Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className={cn(
                    "w-full px-4 py-2 bg-slate-700 border rounded-lg text-white",
                    mutationError ? "border-red-500/50" : "border-slate-600"
                  )}
                  placeholder="Enter your password to confirm"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeChangeModal}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateTypeMutation.isPending}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {updateTypeMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Update Type
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Change Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-800 rounded-lg w-full max-w-md m-4 border border-slate-700">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Bulk Change User Types</h2>
              <p className="text-slate-400 text-sm mt-1">
                Changing type for {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''}
              </p>
            </div>
            <form onSubmit={handleBulkChange} className="p-6 space-y-4">
              {/* Error Message */}
              {mutationError && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium text-sm">Error</p>
                    <p className="text-red-300 text-sm">{mutationError}</p>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-400 mb-2">New User Type</label>
                <select
                  value={newUserType}
                  onChange={(e) => setNewUserType(e.target.value as UserType)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  {USER_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Admin Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className={cn(
                    "w-full px-4 py-2 bg-slate-700 border rounded-lg text-white",
                    mutationError ? "border-red-500/50" : "border-slate-600"
                  )}
                  placeholder="Enter your password to confirm"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeBulkModal}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkUpdateMutation.isPending}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {bulkUpdateMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Update All
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto-Classify Demo Users Modal */}
      {showAutoClassifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-800 rounded-lg w-full max-w-lg m-4 border border-slate-700">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Auto-Classify Demo-Only Users</h2>
              <p className="text-slate-400 text-sm mt-1">
                Automatically mark users as DEMO_ONLY if they have no deposits and no live trades
              </p>
            </div>
            <div className="p-6 space-y-4">
              {/* Preview Section */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-400 font-medium">Preview</p>
                {previewLoading ? (
                  <div className="flex items-center gap-2 mt-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
                    <span className="text-blue-300 text-sm">Scanning users...</span>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="text-blue-300 text-2xl font-bold">{demoPreview?.count || 0}</p>
                    <p className="text-blue-300/80 text-sm">user(s) will be classified as DEMO_ONLY</p>
                    {demoPreview && demoPreview.users.length > 0 && (
                      <div className="mt-3 max-h-32 overflow-y-auto">
                        <p className="text-blue-400 text-xs mb-1">Sample users (up to 100):</p>
                        <div className="space-y-1">
                          {demoPreview.users.slice(0, 10).map((user: { id: string; email: string; name: string }) => (
                            <div key={user.id} className="text-xs text-blue-300/70">
                              {user.name} - {user.email}
                            </div>
                          ))}
                          {demoPreview.count > 10 && (
                            <div className="text-xs text-blue-300/50">
                              ...and {demoPreview.count - 10} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Criteria Info */}
              <div className="bg-slate-700/30 rounded-lg p-4 text-sm">
                <p className="text-slate-300 font-medium mb-2">Classification Criteria:</p>
                <ul className="text-slate-400 space-y-1 list-disc list-inside">
                  <li>User is currently marked as REAL</li>
                  <li>User has ZERO approved deposits</li>
                  <li>User has ZERO live account trades</li>
                </ul>
              </div>

              {demoPreview && demoPreview.count > 0 && (
                <form onSubmit={handleAutoClassify} className="space-y-4">
                  {/* Error Message */}
                  {mutationError && (
                    <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-400 font-medium text-sm">Error</p>
                        <p className="text-red-300 text-sm">{mutationError}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Admin Password to Confirm</label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className={cn(
                        "w-full px-4 py-2 bg-slate-700 border rounded-lg text-white",
                        mutationError ? "border-red-500/50" : "border-slate-600"
                      )}
                      placeholder="Enter your password"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeAutoClassifyModal}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={autoClassifyMutation.isPending || !demoPreview?.count}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      {autoClassifyMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Classifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Classify {demoPreview?.count} User{(demoPreview?.count || 0) > 1 ? 's' : ''}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {demoPreview && demoPreview.count === 0 && (
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-2" />
                  <p className="text-green-400 font-medium">All users are properly classified!</p>
                  <p className="text-slate-400 text-sm mt-1">No demo-only users need to be reclassified.</p>
                  <button
                    type="button"
                    onClick={closeAutoClassifyModal}
                    className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
