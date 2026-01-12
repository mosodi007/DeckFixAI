import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Check, FileText, AlertCircle, Gift, CreditCard } from 'lucide-react';
import { supabase } from '../services/analysisService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface Notification {
  id: string;
  user_id: string;
  type: 'analysis_complete' | 'analysis_failed' | 'credit_low' | 'referral_bonus' | 'subscription_renewal';
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
  metadata?: any; // JSONB field for additional data
}

interface NotificationBellProps {
  onNotificationClick?: (link: string) => void;
}

export function NotificationBell({ onNotificationClick }: NotificationBellProps) {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const previousNotificationIds = useRef<Set<string>>(new Set());

  const unreadCount = notifications.filter(n => !n.read).length;

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      previousNotificationIds.current = new Set();
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50); // Increased limit to catch more notifications

      if (error) throw error;

      const newNotifications = (data || []) as Notification[];
      
      // Check for new notifications and show toast
      // Show toast for new unread notifications that weren't in previous list
      const newUnreadNotifications = newNotifications.filter(
        n => !previousNotificationIds.current.has(n.id) && !n.read
      );

      // Also check for very recent notifications (created in last 60 seconds) if this is first load
      // This handles the case where notification was created just before page load
      const isFirstLoad = previousNotificationIds.current.size === 0;
      const recentNotifications = isFirstLoad 
        ? newNotifications.filter(n => {
            const createdAt = new Date(n.created_at).getTime();
            const now = Date.now();
            return !n.read && (now - createdAt) < 60000; // 60 seconds
          })
        : [];

      // Combine new notifications and recent notifications (avoid duplicates)
      const notificationsToShow = [...newUnreadNotifications];
      recentNotifications.forEach(notif => {
        if (!notificationsToShow.find(n => n.id === notif.id)) {
          notificationsToShow.push(notif);
        }
      });

      // Show toasts for new notifications
      notificationsToShow.forEach((notification) => {
        console.log('Showing toast for notification:', notification.type, notification.message);
        if (notification.type === 'analysis_complete') {
          showSuccess(notification.message, 8000); // Longer duration for analysis complete
        } else if (notification.type === 'analysis_failed') {
          showError(notification.message, 6000);
        } else if (notification.type === 'subscription_renewal') {
          // This includes credit purchases and subscription renewals
          showSuccess(notification.message, 6000);
        } else {
          showSuccess(notification.message, 5000);
        }
      });

      // Update previous notification IDs
      previousNotificationIds.current = new Set(newNotifications.map(n => n.id));
      setNotifications(newNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user, showSuccess, showError]);

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Poll for new notifications more frequently
  useEffect(() => {
    if (!user) return;

    // Load immediately on mount
    loadNotifications();
    
    // Then poll every 3 seconds for faster notification detection
    const pollInterval = setInterval(() => {
      loadNotifications();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [user, loadNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const { error } = await supabase.rpc('mark_all_notifications_read');

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    if (notification.link && onNotificationClick) {
      onNotificationClick(notification.link);
    }
    
    setShowDropdown(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'analysis_complete':
        return <FileText className="w-5 h-5 text-green-600" />;
      case 'analysis_failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'credit_low':
        return <CreditCard className="w-5 h-5 text-amber-600" />;
      case 'referral_bonus':
        return <Gift className="w-5 h-5 text-blue-600" />;
      case 'subscription_renewal':
        return <CreditCard className="w-5 h-5 text-green-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <>
            {/* Red dot indicator */}
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
            {/* Count badge */}
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-slate-600 hover:text-slate-900 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-slate-500">
                <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className={`text-sm font-semibold mb-1 ${
                              !notification.read ? 'text-slate-900' : 'text-slate-700'
                            }`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-slate-600 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {new Date(notification.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

