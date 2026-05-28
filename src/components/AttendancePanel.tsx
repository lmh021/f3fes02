import React, { useState } from 'react';
import { Student, ExamSession, UndoAction } from '../types';
import { examSessions, getRoomForGroup } from '../data/rawRoster';
import { getStudentUid } from '../utils/studentParser';
import { AlertCircle, CheckCircle, Clock, Undo, Users, Filter, Check, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AttendancePanelProps {
  students: Student[];
  onUpdateAttendance: (studentClass: string, classNo: number, status: Student['attendance']) => void;
  onBulkAttendance: (studentClassNoList: { class: string; classNo: number }[], status: Student['attendance']) => void;
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
  undoStack: UndoAction[];
  onUndo: () => void;
}

export default function AttendancePanel({
  students,
  onUpdateAttendance,
  onBulkAttendance,
  activeSessionId,
  setActiveSessionId,
  undoStack,
  onUndo,
}: AttendancePanelProps) {
  const [filterClass, setFilterClass] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Get current session object
  const currentSession = examSessions.find(s => s.id === activeSessionId) || examSessions[0];

  // Unique classes for filtering helper
  const classesList = ['All', '3A', '3B', '3C', '3D', '3E', '3F'];

  // Under current session, what are the groups? (e.g. groups [1, 2, 3])
  const activeGroupNums = currentSession.groups;

  // Filter students based on current session's groups or name search
  const getStudentsInGroup = (groupNum: number) => {
    return students.filter(student => {
      // Must belong to this group
      if (student.group !== groupNum) return false;

      // Class filter
      if (filterClass !== 'All' && student.class !== filterClass) return false;

      // Name search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          student.ename.toLowerCase().includes(term) ||
          student.class.toLowerCase().includes(term) ||
          student.candidateNo.toString().includes(term)
        );
      }

      return true;
    });
  };

  // Get count helpers for progress indicators
  const sessionStudents = students.filter(s => activeGroupNums.includes(s.group));
  const markedCount = sessionStudents.filter(s => s.attendance !== 'Unmarked').length;
  const totalCount = sessionStudents.length;
  const presentCount = sessionStudents.filter(s => s.attendance === 'Present').length;
  const lateCount = sessionStudents.filter(s => s.attendance === 'Late').length;
  const absentCount = sessionStudents.filter(s => s.attendance === 'Absent').length;

  const handleMarkAllGroupPresent = (groupNum: number) => {
    const unmarkedGroupStudents = students.filter(
      s => s.group === groupNum && s.attendance === 'Unmarked'
    );
    if (unmarkedGroupStudents.length === 0) return;

    onBulkAttendance(
      unmarkedGroupStudents.map(s => ({ class: s.class, classNo: s.classNo })),
      'Present'
    );
  };

  // Helpers to get color badge styling
  const getColorBadgeStyle = (color: string) => {
    const lower = color.trim().toLowerCase();
    switch (lower) {
      case 'blue':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800/60';
      case 'green':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60';
      case 'red':
        return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/60';
      case 'purple':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800/60';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-750';
    }
  };

  // Check if a student's last action is at the top of the undo stack (to highlight edit undo next to row)
  const isLastActionForStudent = (studentClass: string, classNo: number) => {
    if (undoStack.length === 0) return false;
    const last = undoStack[undoStack.length - 1];
    const uid = `${studentClass}-${classNo}`;
    return last.payload.studentIds.includes(uid);
  };

  return (
    <div className="space-y-6">
      {/* Banner / Instructions */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden border border-blue-500/10">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-12 -translate-y-6">
          <Users size={180} />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="px-3 py-1 bg-white/20 text-white font-mono text-xs font-semibold rounded-full uppercase tracking-wider backdrop-blur-md">
              Preparation Room (Classroom 5A) Guide
            </span>
            <div className="flex items-center gap-2 font-mono text-xs text-blue-100 bg-black/15 px-3 py-1.5 rounded-lg border border-white/10">
              <Clock size={14} /> Schedule Date: Thursday, 10th June, 2026
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Report Room Attendance Desk</h2>
          <p className="text-blue-100 text-sm max-w-2xl leading-relaxed">
            Welcome, Preparation Room Supervisor! Take attendance for candidate groups 10 minutes before their designated reporting time. Present students will be issued two score sheets and one chest chest-label before proceeding to preparation.
          </p>
        </div>
      </div>

      {/* Control Strip & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Session Switcher Container */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock size={18} className="text-indigo-500" /> Select Examination Session
            </h3>
            {undoStack.length > 0 && (
              <button
                onClick={onUndo}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/60 rounded-lg text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
              >
                <Undo size={14} /> Undo Last Action ({undoStack.length})
              </button>
            )}
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5">
            {examSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              // Check if any student in this group is unmarked
              const sessionGroupNums = session.groups;
              const hasUnmarked = students.some(
                s => sessionGroupNums.includes(s.group) && s.attendance === 'Unmarked'
              );
              const allAbsent = students.some(
                s => sessionGroupNums.includes(s.group)
              ) && students.filter(
                s => sessionGroupNums.includes(s.group)
              ).every(s => s.attendance === 'Absent');

              return (
                <button
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  id={`session-btn-${session.id}`}
                  className={`relative py-2.5 rounded-xl font-mono text-sm font-bold flex flex-col items-center justify-center border transition ${
                    isActive
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <span className="text-base leading-none">{session.id}</span>
                  <span className={`text-[9px] leading-none mt-1 ${isActive ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-505'}`}>
                    {session.reportingTime}
                  </span>
                  
                  {/* Attendance status dot */}
                  {hasUnmarked ? (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                  ) : allAbsent ? (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
                  ) : (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Session Mini Details */}
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-150 dark:border-slate-850 p-3.5 rounded-xl text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3 text-slate-600 dark:text-slate-400">
            <div>
              <span className="font-semibold text-slate-850 dark:text-slate-200">Session {currentSession.id}</span>
              <span className="mx-2">•</span>
              Reporting: <strong className="text-slate-900 dark:text-indigo-400 font-mono">{currentSession.reportingTime}</strong>
              <span className="mx-2">•</span>
              Prep Window: <span className="font-mono">{currentSession.preparationTime}</span>
            </div>
            <div>
              Active Rooms: <strong className="text-slate-850 dark:text-slate-200">5C (Grp {currentSession.groups[0]}), 5D (Grp {currentSession.groups[1]}), 5E (Grp {currentSession.groups[2]})</strong>
            </div>
          </div>
        </div>

        {/* Quick Stats Column */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Session Progress</h3>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2.5 uppercase rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-450">
                    Checked In
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono inline-block text-slate-800 dark:text-slate-250">
                    {markedCount} / {totalCount} Students ({totalCount > 0 ? Math.round((markedCount / totalCount) * 100) : 0}%)
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2.5 mb-4 text-xs flex rounded-full bg-slate-100 dark:bg-slate-950">
                <div
                  style={{ width: `${totalCount > 0 ? (presentCount / totalCount) * 100 : 0}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-emerald-500 rounded-l"
                />
                <div
                  style={{ width: `${totalCount > 0 ? (lateCount / totalCount) * 100 : 0}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-amber-500"
                />
                <div
                  style={{ width: `${totalCount > 0 ? (absentCount / totalCount) * 100 : 0}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-rose-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center mt-3 sm:mt-1">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-950/50 p-2 rounded-xl">
              <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-450">{presentCount}</div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium uppercase">Present</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-950/50 p-2 rounded-xl">
              <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-450">{lateCount}</div>
              <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium uppercase">Late</div>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/50 p-2 rounded-xl">
              <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-450">{absentCount}</div>
              <div className="text-[10px] text-rose-700 dark:text-rose-400 font-medium uppercase">Absent</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search candidate name, class, candidate number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm bg-slate-50 dark:bg-[#0F172A] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <Filter size={16} className="absolute left-3 top-3 text-slate-400" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 uppercase font-medium font-mono hidden sm:inline">Filter Class:</span>
          <div className="flex gap-1 overflow-x-auto">
            {classesList.map((cls) => (
              <button
                key={cls}
                onClick={() => setFilterClass(cls)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap cursor-pointer ${
                  filterClass === cls
                    ? 'bg-blue-600 dark:bg-white text-white dark:text-slate-950 border-blue-650 dark:border-white font-extrabold'
                    : 'bg-slate-50 dark:bg-[#0F172A] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Groups */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {activeGroupNums.map((groupNum) => {
          const groupStudents = getStudentsInGroup(groupNum);
          const totalInGroup = students.filter(s => s.group === groupNum).length;
          const markedInGroup = students.filter(s => s.group === groupNum && s.attendance !== 'Unmarked').length;
          const allMarked = totalInGroup === markedInGroup;
          const assignedRoom = getRoomForGroup(groupNum);

          return (
            <div
              key={groupNum}
              className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden flex flex-col"
            >
              {/* Group Header Card */}
              <div className="bg-slate-50 dark:bg-[#0F172A]/70 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Users size={16} className="text-blue-500" /> Group {groupNum}
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] font-mono mt-0.5">
                    Classroom Room: <strong className="text-blue-600 dark:text-blue-400">{assignedRoom}</strong>
                  </p>
                </div>
                
                {/* Instant Bulk Present */}
                {!allMarked ? (
                  <button
                    onClick={() => handleMarkAllGroupPresent(groupNum)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    <Check size={12} className="stroke-[3px]" /> Check-in All
                  </button>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-[#0F172A] text-slate-500 dark:text-slate-400 rounded-lg text-[10px] font-bold font-mono uppercase">
                    <CheckCircle size={10} className="text-emerald-500" /> Ready
                  </span>
                )}
              </div>

              {/* Group Students List */}
              <div className="divide-y divide-slate-100 dark:divide-slate-850 flex-1">
                {groupStudents.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                    No candidates found matches filters.
                  </div>
                ) : (
                  groupStudents.map((currStudent) => {
                    const isLastAction = isLastActionForStudent(currStudent.class, currStudent.classNo);
                    return (
                      <div
                        key={getStudentUid(currStudent)}
                        id={`student-row-${getStudentUid(currStudent)}`}
                        className={`p-4 hover:bg-slate-50/50 dark:hover:bg-[#0F172A]/40 transition flex flex-col space-y-3 relative ${
                          isLastAction ? 'ring-1 ring-inset ring-blue-500 dark:ring-blue-400 bg-blue-500/5' : ''
                        }`}
                      >
                        {/* Student Core Meta */}
                        <div className="flex items-start justify-between gap-1">
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                              <span className="bg-slate-150 dark:bg-[#0F172A] px-1.5 py-0.5 rounded font-mono font-bold text-slate-800 dark:text-slate-300 border dark:border-slate-800">
                                {currStudent.class} ({currStudent.classNo})
                              </span>
                            </span>
                            <h5 className="font-bold text-slate-900 dark:text-white leading-tight text-sm">
                              {currStudent.ename}
                            </h5>
                          </div>

                          {/* Candidate Color/Number Label */}
                          <div className="text-right">
                            <span className={`inline-block px-2.2 py-0.5 rounded-full text-[10px] font-bold border ${getColorBadgeStyle(currStudent.candidateColor)}`}>
                              {currStudent.candidateColor} {currStudent.candidateNo}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Buttons Stack */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-dashed border-slate-150 dark:border-slate-800">
                          {/* Options Grid */}
                          <div className="flex gap-1.5 flex-1 max-w-xs">
                            <button
                              onClick={() => {
                                onUpdateAttendance(currStudent.class, currStudent.classNo, 'Present');
                              }}
                              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1 cursor-pointer ${
                                currStudent.attendance === 'Present'
                                  ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white shadow-sm'
                                  : 'bg-slate-50 dark:bg-[#0F172A] border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                              }`}
                            >
                              {currStudent.attendance === 'Present' && <Check size={12} className="stroke-[3px]" />}
                              Pres.
                            </button>

                            <button
                              onClick={() => {
                                onUpdateAttendance(currStudent.class, currStudent.classNo, 'Late');
                              }}
                              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1 cursor-pointer ${
                                currStudent.attendance === 'Late'
                                  ? 'bg-amber-500 hover:bg-amber-600 border-amber-500 text-slate-950 shadow-sm'
                                  : 'bg-slate-50 dark:bg-[#0F172A] border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                              }`}
                            >
                              {currStudent.attendance === 'Late' && <Check size={12} className="text-slate-950 stroke-[3px]" />}
                              Late
                            </button>

                            <button
                              onClick={() => {
                                onUpdateAttendance(currStudent.class, currStudent.classNo, 'Absent');
                              }}
                              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1 cursor-pointer ${
                                currStudent.attendance === 'Absent'
                                  ? 'bg-rose-500 hover:bg-rose-600 border-rose-500 text-white shadow-sm'
                                  : 'bg-slate-50 dark:bg-[#0F172A] border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-450 hover:bg-rose-500/10'
                              }`}
                            >
                              {currStudent.attendance === 'Absent' && <Check size={12} className="stroke-[3px]" />}
                              Abs.
                            </button>
                          </div>

                          {/* Quick Undo Indicator */}
                          {isLastAction && (
                            <button
                              onClick={onUndo}
                              title="Undo this attendance mark"
                              className="p-1 px-2 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-[#1E293B] rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm transition cursor-pointer"
                            >
                              <Undo size={10} /> Undo
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
