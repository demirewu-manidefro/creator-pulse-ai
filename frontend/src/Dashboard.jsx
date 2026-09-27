import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, AlertTriangle, Globe, Search, Loader2, Play, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Vercel / VidIQ inspired color palette
const COLORS = {
  positive: '#10B981', // Emerald 500
  neutral: '#6B7280',  // Gray 500
  negative: '#EF4444', // Red 500
  fidel: '#8B5CF6',    // Violet 500
  romanized: '#3B82F6',// Blue 500
  english: '#F59E0B'   // Amber 500
};

export default function Dashboard() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle'); // idle, fetching, analyzing, completed, error
  const [data, setData] = useState(null);
  const [taskId, setTaskId] = useState(null);

  // Polling effect
  useEffect(() => {
    let interval;
    if (taskId && (status === 'fetching_comments' || status === 'running_inference' || status === 'pending')) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`http://localhost:8000/api/results/${taskId}`);
          const json = await res.json();
          
          if (json.status === 'completed') {
            setData(json.result);
            setStatus('completed');
            setTaskId(null);
          } else if (json.status === 'failed') {
            setStatus('error');
            setTaskId(null);
          } else {
            setStatus(json.status);
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [taskId, status]);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!url) return;
    
    setStatus('pending');
    setData(null);
    
    try {
      const res = await fetch('http://localhost:8000/api/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: url })
      });
      const json = await res.json();
      setTaskId(json.task_id);
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  const getSentimentData = () => {
    if (!data) return [];
    return [
      { name: 'Positive', value: data.overall_sentiment.positive, color: COLORS.positive },
      { name: 'Neutral', value: data.overall_sentiment.neutral, color: COLORS.neutral },
      { name: 'Negative', value: data.overall_sentiment.negative, color: COLORS.negative },
    ];
  };

  const getDemographicsData = () => {
    if (!data) return [];
    return [
      { name: 'Fidel (Amharic)', value: data.language_demographics.fidel, fill: COLORS.fidel },
      { name: 'Romanized', value: data.language_demographics.romanized, fill: COLORS.romanized },
      { name: 'English', value: data.language_demographics.english, fill: COLORS.english },
    ];
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-violet-500/30">
      
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-violet-600 to-blue-500 p-1.5 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              CreatorPulse <span className="text-violet-500 font-medium">Ethiopia</span>
            </h1>
          </div>
          <div className="text-sm text-gray-400">MVP Engine v1.0</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Input Section */}
        <section className="mb-12">
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <h2 className="text-2xl font-semibold mb-2">Analyze Content</h2>
            <p className="text-gray-400 mb-6 max-w-2xl">
              Paste a YouTube video URL to extract Amharic/English sentiment, identify content requests, and surface production pain points.
            </p>
            
            <form onSubmit={handleAnalyze} className="flex gap-4 relative z-10">
              <div className="relative flex-1">
                <Play className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input 
                  type="text" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all placeholder:text-gray-600"
                  disabled={status !== 'idle' && status !== 'completed' && status !== 'error'}
                />
              </div>
              <button 
                type="submit"
                disabled={!url || (status !== 'idle' && status !== 'completed' && status !== 'error')}
                className="bg-white text-black font-medium px-8 py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {status === 'pending' || status === 'fetching_comments' || status === 'running_inference' ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing</>
                ) : (
                  <><Search className="w-5 h-5" /> Analyze</>
                )}
              </button>
            </form>

            {/* Status Indicator */}
            {(status === 'fetching_comments' || status === 'running_inference') && (
              <div className="mt-6 flex items-center gap-3 text-sm text-violet-400 bg-violet-500/10 p-3 rounded-lg border border-violet-500/20 w-fit">
                <Loader2 className="w-4 h-4 animate-spin" />
                {status === 'fetching_comments' ? 'Fetching comments & stripping HTML...' : 'Running high-speed batch inference...'}
              </div>
            )}
            
            {status === 'error' && (
              <div className="mt-6 flex items-center gap-3 text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20 w-fit">
                <AlertTriangle className="w-4 h-4" />
                Task failed. Please check the backend console.
              </div>
            )}
          </div>
        </section>

        {/* Results Grid */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* 1. Audience Sentiment Health Score */}
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  Sentiment Health
                </h3>
                <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  data.sentiment_index > 20 ? 'bg-emerald-500/20 text-emerald-400' : 
                  data.sentiment_index < -20 ? 'bg-red-500/20 text-red-400' : 
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  Index: {data.sentiment_index.toFixed(1)}
                </div>
              </div>
              
              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getSentimentData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {getSentimentData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value) => `${value.toFixed(1)}%`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="text-center">
                  <div className="text-emerald-500 flex items-center justify-center mb-1"><ThumbsUp className="w-4 h-4" /></div>
                  <div className="text-xl font-bold">{data.overall_sentiment.positive.toFixed(0)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-500 flex items-center justify-center mb-1"><Minus className="w-4 h-4" /></div>
                  <div className="text-xl font-bold">{data.overall_sentiment.neutral.toFixed(0)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-red-500 flex items-center justify-center mb-1"><ThumbsDown className="w-4 h-4" /></div>
                  <div className="text-xl font-bold">{data.overall_sentiment.negative.toFixed(0)}%</div>
                </div>
              </div>
            </div>

            {/* 2. Language Demographics */}
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <Globe className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold">Language Demographics</h3>
              </div>
              <p className="text-xs text-gray-500 mb-6">Dialect and script breakdown of the comment section.</p>
              
              <div className="flex-1 min-h-[200px] -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getDemographicsData()} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} width={100} />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '8px' }}
                      formatter={(value) => `${value.toFixed(1)}%`}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Content Goldmine & Requests */}
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 lg:col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-4 h-4 text-violet-500" />
                <h3 className="font-semibold">Content Goldmine</h3>
              </div>
              <p className="text-xs text-gray-500 mb-4">Top requested topics and videos from your audience.</p>
              
              {data.top_requests.length > 0 ? (
                <div className="space-y-3">
                  {data.top_requests.map((req, i) => (
                    <div key={i} className="bg-white/5 border border-white/5 rounded-lg p-3 flex justify-between items-center group hover:bg-white/10 transition-colors">
                      <span className="text-sm font-medium">"{req.topic}"</span>
                      <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-1 rounded font-bold">
                        {req.count} requests
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic text-center py-8">No specific content requests detected.</div>
              )}
            </div>

            {/* 4. Pain Point & Crisis Alert */}
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 lg:col-span-3">
              <div className="flex items-center gap-2 mb-6">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h3 className="font-semibold">Pain Point Alerts</h3>
              </div>
              
              {data.pain_points.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data.pain_points.map((pain, i) => (
                    <div key={i} className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full"></div>
                      <div className="text-red-400 font-medium mb-1 capitalize">{pain.issue} Issue</div>
                      <div className="text-2xl font-bold">{pain.count} <span className="text-sm font-normal text-gray-500">complaints</span></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6 text-center">
                  <Activity className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <div className="font-medium text-emerald-400">All clear!</div>
                  <div className="text-sm text-emerald-500/70">No major production issues detected in the comments.</div>
                </div>
              )}
            </div>
            
          </div>
        )}
      </main>
    </div>
  );
}
