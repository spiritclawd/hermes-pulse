import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Zap, Heart, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// Mini count-up for big numbers
function useCountUp(end: number, duration = 1000, start = 0) {
  const [value, setValue] = useState(start);
  useEffect(() => {
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [end, duration, start]);
  return value;
}

export function AnalyticsTop() {
  const [status, setStatus] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [s, a] = await Promise.all([
          fetch('/api/status').then(r => r.json()),
          fetch('/api/analytics/usage?days=7').then(r => r.json()),
        ]);
        setStatus(s);
        setAnalytics(a);
      } catch (e) { /* silent */ }
      setLoading(false);
    };
    fetch();
  }, []);

  const activeSessions = useCountUp(status?.active_sessions || 0);
  const totalTokens = useCountUp(analytics?.total_tokens || 0, 1500);
  const cost = analytics?.total_cost || 0;
  const cacheRate = analytics?.cache_hit_rate || 0;

  return (
    <div className="mb-6 fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-primary" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-[0.1em]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Zaia<span className="text-primary">Pulse</span> Overview
          </h2>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono opacity-60">
          <div className="flex items-center gap-1">
            <Heart className={cn("w-3 h-3", status?.gateway_running ? "text-rose-400 fill-rose-400" : "text-muted")} />
            <span>{status?.gateway_running ? 'LIVE' : 'OFFLINE'}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-16 bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3">
              <div className="text-[10px] uppercase opacity-60 mb-1">Sessions</div>
              <div className="text-xl font-bold text-primary tabular-nums">{activeSessions}</div>
            </CardContent>
          </Card>

          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="p-3">
              <div className="text-[10px] uppercase opacity-60 mb-1">Tokens (7d)</div>
              <div className="text-xl font-bold" style={{ color: 'var(--color-accent)' }}>
                {totalTokens.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-3">
              <div className="text-[10px] uppercase opacity-60 mb-1">Cache Hit</div>
              <div className="text-xl font-bold text-success tabular-nums">
                {(cacheRate * 100).toFixed(0)}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-border/20">
            <CardContent className="p-3">
              <div className="text-[10px] uppercase opacity-60 mb-1">Est. Cost</div>
              <div className="text-xl font-bold text-destructive tabular-nums">
                ${cost.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <style jsx>{`
        .fade-in { animation: fade-in 0.4s ease-out; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
