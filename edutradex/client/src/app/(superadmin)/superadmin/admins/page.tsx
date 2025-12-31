'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Search,
  Plus,
  MoreVertical,
  Shield,
  Crown,
  UserCheck,
  UserX,
  Key,
  Trash2,
  Loader2,
  X,
  Copy,
  Check,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, SuperAdminUser, PaginatedResponse, CreateAdminInput } from '@/lib/api';
import { cn } from '@/lib/utils';
import { PasswordConfirmModal } from '@/components/modals/PasswordConfirmModal';

type PendingAction = {
  type: 'create' | 'reset-password' | 'deactivate' | 'delete';
  admin?: SuperAdminUser;
  formData?: CreateAdminInput;
};

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<SuperAdminUser[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ADMIN' | 'SUPERADMIN' | ''>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<SuperAdminUser | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);

  // Password confirmation state
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateAdminInput>({ email: '', name: '' });
  const [formLoading, setFormLoading] = useState(false);

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const result: PaginatedResponse<SuperAdminUser> = await (api as any).getSuperAdminAdmins({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        role: roleFilter || undefined,
        isActive: statusFilter ? statusFilter === 'active' : undefined,
      });
      setAdmins(result.data);
      setPagination(prev => ({ ...prev, ...result.pagination }));
    } catch (error) {
      console.error('Failed to fetch admins:', error);
      toast.error('Failed to load admins');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Handle actions that require password confirmation
  const handleActionWithPassword = async (password: string) => {
    if (!pendingAction) return;

    try {
      switch (pendingAction.type) {
        case 'create':
          if (pendingAction.formData) {
            const result = await (api as any).createSuperAdminAdmin({
              ...pendingAction.formData,
              adminPassword: password,
            });
            toast.success('Admin created successfully');
            setShowCreateModal(false);

            if (result.tempPassword) {
              setTempPassword(result.tempPassword);
              setSelectedAdmin(result.admin);
              setShowPasswordModal(true);
            }

            setFormData({ email: '', name: '' });
            fetchAdmins();
          }
          break;

        case 'reset-password':
          if (pendingAction.admin) {
            const result = await (api as any).resetAdminPassword(pendingAction.admin.id, password);
            toast.success('Password reset successfully');
            setTempPassword(result.tempPassword);
            setSelectedAdmin(pendingAction.admin);
            setShowPasswordModal(true);
          }
          break;

        case 'deactivate':
          if (pendingAction.admin) {
            await (api as any).deactivateSuperAdminAdmin(pendingAction.admin.id, password);
            toast.success('Admin deactivated');
            fetchAdmins();
          }
          break;

        case 'delete':
          if (pendingAction.admin) {
            await (api as any).deleteSuperAdminAdmin(pendingAction.admin.id, password);
            toast.success('Admin deleted');
            setShowDeleteConfirmModal(false);
            fetchAdmins();
          }
          break;
      }

      setShowPasswordConfirm(false);
      setPendingAction(null);
      setOpenMenuId(null);
    } catch (error: any) {
      // Re-throw to let the modal handle the error
      throw error;
    }
  };

  const initiateCreateAdmin = () => {
    if (!formData.email || !formData.name) {
      toast.error('Email and name are required');
      return;
    }

    setPendingAction({ type: 'create', formData: { ...formData } });
    setShowPasswordConfirm(true);
  };

  const initiateResetPassword = (admin: SuperAdminUser) => {
    setPendingAction({ type: 'reset-password', admin });
    setShowPasswordConfirm(true);
    setOpenMenuId(null);
  };

  const initiateDeactivate = (admin: SuperAdminUser) => {
    setPendingAction({ type: 'deactivate', admin });
    setShowPasswordConfirm(true);
    setOpenMenuId(null);
  };

  const initiateDelete = (admin: SuperAdminUser) => {
    setSelectedAdmin(admin);
    setShowDeleteConfirmModal(true);
    setOpenMenuId(null);
  };

  const confirmDelete = () => {
    if (selectedAdmin) {
      setPendingAction({ type: 'delete', admin: selectedAdmin });
      setShowPasswordConfirm(true);
    }
  };

  const handleToggleStatus = async (admin: SuperAdminUser) => {
    if (admin.isActive) {
      // Deactivate requires password
      initiateDeactivate(admin);
    } else {
      // Activate doesn't require password
      try {
        await (api as any).activateSuperAdminAdmin(admin.id);
        toast.success('Admin activated');
        setOpenMenuId(null);
        fetchAdmins();
      } catch (error: any) {
        toast.error(error.message || 'Failed to activate');
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPasswordModalConfig = () => {
    if (!pendingAction) return { title: '', description: '' };

    switch (pendingAction.type) {
      case 'create':
        return {
          title: 'Confirm Admin Creation',
          description: `Creating a new admin account for ${pendingAction.formData?.name}. Enter your password to confirm.`,
          confirmText: 'Create Admin',
          confirmColor: 'amber' as const,
        };
      case 'reset-password':
        return {
          title: 'Confirm Password Reset',
          description: `Resetting password for ${pendingAction.admin?.name}. This will generate a new temporary password. Enter your password to confirm.`,
          confirmText: 'Reset Password',
          confirmColor: 'amber' as const,
        };
      case 'deactivate':
        return {
          title: 'Confirm Deactivation',
          description: `Deactivating admin ${pendingAction.admin?.name}. They will lose access to the admin panel. Enter your password to confirm.`,
          confirmText: 'Deactivate',
          confirmColor: 'red' as const,
        };
      case 'delete':
        return {
          title: 'Confirm Deletion',
          description: `Permanently deleting admin ${pendingAction.admin?.name}. This action cannot be undone. Enter your password to confirm.`,
          confirmText: 'Delete Admin',
          confirmColor: 'red' as const,
        };
      default:
        return { title: '', description: '' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-7 w-7 text-amber-500" />
            Admin Management
          </h1>
          <p className="text-slate-400 mt-1">Create and manage administrator accounts</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Admin
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as any)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPERADMIN">SuperAdmin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Admins Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            No admins found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Admin</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Role</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Last Login</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Logins</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'h-10 w-10 rounded-full flex items-center justify-center',
                          admin.role === 'SUPERADMIN' ? 'bg-amber-900/50' : 'bg-red-900/50'
                        )}>
                          {admin.role === 'SUPERADMIN' ? (
                            <Crown className="h-5 w-5 text-amber-400" />
                          ) : (
                            <Shield className="h-5 w-5 text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">{admin.name}</p>
                          <p className="text-slate-400 text-sm">{admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        'px-2 py-1 rounded text-xs font-medium',
                        admin.role === 'SUPERADMIN'
                          ? 'bg-amber-900/50 text-amber-400'
                          : 'bg-red-900/50 text-red-400'
                      )}>
                        {admin.role}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        'px-2 py-1 rounded text-xs font-medium inline-flex items-center gap-1',
                        admin.isActive
                          ? 'bg-emerald-900/50 text-emerald-400'
                          : 'bg-slate-700 text-slate-400'
                      )}>
                        {admin.isActive ? (
                          <>
                            <UserCheck className="h-3 w-3" /> Active
                          </>
                        ) : (
                          <>
                            <UserX className="h-3 w-3" /> Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-400 text-sm">
                      {admin.lastLoginAt
                        ? new Date(admin.lastLoginAt).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-4 py-4 text-slate-400 text-sm">
                      {admin.loginCount}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === admin.id ? null : admin.id)}
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <MoreVertical className="h-4 w-4 text-slate-400" />
                        </button>

                        {openMenuId === admin.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-slate-700 rounded-lg shadow-lg border border-slate-600 py-1 z-20">
                              <button
                                onClick={() => initiateResetPassword(admin)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-left text-white hover:bg-slate-600 transition-colors"
                              >
                                <Key className="h-4 w-4" />
                                <Lock className="h-3 w-3 text-amber-400" />
                                Reset Password
                              </button>
                              <button
                                onClick={() => handleToggleStatus(admin)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-left text-white hover:bg-slate-600 transition-colors"
                              >
                                {admin.isActive ? (
                                  <>
                                    <UserX className="h-4 w-4" />
                                    <Lock className="h-3 w-3 text-amber-400" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </button>
                              {!admin.isProtected && admin.role !== 'SUPERADMIN' && (
                                <button
                                  onClick={() => initiateDelete(admin)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-400 hover:bg-slate-600 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <Lock className="h-3 w-3 text-amber-400" />
                                  Delete
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 bg-slate-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 bg-slate-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Admin Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-2">Create New Admin</h2>
            <p className="text-sm text-slate-400 mb-6 flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-400" />
              Password confirmation required
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
                  placeholder="Admin Name"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Password (optional)</label>
                <input
                  type="password"
                  value={formData.password || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value || undefined }))}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
                  placeholder="Leave empty to auto-generate"
                />
                <p className="text-xs text-slate-500 mt-1">If empty, a secure password will be generated</p>
              </div>

              <button
                onClick={initiateCreateAdmin}
                disabled={formLoading}
                className="w-full py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Display Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowPasswordModal(false)} />
          <div className="relative bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-2">Temporary Password</h2>
            <p className="text-slate-400 text-sm mb-4">
              Save this password now. It will not be shown again.
            </p>

            {selectedAdmin && (
              <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
                <p className="text-slate-400 text-sm">Admin: {selectedAdmin.name}</p>
                <p className="text-slate-400 text-sm">Email: {selectedAdmin.email}</p>
              </div>
            )}

            <div className="flex items-center gap-2 p-3 bg-amber-900/20 border border-amber-900/50 rounded-lg">
              <code className="flex-1 text-amber-400 font-mono text-lg">{tempPassword}</code>
              <button
                onClick={copyToClipboard}
                className="p-2 hover:bg-amber-900/30 rounded transition-colors"
              >
                {copied ? (
                  <Check className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Copy className="h-5 w-5 text-amber-400" />
                )}
              </button>
            </div>

            <button
              onClick={() => {
                setShowPasswordModal(false);
                setTempPassword('');
                setSelectedAdmin(null);
              }}
              className="w-full mt-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (pre-password step) */}
      {showDeleteConfirmModal && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteConfirmModal(false)} />
          <div className="relative bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Delete Admin</h2>
            <p className="text-slate-400 mb-6">
              Are you sure you want to delete <span className="text-white font-medium">{selectedAdmin.name}</span>?
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setSelectedAdmin(null);
                }}
                className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <Lock className="h-4 w-4" />
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Confirmation Modal */}
      <PasswordConfirmModal
        isOpen={showPasswordConfirm}
        {...getPasswordModalConfig()}
        onConfirm={handleActionWithPassword}
        onCancel={() => {
          setShowPasswordConfirm(false);
          setPendingAction(null);
        }}
      />
    </div>
  );
}
