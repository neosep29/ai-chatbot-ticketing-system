import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { Search, Plus, Edit, Trash2, Eye, EyeOff, Check, X } from 'lucide-react';

interface Inquiry {
  _id: string;
  promptQuestion: string;
  promptResponse: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface InquiryFormData {
  promptQuestion: string;
  promptResponse: string;
  isEnabled: boolean;
}

const InquiryManagement: React.FC = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [filteredInquiries, setFilteredInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [formData, setFormData] = useState<InquiryFormData>({
    promptQuestion: '',
    promptResponse: '',
    isEnabled: true
  });
  const [formLoading, setFormLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { token } = useAuth();

  useEffect(() => {
    fetchInquiries();
  }, [currentPage]);

  useEffect(() => {
    let filtered = inquiries;
    
    if (searchTerm) {
      filtered = filtered.filter(inquiry =>
        inquiry.promptQuestion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inquiry.promptResponse.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter === 'enabled') {
      filtered = filtered.filter(inquiry => inquiry.isEnabled);
    } else if (statusFilter === 'disabled') {
      filtered = filtered.filter(inquiry => !inquiry.isEnabled);
    }
    
    setFilteredInquiries(filtered);
  }, [inquiries, searchTerm, statusFilter]);

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/inquiry?page=${currentPage}&limit=10&status=${statusFilter === 'all' ? 'all' : statusFilter === 'enabled' ? 'enabled' : 'disabled'}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInquiries(response.data.data);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching inquiries:', error);
      alert('Failed to fetch inquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setFormLoading(true);
      await axios.post(`${API_BASE_URL}/api/inquiry`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowCreateModal(false);
      setFormData({ promptQuestion: '', promptResponse: '', isEnabled: true });
      fetchInquiries();
    } catch (error: any) {
      console.error('Error creating inquiry:', error);
      alert(error?.response?.data?.message || 'Failed to create inquiry');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedInquiry) return;
    
    try {
      setFormLoading(true);
      await axios.put(`${API_BASE_URL}/api/inquiry/${selectedInquiry._id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowEditModal(false);
      setSelectedInquiry(null);
      setFormData({ promptQuestion: '', promptResponse: '', isEnabled: true });
      fetchInquiries();
    } catch (error: any) {
      console.error('Error updating inquiry:', error);
      alert(error?.response?.data?.message || 'Failed to update inquiry');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedInquiry) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/api/inquiry/${selectedInquiry._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowDeleteModal(false);
      setSelectedInquiry(null);
      fetchInquiries();
    } catch (error: any) {
      console.error('Error deleting inquiry:', error);
      alert(error?.response?.data?.message || 'Failed to delete inquiry');
    }
  };

  const openEditModal = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setFormData({
      promptQuestion: inquiry.promptQuestion,
      promptResponse: inquiry.promptResponse,
      isEnabled: inquiry.isEnabled
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setShowDeleteModal(true);
  };

  const toggleInquiryStatus = async (inquiry: Inquiry) => {
    try {
      await axios.put(`${API_BASE_URL}/api/inquiry/${inquiry._id}`, {
        promptQuestion: inquiry.promptQuestion,
        promptResponse: inquiry.promptResponse,
        isEnabled: !inquiry.isEnabled
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchInquiries();
    } catch (error) {
      console.error('Error toggling inquiry status:', error);
      alert('Failed to update inquiry status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Inquiry Management</h1>
        <p className="text-gray-600">Manage AI training inquiries and responses</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search inquiries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Inquiry
            </button>
          </div>
        </div>
      </div>

      {/* Inquiries List */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInquiries.map((inquiry) => (
                    <tr key={inquiry._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={inquiry.promptQuestion}>
                          {inquiry.promptQuestion}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-xs truncate" title={inquiry.promptResponse}>
                          {inquiry.promptResponse}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          inquiry.isEnabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {inquiry.isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(inquiry.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleInquiryStatus(inquiry)}
                            className={`p-1 rounded ${
                              inquiry.isEnabled
                                ? 'text-green-600 hover:text-green-900'
                                : 'text-red-600 hover:text-red-900'
                            }`}
                            title={inquiry.isEnabled ? 'Disable' : 'Enable'}
                          >
                            {inquiry.isEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => openEditModal(inquiry)}
                            className="p-1 text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(inquiry)}
                            className="p-1 text-red-600 hover:text-red-900"
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {filteredInquiries.length} of {inquiries.length} inquiries
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Inquiry</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                <textarea
                  value={formData.promptQuestion}
                  onChange={(e) => setFormData({ ...formData, promptQuestion: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter the inquiry question..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Response</label>
                <textarea
                  value={formData.promptResponse}
                  onChange={(e) => setFormData({ ...formData, promptResponse: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter the AI response..."
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isEnabled"
                  checked={formData.isEnabled}
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isEnabled" className="ml-2 block text-sm text-gray-700">
                  Enable this inquiry
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={formLoading || !formData.promptQuestion.trim() || !formData.promptResponse.trim()}
                className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {formLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedInquiry && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Inquiry</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                <textarea
                  value={formData.promptQuestion}
                  onChange={(e) => setFormData({ ...formData, promptQuestion: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Response</label>
                <textarea
                  value={formData.promptResponse}
                  onChange={(e) => setFormData({ ...formData, promptResponse: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editIsEnabled"
                  checked={formData.isEnabled}
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="editIsEnabled" className="ml-2 block text-sm text-gray-700">
                  Enable this inquiry
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={formLoading || !formData.promptQuestion.trim() || !formData.promptResponse.trim()}
                className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {formLoading ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedInquiry && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Delete Inquiry</h3>
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this inquiry? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 mb-4">
              <p className="text-sm text-gray-700">
                <strong>Question:</strong> {selectedInquiry.promptQuestion}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InquiryManagement;
