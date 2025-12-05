'use client'

import { useState, useEffect } from 'react'
import { organizationUsersApi, clientsApi } from '@/services/api'
import { OrganizationUser, UserRole, Client } from '@/types'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DataTable, { Column } from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import { Plus, Pencil, Trash2, Key, Crown, Users } from 'lucide-react'

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'company_admin', label: 'Company Admin' },
  { value: 'scheduler', label: 'Scheduler' },
  { value: 'finance', label: 'Finance' },
  { value: 'guard', label: 'Guard' },
]

export default function UsersPage() {
  const [users, setUsers] = useState<OrganizationUser[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditClientsModal, setShowEditClientsModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<OrganizationUser | null>(null)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: '',
    role: 'scheduler' as UserRole,
    managed_client_ids: [] as number[],
    send_email: true,
  })
  const [editClientIds, setEditClientIds] = useState<number[]>([])
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  // Helper to extract error message from various error formats
  const extractErrorMessage = (err: any): string => {
    const detail = err.response?.data?.detail
    if (!detail) {
      return err.message || 'An unexpected error occurred'
    }
    // FastAPI validation errors return detail as an array of objects
    if (Array.isArray(detail)) {
      return detail.map((e: any) => e.msg || String(e)).join(', ')
    }
    // Standard string detail
    if (typeof detail === 'string') {
      return detail
    }
    // Object with message property
    if (detail.message) {
      return detail.message
    }
    // Fallback to JSON string
    return JSON.stringify(detail)
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [usersRes, clientsRes] = await Promise.all([
        organizationUsersApi.getAll(),
        clientsApi.getAll(),
      ])
      setUsers(usersRes.data)
      setClients(clientsRes.data)
      setError(null)
    } catch (err: any) {
      console.error('[UsersPage] Fetch error:', err.response?.data || err)
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async () => {
    try {
      setActionLoading(true)
      const response = await organizationUsersApi.invite(inviteForm)
      if (response.data.temporary_password) {
        setTempPassword(response.data.temporary_password)
      }
      fetchData()
      if (!response.data.temporary_password) {
        setShowInviteModal(false)
        resetInviteForm()
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to invite user')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemove = async (userId: number) => {
    if (!confirm('Are you sure you want to remove this user from the organization?')) return
    try {
      await organizationUsersApi.remove(userId)
      fetchData()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to remove user')
    }
  }

  const handleResetPassword = async (userId: number) => {
    if (!confirm('Are you sure you want to reset this user\'s password?')) return
    try {
      const response = await organizationUsersApi.resetPassword(userId)
      alert(`Password reset successful!\n\nNew temporary password: ${response.data.temporary_password}\n\nPlease share this with the user.`)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to reset password')
    }
  }

  const handleUpdateRole = async (userId: number, newRole: string) => {
    try {
      await organizationUsersApi.updateRole(userId, newRole)
      fetchData()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update role')
    }
  }

  const handleToggleOwner = async (userId: number, currentStatus: boolean) => {
    const action = currentStatus ? 'remove ownership from' : 'grant ownership to'
    if (!confirm(`Are you sure you want to ${action} this user?`)) return
    try {
      await organizationUsersApi.updateOwnerStatus(userId, !currentStatus)
      fetchData()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update owner status')
    }
  }

  const openEditClients = (user: OrganizationUser) => {
    setSelectedUser(user)
    setEditClientIds(user.managed_client_ids || [])
    setShowEditClientsModal(true)
  }

  const handleSaveClients = async () => {
    if (!selectedUser) return
    try {
      setActionLoading(true)
      await organizationUsersApi.updateClients(selectedUser.user_id, editClientIds)
      fetchData()
      setShowEditClientsModal(false)
      setSelectedUser(null)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update client assignments')
    } finally {
      setActionLoading(false)
    }
  }

  const resetInviteForm = () => {
    setInviteForm({
      email: '',
      full_name: '',
      role: 'scheduler',
      managed_client_ids: [],
      send_email: true,
    })
    setTempPassword(null)
  }

  const closeInviteModal = () => {
    setShowInviteModal(false)
    resetInviteForm()
  }

  const toggleClientSelection = (clientId: number, targetArray: number[], setArray: (ids: number[]) => void) => {
    if (targetArray.includes(clientId)) {
      setArray(targetArray.filter(id => id !== clientId))
    } else {
      setArray([...targetArray, clientId])
    }
  }

  const columns: Column<OrganizationUser>[] = [
    {
      header: 'User',
      cell: (user) => (
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            user.is_owner
              ? 'bg-gradient-to-br from-amber-500 to-orange-600'
              : 'bg-gradient-to-br from-blue-500 to-indigo-600'
          }`}>
            <span className="text-white font-bold text-sm">
              {user.full_name?.substring(0, 2).toUpperCase() || user.username.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
              {user.full_name || user.username}
              {user.is_owner && (
                <Crown className="w-4 h-4 text-amber-500" title="Organization Owner" />
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      cell: (user) => (
        <select
          value={user.role}
          onChange={(e) => handleUpdateRole(user.user_id, e.target.value)}
          className="px-2 py-1 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
        >
          {ROLE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ),
    },
    {
      header: 'Client Access',
      cell: (user) => (
        <div className="flex items-center gap-2">
          {user.is_owner ? (
            <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">All Clients</span>
          ) : user.managed_client_ids && user.managed_client_ids.length > 0 ? (
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {user.managed_client_ids.length} client(s)
            </span>
          ) : (
            <span className="text-sm text-red-500">No clients assigned</span>
          )}
          {!user.is_owner && (
            <button
              onClick={() => openEditClients(user)}
              className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
              title="Edit client access"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (user) => (
        <span className={`px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full ${
          user.is_active
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {user.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (user) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleToggleOwner(user.user_id, user.is_owner)}
            className={`p-2 rounded-lg transition-colors ${
              user.is_owner
                ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                : 'text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
            title={user.is_owner ? 'Remove ownership' : 'Grant ownership'}
          >
            <Crown className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleResetPassword(user.user_id)}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
            title="Reset password"
          >
            <Key className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleRemove(user.user_id)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Remove user"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Manage users and their access to your organization
            </p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-5 h-5" />
            Invite User
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
          <DataTable
            data={users}
            columns={columns}
            loading={loading}
            emptyMessage="No users found. Invite your first team member!"
          />
        </div>
      </div>

      {/* Invite User Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={closeInviteModal}
        title="Invite User"
        maxWidth="lg"
      >
        {tempPassword ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <p className="text-green-700 dark:text-green-400 font-medium">User invited successfully!</p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
                Please share these credentials with the user:
              </p>
              <div className="font-mono text-sm bg-white dark:bg-slate-800 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                <p><strong>Email:</strong> {inviteForm.email}</p>
                <p><strong>Temporary Password:</strong> {tempPassword}</p>
              </div>
            </div>
            <button
              onClick={closeInviteModal}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={inviteForm.full_name}
                onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Role *
              </label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as UserRole })}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Assign to Clients
              </label>
              <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-2 space-y-1">
                {clients.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 p-2">No clients available</p>
                ) : (
                  clients.map(client => (
                    <label key={client.client_id} className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inviteForm.managed_client_ids.includes(client.client_id)}
                        onChange={() => toggleClientSelection(
                          client.client_id,
                          inviteForm.managed_client_ids,
                          (ids) => setInviteForm({ ...inviteForm, managed_client_ids: ids })
                        )}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{client.client_name}</span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Leave empty for no client access, or assign specific clients.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="send_email"
                checked={inviteForm.send_email}
                onChange={(e) => setInviteForm({ ...inviteForm, send_email: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="send_email" className="text-sm text-slate-700 dark:text-slate-300">
                Send invitation email with login credentials
              </label>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={closeInviteModal}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteForm.email || !inviteForm.full_name || actionLoading}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-xl font-medium transition-colors"
              >
                {actionLoading ? 'Inviting...' : 'Invite User'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Client Access Modal */}
      <Modal
        isOpen={showEditClientsModal}
        onClose={() => setShowEditClientsModal(false)}
        title={`Edit Client Access - ${selectedUser?.full_name || selectedUser?.username}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-2 space-y-1">
            {clients.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 p-2">No clients available</p>
            ) : (
              clients.map(client => (
                <label key={client.client_id} className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editClientIds.includes(client.client_id)}
                    onChange={() => toggleClientSelection(client.client_id, editClientIds, setEditClientIds)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{client.client_name}</span>
                </label>
              ))
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Selected clients: {editClientIds.length === 0 ? 'None (no access)' : editClientIds.length}
          </p>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowEditClientsModal(false)}
              className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveClients}
              disabled={actionLoading}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-xl font-medium transition-colors"
            >
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
