import React, { useState, useEffect } from 'react';
import { Student, ExamSession, UndoAction } from '../types';
import { examSessions, rooms, getRoomForGroup } from '../data/rawRoster';
import { getStudentUid } from '../utils/studentParser';
import { ShieldAlert, BookOpen, AlertCircle, Save, Undo, CheckCheck, Star, Award, MessageCircle, FileText, ChevronRight, UserCheck } from 'lucide-react';

interface MarkingPanelProps {
  students: Student[];
  onUpdateMarks: (studentClass: string, classNo: number, marks: Student['marks']) => void;
  onUpdateAttendance: (studentClass: string, classNo: number, status: Student['attendance']) => void;
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
  activeRoom: typeof rooms[number];
  setActiveRoom: (room: typeof rooms[number]) => void;
  undoStack: UndoAction[];
  onUndo: () => void;
}

const CRITERIA_INFO = [
  {
    key: 'pronunciation' as const,
    label: 'Pronunciation & Delivery',
    desc: 'Clarity, word stress, intonation, fluency, pausing, projection and speed.',
    colorText: 'text-blue-600 dark:text-blue-400',
    colorBg: 'bg-blue-50 dark:bg-blue-950/20',
  },
  {
    key: 'communicative' as const,
    label: 'Communicative Strategies',
    desc: 'Turn-taking, direct response, prompts, body language, holding attention.',
    colorText: 'text-emerald-600 dark:text-emerald-400',
    colorBg: 'bg-emerald-50 dark:bg-emerald-950/20',
  },
  {
    key: 'vocabulary' as const,
    label: 'Vocabulary & Language Patterns',
    desc: 'Sentence structures, word variety, grammar accuracy, speaking registers.',
    colorText: 'text-purple-600 dark:text-purple-400',
    colorBg: 'bg-purple-50 dark:bg-purple-950/20',
  },
  {
    key: 'ideas' as const,
    label: 'Ideas & Organization',
    desc: 'Content relevance, reasoning, detail elaboration, cohesiveness, logical flow.',
    colorText: 'text-amber-600 dark:text-amber-450',
    colorBg: 'bg-amber-50 dark:bg-amber-950/20',
  }
];

const FEEDBACK_PRESETS = [
  'Spoke with great confidence and clear natural phrasing.',
  'Excellent active listening, built effectively on group ideas.',
  'Accurate and expressive pronounciation, pleasant delivery.',
  'Well-structured opinions, supported by valid examples.',
  'Good conversational flow but needs richer vocabulary.',
  'Contributed good ideas but spoke a bit too quietly.',
  'Struggled with grammatical consistency under time constraints.',
  'Relatively quiet; should attempt to initiate turns more actively.'
];

