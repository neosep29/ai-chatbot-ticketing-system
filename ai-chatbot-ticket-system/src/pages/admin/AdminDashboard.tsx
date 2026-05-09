import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, CheckCircle, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTicket } from '../../context/TicketContext';
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


interface MetricsResponse {
  status: string;
  message: string;
  details?: string;
  trace?: string;
  metrics: {
    accuracy: number;
    mean_confidence: number;
  };
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { tickets, getAllTickets, pagination, statusCounters } = useTicket();
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [staffTicketData, setStaffTicketData] = useState<any[]>([]);
  const [monthlyTicketData, setMonthlyTicketData] = useState<any[]>([]);
  const { token } = useAuth();

  useEffect(() => {
    getAllTickets(page, 10, activeFilter || undefined);
    getMetrics().then(setMetrics).catch(console.error);
  }, [page, activeFilter]);

  useEffect(() => {
    fetchStaffTicketData();
    fetchMonthlyTicketData();
  }, [tickets]);

  const getMetrics = async (): Promise<MetricsResponse> => {
    const response = await axios.get<MetricsResponse>(`${API_BASE_URL}/api/metrics`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  };

  const fetchStaffTicketData = async () => {
    try {
      // Debug: Log ticket structure
      console.log('Ticket sample:', tickets[0]);
      
      // Group tickets by assigned staff
      const staffCounts: { [key: string]: number } = {};
      tickets.forEach(ticket => {
        // Check different possible staff assignment fields
        let staffName = 'Unassigned';
        
        if (ticket.assignedTo) {
          if (typeof ticket.assignedTo === 'string') {
            staffName = ticket.assignedTo;
          } else if (ticket.assignedTo.name) {
            staffName = ticket.assignedTo.name;
          }
        } else if (ticket.staffName) {
          staffName = ticket.staffName;
        }
        
        if (staffName !== 'Unassigned') {
          staffCounts[staffName] = (staffCounts[staffName] || 0) + 1;
        }
      });
      
      const data = Object.entries(staffCounts).map(([name, count]) => ({
        name,
        value: count
      }));
      
      console.log('Staff data:', data);
      setStaffTicketData(data);
    } catch (error) {
      console.error('Error fetching staff ticket data:', error);
    }
  };

  const fetchMonthlyTicketData = async () => {
    try {
      // Group tickets by month and status
      const monthlyData: { [key: string]: { total: number; resolved: number } } = {};
      const currentYear = new Date().getFullYear();
      
      tickets.forEach(ticket => {
        const date = new Date(ticket.createdAt);
        if (date.getFullYear() === currentYear) {
          const month = date.toLocaleString('default', { month: 'short' });
          if (!monthlyData[month]) {
            monthlyData[month] = { total: 0, resolved: 0 };
          }
          monthlyData[month].total++;
          if (ticket.status === 'resolved' || ticket.status === 'closed') {
            monthlyData[month].resolved++;
          }
        }
      });
      
      const data = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        total: data.total,
        resolved: data.resolved
      }));
      
