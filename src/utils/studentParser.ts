import { rawStudentCSV } from '../data/rawRoster';
import { Student } from '../types';

export function parseStudentsCSV(): Student[] {
  const lines = rawStudentCSV.trim().split('\n');
  const result: Student[] = [];

  // Headings: Class,No,Ename,Group,Candidate,No.
  // Rows starts at index 1
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Use split with regex or simple comma splitting, keeping in mind names don't contain commas
    const parts = line.split(',');
    if (parts.length < 6) continue;

    const studentClass = parts[0].trim();
    const classNo = parseInt(parts[1].trim(), 10);
    const ename = parts[2].trim();
    const group = parseInt(parts[3].trim(), 10);
    const candidateColor = parts[4].trim();
    const candidateNo = parseInt(parts[5].trim(), 10);

    result.push({
      class: studentClass,
      classNo,
      ename,
      group,
      candidateColor,
      candidateNo,
      attendance: 'Unmarked',
    });
  }

  return result;
}

export function getStudentUid(student: Pick<Student, 'class' | 'classNo'>): string {
  return `${student.class}-${student.classNo}`;
}

export function generateMockScores(students: Student[]): Student[] {
  // Let's populate some random/realistic student scores for preview & demo purposes,
  // making it extremely fun and delightful for the user. We can pre-fill 40% of the students
  const colorSeeds = ['Present', 'Absent', 'Late', 'Unmarked'];
  return students.map((student, idx) => {
    // Determine random state based on index to be consistent
    const seed = (idx * 17) % 100;
    let attendance: Student['attendance'] = 'Unmarked';
    let marks: Student['marks'] | undefined = undefined;

    if (seed < 50) {
      attendance = 'Present';
      // Give marks to some present students
      if (seed % 3 !== 0) {
        const p = 3 + (seed % 4); // 3-6
        const c = 3 + ((seed + 1) % 4);
        const v = 3 + ((seed + 2) % 4);
        const id = 3 + ((seed + 3) % 4);
        marks = {
          pronunciation: p,
          communicative: c,
          vocabulary: v,
          ideas: id,
          total: p + c + v + id,
          comments: seed % 5 === 0 
            ? 'Very active participant, excellent delivery and ideas.' 
            : seed % 5 === 1 
              ? 'Clear and concise, spoke with good rhythm.' 
              : 'Constructive input, made eye contact and led the group topic well.',
          gradedAt: new Date(new Date('2026-06-10T08:00:00Z').getTime() + (student.group * 3 * 60 * 1000)).toISOString()
        };
      }
    } else if (seed < 60) {
      attendance = 'Late';
      // Give marks to some late students
      if (seed % 2 === 0) {
        const p = 2 + (seed % 4); // 2-5
        const c = 3 + ((seed + 1) % 3);
        const v = 2 + ((seed + 2) % 4);
        const id = 2 + ((seed + 3) % 4);
        marks = {
          pronunciation: p,
          communicative: c,
          vocabulary: v,
          ideas: id,
          total: p + c + v + id,
          comments: 'Arrived slightly late but caught up quickly. Showed good language patterns.',
          gradedAt: new Date(new Date('2026-06-10T08:00:00Z').getTime() + (student.group * 3.2 * 60 * 1000)).toISOString()
        };
      }
    } else if (seed < 70) {
      attendance = 'Absent';
      marks = undefined;
    }

    return {
      ...student,
      attendance,
      marks
    };
  });
}
