import React, { useState } from 'react';
import { 
  Users, 
  Receipt, 
  Calendar, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  MoreHorizontal,
  GraduationCap,
  Award,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Check,
  X
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { mockEvents, mockFacultyUpdates } from '../../data/mockData';

export const ExecutiveDashboard: React.FC = () => {
  const [chartPeriod, setChartPeriod] = useState<'Weekly' | 'Monthly' | 'Yearly'>('Monthly');
  const [facultyUpdates, setFacultyUpdates] = useState(mockFacultyUpdates);

  // Smooth Area/Line chart data matching screenshot curve (Jan, Mar, May, Jul, Sep, Nov)
  const performanceData = [
    { month: 'Jan', gradePoint: 42, attendance: 52 },
    { month: 'Mar', gradePoint: 68, attendance: 58 },
    { month: 'May', gradePoint: 62, attendance: 48 },
    { month: 'Jul', gradePoint: 78, attendance: 65 },
    { month: 'Sep', gradePoint: 84, attendance: 68 },
    { month: 'Nov', gradePoint: 95, attendance: 72 },
  ];

  // Financial summary bar chart data (Q1, Q2, Q3, Q4, Q1'24)
  const financialData = [
    { quarter: 'Q1', val: 45 },
    { quarter: 'Q2', val: 65 },
    { quarter: 'Q3', val: 52 },
    { quarter: 'Q4', val: 88 },
    { quarter: "Q1'24", val: 60 },
  ];

  const handleApproveLeave = (id: string) => {
    setFacultyUpdates(prev => prev.map(fu => fu.id === id ? { ...fu, needsApproval: false } : fu));
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      
      {/* TOP STAT CARDS (4 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: TOTAL STUDENTS */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">TOTAL STUDENTS</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">14,295</div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold">
                <TrendingUp className="w-3.5 h-3.5" /> +4.2%
              </span>
              <span>vs last semester</span>
            </div>
          </div>
        </div>

        {/* Card 2: REVENUE (YTD) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">REVENUE (YTD)</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">$12.4M</div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold">
                <TrendingUp className="w-3.5 h-3.5" /> +12.8%
              </span>
              <span>vs last year</span>
            </div>
          </div>
        </div>

        {/* Card 3: STAFF ATTENDANCE */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">STAFF ATTENDANCE</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">98.2%</div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="inline-flex items-center gap-0.5 text-rose-600 font-bold">
                <TrendingDown className="w-3.5 h-3.5" /> -0.5%
              </span>
              <span>vs last week</span>
            </div>
          </div>
        </div>

        {/* Card 4: PENDING APPS */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">PENDING APPS</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">432</div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-slate-900 h-full w-[65%] rounded-full"></div>
              </div>
              <span className="text-xs text-slate-500 font-medium">65% Processed</span>
            </div>
          </div>
        </div>

      </div>

      {/* MIDDLE SECTION (2 Columns: Academic Chart vs Financial Summary) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left: Academic Performance vs Attendance Chart (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Academic Performance vs Attendance
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Year-over-year correlation analysis across all departments.
              </p>
            </div>

            {/* Toggle Buttons (Weekly, Monthly, Yearly) */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold self-start sm:self-auto">
              {(['Weekly', 'Monthly', 'Yearly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setChartPeriod(p)}
                  className={`px-4 py-1.5 rounded-lg transition-all ${
                    chartPeriod === p
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Smooth Recharts Curved Area Chart */}
          <div className="h-72 mt-8">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e293b" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#1e293b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="gradePoint" 
                  stroke="#0f172a" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#gradeGradient)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="attendance" 
                  stroke="#475569" 
                  strokeWidth={2} 
                  strokeDasharray="4 4" 
                  fillOpacity={0} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span>
              <span>Avg. Grade Point</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-600 border-dashed"></span>
              <span>Attendance Rate</span>
            </div>
          </div>
        </div>

        {/* Right: Financial Summary (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Financial Summary
            </h2>

            {/* Quarter Bar Chart */}
            <div className="h-48 mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <XAxis dataKey="quarter" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Bar dataKey="val" fill="#1e293b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary Pills matching screenshot */}
          <div className="space-y-3 mt-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700">Tuition Fees</span>
              </div>
              <span className="text-sm font-extrabold text-slate-900">$8.4M</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <Award className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700">Grants & Alumni</span>
              </div>
              <span className="text-sm font-extrabold text-slate-900">$3.2M</span>
            </div>
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION (3 Equal Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Column 1: Upcoming Events */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Upcoming Events</h3>
              <MoreHorizontal className="w-5 h-5 text-slate-400 cursor-pointer" />
            </div>

            <div className="space-y-5">
              {mockEvents.map((ev) => (
                <div key={ev.id} className="flex items-start gap-4">
                  <div className="bg-slate-100 rounded-xl p-2.5 text-center min-w-[54px]">
                    <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">{ev.dateDay.split(' ')[0]}</div>
                    <div className="text-base font-extrabold text-slate-900 leading-none mt-0.5">{ev.dateDay.split(' ')[1]}</div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">{ev.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {ev.timeLocation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="w-full mt-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors">
            View Full Calendar
          </button>
        </div>

        {/* Column 2: Faculty Updates [LIVE] */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Faculty Updates</h3>
              <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md uppercase">
                LIVE
              </span>
            </div>

            <div className="space-y-5">
              {facultyUpdates.map((fu) => (
                <div key={fu.id} className="flex items-start gap-3 text-xs">
                  <img
                    src={fu.avatarUrl}
                    alt={fu.authorName}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100 mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="text-slate-800 font-medium">
                      <strong className="font-bold text-slate-900">{fu.authorName}</strong> {fu.title}
                    </p>
                    <span className="text-[11px] text-slate-400 block mt-1">{fu.timeAgo}</span>

                    {fu.needsApproval && (
                      <div className="flex gap-2 mt-2">
                        <button 
                          onClick={() => handleApproveLeave(fu.id)}
                          className="px-3 py-1 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Approve
                        </button>
                        <button 
                          onClick={() => handleApproveLeave(fu.id)}
                          className="px-3 py-1 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> Deny
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: System Health */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 text-lg">System Health</h3>
            </div>

            <div className="space-y-4">
              
              {/* Item 1: Payment Gateway Latency */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0"></span>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Payment Gateway Latency</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                      Stripe API is responding slower than usual (avg 850ms). Monitoring situation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Item 2: Storage Capacity Alert */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
                  <div className="flex-1">
                    <h4 className="font-bold text-xs text-slate-900">Storage Capacity Alert</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                      Database cluster is at 82% capacity. Scheduled cleanup required.
                    </p>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                      <div className="bg-amber-500 h-full w-[82%] rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Item 3: Nightly Backup Successful */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></span>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Nightly Backup Successful</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                      All system records securely archived to AWS Glacier.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
