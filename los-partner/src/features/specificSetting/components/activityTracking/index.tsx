import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../../../shared/services/axios';
import { Button } from '../../../../common/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../common/ui/card';

interface PartnerUser {
  id: string;
  email: string;
  name: string | null;
}

interface ActivitySession {
  id: string;
  sessionId: string;
  partnerUserId: string;
  startTime: string;
  endTime: string | null;
  totalEvents: number;
  inactiveTimeMs: number;
  pageViews: string[];
  userAgent: string;
  screenResolution: string;
  partnerUser: {
    id: string;
    email: string;
    name: string | null;
  };
  activityLogs: ActivityLog[];
}

interface ActivityLog {
  id: string;
  timestamp: string;
  eventType: string;
  pageUrl: string;
  mouseX: number | null;
  mouseY: number | null;
  scrollPos: number | null;
}

interface InactiveUser {
  id: string;
  partnerUserId: string;
  inactiveTimeSeconds: number;
  lastActivityTime: string;
  currentPage: string;
  alertSentAt: string;
  partnerUser: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface ActivityStats {
  summary: {
    totalSessions: number;
    totalEvents: number;
    totalActiveTimeMs: number;
    totalInactiveTimeMs: number;
    uniquePages: number;
    avgEventsPerSession: number;
    avgSessionDurationMs: number;
  };
  eventBreakdown: {
    mouse: number;
    scroll: number;
    keyboard: number;
    click: number;
  };
  topPages: string[];
}

export default function ActivityTrackingDashboard() {
  const { brandId } = useParams<{ brandId: string }>();
  const [activeTab, setActiveTab] = useState<'sessions' | 'inactive' | 'stats'>('stats');
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [inactiveUsers, setInactiveUsers] = useState<InactiveUser[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [partnerUsers, setPartnerUsers] = useState<PartnerUser[]>([]);
  
  // Helper function to convert date to IST (Indian Standard Time)
  const toISTDate = (date: Date) => {
    // IST is UTC+5:30
    const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
    const istDate = new Date(date.getTime() + istOffset);
    return istDate.toISOString().split('T')[0];
  };

  // Initialize with IST dates
  const [dateRange, setDateRange] = useState({
    startDate: toISTDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    endDate: toISTDate(new Date()),
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [totalPages, setTotalPages] = useState(1);

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'mouse':
        return 'bg-blue-100 text-blue-700';
      case 'scroll':
        return 'bg-purple-100 text-purple-700';
      case 'keyboard':
        return 'bg-green-100 text-green-700';
      case 'click':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Fetch partner users list on mount
  useEffect(() => {
    fetchPartnerUsers();
  }, []);

  const fetchPartnerUsers = async () => {
    if (!brandId) {
      console.error('Brand ID is required');
      return;
    }
    
    setLoadingUsers(true);
    try {
      const response = await api.get(`/partner/brand/${brandId}/partner-users`, {
        params: { page: 1, limit: 1000 } // Get all users
      });
      const users = response.data.users || response.data.data || response.data || [];
      setPartnerUsers(users);
      
      // Auto-select first user if available
      if (users.length > 0 && !selectedUserId) {
        setSelectedUserId(users[0].id);
      }
    } catch (error) {
      console.error('Error fetching partner users:', error);
      setPartnerUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    // Only fetch if user is selected
    if (selectedUserId) {
      if (activeTab === 'sessions') {
        fetchSessions();
      } else if (activeTab === 'inactive') {
        fetchInactiveUsers();
      } else if (activeTab === 'stats') {
        fetchStats();
      }
    }
  }, [activeTab, pagination.page, selectedUserId]);

  const getValidDateRange = () => {
    let start = dateRange.startDate;
    let end = dateRange.endDate;
    
    // Swap dates if start is after end
    if (new Date(start) > new Date(end)) {
      [start, end] = [end, start];
    }
    
    return { startDate: start, endDate: end };
  };

  const fetchSessions = async () => {
    if (!selectedUserId) {
      setSessions([]);
      return;
    }
    
    setLoading(true);
    try {
      const validDateRange = getValidDateRange();
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        startDate: validDateRange.startDate,
        endDate: validDateRange.endDate,
        userId: selectedUserId,
      };

      const response = await api.get('/partner/activity-tracking/sessions', { params });
      setSessions(response.data.data || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setSessions([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchInactiveUsers = async () => {
    if (!selectedUserId) {
      setInactiveUsers([]);
      return;
    }
    
    setLoading(true);
    try {
      const validDateRange = getValidDateRange();
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        startDate: validDateRange.startDate,
        endDate: validDateRange.endDate,
        minInactiveSeconds: 300,
        userId: selectedUserId,
      };

      const response = await api.get('/partner/activity-tracking/inactive-users', { params });
      setInactiveUsers(response.data.data || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching inactive users:', error);
      setInactiveUsers([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!selectedUserId) {
      setStats(null);
      return;
    }
    
    setLoading(true);
    try {
      const validDateRange = getValidDateRange();
      const params: any = {
        startDate: validDateRange.startDate,
        endDate: validDateRange.endDate,
        userId: selectedUserId,
      };

      const response = await api.get('/partner/activity-tracking/stats', { params });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatDate = (dateStr: string) => {
    // Format date in IST (Indian Standard Time)
    return new Date(dateStr).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor partner user activity and engagement</p>
        </div>
        <span className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full font-medium">
          🕐 IST Timezone
        </span>
      </div>

      {/* Compact Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label htmlFor="partnerUser" className="block text-xs font-medium mb-1.5 text-gray-700">
                Partner User <span className="text-red-500">*</span>
              </label>
              <select
                id="partnerUser"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={loadingUsers}
                required
              >
                <option value="">
                  {loadingUsers ? 'Loading users...' : 'Select a user'}
                </option>
                {partnerUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
              {!selectedUserId && partnerUsers.length > 0 && (
                <p className="text-xs text-red-500 mt-1">Please select a user</p>
              )}
            </div>
            <div>
              <label htmlFor="startDate" className="block text-xs font-medium mb-1.5 text-gray-700">
                Start Date
              </label>
              <input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-xs font-medium mb-1.5 text-gray-700">
                End Date
              </label>
              <input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => {
                  if (!selectedUserId) {
                    alert('Please select a partner user');
                    return;
                  }
                  setPagination({ ...pagination, page: 1 });
                  if (activeTab === 'sessions') fetchSessions();
                  else if (activeTab === 'inactive') fetchInactiveUsers();
                  else if (activeTab === 'stats') fetchStats();
                }} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-all shadow-sm"
                disabled={!selectedUserId}
              >
                Apply Filters
              </Button>
            </div>
          </div>
          {new Date(dateRange.startDate) > new Date(dateRange.endDate) && (
            <div className="mt-3 text-xs text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200">
              ⚠️ Dates will be auto-swapped
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-50 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${
            activeTab === 'stats'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          📊 Statistics
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${
            activeTab === 'sessions'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          🔄 Sessions
          {sessions.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">
              {sessions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('inactive')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${
            activeTab === 'inactive'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          ⏸️ Inactive Users
          {inactiveUsers.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs">
              {inactiveUsers.length}
            </span>
          )}
        </button>
      </div>

      {/* No User Selected Message */}
      {!selectedUserId && !loading && (
        <Card className="shadow-sm">
          <CardContent className="p-16">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">👤</span>
              </div>
              <p className="text-gray-900 font-semibold text-lg">Select a Partner User</p>
              <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">Choose a partner user from the dropdown above to view their activity tracking data and statistics</p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && <div className="text-center py-8">Loading...</div>}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && !loading && selectedUserId && (
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-gray-500">
                No activity sessions found for the selected period.
              </CardContent>
            </Card>
          ) : (
            sessions.map((session) => (
              <Card key={session.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {session.partnerUser.name || session.partnerUser.email}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(session.startTime)}</p>
                    </div>
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-mono rounded">
                      {session.sessionId.substring(0, 8)}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <p className="text-lg font-bold text-blue-600">{session.totalEvents}</p>
                      <p className="text-xs text-gray-600">Events</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <p className="text-lg font-bold text-green-600">
                        {session.endTime
                          ? formatDuration(
                              new Date(session.endTime).getTime() - new Date(session.startTime).getTime()
                            )
                          : 'Live'}
                      </p>
                      <p className="text-xs text-gray-600">Duration</p>
                    </div>
                    <div className="text-center p-2 bg-orange-50 rounded-lg">
                      <p className="text-lg font-bold text-orange-600">{formatDuration(session.inactiveTimeMs)}</p>
                      <p className="text-xs text-gray-600">Inactive</p>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded-lg">
                      <p className="text-lg font-bold text-purple-600">{session.pageViews.length}</p>
                      <p className="text-xs text-gray-600">Pages</p>
                    </div>
                  </div>

                  {/* Pages Visited */}
                  {session.pageViews.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Pages Visited:</p>
                      <div className="flex flex-wrap gap-2">
                        {session.pageViews.slice(0, 5).map((page) => (
                          <span
                            key={`${session.id}-${page}`}
                            className="px-2 py-1 bg-gray-100 rounded text-sm"
                          >
                            {page}
                          </span>
                        ))}
                        {session.pageViews.length > 5 && (
                          <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                            +{session.pageViews.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recent Activity */}
                  {session.activityLogs && session.activityLogs.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Recent Activity:</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {session.activityLogs.slice(0, 5).map((log) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  getEventTypeColor(log.eventType)
                                }`}
                              >
                                {log.eventType}
                              </span>
                              <span className="text-gray-600">{log.pageUrl}</span>
                            </div>
                            <span className="text-gray-500">{formatDate(log.timestamp)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Device Info */}
                  <div className="mt-4 pt-4 border-t text-xs text-gray-500">
                    <p>Device: {session.screenResolution}</p>
                    <p className="truncate">User Agent: {session.userAgent}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <Button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-4 py-2 text-sm"
                variant="outline"
              >
                ← Prev
              </Button>
              <span className="px-3 py-2 text-sm text-gray-600">
                {pagination.page} / {totalPages}
              </span>
              <Button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page >= totalPages}
                className="px-4 py-2 text-sm"
                variant="outline"
              >
                Next →
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Inactive Users Tab */}
      {activeTab === 'inactive' && !loading && selectedUserId && (
        <div className="space-y-4">
          {inactiveUsers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-gray-500">
                No inactive users found for the selected period.
              </CardContent>
            </Card>
          ) : (
            inactiveUsers.map((user) => (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {user.partnerUser.name || user.partnerUser.email}
                      </h3>
                      <p className="text-sm text-gray-500">{user.partnerUser.email}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Current Page: <span className="font-medium">{user.currentPage}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-red-600">
                        {Math.floor(user.inactiveTimeSeconds / 60)}m
                      </div>
                      <p className="text-sm text-gray-500">Inactive Time</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Last Active: {formatDate(user.lastActivityTime)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Alert Sent: {formatDate(user.alertSentAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && !loading && selectedUserId && stats && (
        <div className="space-y-4">
          {/* Summary Stats - Compact Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📊</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.summary.totalSessions}</p>
                    <p className="text-xs text-gray-500">Total Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl">⚡</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.summary.totalEvents.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Total Events</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl">📈</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.summary.avgEventsPerSession}</p>
                    <p className="text-xs text-gray-500">Avg Events/Session</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl">⏱️</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatDuration(stats.summary.avgSessionDurationMs)}
                    </p>
                    <p className="text-xs text-gray-500">Avg Duration</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Event Breakdown & Time Stats Combined */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Event Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🖱️</span>
                    <span className="text-sm font-medium text-gray-700">Mouse Events</span>
                  </div>
                  <span className="text-xl font-bold text-blue-600">{stats.eventBreakdown.mouse.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📜</span>
                    <span className="text-sm font-medium text-gray-700">Scroll Events</span>
                  </div>
                  <span className="text-xl font-bold text-purple-600">{stats.eventBreakdown.scroll.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⌨️</span>
                    <span className="text-sm font-medium text-gray-700">Keyboard Events</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">{stats.eventBreakdown.keyboard.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👆</span>
                    <span className="text-sm font-medium text-gray-700">Click Events</span>
                  </div>
                  <span className="text-xl font-bold text-orange-600">{stats.eventBreakdown.click.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Time Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">✅</span>
                    <span className="text-xs text-gray-600 font-medium">Total Active Time</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">
                    {formatDuration(stats.summary.totalActiveTimeMs)}
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">⏸️</span>
                    <span className="text-xs text-gray-600 font-medium">Total Inactive Time</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700">
                    {formatDuration(stats.summary.totalInactiveTimeMs)}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">📄</span>
                    <span className="text-xs text-gray-600 font-medium">Unique Pages Visited</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">
                    {stats.summary.uniquePages}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Pages */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Top Pages Visited</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.topPages.length === 0 ? (
                  <p className="text-center text-gray-500 py-8 text-sm">No page data available</p>
                ) : (
                  stats.topPages.slice(0, 5).map((page, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <div
                        key={`top-page-${page}`}
                        className="flex items-center gap-3 p-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <span className="flex-shrink-0 w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">
                          {pageNum}
                        </span>
                        <span className="text-sm font-medium text-gray-700 truncate">{page}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <Card className="shadow-sm">
          <CardContent className="p-16">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-sm text-gray-600">Loading data...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

