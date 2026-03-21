import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import { useAuth } from '../../context/AuthContext';

interface SystemStats {
  tickets: { total: number };
  chats: { total: number };
  staff: { total: number; withRatings: number };
  inquiryRelevance: { total: number };
  inquiries: { total: number };
}

interface ResetPreview {
  willBeDeleted: {
    tickets: number;
    chats: number;
    staffRatings: number;
  };
  willBePreserved: {
    inquiryRelevanceEvaluations: number;
    gptMetrics: string;
    staffAccounts: number;
    systemConfig: string;
  };
}

const BetaReset: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [preview, setPreview] = useState<ResetPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    fetchStats();
    fetchPreview();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/beta-reset/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      alert('Failed to fetch system statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/beta-reset/preview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreview(response.data.data);
    } catch (error) {
      console.error('Error fetching preview:', error);
      alert('Failed to fetch reset preview');
    }
  };

  const performReset = async () => {
    if (!window.confirm(
      '⚠️ WARNING: This will permanently delete:\n\n' +
      '• All user tickets\n' +
      '• All user chats\n' +
      '• All staff ratings\n\n' +
      'This action CANNOT be undone. Are you sure you want to continue?'
    )) {
      return;
    }

    if (!window.confirm(
      '🚨 FINAL WARNING:\n\n' +
      'This is your last chance to cancel.\n' +
      'All beta data will be permanently erased.\n\n' +
      'Click OK to proceed with the reset.'
    )) {
      return;
    }

    try {
      setResetLoading(true);
      const response = await axios.post(`${API_BASE_URL}/api/beta-reset/reset`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Beta reset completed successfully!');
      console.log('Reset results:', response.data);
      
      // Refresh stats and preview
      await fetchStats();
      await fetchPreview();
    } catch (error: any) {
      console.error('Error performing reset:', error);
      alert(error?.response?.data?.message || 'Failed to perform beta reset');
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Beta Reset</h1>
        <p className="text-gray-600">
          Reset the system for beta testing. This will clear all user data while preserving training metrics.
        </p>
      </div>

      {/* Current Statistics */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Current System Statistics</h2>
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-600 uppercase mb-1">Tickets</h3>
              <p className="text-2xl font-bold text-blue-700">{stats.tickets.total}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-600 uppercase mb-1">Chats</h3>
              <p className="text-2xl font-bold text-green-700">{stats.chats.total}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-600 uppercase mb-1">Staff with Ratings</h3>
              <p className="text-2xl font-bold text-purple-700">{stats.staff.withRatings}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-orange-600 uppercase mb-1">Inquiry Evaluations</h3>
              <p className="text-2xl font-bold text-orange-700">{stats.inquiryRelevance.total}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-emerald-600 uppercase mb-1">Total Staff</h3>
              <p className="text-2xl font-bold text-emerald-700">{stats.staff.total}</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-indigo-600 uppercase mb-1">Training Inquiries</h3>
              <p className="text-2xl font-bold text-indigo-700">{stats.inquiries.total}</p>
            </div>
          </div>
        )}
      </div>

      {/* Reset Preview */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Reset Preview</h2>
        {preview && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-red-600 mb-3">🗑️ Will Be Deleted</h3>
              <div className="space-y-2">
                <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-red-700">Tickets</span>
                  <span className="font-bold text-red-800">{preview.willBeDeleted.tickets}</span>
                </div>
                <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-red-700">Chats</span>
                  <span className="font-bold text-red-800">{preview.willBeDeleted.chats}</span>
                </div>
                <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-red-700">Staff Ratings</span>
                  <span className="font-bold text-red-800">{preview.willBeDeleted.staffRatings}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-green-600 mb-3">✅ Will Be Preserved</h3>
              <div className="space-y-2">
                <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-green-700">Inquiry Evaluations</span>
                  <span className="font-bold text-green-800">{preview.willBePreserved.inquiryRelevanceEvaluations}</span>
                </div>
                <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-green-700">GPT-4 Metrics</span>
                  <span className="font-bold text-green-800">{preview.willBePreserved.gptMetrics}</span>
                </div>
                <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-green-700">Staff Accounts</span>
                  <span className="font-bold text-green-800">{preview.willBePreserved.staffAccounts}</span>
                </div>
                <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-green-700">System Config</span>
                  <span className="font-bold text-green-800">{preview.willBePreserved.systemConfig}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reset Button */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-red-800">⚠️ Perform Beta Reset</h3>
            <p className="text-red-600 mt-1">
              This action will permanently delete all user data. Make sure you have backups if needed.
            </p>
          </div>
          <button
            onClick={performReset}
            disabled={resetLoading}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {resetLoading ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Resetting...
              </span>
            ) : (
              'Reset System'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BetaReset;
