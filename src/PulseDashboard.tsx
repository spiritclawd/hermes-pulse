import React, { useState, useEffect, useRef } from 'react';
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
  TrendingUp,
  Heart,
  Shield,
  Brain,
  Eye
} from 'lucide-react';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';

// ─── Utilities ───

// Count-up animation hook
function useCountUp(end: number, duration = 1200, start = 0) {
  const [value, setValue] = useState(start);
  const ref = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startTime = performance.now();
    ref.current = start;
    rafRef.current = requestAnimationFrame(function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      setValue(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    });
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [end, duration, start]);

  return value;
}

// ─── Sparkline ───

function Sparkline({ data, color = "#3fd3ff", height = 40 }: { data: number[], color?: string, height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg 
      viewBox="0 0 100 100" 
      preserveAspectRatio="none"
      style={{ height, width: '100%', display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="spark-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polygon
        points={`0,100 ${points} 100,100`}
        fill="url(#spark-gradient)"
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* End dot */}
      {data.length > 0 && (
        <circle cx={100} cy={100 - ((data[data.length-1] - min) / range) * 80 - 10} r="2" fill={color} />
      )}
    </svg>
  );
}

// ─── Heartbeat Indicator ───

function HeartbeatIndicator({ alive, label }: { alive: boolean, label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Heart 
          className={cn(
            "w-4 h-4 transition-all duration-300",
            alive ? "text-rose-400 fill-rose-400" : "text-muted-foreground"
          )} 
        />
        {alive && (
          <>
            <div className="absolute inset-0 text-rose-400 fill-rose-400 animate-ping opacity-75">
              <Heart className="w-4 h-4" />
            </div>
            <div className="absolute inset-0 text-rose-400 fill-rose-400 animate-pulse opacity-40">
              <Heart className="w-4 h-4" />
            </div>
          </>
        )}
      </div>
      {label && <span className="text-xs font-mono opacity-70">{label}</span>}
    </div>
  );
}

// ─── Gauge ───

function Gauge({ value, max, label, color, suffix = "" }: { value: number, max: number, label: string, color: string, suffix?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const displayMax = max >= 1000000 ? (max / 1000000).toFixed(1) + 'M' : 
                     max >= 1000 ? Math.round(max / 1000) + 'k' : max.toString();
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] uppercase tracking-wider opacity-60">
        <span>{label}</span>
        <span className="font-bold">{value.toLocaleString()}{suffix}</span>
      </div>
      <div className="h-1.5 bg-white/08 rounded-full overflow-hidden relative">
        {/* Track glow */}
        <div 
          className="absolute inset-0 rounded-full opacity-30 blur-[2px]"
          style={{ background: color, width: `${pct}%` }}
        />
        {/* Fill */}
        <div 
          className="h-full rounded-full transition-all duration-500 ease-out relative"
          style={{ 
            width: `${pct}%`, 
            background: `linear-gradient(90deg, ${color}, ${color}aa)`,
          }}
        />
      </div>
    </div>
  );
}

// ─── Data Panel (reusable error/session item) ───

