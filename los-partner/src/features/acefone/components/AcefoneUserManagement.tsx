import { useState, useEffect } from 'react';
import { FiEdit2, FiTrash2, FiPlus, FiLoader } from 'react-icons/fi';
import Dialog from '../../../common/dialog';
import { toast } from 'react-toastify';
import axios from 'axios';

interface User {
  id: number;
  name: string;
  number: string;
  email: string;
  login_id: string;
  status: boolean;
  role?: string;
}

interface CreateUserFormData {
  name: string;
  number: string;
  email: string;
  login_id: string;
  user_role: number;
  password: string;
  status: boolean;
  create_agent: boolean;
  create_web_login: boolean;
  caller_id: number[];
}

export function AcefoneUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [pagination, setPagination] = useState({ limit: 10, offset: 0, total: 0 });
  
  const [formData, setFormData] = useState<CreateUserFormData>({
    name: '',
    number: '',
    email: '',
    login_id: '',
    user_role: 2,
    password: '',
    status: true,
    create_agent: true,
    create_web_login: true,
    caller_id: [],
  });

  // Fetch users on mount and pagination change
  useEffect(() => {
    fetchUsers();
  }, [pagination.limit, pagination.offset]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/acefone/user', {
        params: {
          limit: pagination.limit,
          offset: pagination.offset,
        },
      });

      if (response.data.success) {
        setUsers(response.data.data?.users || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.data?.total || 0,
        }));
      } else {
        toast.error(response.data.message || 'Failed to fetch users');
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      // Validate required fields
      if (!formData.name || !formData.number || !formData.email || !formData.login_id) {
        toast.error('Please fill all required fields');
        return;
      }

      const response = await axios.post('/api/acefone/user', formData);

      if (response.data.success) {
        toast.success('User created successfully');
        setShowCreateDialog(false);
        resetForm();
        fetchUsers();
      } else {
        toast.error(response.data.message || 'Failed to create user');
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUserId) return;

    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        number: formData.number,
        status: formData.status,
      };

      const response = await axios.patch(
        `/api/acefone/user/${editingUserId}`,
        updateData
      );

      if (response.data.success) {
        toast.success('User updated successfully');
        setShowEditDialog(false);
        resetForm();
        fetchUsers();
      } else {
        toast.error(response.data.message || 'Failed to update user');
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await axios.delete(`/api/acefone/user/${userId}`);

      if (response.data.success) {
        toast.success('User deleted successfully');
        fetchUsers();
      } else {
        toast.error(response.data.message || 'Failed to delete user');
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleEditUser = (user: User) => {
    setFormData({
      name: user.name,
      number: user.number,
      email: user.email,
      login_id: user.login_id,
      user_role: 2,
      password: '',
      status: user.status,
      create_agent: true,
      create_web_login: true,
      caller_id: [],
    });
    setEditingUserId(user.id);
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      number: '',
      email: '',
      login_id: '',
      user_role: 2,
      password: '',
      status: true,
      create_agent: true,
      create_web_login: true,
      caller_id: [],
    });
    setEditingUserId(null);
  };

  const handleInputChange = (field: keyof CreateUserFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePreviousPage = () => {
    if (pagination.offset > 0) {
      setPagination(prev => ({
        ...prev,
        offset: Math.max(0, prev.offset - prev.limit),
      }));
    }
  };

  const handleNextPage = () => {
    if (pagination.offset + pagination.limit < pagination.total) {
      setPagination(prev => ({
        ...prev,
        offset: prev.offset + prev.limit,
      }));
    }
  };

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="w-full bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <button
          onClick={() => {
            resetForm();
            setShowCreateDialog(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors"
        >
          <FiPlus size={18} />
          Create User
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <FiLoader className="animate-spin text-blue-500" size={32} />
        </div>
      )}

      {/* Users Table */}
      {!loading && users.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Login ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{user.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.number}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.login_id}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.status
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm flex gap-2">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                      title="Edit user"
                    >
                      <FiEdit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete user"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && users.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <p className="text-gray-500">No users found</p>
        </div>
      )}

      {/* Pagination */}
      {!loading && users.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} users
          </p>
          <div className="flex gap-2">
            <button
              onClick={handlePreviousPage}
              disabled={pagination.offset === 0}
              className="px-4 py-2 bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 rounded-md hover:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={pagination.offset + pagination.limit >= pagination.total}
              className="px-4 py-2 bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 rounded-md hover:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create User Dialog */}
      {showCreateDialog && (
        <Dialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          title="Create New User"
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="User's full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={formData.number}
                  onChange={(e) => handleInputChange('number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10-digit phone number"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Login ID *</label>
                <input
                  type="text"
                  value={formData.login_id}
                  onChange={(e) => handleInputChange('login_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="unique username"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role ID *</label>
                <input
                  type="number"
                  value={formData.user_role}
                  onChange={(e) => handleInputChange('user_role', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2 for Agent"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.create_agent}
                  onChange={(e) => handleInputChange('create_agent', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Create as Agent</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.create_web_login}
                  onChange={(e) => handleInputChange('create_web_login', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Create Web Login</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleCreateUser}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors"
              >
                Create User
              </button>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Edit User Dialog */}
      {showEditDialog && (
        <Dialog
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          title="Edit User"
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.number}
                  onChange={(e) => handleInputChange('number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status ? 'active' : 'inactive'}
                  onChange={(e) => handleInputChange('status', e.target.value === 'active')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleUpdateUser}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors"
              >
                Update User
              </button>
              <button
                onClick={() => setShowEditDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