      setMonthlyTicketData(data);
    } catch (error) {
      console.error('Error fetching monthly ticket data:', error);
    }
  };

  const getTicketStatusCount = (status: string) => {
    if (!statusCounters) {
      if (status === 'resolved') {
        return tickets.filter(t => t.status === 'resolved').length + tickets.filter(t => t.status === 'closed').length;
      }
      return tickets.filter(ticket => ticket.status === status).length;
    }
    if (status === 'pending') return statusCounters.pending;
    if (status === 'in-progress') return statusCounters.inProgress;
    if (status === 'resolved') return (statusCounters.resolved || 0) + (statusCounters.closed || 0);
    if (status === 'closed') return statusCounters.closed;
    return tickets.filter(ticket => ticket.status === status).length;
  };

  const handleFilterClick = (filter: string | null) => {
    setActiveFilter(filter);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      setPage(newPage);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-bold text-gray-900 mb-2"
        >
          Admin Dashboard
        </motion.h1>
        <p className="text-gray-600">
          Manage support tickets, monitor staff performance, and evaluate AI model metrics from this centralized dashboard.
        </p>
      </div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Chatbot Performance Metrics</h2>
        
        {metrics?.status === 'warning' && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Insufficient Data</p>
              <p className="text-sm text-yellow-700">{metrics.message}. Try interacting with the chatbot to generate more evaluation logs.</p>
            </div>
          </div>
        )}

        {metrics?.status === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Metrics Error</p>
              <p className="text-sm text-red-700">{metrics.message}. Please check if the Python service is running on the server.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 mb-6">
          {[
            {
              label: 'Confidence', value: `${metrics?.metrics.mean_confidence || 0}%`, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', icon: (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              )
            },
            {
              label: 'Accuracy', value: `${metrics?.metrics.accuracy || 0}%`, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )
            },
            {
              label: 'Escalation Rate', value: `${((tickets.length / Math.max(tickets.length + 150, 1)) * 100).toFixed(1)}%`, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8L13 15m5 0v6m-3-6v6m-4-6v4m-2-4v4" /></svg>
              )
            },
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className={`${metric.bg} border ${metric.border} rounded-lg p-4`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`${metric.color}`}>{metric.icon}</span>
                <span className={`text-xs font-semibold ${metric.color} bg-white px-2 py-0.5 rounded-full shadow-sm`}>{metric.value}</span>
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{metric.label}</p>
              <div className="mt-2 w-full bg-white rounded-full h-1.5 shadow-inner">
                <div
                  className={`h-1.5 rounded-full ${metric.label === 'Confidence' ? 'bg-purple-500' :
                    metric.label === 'Accuracy' ? 'bg-blue-500' :
                      metric.label === 'Escalation Rate' ? 'bg-amber-500' :
                        'bg-rose-500'
                    }`}
                  style={{ width: metric.value }}
                />
              </div>
            </motion.div>
          ))}
        </div>
        <div className="flex justify-center mt-6 gap-4">
          <button onClick={() => navigate('/admin/beta-reset')} className="px-4 py-2 rounded-md bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition">
            Beta Reset
          </button>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Pie Chart - Tickets per Staff */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white border border-gray-200 rounded-lg p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tickets per Staff</h3>
            {staffTicketData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={staffTicketData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {staffTicketData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No ticket data available
              </div>
            )}
          </motion.div>

          {/* Bar Chart - Tickets Resolved per Month */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white border border-gray-200 rounded-lg p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tickets Resolved per Month</h3>
            {monthlyTicketData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyTicketData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#3b82f6" name="Total Tickets" />
                  <Bar dataKey="resolved" fill="#10b981" name="Resolved Tickets" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No monthly data available
              </div>
            )}
          </motion.div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white border border-gray-200 rounded-lg p-5"
          >
            <div className="flex items-center">
              <div className="mr-4">
                <Ticket className="h-8 w-8 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Tickets</p>
                <p className="text-2xl font-bold text-gray-900">{statusCounters?.total ?? pagination.total}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            onClick={() => handleFilterClick('pending')}
            className={`bg-white border rounded-lg p-5 cursor-pointer transition-colors ${activeFilter === 'pending' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:bg-yellow-50'
              }`}
          >
            <div className="flex items-center">
              <div className="mr-4">
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{getTicketStatusCount('pending')}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            onClick={() => handleFilterClick('in-progress')}
            className={`bg-white border rounded-lg p-5 cursor-pointer transition-colors ${activeFilter === 'in-progress' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-blue-50'
              }`}
          >
            <div className="flex items-center">
              <div className="mr-4">
                <ArrowRight className="h-8 w-8 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{getTicketStatusCount('in-progress')}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            onClick={() => handleFilterClick('resolved')}
            className={`bg-white border rounded-lg p-5 cursor-pointer transition-colors ${activeFilter === 'resolved' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-green-50'
              }`}
          >
            <div className="flex items-center">
              <div className="mr-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Resolved</p>
                <p className="text-2xl font-bold text-gray-900">{getTicketStatusCount('resolved')}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Tickets */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Support Tickets</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleFilterClick(null)}
              className={`px-3 py-1 text-sm rounded-md ${activeFilter === null
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              All
            </button>
            {activeFilter && (
              <button
                onClick={() => handleFilterClick(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th> */}
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th> */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                    No tickets found
                  </td>
                </tr>
              ) : (
                tickets.map((ticket, index) => (
                  <motion.tr
                    key={ticket._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {ticket.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {ticket.userId && typeof ticket.userId === 'object' ? ticket.userId.name : 'User'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {ticket.userId && typeof ticket.userId === 'object' ? ticket.userId.email : ''}
                      </div>
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                        {ticket.category}
                      </span>
                    </td> */}
                    {/* <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${ticket.priority === 'low' ? 'bg-green-100 text-green-800' :
                        ticket.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                          ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                        {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                      </span>
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        ticket.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                          ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                        {ticket.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                        {ticket.status === 'in-progress' && <ArrowRight className="h-3 w-3 mr-1" />}
                        {ticket.status === 'resolved' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {ticket.status === 'closed' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1).replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="space-x-2 flex justify-center">
                        <button
                          onClick={() => navigate(`/admin/tickets/${ticket._id}`)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                        >
                          View
                        </button>
                        {/* <button
                          onClick={() => navigate(`/admin/tickets/${ticket._id}`)}
                          className="flex items-center text-green-600 hover:text-green-900 p-1"
                        >
                          <BarChart4 className="h-4 w-4 mr-1" />
                          Classify
                        </button> */}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${page === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === pagination.pages}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${page === pagination.pages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(page - 1) * 10 + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(page * 10, pagination.total)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 ${page === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {[...Array(pagination.pages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => handlePageChange(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border ${page === i + 1
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        } text-sm font-medium`}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === pagination.pages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 ${page === pagination.pages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