export default function MarkingPanel({
  students,
  onUpdateMarks,
  onUpdateAttendance,
  activeSessionId,
  setActiveSessionId,
  activeRoom,
  setActiveRoom,
  undoStack,
  onUndo
}: MarkingPanelProps) {
  // Get active session
  const currentSession = examSessions.find(s => s.id === activeSessionId) || examSessions[0];

  // Map the room to the corresponding active group in this session
  // Session A has groups [1, 2, 3].
  // 5C gets groups modulo 1 (Group 1), 5D gets modulo 2 (Group 2), 5E gets modulo 0 (Group 3).
  let currentGroup = currentSession.groups[0]; // defaults to 5C
  if (activeRoom === '5D') currentGroup = currentSession.groups[1];
  if (activeRoom === '5E') currentGroup = currentSession.groups[2];

  // Local state to override group selection if teachers want to search outside of scheduled list
  const [selectedGroupOverride, setSelectedGroupOverride] = useState<number | null>(null);
  const activeGroupNum = selectedGroupOverride !== null ? selectedGroupOverride : currentGroup;

  // List of students in the current active group
  const groupStudents = students.filter(student => student.group === activeGroupNum);

  // Selected student inside the group to grade
  const [selectedStudentUid, setSelectedStudentUid] = useState<string>('');

  // Sync selection when group changes: auto-select first student in group
  useEffect(() => {
    if (groupStudents.length > 0) {
      // Find the first unmarked student in terms of scores
      const firstUngraded = groupStudents.find(s => !s.marks);
      if (firstUngraded) {
        setSelectedStudentUid(getStudentUid(firstUngraded));
      } else {
        setSelectedStudentUid(getStudentUid(groupStudents[0]));
      }
    } else {
      setSelectedStudentUid('');
    }
  }, [activeGroupNum, activeSessionId, students.length]);

  const activeStudent = students.find(s => getStudentUid(s) === selectedStudentUid);

  // Score states
  const [pronVal, setPronVal] = useState<number>(0);
  const [commVal, setCommVal] = useState<number>(0);
  const [vocabVal, setVocabVal] = useState<number>(0);
  const [ideaVal, setIdeaVal] = useState<number>(0);
  const [commentsTxt, setCommentsTxt] = useState<string>('');
  const [isSavedNotify, setIsSavedNotify] = useState<boolean>(false);

  // Hydrate scores when activeStudent changes
  useEffect(() => {
    if (activeStudent) {
      if (activeStudent.marks) {
        setPronVal(activeStudent.marks.pronunciation);
        setCommVal(activeStudent.marks.communicative);
        setVocabVal(activeStudent.marks.vocabulary);
        setIdeaVal(activeStudent.marks.ideas);
        setCommentsTxt(activeStudent.marks.comments || '');
      } else {
        // Reset scores
        setPronVal(0);
        setCommVal(0);
        setVocabVal(0);
        setIdeaVal(0);
        setCommentsTxt('');
      }
    }
  }, [selectedStudentUid]);

  const totalScore = (pronVal || 0) + (commVal || 0) + (vocabVal || 0) + (ideaVal || 0);

  const handleSaveMarks = () => {
    if (!activeStudent) return;

    const validatedMarks = {
      pronunciation: pronVal || 1, // default to 1 if not entered
      communicative: commVal || 1,
      vocabulary: vocabVal || 1,
      ideas: ideaVal || 1,
      total: totalScore || 4,
      comments: commentsTxt.trim(),
      gradedAt: new Date().toISOString()
    };

    onUpdateMarks(activeStudent.class, activeStudent.classNo, validatedMarks);
    
    // Trigger quick success message animation
    setIsSavedNotify(true);
    setTimeout(() => {
      setIsSavedNotify(false);
    }, 1500);

    // Auto-advance helper: auto-select the next student
    const currentIdx = groupStudents.findIndex(s => getStudentUid(s) === selectedStudentUid);
    if (currentIdx !== -1 && currentIdx < groupStudents.length - 1) {
      setSelectedStudentUid(getStudentUid(groupStudents[currentIdx + 1]));
    }
  };

  const addCommentPreset = (preset: string) => {
    setCommentsTxt(prev => {
      if (!prev) return preset;
      if (prev.endsWith('.') || prev.endsWith('!')) {
        return `${prev} ${preset}`;
      }
      return `${prev}. ${preset}`;
    });
  };

  // Helper score background
  const getScoreColorBg = (value: number) => {
    if (value >= 5) return 'bg-emerald-500 text-white dark:bg-emerald-500';
    if (value >= 3) return 'bg-blue-500 text-white dark:bg-blue-600';
    if (value >= 1) return 'bg-slate-400 text-slate-900 border-slate-300 dark:bg-slate-750 dark:text-slate-100';
    return 'bg-slate-50 dark:bg-[#0F172A] text-slate-400 border-slate-200 dark:border-slate-800';
  };

  return (
    <div className="space-y-6">
      {/* Banner Instruction and Interactive Mode Switches */}
      <div className="flex flex-col lg:flex-row gap-5 items-stretch">
        
        {/* Main Guide Card */}
        <div className="flex-1 bg-gradient-to-r from-blue-700 to-blue-900 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between border border-blue-500/10">
          <div className="space-y-2">
            <span className="px-3 py-1 bg-blue-500/30 text-blue-200 font-mono text-[10px] font-bold rounded-full uppercase tracking-wider border border-blue-400/20">
              Classroom Speaking Room Evaluation Deck
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white">Examiner Marking Deck</h2>
            <p className="text-blue-100 text-xs sm:text-sm max-w-xl leading-relaxed">
              Supervisors track attendance. Here, Examiners grade the candidate Group Interactions on 4 professional components. Tapping any criterion score saves state immediately in memory. Hit "Save" to commit or "Undo Last Action".
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3.5 mt-5">
            <div className="flex rounded-lg bg-black/25 p-1 border border-blue-500/10">
              {rooms.map(rm => (
                <button
                  key={rm}
                  onClick={() => {
                    setActiveRoom(rm);
                    setSelectedGroupOverride(null); // Reset manual override
                  }}
                  className={`px-3 py-1.5 rounded-md font-bold text-xs transition cursor-pointer ${
                    activeRoom === rm
                      ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                      : 'text-blue-300 hover:text-white'
                  }`}
                >
                  Room {rm}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-blue-200 bg-black/15 px-3 py-1.5 rounded-lg border border-blue-550/10">
              Current Session: 
              <select
                value={activeSessionId}
                onChange={(e) => {
                  setActiveSessionId(e.target.value);
                  setSelectedGroupOverride(null);
                }}
                className="bg-slate-900/60 text-white font-bold font-mono border-0 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                {examSessions.map(s => (
                  <option key={s.id} value={s.id}>Session {s.id} ({s.reportingTime})</option>
                ))}
              </select>
            </div>
            
            {/* Quick Undo Indicator */}
            {undoStack.length > 0 && (
              <button
                onClick={onUndo}
                className="flex items-center gap-1 px-3 py-1.5 bg-white/10 text-white border border-white/15 rounded-lg text-xs font-semibold hover:bg-white/15 transition ml-auto cursor-pointer"
              >
                <Undo size={12} /> Undo Edit
              </button>
            )}
          </div>
        </div>

        {/* Selected Group Monitor Card */}
        <div className="lg:w-80 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Scheduled Group Monitor</h3>
              <span className="text-[10px] bg-slate-100 dark:bg-[#0F172A] py-0.5 px-2 font-mono text-slate-500 dark:text-slate-400 rounded-full font-bold">
                Room {activeRoom}
              </span>
            </div>
            <div className="text-3xl font-black text-blue-600 dark:text-blue-400 font-mono mb-1">
              Group #{activeGroupNum}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Exam includes {groupStudents.length} candidates. Below is the active candidate roster.
            </p>
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block">
              Override Active Group (Anomalies):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="51"
                placeholder="Group 1-51"
                value={selectedGroupOverride || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setSelectedGroupOverride(!isNaN(val) ? val : null);
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {selectedGroupOverride !== null && (
                <button
                  onClick={() => setSelectedGroupOverride(null)}
                  className="px-2 py-1.5 border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Roster & marking Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Candidates in Active Group List */}
        <div className="lg:col-span-4 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 flex flex-col">
          <h3 className="font-bold text-slate-900 dark:text-white mb-3 text-sm flex items-center gap-2">
            <BookOpen size={16} className="text-blue-500" /> Room Candidates list
          </h3>
          
          <div className="space-y-2 divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto flex-1 max-h-[460px] pr-1">
            {groupStudents.length === 0 ? (
              <div className="py-20 text-center text-slate-400 dark:text-slate-550 text-xs">
                No candidates are assigned to Group {activeGroupNum}.
              </div>
            ) : (
              groupStudents.map((stud) => {
                const isSelected = getStudentUid(stud) === selectedStudentUid;
                const studUid = getStudentUid(stud);
                const hasScore = !!stud.marks;

                let attendanceColor = 'text-slate-450 dark:text-slate-500';
                let attendanceBg = 'bg-slate-50 dark:bg-[#0F172A]';
                if (stud.attendance === 'Present') {
                  attendanceColor = 'text-emerald-600 dark:text-emerald-400';
                  attendanceBg = 'bg-emerald-50 dark:bg-emerald-950/20';
                } else if (stud.attendance === 'Late') {
                  attendanceColor = 'text-amber-600 dark:text-amber-400';
                  attendanceBg = 'bg-amber-50 dark:bg-amber-950/20';
                } else if (stud.attendance === 'Absent') {
                  attendanceColor = 'text-rose-600 dark:text-rose-400';
                  attendanceBg = 'bg-rose-50 dark:bg-rose-950/20';
                }

                return (
                  <button
                    key={studUid}
                    onClick={() => setSelectedStudentUid(studUid)}
                    className={`w-full text-left p-3 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold focus:outline-none transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 hover:bg-blue-705 text-white dark:bg-blue-600 dark:hover:bg-blue-700 shadow shadow-blue-500/20'
                        : 'hover:bg-slate-50 dark:hover:bg-[#0F172A]/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1 rounded font-mono font-bold text-[10px] ${isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-[#0F172A] text-slate-600 border dark:border-slate-800'}`}>
                          {stud.class} ({stud.classNo})
                        </span>
                        {hasScore && (
                          <span className={`inline-flex items-center gap-0.5 font-bold font-mono px-1 py-0.2 select-none tracking-tight rounded leading-none text-[9px] ${isSelected ? 'bg-white text-blue-700' : 'bg-blue-100 dark:bg-blue-950/50 text-blue-605 dark:text-blue-400'}`}>
                            <Star size={7} className="fill-current stroke-[3px]" /> {stud.marks?.total}/24
                          </span>
                        )}
                      </div>
                      <div className={`font-bold truncate max-w-[170px] ${isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-200'}`}>
                        {stud.ename}
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1">
                      <span className={`px-1.5 py-0.5 font-bold rounded uppercase text-[9px] ${attendanceBg} ${attendanceColor}`}>
                        {stud.attendance === 'Unmarked' ? 'Unmarked' : stud.attendance}
                      </span>
                      <span className={`text-[9px] block font-mono ${isSelected ? 'text-blue-200' : 'text-slate-400 dark:text-slate-500'}`}>
                        Cnd#{stud.candidateNo}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Evaluations Board */}
        <div className="lg:col-span-8 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 md:p-6 flex flex-col justify-between">
          {activeStudent ? (
            <div className="space-y-6">
              {/* Selected Student Core Meta Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-4 gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-[#0F172A] text-slate-800 dark:text-slate-300 border dark:border-slate-800 rounded-lg">
                      {activeStudent.class} No.{activeStudent.classNo}
                    </span>
                    <span className="text-[11px] font-mono py-0.5 px-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold rounded-lg border border-blue-100 dark:border-blue-900/30">
                      Group {activeStudent.group} • Candidate No.{activeStudent.candidateNo} ({activeStudent.candidateColor})
                    </span>
                  </div>
                  <h4 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {activeStudent.ename}
                  </h4>
                </div>

                <div className="flex items-center gap-3">
                  {/* Attendance quick control */}
                  <div className="text-right">
                    <span className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase block tracking-wider mb-1">
                      Attendance Status:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                        activeStudent.attendance === 'Present' 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : activeStudent.attendance === 'Late'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}>
                        {activeStudent.attendance}
                      </span>
                      {activeStudent.attendance === 'Absent' && (
                        <button
                          onClick={() => onUpdateAttendance(activeStudent.class, activeStudent.classNo, 'Present')}
                          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold shadow-sm transition"
                        >
                          <UserCheck size={11} /> Mark Present
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Absent Warning Block */}
              {activeStudent.attendance === 'Absent' ? (
                <div className="bg-rose-50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/60 rounded-xl p-5 text-center space-y-3">
                  <ShieldAlert size={36} className="text-rose-500 mx-auto" />
                  <h4 className="font-bold text-rose-800 dark:text-rose-350">Option Disabled: Candidate is Absent</h4>
                  <p className="text-rose-600 dark:text-rose-400 text-xs max-w-md mx-auto">
                    The report room supervisor has checked this student as <strong>ABSENT</strong>. Marks cannot be saved for an absent student unless you override their attendance status above (click "Mark Present").
                  </p>
                </div>
              ) : (
                /* Scoring Criteria List */
                <div className="space-y-4">
                  {CRITERIA_INFO.map(({ key, label, desc, colorText, colorBg }) => {
                    const currentVal = key === 'pronunciation' ? pronVal : key === 'communicative' ? commVal : key === 'vocabulary' ? vocabVal : ideaVal;
                    const setter = key === 'pronunciation' ? setPronVal : key === 'communicative' ? setCommVal : key === 'vocabulary' ? setVocabVal : setIdeaVal;

                    return (
                      <div
                        key={key}
                        className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-705 transition bg-slate-50 bg-opacity-30 dark:bg-[#0F172A]/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1 max-w-md">
                          <h5 className={`font-bold text-sm ${colorText} flex items-center gap-1.5`}>
                            {label}
                          </h5>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {desc}
                          </p>
                        </div>

                        {/* Numeric Scale (1-6) */}
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5, 6].map(num => {
                            const isSelected = currentVal === num;
                            return (
                              <button
                                key={num}
                                onClick={() => setter(num)}
                                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg text-sm font-bold border flex items-center justify-center transition-all cursor-pointer ${
                                  isSelected
                                    ? getScoreColorBg(num) + ' scale-105 shadow font-black'
                                    : 'bg-slate-50 dark:bg-[#0F172A] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-600'
                                }`}
                              >
                                {num}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Feedback Comments Area with Presets */}
                  <div className="space-y-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800">
                    <label className="text-xs font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <MessageCircle size={14} /> Teacher Evaluator Comments:
                    </label>

                    {/* Presets Grid */}
                    <div className="flex flex-wrap gap-1.5">
                      {FEEDBACK_PRESETS.map((pst, index) => (
                        <button
                          key={index}
                          onClick={() => addCommentPreset(pst)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 dark:bg-[#0F172A] dark:hover:bg-blue-950/30 text-slate-655 hover:text-blue-650 dark:text-slate-400 dark:hover:text-blue-400 text-[10px] font-semibold rounded-lg border border-slate-150 hover:border-blue-200 dark:border-slate-800 dark:hover:border-blue-900/60 text-left cursor-pointer transition whitespace-normal"
                        >
                          + {pst}
                        </button>
                      ))}
                    </div>

                    <textarea
                      placeholder="Add custom assessment review or choose quick comments presets above to fill in details automatically..."
                      value={commentsTxt}
                      onChange={(e) => setCommentsTxt(e.target.value)}
                      rows={3}
                      className="w-full p-3 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-250 text-xs sm:text-sm bg-slate-50 dark:bg-[#0F172A] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  {/* Submit Button Drawer */}
                  <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between gap-4">
                    {/* Live Score Aggregation Shield */}
                    <div className="flex items-center gap-3">
                      <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/40 text-center select-none font-mono">
                        <div className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Evaluated Score</div>
                        <div className="text-2xl font-black text-blue-655 dark:text-blue-400 leading-none mt-0.5">
                          {totalScore} <span className="text-xs text-slate-400 dark:text-slate-500">/ 24</span>
                        </div>
                      </div>
                      <div className="hidden sm:block text-left text-xs space-y-0.5 text-slate-500 dark:text-slate-400">
                        {totalScore > 0 ? (
                          <>
                            <span className="font-semibold text-slate-850 dark:text-slate-350">Passing Grade:</span> Passed Speaking rubric.
                          </>
                        ) : (
                          <span className="text-rose-500 flex items-center gap-1 font-semibold">
                            <AlertCircle size={12} /> Rubric components ungraded
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveMarks}
                        className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 font-bold rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-blue-600/10 active:scale-95 transition cursor-pointer"
                      >
                        {isSavedNotify ? (
                          <>
                            <CheckCheck size={16} /> Saved Successfully
                          </>
                        ) : (
                          <>
                            <Save size={16} /> Save & Next candidate <ChevronRight size={14} className="stroke-[3px]" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-24 text-center space-y-4">
              <Star size={44} className="text-slate-300 dark:text-slate-700 mx-auto animate-pulse" />
              <h4 className="font-semibold text-slate-700 dark:text-slate-300">Select a Candidate from Room Candidates</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                No active candidate was found or selected in the left list. Evaluate candidates sequentially or pick a candidate class.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
