export interface Student {
  class: string;
  classNo: number;
  ename: string;
  group: number;
  candidateColor: string; // "Blue", "Green", "Red", "Purple"
  candidateNo: number;
  
  // Attendance state
  attendance: 'Unmarked' | 'Present' | 'Absent' | 'Late';
  attendanceTime?: string; // ISO string or simple local time
  
  // Evaluation marks (1-6 scale each for Group Interaction of Speaking Exam)
  marks?: {
    pronunciation: number; // 1-6
    communicative: number; // 1-6
    vocabulary: number;    // 1-6
    ideas: number;         // 1-6
    total: number;         // sum of above (4-24) or 0 if absent
    comments?: string;
    gradedAt?: string;     // ISO timestamp
  };
}

export interface ExamSession {
  id: string; // "A" to "Q"
  reportingTime: string;
  preparationTime: string;
  interactionTime: string;
  groups: number[]; // e.g. [1, 2, 3] for Session A
}

export type UndoActionType = 'ATTENDANCE_CHANGE' | 'MARKS_CHANGE' | 'RESET_STATE' | 'BATCH_ATTENDANCE';

export interface UndoAction {
  id: string;
  type: UndoActionType;
  timestamp: string;
  description: string;
  // Payload stores previous state of affected students to revert
  payload: {
    studentIds: string[]; // composed of "class-classNo"
    prevAttendance: Record<string, 'Unmarked' | 'Present' | 'Absent' | 'Late'>;
    prevMarks: Record<string, Student['marks']>;
  };
}
