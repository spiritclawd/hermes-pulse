import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  AlertTriangle, 
  RefreshCw,
  Zap,
  Clock,
  TrendingUp
} from 'lucide-react';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Types
interface StatusData {
  agent_version: string;
  gateway_running: boolean;
  gateway_pid?: number;
  active_sessions: number;
  recent_sessions: Array<{
    id: string;
    platform: string;
    model: string;
    message_count: number;
    last_activity: string;
  }>;
}

interface AnalyticsData {
  total_tokens: number;
  total_cost: number;
  cache_hit_rate: number;
  sessions: number;
  daily_breakdown: Array<{
    date: string;
    tokens: number;
    cost: number;
  }>;
}

// Sparkline component (no external deps)
function Sparkline({ data, color = "#3fd3ff", height = 40 }: { data: number[], color?: string, height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 80 - 10; // padding
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg 
      viewBox="0 0 100 100" 
      preserveAspectRatio="none"
      style={{ height, width: '100%', display: 'block' }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// Live gauge
function Gauge({ value, max, label, color }: { value: number, max: number, label: string, color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs opacity-70">
        <span>{label}</span>
        <span>{value.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${pct}%`, 
            background: color,
            boxShadow: `0 0 8px ${color}`
          }}
        />
      </div>
    </div>
  );
}

export function PulseDashboard() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [logs, setLogs] = useState<Array<{ level: string; message: string; timestamp: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data
  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, analyticsRes, logsRes] = await Promise.all([
        fetch('/api/status').then(r => r.json()),
        fetch('/api/analytics/usage?days=7').then(r => r.json()),
        fetch('/api/logs?level=ERROR&limit=20').then(r => r.json()),
      ]);
      setStatus(statusRes);
      setAnalytics(analyticsRes);
      setLogs(logsRes.logs || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 p-6 font-mono text-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className="w-6 h-6 text-cyan-400 animate-pulse" />
            <div className="absolute inset-0 bg-cyan-400/20 blur-lg" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              HERMES PULSE
            </h1>
            <p className="text-xs opacity-60">Live Command Center</p>
          </div>
        </div>
        <Button 
          size="sm" 
          variant="outline"
          onClick={refresh}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          REFRESH
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/20 border border-destructive/50 rounded-lg text-destructive">
          Error: {error}
        </div>
      )}

      {/* Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Agent Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono flex items-center gap-2 opacity-60">
              <Cpu className="w-4 h-4" /> AGENT STATUS
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs opacity-60">Version</span>
                  <span className="text-xs font-bold">{status.agent_version}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs opacity-60">Gateway</span>
                  <Badge variant={status.gateway_running ? "default" : "destructive"} className="text-xs">
                    {status.gateway_running ? 'RUNNING' : 'STOPPED'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs opacity-60">Active Sessions</span>
                  <span className="text-lg font-bold text-cyan-400">{status.active_sessions}</span>
                </div>
              </div>
            ) : (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-8 bg-white/10 rounded w-1/2" />
                <div className="h-4 bg-white/10 rounded w-1/2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Token Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono flex items-center gap-2 opacity-60">
              <Zap className="w-4 h-4" /> TOKEN USAGE
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics ? (
              <>
                <Gauge 
                  value={analytics.total_tokens} 
                  max={1000000} 
                  label="Total" 
                  color="#3fd3ff" 
                />
                <div className="flex justify-between text-xs opacity-60">
                  <span>Cost</span>
                  <span className="text-amber-400 font-bold">${analytics.total_cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs opacity-60">
                  <span>Cache Hit</span>
                  <span>{(analytics.cache_hit_rate * 100).toFixed(1)}%</span>
                </div>
              </>
            ) : (
              <div className="animate-pulse space-y-3">
                <div className="h-8 bg-white/10 rounded w-full" />
                <div className="h-4 bg-white/10 rounded w-2/3" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono flex items-center gap-2 opacity-60">
              <TrendingUp className="w-4 h-4" /> USAGE TREND
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics && analytics.daily_breakdown ? (
              <Sparkline 
                data={analytics.daily_breakdown.map(d => d.tokens)} 
                color="#4ade80"
                height={50}
              />
            ) : (
              <div className="h-[50px] flex items-center justify-center opacity-30">
                <Clock className="w-8 h-8" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono flex items-center gap-2 opacity-60">
              <RefreshCw className="w-4 h-4" /> QUICK ACTIONS
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button 
              size="sm" 
              variant="outline"
              className="text-xs"
              onClick={async () => {
                await fetch('/api/gateway/restart', { method: 'POST' });
                setTimeout(refresh, 1000);
              }}
            >
              Restart GW
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="text-xs"
              onClick={() => alert('Cache clear would go here')}
            >
              Clear Cache
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="text-xs col-span-2"
              onClick={() => window.open('/logs', '_blank')}
            >
              View Full Logs
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout: Recent sessions + Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              RECENT SESSIONS
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status?.recent_sessions?.length ? (
              <div className="space-y-2">
                {status.recent_sessions.slice(0, 8).map((session) => (
                  <div 
                    key={session.id}
                    className="flex items-center justify-between p-2 rounded bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-cyan-400/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-cyan-400/60" />
                      <div className="min-w-0">
                        <div className="text-xs font-mono truncate max-w-[150px]">
                          {session.model}
                        </div>
                        <div className="text-[10px] opacity-50">
                          {session.platform} · {session.message_count} msgs
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] opacity-50 font-mono">
                      {timeAgo(session.last_activity)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 opacity-40">
                <Clock className="w-8 h-8 mx-auto mb-2" />
                <p className="text-xs">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Errors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-mono flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              RECENT ERRORS
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {logs.map((log, i) => (
                  <div 
                    key={i}
                    className="p-2 rounded bg-amber-900/20 border border-amber-500/30 text-xs font-mono"
                  >
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/50 text-amber-400">
                        ERROR
                      </Badge>
                      <div className="flex-1 min-w-0 break-words opacity-80">
                        {log.message}
                      </div>
                    </div>
                    <div className="text-[10px] opacity-40 mt-1 font-mono">
                      {log.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 opacity-40">
                <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-green-900/30 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-xs">No errors in the last 20 logs</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] opacity-30 font-mono pt-4 border-t border-white/10">
        HERMES PULSE PLUGIN — AUTO-REFRESH 5s — DATA: /api/status /api/analytics /api/logs
      </div>
    </div>
  );
}

