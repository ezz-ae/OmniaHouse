'use client';

import { useEffect, useState } from 'react';

interface HeatmapPoint {
  label: string;
  count: number;
  total_value: number;
}

export function GhostHeatmap() {
  const [data, setData] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHeatmap() {
      try {
        const res = await fetch('/api/ai/behavior/heatmap');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Heatmap fetch failed', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHeatmap();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-400 animate-pulse">Calculating Neural Hotspots...</div>;

  return (
    <div className="bg-slate-900 text-white rounded-[2.5rem] p-10 shadow-2xl overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full"></div>
      
      <div className="flex justify-between items-end mb-10">
        <div>
          <h3 className="text-2xl font-bold tracking-tighter">Ghost Heatmap</h3>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-bold">Neural Button Intercepts</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full font-bold uppercase tracking-tighter border border-purple-500/30">High-Value Segment Only</span>
        </div>
      </div>

      <div className="space-y-6">
        {data.length > 0 ? data.map((point, i) => {
          const maxCount = Math.max(...data.map(d => d.count), 1);
          const width = (point.count / maxCount) * 100;
          
          return (
            <div key={i} className="group">
              <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-tight">
                <span className="text-slate-200">{point.label}</span>
                <span className="text-purple-400">{point.count} clicks • {point.total_value.toLocaleString()} AED Impact</span>
              </div>
              <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[2px]">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-20 text-slate-500 italic">
            No ghost behavior data linked to high-value orders yet.
          </div>
        )}
      </div>

      <div className="mt-10 pt-6 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-500 font-mono">
        <span>Neural Connector: crm_identity_links</span>
        <span className="animate-pulse">● Sync Active</span>
      </div>
    </div>
  );
}