import React, { useMemo } from 'react';
import { Student } from '../types';
import { examSessions, getRoomForGroup } from '../data/rawRoster';
import { Award, Users, GraduationCap, AlertCircle, TrendingUp, BarChart2, BookOpen, Clock, Info } from 'lucide-react';

interface StatisticsPanelProps {
  students: Student[];
}

export default function StatisticsPanel({ students }: StatisticsPanelProps) {
  const classesList = ['3A', '3B', '3C', '3D', '3E', '3F'];
  const colorsList = ['Blue', 'Green', 'Red', 'Purple'];

  // 1. Overall high-level statistics
  const stats = useMemo(() => {
    const total = students.length;
    const present = students.filter(s => s.attendance === 'Present').length;
    const late = students.filter(s => s.attendance === 'Late').length;
    const absent = students.filter(s => s.attendance === 'Absent').length;
    const unmarked = students.filter(s => s.attendance === 'Unmarked').length;
    const graded = students.filter(s => s.marks).length;
    
    const tested = present + late;
    const totalScore = students.reduce((sum, s) => sum + (s.marks?.total || 0), 0);
    const averageScore = graded > 0 ? (totalScore / graded).toFixed(1) : '0.0';

    return { total, present, late, absent, unmarked, graded, tested, averageScore };
  }, [students]);

  // 2. Class-by-Class Attendance and Score averages
  const classBreakdown = useMemo(() => {
    return classesList.map(cls => {
      const clsStudents = students.filter(s => s.class === cls);
      const total = clsStudents.length;
      const present = clsStudents.filter(s => s.attendance === 'Present').length;
      const late = clsStudents.filter(s => s.attendance === 'Late').length;
      const absent = clsStudents.filter(s => s.attendance === 'Absent').length;
      const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
      
      const graded = clsStudents.filter(s => s.marks);
      const scoreSum = graded.reduce((sum, s) => sum + (s.marks?.total || 0), 0);
      const averageScore = graded.length > 0 ? (scoreSum / graded.length).toFixed(1) : '0.0';

      return {
        class: cls,
        total,
        present,
        late,
        absent,
        attendanceRate,
        gradedCount: graded.length,
        averageScore
      };
    });
  }, [students]);

  // 3. Mark Distribution intervals (4-8, 9-12, 13-16, 17-20, 21-24)
  const scoreDistribution = useMemo(() => {
    const intervals = [
      { label: '4 – 8 (Weak)', range: [4, 8], count: 0, color: 'bg-red-400 dark:bg-red-500' },
      { label: '9 – 12 (Satisfactory)', range: [9, 12], count: 0, color: 'bg-amber-400 dark:bg-amber-500' },
      { label: '13 – 16 (Good)', range: [13, 16], count: 0, color: 'bg-indigo-400 dark:bg-indigo-500' },
      { label: '17 – 20 (Very Good)', range: [17, 20], count: 0, color: 'bg-purple-400 dark:bg-purple-500' },
      { label: '21 – 24 (Excellent)', range: [21, 24], count: 0, color: 'bg-emerald-400 dark:bg-emerald-500' }
    ];

    let totalGraded = 0;
    students.forEach(s => {
      if (s.marks) {
        totalGraded++;
        const val = s.marks.total;
        intervals.forEach(inv => {
          if (val >= inv.range[0] && val <= inv.range[1]) {
            inv.count++;
          }
        });
      }
    });

    return intervals.map(inv => ({
      ...inv,
      percentage: totalGraded > 0 ? Math.round((inv.count / totalGraded) * 100) : 0
    }));
  }, [students]);

  // 4. Candidate House colors breakdown
  const houseDistribution = useMemo(() => {
    return colorsList.map(color => {
      const houseStudents = students.filter(s => s.candidateColor.trim().toLowerCase() === color.toLowerCase());
      const total = houseStudents.length;
      const graded = houseStudents.filter(s => s.marks);
      const scoreSum = graded.reduce((sum, s) => sum + (s.marks?.total || 0), 0);
      const averageScore = graded.length > 0 ? (scoreSum / graded.length).toFixed(1) : '0.0';

      let houseBadge = 'from-blue-500 to-indigo-600 shadow-blue-500/10 dark:from-blue-900/60 dark:to-indigo-950/60';
      if (color === 'Green') houseBadge = 'from-emerald-500 to-teal-600 shadow-emerald-500/10 dark:from-emerald-950/60 dark:to-teal-950/60';
      if (color === 'Red') houseBadge = 'from-rose-500 to-pink-600 shadow-rose-500/10 dark:from-rose-950/60 dark:to-pink-950/60';
      if (color === 'Purple') houseBadge = 'from-purple-500 to-fuchsia-600 shadow-purple-500/10 dark:from-purple-950/60 dark:to-fuchsia-950/60';

      return {
        house: color,
        total,
        graded: graded.length,
        averageScore,
        styling: houseBadge
      };
    });
  }, [students]);

  // 5. Rubric sub-criteria averages breakdown
  const criteriaStats = useMemo(() => {
    const graded = students.filter(s => s.marks);
    const count = graded.length;
    if (count === 0) {
      return { pronunciation: '0.0', communicative: '0.0', vocabulary: '0.0', ideas: '0.0' };
    }

    const pSum = graded.reduce((sum, s) => sum + (s.marks?.pronunciation || 0), 0);
    const cSum = graded.reduce((sum, s) => sum + (s.marks?.communicative || 0), 0);
    const vSum = graded.reduce((sum, s) => sum + (s.marks?.vocabulary || 0), 0);
    const iSum = graded.reduce((sum, s) => sum + (s.marks?.ideas || 0), 0);

    return {
      pronunciation: (pSum / count).toFixed(2),
      communicative: (cSum / count).toFixed(2),
      vocabulary: (vSum / count).toFixed(2),
      ideas: (iSum / count).toFixed(2)
    };
  }, [students]);

  return (
    <div className="space-y-6">
      {/* High-level performance indicators */}
      <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
        <TrendingUp size={20} className="text-indigo-500" /> Analytical Insights Dashboard
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left column: Score distribution + Rubrics */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-sm">
              <BarChart2 size={16} className="text-indigo-500" /> English Speaking Score Ranges
            </h4>
            
            <p className="text-xs text-slate-550 leading-relaxed dark:text-slate-400">
              Distribution of speaking total marks (4 to 24) across {stats.graded} graded candidates. Weak is 4-8, Excellent is 21-24. See passing density.
            </p>

            <div className="space-y-3.5 pt-2">
              {scoreDistribution.map((item, idx) => {
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-350">{item.label}</span>
                      <span className="font-mono text-slate-500 dark:text-slate-450 font-bold">{item.count} Candidates ({item.percentage}%)</span>
                    </div>
                    <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${item.percentage}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sub-Criteria Breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-sm mb-4">
              <GraduationCap size={16} className="text-indigo-500" /> Criteria performance Rubric
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                { title: 'Pronunciation & Delivery', val: criteriaStats.pronunciation, max: '6.0', color: 'border-l-indigo-500 hover:bg-indigo-500/5' },
                { title: 'Communicative Strategies', val: criteriaStats.communicative, max: '6.0', color: 'border-l-emerald-500 hover:bg-emerald-500/5' },
                { title: 'Vocabulary & Language', val: criteriaStats.vocabulary, max: '6.0', color: 'border-l-purple-500 hover:bg-purple-500/5' },
                { title: 'Ideas & Organization', val: criteriaStats.ideas, max: '6.0', color: 'border-l-amber-500 hover:bg-amber-500/5' },
              ].map((cri, i) => (
                <div key={i} className={`p-4 bg-slate-50/50 dark:bg-slate-955 rounded-xl border border-slate-150 dark:border-slate-850 border-l-4 ${cri.color} transition`}>
                  <div className="text-[10px] text-slate-450 uppercase font-black tracking-wider leading-relaxed truncate px-1">{cri.title}</div>
                  <div className="text-3xl font-black font-mono text-slate-800 dark:text-slate-200 mt-2">{cri.val}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Average of {cri.max}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: House Colors Comparison & Highlights */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-sm mb-1">
              <Award size={16} className="text-indigo-500" /> School House Stats Comparison
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-450 mb-4">
              Speaking achievement average comparisons categorized by student group candidate colors.
            </p>

            <div className="space-y-3.5">
              {houseDistribution.map((hs, i) => {
                return (
                  <div
                    key={i}
                    className={`p-3.5 bg-gradient-to-r ${hs.styling} text-white rounded-xl shadow`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-base block">{hs.house} House</span>
                        <span className="text-[10px] text-white/70 block mt-0.5">Tested Candidates: {hs.graded} / {hs.total}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black font-mono select-all text-white">{hs.averageScore}</span>
                        <span className="text-[10px] block opacity-80 font-mono">Exam Avg</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-955 p-3.5 rounded-xl border border-slate-150 dark:border-slate-850 text-xs text-slate-600 dark:text-slate-400 font-medium flex items-start gap-2.5 mt-5">
            <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-mono text-[10px]">
              Tip: Blue House has the highest candidate density. Red and Purple houses represent students tested in secondary shifts (after breaks).
            </p>
          </div>
        </div>
      </div>

      {/* Cohort Grid Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-sm mb-4">
          <BookOpen size={16} className="text-indigo-500" /> Class-by-Class Attendance and Performance Index
        </h4>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-150 dark:border-slate-850">
                <th className="py-2.5 px-3">Class</th>
                <th className="py-2.5 px-3">Enrolled Size</th>
                <th className="py-2.5 px-3 text-center">Attendance rate</th>
                <th className="py-2.5 px-3 text-center">Absent count</th>
                <th className="py-2.5 px-3 text-center">Graded index Progress</th>
                <th className="py-2.5 px-3 text-right">Speaking Mark average</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-mono">
              {classBreakdown.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition">
                  <td className="py-3 px-3 font-bold text-slate-805 dark:text-slate-200">{row.class}</td>
                  <td className="py-3 px-3 text-slate-500 dark:text-slate-450">{row.total} Students</td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{row.attendanceRate}%</span>
                    <div className="w-16 h-1 bg-slate-100 dark:bg-slate-950 rounded-full mx-auto mt-1 overflow-hidden">
                      <div
                        style={{ width: `${row.attendanceRate}%` }}
                        className={`h-full ${row.attendanceRate >= 95 ? 'bg-emerald-500' : 'bg-indigo-505'}`}
                      />
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center text-rose-500 font-bold">{row.absent}</td>
                  <td className="py-3 px-3 text-center">
                    {row.gradedCount} <span className="text-[10px] text-slate-400">/ {row.present + row.late} tested</span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-indigo-650 dark:text-indigo-400">{row.averageScore} / 24</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
