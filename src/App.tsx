import React, { useState, useEffect } from 'react';
import { Student, ExamSession, UndoAction } from './types';
import { rooms } from './data/rawRoster';
import { parseStudentsCSV, getStudentUid, generateMockScores } from './utils/studentParser';
import AttendancePanel from './components/AttendancePanel';
import MarkingPanel from './components/MarkingPanel';
import ResultsSheet from './components/ResultsSheet';
import StatisticsPanel from './components/StatisticsPanel';
import TimerPanel from './components/TimerPanel';
import { ShieldCheck, CalendarRange, Trash2, Sun, Moon, Database, HelpCircle, Check, Undo, Users, Settings } from 'lucide-react';

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('A');
  const [activeRoom, setActiveRoom] = useState<typeof rooms[number]>('5C');
  const [activeTab, setActiveTab] = useState<'attendance' | 'evaluation' | 'timer' | 'sheet' | 'analytics'>('attendance');
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Load configuration and student state from localStorage on startup
  useEffect(() => {
    const cachedStudents = localStorage.getItem('school_speaking_attendance_students_v1');
    const cachedTab = localStorage.getItem('school_active_tab_v1');
    const cachedSession = localStorage.getItem('school_active_session_v1');
    const cachedRoom = localStorage.getItem('school_active_room_v1');
    const cachedDarkMode = localStorage.getItem('school_dark_mode_v1');

    if (cachedStudents) {
      try {
        setStudents(JSON.parse(cachedStudents));
      } catch (e) {
        // Fallback to parse original CSV
        setStudents(parseStudentsCSV());
      }
    } else {
      // Parse fresh roster
      setStudents(parseStudentsCSV());
    }

    if (cachedTab) setActiveTab(cachedTab as any);
    if (cachedSession) setActiveSessionId(cachedSession);
    if (cachedRoom) setActiveRoom(cachedRoom as any);
    
    // Default dark mode is fine and stunning
    if (cachedDarkMode !== null) {
      setDarkMode(cachedDarkMode === 'true');
    } else {
      setDarkMode(true);
    }
  }, []);

  // Persist student database updates
  const saveStudentState = (updatedStudents: Student[]) => {
    setStudents(updatedStudents);
    localStorage.setItem('school_speaking_attendance_students_v1', JSON.stringify(updatedStudents));
  };

  // Sync general options on change
  useEffect(() => {
    localStorage.setItem('school_active_tab_v1', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('school_active_session_v1', activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    localStorage.setItem('school_active_room_v1', activeRoom);
  }, [activeRoom]);

  useEffect(() => {
    localStorage.setItem('school_dark_mode_v1', String(darkMode));
    // Apply dark class to body or HTML wrapper for full CSS compliance
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Core mutating action: Take Attendance with Undo history support
  const handleUpdateAttendance = (studentClass: string, classNo: number, status: Student['attendance']) => {
    const prevAttendanceMap: Record<string, Student['attendance']> = {};
    const prevMarksMap: Record<string, Student['marks']> = {};
    const uid = `${studentClass}-${classNo}`;

    const updated = students.map(s => {
      if (s.class === studentClass && s.classNo === classNo) {
        prevAttendanceMap[uid] = s.attendance;
        prevMarksMap[uid] = s.marks;
        
        // If student is marked Absent, clear their scores as they are technically absent.
        // It prevents illogical data records (Absent but scored).
        let updatedMarks = s.marks;
        if (status === 'Absent') {
          updatedMarks = undefined;
        }

        return {
          ...s,
          attendance: status,
          attendanceTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          marks: updatedMarks
        };
      }
      return s;
    });

    // Create custom undo action
    const action: UndoAction = {
      id: crypto.randomUUID(),
      type: 'ATTENDANCE_CHANGE',
      timestamp: new Date().toISOString(),
      description: `Attendance of ${studentClass} #${classNo} updated to ${status}`,
      payload: {
        studentIds: [uid],
        prevAttendance: prevAttendanceMap,
        prevMarks: prevMarksMap
      }
    };

    setUndoStack(prev => [...prev, action]);
    saveStudentState(updated);
  };

  // Bulk input Attendance with Undo support
  const handleBulkAttendance = (studentClassNoList: { class: string; classNo: number }[], status: Student['attendance']) => {
    const prevAttendanceMap: Record<string, Student['attendance']> = {};
    const prevMarksMap: Record<string, Student['marks']> = {};
    const uidsAffected: string[] = [];

    const uuidsToTarget = new Set(studentClassNoList.map(item => `${item.class}-${item.classNo}`));

    const updated = students.map(s => {
      const studentUid = `${s.class}-${s.classNo}`;
      if (uuidsToTarget.has(studentUid)) {
        prevAttendanceMap[studentUid] = s.attendance;
        prevMarksMap[studentUid] = s.marks;
        uidsAffected.push(studentUid);

        let updatedMarks = s.marks;
        if (status === 'Absent') updatedMarks = undefined;

        return {
          ...s,
          attendance: status,
          attendanceTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          marks: updatedMarks
        };
      }
      return s;
    });

    const action: UndoAction = {
      id: crypto.randomUUID(),
      type: 'BATCH_ATTENDANCE',
      timestamp: new Date().toISOString(),
      description: `Bulk group check-in marked ${status} for ${studentClassNoList.length} students`,
      payload: {
        studentIds: uidsAffected,
        prevAttendance: prevAttendanceMap,
        prevMarks: prevMarksMap
      }
    };

    setUndoStack(prev => [...prev, action]);
    saveStudentState(updated);
  };

  // Core mutating action: Input Speaking Score with Undo history support
  const handleUpdateMarks = (studentClass: string, classNo: number, marks: Student['marks']) => {
    const prevAttendanceMap: Record<string, Student['attendance']> = {};
    const prevMarksMap: Record<string, Student['marks']> = {};
    const uid = `${studentClass}-${classNo}`;

    const updated = students.map(s => {
      if (s.class === studentClass && s.classNo === classNo) {
        prevAttendanceMap[uid] = s.attendance;
        prevMarksMap[uid] = s.marks;

        // If giving positive marks, ensure attendance is marked matching (Present or Late)
        let attendanceStatus = s.attendance;
        if (s.attendance === 'Unmarked' || s.attendance === 'Absent') {
          attendanceStatus = 'Present'; // Auto check-in override
        }

        return {
          ...s,
          attendance: attendanceStatus,
          marks
        };
      }
      return s;
    });

    const action: UndoAction = {
      id: crypto.randomUUID(),
      type: 'MARKS_CHANGE',
      timestamp: new Date().toISOString(),
      description: `Marks inputted for ${studentClass} #${classNo} (Score: ${marks?.total}/24)`,
      payload: {
        studentIds: [uid],
        prevAttendance: prevAttendanceMap,
        prevMarks: prevMarksMap
      }
    };

    setUndoStack(prev => [...prev, action]);
    saveStudentState(updated);
  };

  // Clear student rubrics/marks
  const handleBulkClearMarks = (studentClassNoList: { class: string; classNo: number }[]) => {
    const prevAttendanceMap: Record<string, Student['attendance']> = {};
    const prevMarksMap: Record<string, Student['marks']> = {};
    const uidsAffected: string[] = [];

    const uuidsToTarget = new Set(studentClassNoList.map(item => `${item.class}-${item.classNo}`));

    const updated = students.map(s => {
      const studentUid = `${s.class}-${s.classNo}`;
      if (uuidsToTarget.has(studentUid)) {
        prevAttendanceMap[studentUid] = s.attendance;
        prevMarksMap[studentUid] = s.marks;
        uidsAffected.push(studentUid);

        return {
          ...s,
          marks: undefined
        };
      }
      return s;
    });

    const action: UndoAction = {
      id: crypto.randomUUID(),
      type: 'MARKS_CHANGE',
      timestamp: new Date().toISOString(),
      description: `Evaluator scores cleared for ${studentClassNoList.length} students`,
      payload: {
        studentIds: uidsAffected,
        prevAttendance: prevAttendanceMap,
        prevMarks: prevMarksMap
      }
    };

    setUndoStack(prev => [...prev, action]);
    saveStudentState(updated);
  };

  // Chronological Undo execution
  const handleUndo = () => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack[undoStack.length - 1];
    const { studentIds, prevAttendance, prevMarks } = lastAction.payload;

    const studentIdsSet = new Set(studentIds);

    const reverted = students.map(s => {
      const uid = `${s.class}-${s.classNo}`;
      if (studentIdsSet.has(uid)) {
        return {
          ...s,
          attendance: prevAttendance[uid] ?? s.attendance,
          marks: prevMarks[uid] ?? s.marks
        };
      }
      return s;
    });

    // Remove popped action from undo state stack
    setUndoStack(prev => prev.slice(0, -1));
    saveStudentState(reverted);
  };

  // Clean wipe sheet
  const handleResetAllData = () => {
    const confirmWipe = window.confirm(
      'Are you absolutely sure you want to clear the entire database? This will clear all attendance records and marks back to standard blank form. This action can itself be undone via the undo button.'
    );
    if (!confirmWipe) return;

    const prevAttendanceMap: Record<string, Student['attendance']> = {};
    const prevMarksMap: Record<string, Student['marks']> = {};
    const allUids = students.map(s => {
      const uid = getStudentUid(s);
      prevAttendanceMap[uid] = s.attendance;
      prevMarksMap[uid] = s.marks;
      return uid;
    });

    const action: UndoAction = {
      id: crypto.randomUUID(),
      type: 'RESET_STATE',
      timestamp: new Date().toISOString(),
      description: 'Database fully cleared and reset',
      payload: {
        studentIds: allUids,
        prevAttendance: prevAttendanceMap,
        prevMarks: prevMarksMap
      }
    };

    setUndoStack(prev => [...prev, action]);
    saveStudentState(parseStudentsCSV());
    setIsSettingsOpen(false);
  };

  // Prefill Demo Marks for Evaluation and preview of Charts
  const handleLoadMockDemoMarks = () => {
    const confirmation = window.confirm(
      'Do you want to pre-fill the sheet with realistic mock attendance and evaluation marks for testing? This is perfect for reviewing the Analytics and Results sheet export. (You can clear this anytime).'
    );
    if (!confirmation) return;

    const originalRoster = parseStudentsCSV();
    const mockRoster = generateMockScores(originalRoster);
    
    // Enable undo
    const prevAttendanceMap: Record<string, Student['attendance']> = {};
    const prevMarksMap: Record<string, Student['marks']> = {};
    const allUids = students.map(s => {
      const uid = getStudentUid(s);
      prevAttendanceMap[uid] = s.attendance;
      prevMarksMap[uid] = s.marks;
      return uid;
    });

    const action: UndoAction = {
      id: crypto.randomUUID(),
      type: 'RESET_STATE',
      timestamp: new Date().toISOString(),
      description: 'Prefilled testing details loaded',
      payload: {
        studentIds: allUids,
        prevAttendance: prevAttendanceMap,
        prevMarks: prevMarksMap
      }
    };

    setUndoStack(prev => [...prev, action]);
    saveStudentState(mockRoster);
    setIsSettingsOpen(false);
  };

  // Total tested progress helper
  const presentCohort = students.filter(s => s.attendance === 'Present' || s.attendance === 'Late').length;
  const gradedCohort = students.filter(s => s.marks).length;

  return (
    <div className={`min-h-screen font-sans flex flex-col justify-between transition-colors duration-300 ${
      darkMode ? 'bg-[#0F172A] text-slate-200' : 'bg-[#F8FAFC] text-slate-800'
    }`}>
      
      {/* Dynamic Global Top Branding Navbar */}
      <header className={`border-b sticky top-0 z-45 backdrop-blur-md px-4 sm:px-6 py-3.5 transition-colors duration-300 ${
        darkMode 
          ? 'bg-[#0F172A]/90 border-slate-800 text-white' 
          : 'bg-white/90 border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow shadow-blue-600/20">
              <CalendarRange size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base tracking-tight leading-none uppercase text-white dark:text-white">Form 3 speaking exam</h1>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mt-1 tracking-wider uppercase font-mono">Attendance & Evaluation Dashboard</span>
            </div>
          </div>

          {/* Core Settings / Tools */}
          <div className="flex items-center gap-2.5">
            
            {/* Quick Dark Mode Switch */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                darkMode 
                  ? 'bg-[#1E293B] border-slate-700 text-amber-400 hover:bg-slate-800' 
                  : 'bg-slate-100 border-slate-200 text-blue-600 hover:bg-slate-200'
              }`}
              title={darkMode ? "Switch to Light theme" : "Switch to Dark eye-safe theme"}
              id="theme-toggle-button"
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Quick settings drawer toggle */}
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-2.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                isSettingsOpen 
                  ? 'bg-blue-600 border-blue-600 text-white shadow shadow-blue-600/20' 
                  : 'bg-white dark:bg-[#1E293B] border-slate-250 dark:border-slate-700 text-slate-650 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title="Database Management & Presets"
            >
              <Settings size={15} />
              <span className="hidden sm:inline">Database Controls</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container viewport */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 space-y-6">
        
        {/* Navigation Tabs Drawer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 gap-4">
          <div className="flex items-center gap-1 overflow-x-auto overflow-y-hidden pb-px border-0">
            {[
              { id: 'attendance', label: '1. Attendance Desk', guide: 'Supervisors (Room 5A)' },
              { id: 'evaluation', label: '2. Examiner Marks', guide: 'Teachers (Rooms 5C-5E)' },
              { id: 'timer', label: '3. Clock & Presets', guide: 'Prep Room / Group Timers' },
              { id: 'sheet', label: '4. Student Results', guide: 'CSV Print & Export' },
              { id: 'analytics', label: '5. Progress Analytics', guide: 'Grade Distribution' }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-3 font-semibold text-xs transition duration-200 cursor-pointer border-b-2 text-center whitespace-nowrap min-w-[120px] ${
                    isActive
                      ? 'border-blue-500 text-blue-600 dark:border-blue-500 dark:text-blue-400 font-extrabold bg-blue-500/5'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="block leading-none">{tab.label}</span>
                  <span className="text-[9px] opacity-70 font-mono font-medium block mt-1">{tab.guide}</span>
                </button>
              );
            })}
          </div>

          {/* Quick tracker status strip */}
          <div className="hidden md:flex items-center gap-3 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl font-mono text-[11px] text-slate-500 dark:text-slate-400">
            <div>
              Checked attendance: <strong className="text-slate-800 dark:text-slate-200">{presentCohort} Present / Late</strong>
            </div>
            <span className="text-slate-250 dark:text-slate-800">|</span>
            <div>
              Marks inputted: <strong className="text-blue-500 dark:text-blue-400">{gradedCohort} / {presentCohort || 1} evaluated</strong>
            </div>
          </div>
        </div>

        {/* Selected View Router */}
        <div className="transition-all duration-300">
          {activeTab === 'attendance' && (
            <AttendancePanel
              students={students}
              onUpdateAttendance={handleUpdateAttendance}
              onBulkAttendance={handleBulkAttendance}
              activeSessionId={activeSessionId}
              setActiveSessionId={setActiveSessionId}
              undoStack={undoStack}
              onUndo={handleUndo}
            />
          )}

          {activeTab === 'evaluation' && (
            <MarkingPanel
              students={students}
              onUpdateMarks={handleUpdateMarks}
              onUpdateAttendance={handleUpdateAttendance}
              activeSessionId={activeSessionId}
              setActiveSessionId={setActiveSessionId}
              activeRoom={activeRoom}
              setActiveRoom={setActiveRoom}
              undoStack={undoStack}
              onUndo={handleUndo}
            />
          )}

          {activeTab === 'timer' && (
            <TimerPanel />
          )}

          {activeTab === 'sheet' && (
            <ResultsSheet
              students={students}
              onUpdateAttendance={handleUpdateAttendance}
              onUpdateMarks={handleUpdateMarks}
              onBulkAttendance={handleBulkAttendance}
              onBulkClearMarks={handleBulkClearMarks}
              onUndo={handleUndo}
              undoStackLength={undoStack.length}
            />
          )}

          {activeTab === 'analytics' && (
            <StatisticsPanel
              students={students}
            />
          )}
        </div>
      </main>

      {/* Database Management Slide-out Modal Drawer */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-705 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-1.5">
                <Database size={18} className="text-blue-550" /> Speaking Exam Database Controls
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 px-2 border border-slate-150 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs font-mono font-bold rounded-lg leading-tight cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed mb-1">
              Configure current evaluation states. Ideal for testing and sandbox previews. Clear entire sheet data to start taking real speaking attendance.
            </p>

            <div className="space-y-3.5">
              
              {/* Load realistic presets */}
              <button
                onClick={handleLoadMockDemoMarks}
                className="w-full text-left p-4 rounded-2xl border border-blue-100 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition cursor-pointer flex items-start gap-3"
              >
                <div className="p-2.5 bg-blue-600 text-white rounded-xl">
                  <Database size={16} />
                </div>
                <div className="space-y-0.5">
                  <span className="font-extrabold text-slate-900 dark:text-white text-xs block">Load Realistic Mock Data (Review Mode)</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Pre-populates sample student grades and attendance counts so you can test tables, exports, and charts immediately.</p>
                </div>
              </button>

              {/* Wipe clean data */}
              <button
                onClick={handleResetAllData}
                className="w-full text-left p-4 rounded-2xl border border-rose-100 dark:border-rose-950 bg-rose-50/40 dark:bg-rose-950/10 hover:bg-rose-55 dark:hover:bg-rose-950/20 transition cursor-pointer flex items-start gap-3"
              >
                <div className="p-2.5 bg-rose-600 text-white rounded-xl">
                  <Trash2 size={16} />
                </div>
                <div className="space-y-0.5">
                  <span className="font-extrabold text-rose-800 dark:text-rose-455 text-xs block">Clear All Roster & Reset Blank</span>
                  <p className="text-[10px] text-rose-650 dark:text-rose-400 pb-px">Wipe out all temporary localStorage attendance and rubric marks, resetting to a clean unmarked student cohort roster.</p>
                </div>
              </button>
            </div>

            {/* Quick instruction notice */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-100 dark:border-slate-800 text-[10px] sm:text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
              Note: Roster changes are persisted securely to client browser's memory (<code className="font-mono">localStorage</code>). Refreshing or closing window retains exam data. Export CSV results periodically to secure back up.
            </div>

            <div className="mt-2 text-right">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-5 py-2.5 bg-slate-900 dark:bg-slate-205 hover:bg-black dark:hover:bg-white text-white dark:text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop & Mobile responsive footer */}
      <footer className={`border-t text-center py-4 text-xs font-mono transition-colors duration-300 ${
        darkMode ? 'bg-[#0F172A] border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-500 shadow-inner'
      }`}>
        <p className="max-w-7xl mx-auto px-4">
          Form 3 English Speaking Examination Portal • Academic Year 2025-2026 • Group Interaction Rubric • Prepared by English Lang Dept.
        </p>
      </footer>
    </div>
  );
}
