import React, { useState, useMemo } from 'react';
import { Student } from '../types';
import { examSessions, rooms, getRoomForGroup } from '../data/rawRoster';
import { getStudentUid } from '../utils/studentParser';
import { Download, Search, RotateCcw, AlertCircle, FileSpreadsheet, Eye, SlidersHorizontal, CheckCircle, Info, ChevronDown, Check, X, Undo } from 'lucide-react';

interface ResultsSheetProps {
  students: Student[];
  onUpdateAttendance: (studentClass: string, classNo: number, status: Student['attendance']) => void;
  onUpdateMarks: (studentClass: string, classNo: number, marks: Student['marks']) => void;
  onBulkAttendance: (studentClassNoList: { class: string; classNo: number }[], status: Student['attendance']) => void;
  onBulkClearMarks: (studentClassNoList: { class: string; classNo: number }[]) => void;
  onUndo: () => void;
  undoStackLength: number;
}

export default function ResultsSheet({
  students,
  onUpdateAttendance,
  onUpdateMarks,
  onBulkAttendance,
  onBulkClearMarks,
  onUndo,
  undoStackLength
}: ResultsSheetProps) {
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedRoom, setSelectedRoom] = useState('All');
  const [selectedColor, setSelectedColor] = useState('All');
  const [selectedAttendance, setSelectedAttendance] = useState('All');
  const [selectedGradeState, setSelectedGradeState] = useState('All'); // "All", "Graded", "Ungraded"
  const [sortField, setSortField] = useState<'class' | 'ename' | 'group' | 'total' | 'attendance'>('class');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Detail Modal/Drawer student selection
  const [detailedStudentUid, setDetailedStudentUid] = useState<string | null>(null);

  // Filter lists constants
  const classesList = ['All', '3A', '3B', '3C', '3D', '3E', '3F'];
  const roomsList = ['All', '5C', '5D', '5E'];
  const colorsList = ['All', 'Blue', 'Green', 'Red', 'Purple'];
  const attendanceList = ['All', 'Present', 'Late', 'Absent', 'Unmarked'];

  // Computed details with Room mapping
  const studentWithRoomInfo = useMemo(() => {
    return students.map(s => ({
      ...s,
      room: getRoomForGroup(s.group),
      uid: getStudentUid(s)
    }));
  }, [students]);

  // Filter logic
  const filteredStudents = useMemo(() => {
    return studentWithRoomInfo.filter(student => {
      // Text Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = student.ename.toLowerCase().includes(term);
        const matchesClass = student.class.toLowerCase().includes(term);
        const matchesNo = student.classNo.toString().includes(term);
        const matchesGroup = student.group.toString().includes(term);
        const matchesCand = student.candidateNo.toString().includes(term);
        if (!matchesName && !matchesClass && !matchesNo && !matchesGroup && !matchesCand) {
          return false;
        }
      }

      // Class Filter
      if (selectedClass !== 'All' && student.class !== selectedClass) return false;

      // Room Filter
      if (selectedRoom !== 'All' && student.room !== selectedRoom) return false;

      // Color Filter
      if (selectedColor !== 'All' && student.candidateColor.trim().toLowerCase() !== selectedColor.toLowerCase()) return false;

      // Attendance Filter
      if (selectedAttendance !== 'All' && student.attendance !== selectedAttendance) return false;

      // Grade state filter
      if (selectedGradeState === 'Graded' && !student.marks) return false;
      if (selectedGradeState === 'Ungraded' && student.marks) return false;

      return true;
    });
  }, [studentWithRoomInfo, searchTerm, selectedClass, selectedRoom, selectedColor, selectedAttendance, selectedGradeState]);

  // Sort logic
  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'class') {
        const aClass = `${a.class}-${a.classNo.toString().padStart(2, '0')}`;
        const bClass = `${b.class}-${b.classNo.toString().padStart(2, '0')}`;
        comparison = aClass.localeCompare(bClass);
      } else if (sortField === 'ename') {
        comparison = a.ename.localeCompare(b.ename);
      } else if (sortField === 'group') {
        comparison = a.group - b.group;
      } else if (sortField === 'total') {
        const aTotal = a.marks?.total ?? -1;
        const bTotal = b.marks?.total ?? -1;
        comparison = aTotal - bTotal;
      } else if (sortField === 'attendance') {
        comparison = a.attendance.localeCompare(b.attendance);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredStudents, sortField, sortOrder]);

  // Global Statistics computed on entire cohort
  const cohortStats = useMemo(() => {
    const total = students.length;
    const marked = students.filter(s => s.attendance !== 'Unmarked').length;
    const present = students.filter(s => s.attendance === 'Present').length;
    const late = students.filter(s => s.attendance === 'Late').length;
    const absent = students.filter(s => s.attendance === 'Absent').length;
    
    // Tested (Present + Late)
    const tested = present + late;
    const testedWithMarks = students.filter(s => (s.attendance === 'Present' || s.attendance === 'Late') && s.marks).length;
    const totalSpeakingScoresSum = students.reduce((acc, s) => acc + (s.marks?.total || 0), 0);
    const averageScore = testedWithMarks > 0 ? (totalSpeakingScoresSum / testedWithMarks).toFixed(1) : '0.0';

    return {
      total,
      marked,
      present,
      late,
      absent,
      tested,
      testedWithMarks,
      averageScore
    };
  }, [students]);

  // CSV Export logic
  const exportToCSV = (isCurrentOnly: boolean) => {
    const dataSource = isCurrentOnly ? sortedStudents : studentWithRoomInfo;
    
    // Prepare Headers
    const headers = [
      'Class',
      'Class No',
      'English Name',
      'Assigned Group No',
      'Examination Room',
      'Candidate Color',
      'Candidate Number',
      'Attendance Status',
      'Pronunciation & Delivery (1-6)',
      'Communicative Strategies (1-6)',
      'Vocabulary & Language Patterns (1-6)',
      'Ideas & Elaboration (1-6)',
      'Total Speaking Score (4-24)',
      'Teacher Comments',
      'Grading Timestamp'
    ];

    // Build Rows
    const rows = dataSource.map(student => {
      return [
        student.class,
        student.classNo,
        `"${student.ename.replace(/"/g, '""')}"`, // escape quotes
        student.group,
        student.room,
        student.candidateColor.trim(),
        student.candidateNo,
        student.attendance,
        student.marks?.pronunciation ?? '',
        student.marks?.communicative ?? '',
        student.marks?.vocabulary ?? '',
        student.marks?.ideas ?? '',
        student.marks?.total ?? '',
        student.marks?.comments ? `"${student.marks.comments.replace(/"/g, '""')}"` : '',
        student.marks?.gradedAt ?? ''
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    // Browser download execution
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = isCurrentOnly 
      ? `Filtered_Form3_Speaking_Marks_${timestamp}.csv` 
      : `Full_Cohort_Form3_Speaking_Marks_${timestamp}.csv`;
      
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedClass('All');
    setSelectedRoom('All');
    setSelectedColor('All');
    setSelectedAttendance('All');
    setSelectedGradeState('All');
  };

  // Detailed views student
  const activeDetailedStudent = studentWithRoomInfo.find(s => s.uid === detailedStudentUid);

  return (
    <div className="space-y-6">
      {/* Top statistics strips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm text-center">
          <div className="text-[10px] uppercase font-bold font-mono text-slate-400 dark:text-slate-500 tracking-wider">Cohort Attendance</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
            {cohortStats.tested} <span className="text-xs text-slate-500">/ {cohortStats.total}</span>
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            {cohortStats.total > 0 ? Math.round((cohortStats.tested / cohortStats.total) * 100) : 0}% Attendance Rate
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm text-center border-l-4 border-l-blue-500">
          <div className="text-[10px] uppercase font-bold font-mono text-slate-400 dark:text-slate-500 tracking-wider">Grading Progress</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono mt-1">
            {cohortStats.testedWithMarks} <span className="text-xs text-slate-500">/ {cohortStats.tested}</span>
          </div>
          <div className="text-xs text-blue-500 font-semibold mt-1">
            {cohortStats.tested > 0 ? Math.round((cohortStats.testedWithMarks / cohortStats.tested) * 100) : 0}% Graded
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm text-center border-l-4 border-l-purple-500">
          <div className="text-[10px] uppercase font-bold font-mono text-slate-400 dark:text-slate-500 tracking-wider">Average Speaking Mark</div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono mt-1">
            {cohortStats.averageScore} <span className="text-xs text-slate-500">/ 24</span>
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            Based on completed evaluations
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm text-center">
          <div className="text-[10px] uppercase font-bold font-mono text-slate-400 dark:text-slate-500 tracking-wider">Absent / Late</div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono mt-1">
            {cohortStats.absent} <span className="text-xs text-slate-500">Abs</span> <span className="text-slate-300 dark:text-slate-700">|</span> <span className="text-amber-500">{cohortStats.late} <span className="text-xs text-slate-500">Late</span></span>
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
            Unmarked Count: {cohortStats.total - cohortStats.marked}
          </div>
        </div>
      </div>

      {/* Advanced Control Drawer & Filtering */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <SlidersHorizontal size={18} className="text-blue-500" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Results Sheet Filters</h3>
            <span className="text-xs bg-slate-100 dark:bg-[#0F172A] font-bold px-2.5 py-0.5 rounded-full text-slate-600 dark:text-slate-300 font-mono border dark:border-slate-800">
              Found {sortedStudents.length} Students
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {undoStackLength > 0 && (
              <button
                onClick={onUndo}
                className="flex items-center gap-1 px-3 py-1.5 border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/60 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                <Undo size={12} /> Undo Edit
              </button>
            )}

            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              <RotateCcw size={12} /> Reset
            </button>

            {/* Dynamic Export Triggers */}
            <div className="relative group inline-block">
              <button
                onClick={() => exportToCSV(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
              >
                <Download size={13} /> Export Current CSV
              </button>
              
              <button
                onClick={() => exportToCSV(false)}
                className="sm:ml-1 flex items-center gap-1.5 px-4 py-2 border border-emerald-500/20 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                <FileSpreadsheet size={13} /> Export Entire cohort
              </button>
            </div>
          </div>
        </div>

        {/* Input selectors grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {/* Text search */}
          <div className="col-span-2 relative">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Search Context:</label>
            <input
              type="text"
              placeholder="Filter by name, class, cnd#..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.8 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Search size={12} className="absolute left-2.5 top-7 text-slate-400" />
          </div>

          {/* Class selection */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Class Filter:</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full p-2 py-1.8 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              {classesList.map(c => <option key={c} value={c}>{c === 'All' ? 'All Classes' : `Class ${c}`}</option>)}
            </select>
          </div>

          {/* Exam room select */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Examination Room:</label>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="w-full p-2 py-1.8 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              {roomsList.map(r => <option key={r} value={r}>{r === 'All' ? 'All Rooms' : `Room ${r}`}</option>)}
            </select>
          </div>

          {/* Candidate Color */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Group Color:</label>
            <select
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="w-full p-2 py-1.8 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              {colorsList.map(col => <option key={col} value={col}>{col === 'All' ? 'All Colors' : `${col} House`}</option>)}
            </select>
          </div>

          {/* Attendance Status */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Attendance state:</label>
            <select
              value={selectedAttendance}
              onChange={(e) => setSelectedAttendance(e.target.value)}
              className="w-full p-2 py-1.8 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-[#0F172A] text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              {attendanceList.map(at => <option key={at} value={at}>{at === 'All' ? 'All Status' : at}</option>)}
            </select>
          </div>
        </div>

        {/* Extended grading checks */}
        <div className="flex gap-4 border-t border-slate-150 dark:border-slate-800 pt-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Evaluation Grade Filter:</span>
            <div className="flex gap-1.5">
              {['All', 'Graded', 'Ungraded'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedGradeState(st)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                    selectedGradeState === st
                      ? 'bg-blue-600 border-blue-650 text-white dark:bg-white dark:border-white dark:text-slate-950 font-extrabold'
                      : 'bg-slate-50 border-slate-200 dark:bg-[#0F172A] dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Datatable */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0F172A]/80 text-[10px] font-bold font-mono text-slate-450 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4 select-none cursor-pointer hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleToggleSort('class')}>
                  Class {sortField === 'class' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="py-3 px-4 select-none cursor-pointer hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleToggleSort('ename')}>
                  Candidate Name {sortField === 'ename' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="py-3 px-4 select-none cursor-pointer hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleToggleSort('group')}>
                  Grp (Room) {sortField === 'group' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="py-3 px-4">Color (Number)</th>
                <th className="py-3 px-4 select-none cursor-pointer hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleToggleSort('attendance')}>
                  Attendance {sortField === 'attendance' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="py-3 px-4">Evaluation (P/C/V/I)</th>
                <th className="py-3 px-4 select-none cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 text-right" onClick={() => handleToggleSort('total')}>
                  Total {sortField === 'total' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
              {sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 dark:text-slate-550">
                    <AlertCircle className="mx-auto text-slate-300 dark:text-slate-700 mb-2" size={36} />
                    <p className="font-semibold">No students found matching current filters.</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting the filter sliders or changing the text query.</p>
                  </td>
                </tr>
              ) : (
                sortedStudents.map(student => {
                  const hasMarks = !!student.marks;
                  
                  let colorClass = 'bg-slate-100 dark:bg-[#0F172A] text-slate-755';
                  const cColor = student.candidateColor.trim().toLowerCase();
                  if (cColor === 'blue') colorClass = 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
                  if (cColor === 'green') colorClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
                  if (cColor === 'red') colorClass = 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
                  if (cColor === 'purple') colorClass = 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300';

                  let attendBadge = 'bg-slate-100 text-slate-600 dark:bg-[#0F172A] dark:text-slate-400';
                  if (student.attendance === 'Present') attendBadge = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
                  if (student.attendance === 'Late') attendBadge = 'bg-amber-500/10 text-amber-600 dark:text-amber-450';
                  if (student.attendance === 'Absent') attendBadge = 'bg-rose-500/10 text-rose-600 dark:text-rose-455';

                  return (
                    <tr
                      key={student.uid}
                      className={`hover:bg-slate-50/50 dark:hover:bg-[#0F172A]/10 transition group/row ${
                        detailedStudentUid === student.uid ? 'bg-blue-50/20 dark:bg-blue-950/10' : ''
                      }`}
                    >
                      {/* Class Info */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {student.class} <span className="text-slate-400 text-xs">#{student.classNo}</span>
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {student.ename}
                      </td>

                      {/* Group and Room */}
                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-blue-600 dark:text-blue-400">Grp {student.group}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Room {student.room}</span>
                      </td>

                      {/* Color Group */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.2 py-0.5 rounded text-[10px] uppercase border font-bold ${colorClass}`}>
                          {student.candidateColor} {student.candidateNo}
                        </span>
                      </td>

                      {/* Attendance */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide select-none ${attendBadge}`}>
                          {student.attendance}
                        </span>
                      </td>

                      {/* Marks details */}
                      <td className="py-3 px-4 text-xs font-mono">
                        {hasMarks ? (
                          <div className="flex gap-2">
                            <span title="Pronunciation & Delivery">P:<strong>{student.marks?.pronunciation}</strong></span>
                            <span title="Communicative Strategies" className="text-slate-300 dark:text-slate-700">|</span>
                            <span title="Communicative Strategies">C:<strong>{student.marks?.communicative}</strong></span>
                            <span title="Vocabulary & Language Patterns" className="text-slate-300 dark:text-slate-700">|</span>
                            <span title="Vocabulary & Language">V:<strong>{student.marks?.vocabulary}</strong></span>
                            <span title="Ideas & Organization" className="text-slate-300 dark:text-slate-700">|</span>
                            <span title="Ideas & Detail">I:<strong>{student.marks?.ideas}</strong></span>
                          </div>
                        ) : student.attendance === 'Absent' ? (
                          <span className="text-rose-500 dark:text-rose-400 font-semibold text-[11px] uppercase">Absent - Not tested</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">Pending evaluation</span>
                        )}
                      </td>

                      {/* Total Speaks Marks */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-base select-all">
                        {hasMarks ? (
                          <span className="text-blue-600 dark:text-blue-400">
                            {student.marks?.total} <span className="text-[10px] text-slate-400">/24</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-750">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setDetailedStudentUid(student.uid)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg transition"
                          title="View Assessment Comments & Details"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Overlay Drawer */}
      {detailedStudentUid && activeDetailedStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end transition-opacity">
          <div className="w-full max-w-md bg-white dark:bg-[#1E293B] h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-slide-left border-l border-slate-200 dark:border-slate-800">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-4 mb-5">
                <div>
                  <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 block uppercase">Candidate assessment sheet</span>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {activeDetailedStudent.ename}
                  </h4>
                </div>
                <button
                  onClick={() => setDetailedStudentUid(null)}
                  className="p-2 border border-slate-150 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-950 text-slate-500 rounded-xl font-bold font-mono text-xs leading-none transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Specs Stack */}
              <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-54 dark:bg-[#0F172A]/70 p-4 rounded-xl border border-slate-150 dark:border-slate-800">
                <div className="text-xs">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Class & No:</span>
                  <strong className="text-slate-800 dark:text-slate-200 text-sm font-mono mt-0.5 block">{activeDetailedStudent.class} ({activeDetailedStudent.classNo})</strong>
                </div>
                <div className="text-xs">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Assigned Group:</span>
                  <strong className="text-slate-800 dark:text-slate-200 text-blue-600 dark:text-blue-400 text-sm font-mono mt-0.5 block">Group {activeDetailedStudent.group}</strong>
                </div>
                <div className="text-xs mt-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Exam room:</span>
                  <strong className="text-slate-800 dark:text-slate-200 text-sm font-mono mt-0.5 block">Classroom {activeDetailedStudent.room}</strong>
                </div>
                <div className="text-xs mt-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Candidate Code:</span>
                  <strong className="text-slate-800 dark:text-slate-200 text-sm font-mono mt-0.5 block uppercase">{activeDetailedStudent.candidateColor} {activeDetailedStudent.candidateNo}</strong>
                </div>
              </div>

              {/* Attendance and Score breakdown */}
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-50 dark:bg-[#0F172A]/50 p-3 rounded-lg border dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Attendance state:</span>
                  <div className="flex gap-1.55">
                    {['Present', 'Late', 'Absent'].map(at => (
                      <button
                        key={at}
                        onClick={() => onUpdateAttendance(activeDetailedStudent.class, activeDetailedStudent.classNo, at as Student['attendance'])}
                        className={`px-2 py-1 select-all font-mono font-bold rounded text-[10px] uppercase border transition cursor-pointer ${
                          activeDetailedStudent.attendance === at
                            ? at === 'Present' 
                              ? 'bg-emerald-500 border-emerald-500 text-white font-extrabold' 
                              : at === 'Late' 
                                ? 'bg-amber-500 border-amber-500 text-slate-950 font-extrabold' 
                                : 'bg-rose-500 border-rose-500 text-white font-extrabold'
                            : 'bg-white dark:bg-[#1E293B] text-slate-500 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {at}
                      </button>
                    ))}
                  </div>
                </div>

                {activeDetailedStudent.attendance === 'Absent' ? (
                  <div className="p-4 bg-rose-50 dark:bg-rose-955/20 border border-rose-100 dark:border-rose-900 text-center text-xs text-rose-700 dark:text-rose-400 font-semibold rounded-xl">
                    Student is flagged absent. Speak marks are bypassed.
                  </div>
                ) : (
                  <>
                    <h5 className="font-bold text-xs uppercase text-slate-450 dark:text-slate-500 tracking-wider">Evaluation marks criteria:</h5>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Pronunciation & Delivery', k: 'pronunciation' as const, color: 'text-blue-600' },
                        { label: 'Communicative Strategies', k: 'communicative' as const, color: 'text-emerald-600' },
                        { label: 'Vocabulary & Language', k: 'vocabulary' as const, color: 'text-purple-600' },
                        { label: 'Ideas & Organization', k: 'ideas' as const, color: 'text-amber-600' },
                      ].map(({ label, k, color }) => {
                        const val = activeDetailedStudent.marks?.[k] || 0;
                        return (
                          <div key={k} className="flex justify-between items-center text-xs border-b border-dashed border-slate-100 dark:border-slate-800 pb-2">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">{label}</span>
                            <div className="flex items-center gap-1">
                              {[1,2,3,4,5,6].map(num => (
                                <button
                                  key={num}
                                  onClick={() => {
                                    const prevMarks = activeDetailedStudent.marks || { pronunciation: 1, communicative: 1, vocabulary: 1, ideas: 1, total: 4 };
                                    const updated = {
                                      ...prevMarks,
                                      [k]: num,
                                      total: (k === 'pronunciation' ? num : prevMarks.pronunciation) +
                                             (k === 'communicative' ? num : prevMarks.communicative) +
                                             (k === 'vocabulary' ? num : prevMarks.vocabulary) +
                                             (k === 'ideas' ? num : prevMarks.ideas)
                                    };
                                    onUpdateMarks(activeDetailedStudent.class, activeDetailedStudent.classNo, updated);
                                  }}
                                  className={`w-5 h-5 text-[10px] font-black rounded-md flex items-center justify-center transition border cursor-pointer ${
                                    val === num
                                      ? 'bg-blue-605 border-blue-600 text-white font-extrabold'
                                      : 'bg-slate-50 border-slate-150 dark:bg-[#0F172A] dark:border-slate-800 text-slate-500'
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Feedback Comments Box */}
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] font-bold text-slate-450 block uppercase font-mono">Teacher Comments:</span>
                      <textarea
                        value={activeDetailedStudent.marks?.comments || ''}
                        onChange={(e) => {
                          const prev = activeDetailedStudent.marks || { pronunciation: 1, communicative: 1, vocabulary: 1, ideas: 1, total: 4 };
                          onUpdateMarks(activeDetailedStudent.class, activeDetailedStudent.classNo, {
                            ...prev,
                            comments: e.target.value
                          });
                        }}
                        rows={3}
                        className="w-full p-2.5 text-xs text-slate-800 dark:text-slate-250 bg-slate-50 dark:bg-[#0F172A] border border-slate-205 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Type standard review comment..."
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Total aggregation and Close trigger */}
            <div className="pt-6 border-t border-slate-150 dark:border-slate-800 space-y-3">
              {activeDetailedStudent.attendance !== 'Absent' && (
                <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-955 p-4 rounded-xl border border-blue-100 dark:border-blue-900/40">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400 font-mono text-[10px] uppercase tracking-wider">AGGREGATED SPEAK MARKS</span>
                  <span className="text-xl font-mono font-black text-blue-600 dark:text-blue-400 leading-none">
                    {activeDetailedStudent.marks?.total ?? 0} <span className="text-xs text-slate-400">/ 24</span>
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const uidsList = [{ class: activeDetailedStudent.class, classNo: activeDetailedStudent.classNo }];
                    onBulkClearMarks(uidsList);
                    setDetailedStudentUid(null);
                  }}
                  className="flex-1 py-3 border border-rose-100 hover:bg-rose-50 dark:border-rose-950/30 dark:hover:bg-rose-950/10 text-rose-500 font-bold text-xs rounded-xl text-center cursor-pointer transition select-none"
                >
                  Clear Rubric Scores
                </button>
                <button
                  onClick={() => setDetailedStudentUid(null)}
                  className="flex-1 py-3 bg-slate-900 dark:bg-slate-200 hover:bg-black dark:hover:bg-white text-white dark:text-slate-950 font-bold text-xs rounded-xl text-center cursor-pointer transition shadow-md select-none"
                >
                  Close sheet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