function DataPanel({ icon: Icon, title, children, className }: { 
  icon: any, 
  title: string, 
  children: React.ReactNode, 
  className?: string 
}) {
  return (
    <Card className={cn("backdrop-blur-sm", className)}>
      <CardHeader className="pb-3 border-b border-border/30">
        <CardTitle className="text-[10px] font-mono uppercase tracking-[0.15em] flex items-center gap-2 opacity-60">
          <Icon className="w-3.5 h-3.5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {children}
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ───

export function PulseDashboard() {
  const [status, setStatus] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Count-up values
  const activeSessions = useCountUp(status?.active_sessions || 0);
  const totalTokens = useCountUp(analytics?.total_tokens || 0, 1500);

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
      setLastUpdate(new Date());
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

  // Theme-aware colors (read CSS custom properties)
  const [themeVars, setThemeVars] = useState({
    primary: '#3fd3ff',
    accent: '#ffce3a',
    success: '#4ade80',
    destructive: '#ff3a5e',
    mutedForeground: '#6b8ca4',
  });

  useEffect(() => {
    const root = getComputedStyle(document.documentElement);
    const getVar = (name: string) => root.getPropertyValue(`--${name}`).trim() || undefined;
    setThemeVars({
      primary: getVar('color-primary') || '#3fd3ff',
      accent: getVar('color-accent') || '#ffce3a',
      success: getVar('color-success') || '#4ade80',
      destructive: getVar('color-destructive') || '#ff3a5e',
      mutedForeground: getVar('color-muted-foreground') || '#6b8ca4',
    });
  }, []);

  const uptime = status?.uptime_seconds ? 
    `${Math.floor(status.uptime_seconds / 3600)}h ${Math.floor((status.uptime_seconds % 3600) / 60)}m` : '--';

  return (
    <div className="space-y-6 p-6 font-mono text-sm fade-in">
      {/* ─── Header ─── */}
      <header className="flex items-center justify-between pb-4 border-b border-border/20">
        <div className="flex items-center gap-4">
          {/* Zaia crest */}
          <div className="relative">
            <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center">
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <div className="absolute -inset-1 bg-primary/20 blur-md -z-10" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-[0.25em] uppercase" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Hermes<span className="text-primary">Pulse</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-60">
              Live Command Center · {status?.agent_version || '--'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <HeartbeatIndicator alive={status?.gateway_running || false} label={uptime} />
          <div className="text-[10px] font-mono opacity-50 text-right hidden sm:block">
            <div>Last update</div>
            <div>{lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second:'2-digit' })}</div>
          </div>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={refresh}
            disabled={loading}
            className="gap-2 hover:bg-primary/10"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-xs font-mono flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold uppercase mb-1">Connection Error</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* ─── Metrics Grid ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status */}
        <DataPanel icon={Cpu} title="Agent Status" className="sm:col-span-1">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="opacity-50">Gateway</span>
              <Badge variant={status?.gateway_running ? "default" : "destructive"} className="text-[9px] px-1.5 py-0 h-4 font-mono">
                {status?.gateway_running ? 'RUNNING' : 'STOPPED'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="opacity-50">Active Sessions</span>
              <span className="text-lg font-bold text-primary tabular-nums">{activeSessions}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="opacity-50">Recent Activity</span>
              <span className="text-xs text-primary/70">{status?.recent_sessions?.length || 0} sessions</span>
            </div>
          </div>
        </DataPanel>

        {/* Token Usage */}
        <DataPanel icon={Zap} title="Token Usage" className="sm:col-span-1">
          <div className="space-y-3">
            <Gauge 
              value={analytics?.total_tokens || 0} 
              max={1000000} 
              label="Total" 
              color={themeVars.primary}
              suffix=""
            />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <div className="text-[10px] uppercase opacity-50">Cost</div>
                <div className="text-sm font-bold" style={{ color: themeVars.accent }}>
                  ${(analytics?.total_cost || 0).toFixed(2)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] uppercase opacity-50">Cache</div>
                <div className="text-sm font-bold" style={{ color: themeVars.success }}>
                  {((analytics?.cache_hit_rate || 0) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </DataPanel>

        {/* Trend */}
        <DataPanel icon={TrendingUp} title="7-Day Trend" className="sm:col-span-1 lg:col-span-2">
          <div className="h-12">
            {analytics?.daily_breakdown?.length ? (
              <Sparkline 
                data={analytics.daily_breakdown.map((d: any) => d.tokens)} 
                color={themeVars.success}
                height={48}
              />
            ) : (
              <div className="h-full flex items-center justify-center opacity-30">
                <Clock className="w-6 h-6" />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] opacity-50">
            <span>Daily token count</span>
            <span className="font-mono">{analytics?.daily_breakdown?.length || 0} days tracked</span>
          </div>
        </DataPanel>
      </div>

      {/* ─── Split View: Sessions + Errors ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Sessions */}
        <DataPanel icon={Activity} title="Recent Sessions" className="lg:col-span-1">
          <div className="space-y-1 max-h-[280px] overflow-y-auto scrollbar-thin">
            {status?.recent_sessions?.length ? status.recent_sessions.slice(0, 12).map((session: any) => (
              <div 
                key={session.id}
                className="group flex items-center justify-between p-2.5 rounded hover:bg-primary/5 transition-all duration-200 border border-transparent hover:border-primary/20"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary group-hover:shadow-[0_0_8px_rgba(63,211,255,0.5)] transition-all" />
                  <div className="min-w-0">
                    <div className="text-xs font-mono truncate max-w-[140px] opacity-90">
                      {session.model}
                    </div>
                    <div className="text-[9px] opacity-50">
                      {session.platform} · {session.message_count} msgs
                    </div>
                  </div>
                </div>
                <div className="text-[9px] font-mono opacity-40 group-hover:opacity-70">
                  {timeAgo(session.last_activity)}
                </div>
              </div>
            )) : (
              <div className="text-center py-8 opacity-30">
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No recent sessions</p>
              </div>
            )}
          </div>
        </DataPanel>

        {/* Errors */}
        <DataPanel icon={AlertTriangle} title="Recent Errors" className="lg:col-span-1">
          <div className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-thin">
            {logs.length > 0 ? logs.map((log, i) => (
              <div 
                key={i}
                className="p-2.5 rounded bg-destructive/5 border border-destructive/10 text-xs font-mono group hover:border-destructive/20 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-destructive/30 text-destructive shrink-0">
                    ERROR
                  </Badge>
                  <div className="flex-1 min-w-0 leading-relaxed opacity-80">
                    {log.message}
                  </div>
                </div>
                <div className="text-[9px] opacity-40 mt-1 font-mono">
                  {log.timestamp}
                </div>
              </div>
            )) : (
              <div className="text-center py-8 opacity-30">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-success/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-success" />
                </div>
                <p className="text-xs">All systems operational</p>
              </div>
            )}
          </div>
        </DataPanel>
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button 
          size="sm" 
          variant="outline"
          className="h-10 text-xs gap-2 hover:bg-primary/10 hover:border-primary/30"
          onClick={async () => {
            await fetch('/api/gateway/restart', { method: 'POST' })
              .then(r => r.json())
              .then(() => setTimeout(refresh, 1200));
          }}
        >
          <RefreshCw className="w-3 h-3" />
          Restart GW
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          className="h-10 text-xs gap-2 hover:bg-accent/10 hover:border-accent/30"
          onClick={() => alert('Cache clear endpoint not yet implemented')}
        >
          <HardDrive className="w-3 h-3" />
          Clear Cache
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          className="h-10 text-xs gap-2 col-span-2 sm:col-span-1 hover:bg-success/10 hover:border-success/30"
          onClick={() => window.open('/logs', '_blank')}
        >
          <Eye className="w-3 h-3" />
          View Full Logs
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          className="h-10 text-xs gap-2 hidden sm:flex hover:bg-muted/50"
          onClick={() => window.open('/sessions', '_blank')}
        >
          <Activity className="w-3 h-3" />
          Browse Sessions
        </Button>
      </div>

      {/* ─── Footer ─── */}
      <footer className="text-center text-[9px] uppercase tracking-widest opacity-30 pt-4 border-t border-border/10">
        Zaia Pulse · Auto-refresh 5s · Data: /api/status /api/analytics /api/logs
      </footer>

      <style jsx>{`
        .fade-in {
          animation: fade-in 0.6s ease-out;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Scrollbar styling */
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(63, 211, 255, 0.2);
          border-radius: 2px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(63, 211, 255, 0.4);
        }
      `}</style>
    </div>
  );
}

