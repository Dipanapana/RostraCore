"use client";

/**
 * Analytics Debug Dashboard
 *
 * Development tool to view all tracked events and verify analytics integration
 */

import React, { useState, useEffect } from 'react';
import { Button, Card } from '@/design-system/components';
import { analytics } from '@/lib/analytics';

export default function AnalyticsDebugPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadEvents = () => {
    setEvents(analytics.getEvents());
  };

  useEffect(() => {
    loadEvents();

    if (autoRefresh) {
      const interval = setInterval(loadEvents, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const clearAll = () => {
    if (confirm('Clear all tracked events?')) {
      analytics.clearEvents();
      setEvents([]);
    }
  };

  const downloadJSON = () => {
    const dataStr = JSON.stringify(events, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `analytics_events_${new Date().toISOString()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const eventsByType = events.reduce((acc, event) => {
    const type = event.data?.event || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Analytics Debug Dashboard
          </h1>
          <p className="text-gray-600">
            View all tracked events for development and debugging
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card padding="lg">
            <div className="text-3xl font-extrabold text-primary-500 mb-2">
              {events.length}
            </div>
            <div className="text-sm text-gray-600">Total Events</div>
          </Card>

          <Card padding="lg">
            <div className="text-3xl font-extrabold text-accent-500 mb-2">
              {Object.keys(eventsByType).length}
            </div>
            <div className="text-sm text-gray-600">Event Types</div>
          </Card>

          <Card padding="lg">
            <div className="text-3xl font-extrabold text-success-500 mb-2">
              {events.filter((e) => e.method === 'track').length}
            </div>
            <div className="text-sm text-gray-600">Track Events</div>
          </Card>

          <Card padding="lg">
            <div className="text-3xl font-extrabold text-gray-500 mb-2">
              {events.filter((e) => e.method === 'page').length}
            </div>
            <div className="text-sm text-gray-600">Page Views</div>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="primary" onClick={loadEvents}>
            Refresh
          </Button>

          <Button
            variant={autoRefresh ? 'primary' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
          </Button>

          <Button variant="outline" onClick={downloadJSON}>
            Download JSON
          </Button>

          <Button variant="danger" onClick={clearAll}>
            Clear All
          </Button>

          <div className="ml-auto text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Event Type Summary */}
        <Card padding="lg" className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Events by Type
          </h2>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(eventsByType)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([type, count]) => (
                <div
                  key={type}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {count}
                  </div>
                  <div className="text-xs text-gray-600 font-mono truncate">
                    {type}
                  </div>
                </div>
              ))}
          </div>
        </Card>

        {/* Event List */}
        <Card padding="lg">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            All Events ({events.length})
          </h2>

          {events.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-5xl mb-4">📊</div>
              <p className="text-lg">No events tracked yet</p>
              <p className="text-sm mt-2">
                Navigate around the app to see events appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {events
                .slice()
                .reverse()
                .map((event, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 font-mono text-xs"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            event.method === 'track'
                              ? 'bg-primary-100 text-primary-700'
                              : event.method === 'page'
                              ? 'bg-accent-100 text-accent-700'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {event.method}
                        </span>
                        <span className="font-bold text-gray-900">
                          {event.data?.event || event.data?.name || 'Unknown'}
                        </span>
                      </div>
                      <span className="text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Properties */}
                    {event.data?.properties && (
                      <div className="bg-white rounded p-3 mt-2 overflow-x-auto">
                        <pre className="text-xs text-gray-700">
                          {JSON.stringify(event.data.properties, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </Card>

        {/* Integration Guide */}
        <Card padding="lg" className="mt-8 bg-primary-50 border-2 border-primary-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            📚 Integration Guide
          </h2>

          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                1. Track events in components:
              </h3>
              <pre className="bg-white rounded p-3 overflow-x-auto">
                {`import { analytics } from '@/lib/analytics';

analytics.track('cta_clicked', {
  location: 'hero',
  type: 'primary_cta',
});`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                2. Use React hooks:
              </h3>
              <pre className="bg-white rounded p-3 overflow-x-auto">
                {`import { useAnalytics } from '@/hooks/useAnalytics';

const { track } = useAnalytics();
track('button_clicked', { button_id: 'submit' });`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                3. Track page views automatically:
              </h3>
              <pre className="bg-white rounded p-3 overflow-x-auto">
                {`import { usePageTracking } from '@/hooks/useAnalytics';

function MyPage() {
  usePageTracking(); // Automatically tracks page view
  // ...
}`}
              </pre>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <p className="font-semibold text-yellow-900 mb-2">
                🚀 Production Setup
              </p>
              <p className="text-yellow-800 text-xs">
                To enable analytics in production, add your analytics provider
                keys to <code className="bg-yellow-100 px-1 rounded">.env.local</code>:
              </p>
              <pre className="bg-yellow-100 rounded p-2 mt-2 text-xs">
                {`NEXT_PUBLIC_MIXPANEL_TOKEN=your_token_here
NEXT_PUBLIC_SEGMENT_WRITE_KEY=your_key_here
NEXT_PUBLIC_GA4_MEASUREMENT_ID=your_id_here`}
              </pre>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
