import React, { useState, useEffect } from 'react';
import { Activity, Heart, Zap, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Minimal heartbeat component for sidebar
function SidebarHeartbeat({ alive }: { alive: boolean }) {
  return (
    <div className="relative flex items-center gap-2 mb-4">
      <div className="relative">
        <Heart className={cn(
          "w-5 h-5 transition-all duration-300",
          alive ? "text-rose-400 fill-rose-400" : "text-muted-foreground"
        )} />
        {alive && (
          <>
            <div className="absolute inset-0 text-rose-400 fill-rose-400 animate-ping opacity-60">
              <Heart className="w-5 h-5" />
            </div>
            <div className="absolute inset-0 text-rose-400 fill-rose-400 animate-pulse opacity-30">
              <Heart className="w-5 h-5" />
            </div>
          </>
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          HERMES
        </span>
        <span className="text-[9px] opacity-60 uppercase tracking-widest">
          {alive ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>
    </div>
  );
}

// Compact token gauge (horizontal)
function MiniGauge({ value, max, color }: { value: number, max: number, color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[9px] uppercase opacity-60">
        <span>Tokens</span>
        <span className="font-mono">{value.toLocaleString()}</span>
      </div>
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <div 
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}` }}
        />
      </div>
    </div>
  );
}

// Mini errors/stats panel
function MiniPanel({ label, value, color, icon: Icon }: { 
  label: string, 
  value: string | number, 
  color: string, 
  icon: any 
}) {
  return (
    <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className="text-[10px] uppercase opacity-60">{label}</span>
      </div>
      <span className="text-xs font-mono font-bold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

// Main sidebar content
export function SidebarWidget() {
  const [status, setStatus] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'sessions'>('stats');

  useEffect(() => {
    const fetch = async () => {
      try {
        const [s, a] = await Promise.all([
          fetch('/api/status').then(r => r.json()),
          fetch('/api/analytics/usage?days=1').then(r => r.json()),
        ]);
        setStatus(s);
        setAnalytics(a);
      } catch (e) {
        // silent fail — sidebar stays readable
      }
    };
    fetch();
    const interval = setInterval(fetch, 10000);  // slower refresh for sidebar
    return () => clearInterval(interval);
  }, []);

  const isAlive = status?.gateway_running;
  const sessions = status?.active_sessions || 0;
  const tokens = analytics?.total_tokens || 0;

  return (
    <div className="h-full flex flex-col p-4 space-y-4 overflow-y-auto scrollbar-thin">
      {/* Header */}
      <SidebarHeartbeat alive={isAlive} />

      {/* Mini Stats */}
      <div className="space-y-3">
        <MiniGauge 
          value={tokens} 
          max={1000000} 
          color="var(--color-primary, #3fd3ff)" 
        />

        <div className="grid grid-cols-2 gap-2">
          <MiniPanel 
            label="Sessions" 
            value={sessions} 
            color="var(--color-accent, #ffce3a)" 
            icon={Activity} 
          />
          <MiniPanel 
            label="Uptime" 
            value={status?.uptime_seconds ? 
              `${Math.floor(status.uptime_seconds / 3600)}h` : '--'} 
            color="var(--color-success, #4ade80)" 
            icon={Eye} 
          />
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-border/20">
        <button
          className={cn(
            "flex-1 pb-2 text-[10px] uppercase tracking-wider transition-colors border-b-2",
            activeTab === 'stats' 
              ? "border-primary text-primary" 
              : "border-transparent opacity-50 hover:opacity-80"
          )}
          onClick={() => setActiveTab('stats')}
        >
          Stats
        </button>
        <button
          className={cn(
            "flex-1 pb-2 text-[10px] uppercase tracking-wider transition-colors border-b-2",
            activeTab === 'sessions' 
              ? "border-primary text-primary" 
              : "border-transparent opacity-50 hover:opacity-80"
          )}
          onClick={() => setActiveTab('sessions')}
        >
          Active
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'stats' ? (
        <div className="space-y-2 text-[10px] font-mono opacity-70">
          <div className="flex justify-between">
            <span>Version</span>
            <span className="opacity-90">{status?.agent_version?.slice(0, 12) || '--'}</span>
          </div>
          <div className="flex justify-between">
            <span>Model</span>
            <span className="opacity-90">{status?.model || '--'}</span>
          </div>
          <div className="flex justify-between">
            <span>Cache Hit</span>
            <span style={{ color: 'var(--color-success)' }}>
              {analytics ? `${(analytics.cache_hit_rate * 100).toFixed(0)}%` : '--'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Cost</span>
            <span style={{ color: 'var(--color-accent)' }}>
              ${analytics?.total_cost?.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">
          {status?.recent_sessions?.length ? (
            status.recent_sessions.slice(0, 6).map((session: any) => (
              <div 
                key={session.id}
                className="p-2 rounded hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all text-[10px]"
              >
                <div className="font-mono truncate opacity-90">
                  {session.model.split('/').pop()}
                </div>
                <div className="opacity-50 mt-0.5">
                  {session.platform} · {session.message_count} msgs · {timeAgo(session.last_activity)}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 opacity-40 text-[10px]">
              No active sessions
            </div>
          )}
        </div>
      )}

      {/* Footer spacer */}
      <div className="flex-1" />
      
      {/* Bottom branding */}
      <div className="text-[8px] uppercase tracking-widest opacity-30 border-t border-border/10 pt-2">
        Zaia Pulse · v0.2.0
      </div>

      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(63, 211, 255, 0.2);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
