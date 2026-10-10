import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { queryAll, queryOne, execute } from './db.js';
import { authenticateToken, requireRole, generateToken, AuthenticatedRequest } from './auth.js';
import { examUpload, attendanceUpload } from './upload.js';

export const apiRouter = express.Router();

// Helper to log system activity (Section 14)
async function logActivity(
  userId: number | null,
  userName: string,
  userRole: string,
  action: string,
  description: string,
  ip: string = '127.0.0.1'
) {
  try {
    await execute(
      `INSERT INTO activity_logs (user_id, user_name, user_role, action, description, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, userName, userRole, action, description, ip]
    );
  } catch (e) {
    console.error('Failed to log activity:', e);
  }
}


async function notifyRoles(title: string, message: string, roles: string[], userId?: number) {
  for (const role of roles) {
    await execute(
      `INSERT INTO notifications (user_id, target_role, title, message, is_read) VALUES (?, ?, ?, ?, 0)`,
      [userId || null, role, title, message]
    );
  }
}

// -------------------------------------------------------------
// AUTHENTICATION ROUTES (Section 2 & 3)
// -------------------------------------------------------------


apiRouter.get('/public/registration-data', async (_req, res) => {
  const courses = await queryAll(`SELECT id, course_name, course_code, duration FROM courses WHERE status='ACTIVE' ORDER BY course_name`);
  const batches = await queryAll(`SELECT b.id, b.batch_name, b.batch_code, b.course_id, b.start_date, b.end_date, b.timing, u.name as faculty_name FROM batches b JOIN users u ON b.trainer_id=u.id WHERE b.status='ACTIVE' ORDER BY b.start_date DESC`);
  res.json({ courses, batches });
});

apiRouter.post('/public/student/register', async (req, res) => {
  const { name, email, mobile, password, course_id, batch_id, address } = req.body || {};
  if (!name || !email || !mobile || !password || !course_id || !batch_id) {
    res.status(400).json({ error: 'Name, email, mobile, password, course and batch are required.' }); return;
  }
  if (String(password).length < 6) { res.status(400).json({ error: 'Password must be at least 6 characters.' }); return; }
  const batch = await queryOne<any>(`SELECT b.*, u.id as faculty_id, u.name as faculty_name FROM batches b JOIN users u ON b.trainer_id=u.id WHERE b.id=? AND b.course_id=? AND b.status='ACTIVE'`, [batch_id, course_id]);
  if (!batch) { res.status(400).json({ error: 'Selected batch is not available for the selected course.' }); return; }
  const existing = await queryOne<any>(`SELECT id FROM users WHERE LOWER(email)=LOWER(?)`, [String(email).trim()]);
  if (existing) { res.status(409).json({ error: 'An account already exists with this email address.' }); return; }
  const countRow = await queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM students`);
  const nextNum = (countRow?.count || 0) + 1;
  const studentId = `DP-STD-${String(nextNum).padStart(4, '0')}`;
  const regNo = `DP-GJW-2026-${String(nextNum).padStart(3, '0')}`;
  const username = studentId.toLowerCase();
  const hash = bcrypt.hashSync(String(password), 10);
  const studentResult = await execute(`INSERT INTO students (student_id,name,email,mobile,course_id,batch_id,joining_date,status,address,registration_no) VALUES (?,?,?,?,?, ?, CURRENT_DATE,'ACTIVE',?,?)`, [studentId, name.trim(), email.trim(), mobile.trim(), course_id, batch_id, address?.trim() || null, regNo]);
  const studentDbId = studentResult.lastInsertRowId!;
  const studentRole = await queryOne<any>(`SELECT id FROM roles WHERE role_name='STUDENT'`);
  await execute(`INSERT INTO users (name,username,email,password_hash,role_id,mobile,status) VALUES (?,?,?,?,?,?, 'ACTIVE')`, [name.trim(), username, email.trim(), hash, studentRole?.id, mobile.trim()]);
  const userRow = await queryOne<any>(`SELECT id FROM users WHERE username=?`, [username]);
  if (userRow) await execute(`UPDATE students SET user_id=? WHERE id=?`, [userRow.id, studentDbId]);
  const message = `New student registration: ${name.trim()} (${studentId}) for ${batch.batch_name} (${batch.batch_code}). Please review the registration.`;
  await execute(`INSERT INTO notifications (user_id,target_role,title,message,is_read) VALUES (?,?,?,?,0)`, [batch.faculty_id, null, 'New Student Registration', message]);
  for (const role of ['ADMIN', 'COUNSELLOR', 'TEAM_LEAD']) await execute(`INSERT INTO notifications (user_id,target_role,title,message,is_read) VALUES (NULL,?,?,?,0)`, [role, 'New Student Registration', message]);
  logActivity(null, name.trim(), 'STUDENT', 'STUDENT_REGISTER', message);
  res.status(201).json({ message: 'Registration successful.', student_id: studentId, username });
});

apiRouter.post('/auth/login', async (req, res) => {
  const { identifier, password } = req.body; // identifier can be username or email

  if (!identifier || !password) {
    res.status(400).json({ error: 'Username/Email and Password are required.' });
    return;
  }

  const rawIdent = identifier.trim().toLowerCase();
  let searchIdent = rawIdent;
  if (rawIdent === 'vinit') searchIdent = 'vinith';
  if (rawIdent === 'azmal.lead') searchIdent = 'azmal';
  if (rawIdent === 'varaprasad') searchIdent = 'varaprasad.manager';

  const user = await queryOne<any>(
    `SELECT u.id, u.name, u.username, u.email, u.password_hash, u.status, u.role_id, r.role_name as role, u.mobile
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE LOWER(u.username) = LOWER(?) OR LOWER(u.email) = LOWER(?) OR LOWER(u.username) = LOWER(?)`,
    [searchIdent, rawIdent, rawIdent]
  );

  if (!user) {
    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  if (user.status !== 'ACTIVE') {
    res.status(403).json({ error: 'Your account has been deactivated. Please contact the administrator.' });
    return;
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  // Update last login timestamp
  await execute(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);

  const authUser = {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    role_id: user.role_id,
    mobile: user.mobile,
    status: user.status
  };

  const token = generateToken(authUser);

  // Log activity
  logActivity(
    user.id,
    user.name,
    user.role,
    'LOGIN',
    `User ${user.name} (${user.role}) logged in successfully.`,
    req.ip || '127.0.0.1'
  );

  res.json({
    message: 'Login successful.',
    user: authUser,
    token
  });
});


apiRouter.get('/student/me', authenticateToken, requireRole(['STUDENT']), async (req: AuthenticatedRequest, res: Response) => {
  const student = await queryOne<any>(`SELECT s.*, c.course_name, c.course_code, b.batch_name, b.batch_code, b.timing, u.username FROM students s JOIN courses c ON s.course_id=c.id JOIN batches b ON s.batch_id=b.id JOIN users u ON s.user_id=u.id WHERE s.user_id=?`, [req.user!.id]);
  if (!student) { res.status(404).json({ error: 'Student profile not found.' }); return; }
  res.json({ student });
});


apiRouter.get('/student/examinations', authenticateToken, requireRole(['STUDENT']), async (req: AuthenticatedRequest, res: Response) => {
  const student = await queryOne<any>('SELECT id,batch_id,course_id FROM students WHERE user_id=?', [req.user!.id]);
  if (!student) { res.status(404).json({ error: 'Student profile not found.' }); return; }
  const examinations = await queryAll<any>(`SELECT e.id,e.exam_id,e.title,e.subject,e.exam_type,e.exam_date,e.duration,e.total_marks,e.number_of_questions,e.status,e.created_at,e.file_name,
    c.course_name,b.batch_name,b.batch_code,u.name as faculty_name
    FROM examinations e JOIN courses c ON c.id=e.course_id JOIN batches b ON b.id=e.batch_id JOIN users u ON u.id=e.trainer_id
    WHERE e.batch_id=? AND e.course_id=? ORDER BY e.created_at DESC`, [student.batch_id, student.course_id]);
  res.json({ examinations });
});

apiRouter.get('/student/online-exams', authenticateToken, requireRole(['STUDENT']), async (req: AuthenticatedRequest, res: Response) => {
  const student = await queryOne<any>(`SELECT id FROM students WHERE user_id=?`, [req.user!.id]);
  if (!student) { res.status(404).json({ error: 'Student profile not found.' }); return; }
  const exams = await queryAll<any>(`SELECT a.id as assignment_id,a.access_token,oe.exam_code,oe.title,oe.topics,oe.duration_minutes,oe.total_marks,oe.passing_marks,oe.status,oe.created_at, c.course_name,b.batch_name, at.status as attempt_status,at.score,at.submitted_at FROM online_exam_assignments a JOIN online_exams oe ON oe.id=a.online_exam_id JOIN courses c ON c.id=oe.course_id JOIN batches b ON b.id=oe.batch_id LEFT JOIN online_exam_attempts at ON at.assignment_id=a.id WHERE a.student_id=? AND oe.status='PUBLISHED' ORDER BY oe.created_at DESC`, [student.id]);
  const base = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  res.json({ exams: exams.map((e: any) => ({ ...e, exam_link: `${base}/exam/${e.access_token}` })) });
});

apiRouter.get('/student/results', authenticateToken, requireRole(['STUDENT']), async (req: AuthenticatedRequest, res: Response) => {
  const student = await queryOne<any>(`SELECT id FROM students WHERE user_id=?`, [req.user!.id]);
  if (!student) { res.status(404).json({ error: 'Student profile not found.' }); return; }
  const results = await queryAll<any>(`SELECT at.id as attempt_id,oe.exam_code,oe.title,oe.total_marks,oe.passing_marks,at.score,at.correct_answers,at.wrong_answers,at.unanswered,at.submitted_at,at.status FROM online_exam_attempts at JOIN online_exam_assignments a ON a.id=at.assignment_id JOIN online_exams oe ON oe.id=a.online_exam_id WHERE a.student_id=? ORDER BY at.submitted_at DESC`, [student.id]);
  res.json({ results });
});

apiRouter.post('/auth/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    logActivity(
      req.user.id,
      req.user.name,
      req.user.role,
      'LOGOUT',
      `User ${req.user.name} logged out.`,
      req.ip || '127.0.0.1'
    );
  }
  res.json({ message: 'Logged out successfully.' });
});

apiRouter.get('/auth/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = await queryOne<any>(
    `SELECT u.id, u.name, u.username, u.email, u.status, u.role_id, r.role_name as role, u.mobile, u.last_login, u.created_at
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.id = ?`,
    [req.user!.id]
  );
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  res.json({ user });
});

apiRouter.post('/auth/change-password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current password and new password are required.' });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    return;
  }

  const user = await queryOne<any>('SELECT password_hash FROM users WHERE id = ?', [req.user!.id]);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    res.status(400).json({ error: 'Incorrect current password.' });
    return;
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  await execute('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newHash, req.user!.id]);

  logActivity(
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'PASSWORD_CHANGE',
    `User changed their password.`
  );

  res.json({ message: 'Password changed successfully.' });
});

apiRouter.put('/auth/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { name, mobile, email } = req.body;
  if (!name || !email) {
    res.status(400).json({ error: 'Name and email are required.' });
    return;
  }

  await execute(
    'UPDATE users SET name = ?, mobile = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name.trim(), mobile?.trim() || null, email.trim(), req.user!.id]
  );

  res.json({ message: 'Profile updated successfully.' });
});

// -------------------------------------------------------------
// DASHBOARD STATS (Section 4)
// -------------------------------------------------------------

apiRouter.get('/stats/dashboard', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  if (user.role === 'FACULTY') {
    // Trainer specific statistics
    const coursesCount = (await queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT course_id) as count FROM batches WHERE trainer_id = ? AND status = 'ACTIVE'`,
      [user.id]
    ))?.count || 0;

    const batchesCount = (await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM batches WHERE trainer_id = ? AND status = 'ACTIVE'`,
      [user.id]
    ))?.count || 0;

    const studentsCount = (await queryOne<{ count: number }>(
      `SELECT COUNT(s.id) as count 
       FROM students s 
       JOIN batches b ON s.batch_id = b.id 
       WHERE b.trainer_id = ? AND s.status = 'ACTIVE'`,
      [user.id]
    ))?.count || 0;

    const uploadedPapersCount = (await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM examinations WHERE trainer_id = ?`,
      [user.id]
    ))?.count || 0;

    const recentUploads = await queryAll(
      `SELECT e.id, e.exam_id, e.title, e.subject, e.exam_type, e.exam_date, e.total_marks, e.status, e.created_at,
              c.course_name, b.batch_code
       FROM examinations e
       JOIN courses c ON e.course_id = c.id
       JOIN batches b ON e.batch_id = b.id
       WHERE e.trainer_id = ?
       ORDER BY e.created_at DESC LIMIT 5`,
      [user.id]
    );

    const assignedCourses = await queryAll(
      `SELECT DISTINCT c.id, c.course_name, c.course_code, c.duration
       FROM courses c
       JOIN batches b ON b.course_id = c.id
       WHERE b.trainer_id = ? AND b.status = 'ACTIVE'`,
      [user.id]
    );

    const assignedBatches = await queryAll(
      `SELECT b.id, b.batch_name, b.batch_code, b.timing, b.start_date, c.course_name,
              (SELECT COUNT(*) FROM students s WHERE s.batch_id = b.id) as student_count
       FROM batches b
       JOIN courses c ON b.course_id = c.id
       WHERE b.trainer_id = ? AND b.status = 'ACTIVE'`,
      [user.id]
    );

    res.json({
      role: 'FACULTY',
      totalCourses: coursesCount,
      activeBatches: batchesCount,
      totalStudents: studentsCount,
      uploadedPapers: uploadedPapersCount,
      recentUploads,
      assignedCourses,
      assignedBatches
    });
    return;
  }

  // Admin, Center Manager, Team Lead, Counsellor stats
  const totalStudents = (await queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM students WHERE status = 'ACTIVE'`))?.count || 0;
  const totalTrainers = (await queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM users u JOIN roles r ON r.id=u.role_id WHERE r.role_name='FACULTY' AND u.status = 'ACTIVE'`))?.count || 0;
  const totalCourses = (await queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM courses WHERE status = 'ACTIVE'`))?.count || 0;
  const totalBatches = (await queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM batches WHERE status = 'ACTIVE'`))?.count || 0;
  const totalExaminations = (await queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM examinations`))?.count || 0;

  const recentUploads = await queryAll(
    `SELECT e.id, e.exam_id, e.title, e.subject, e.exam_type, e.exam_date, e.total_marks, e.status, e.created_at,
            c.course_name, b.batch_code, u.name as trainer_name
     FROM examinations e
     JOIN courses c ON e.course_id = c.id
     JOIN batches b ON e.batch_id = b.id
     JOIN users u ON e.trainer_id = u.id
     ORDER BY e.created_at DESC LIMIT 6`
  );

  const recentActivities = await queryAll(
    `SELECT id, user_name, user_role, action, description, created_at
     FROM activity_logs
     ORDER BY created_at DESC LIMIT 6`
  );

  const courseStats = await queryAll(
    `SELECT c.id, c.course_name, c.course_code,
            COUNT(DISTINCT s.id) as student_count,
            COUNT(DISTINCT e.id) as exam_count
     FROM courses c
     LEFT JOIN students s ON s.course_id = c.id
     LEFT JOIN examinations e ON e.course_id = c.id
     WHERE c.status = 'ACTIVE'
     GROUP BY c.id
     ORDER BY student_count DESC`
  );

  res.json({
    role: user.role,
    totalStudents,
    totalTrainers,
    totalCourses,
    totalBatches,
    totalExaminations,
    recentUploads,
    recentActivities,
    courseStats
  });
});

// -------------------------------------------------------------
// COURSES MANAGEMENT (Section 5)
// -------------------------------------------------------------

apiRouter.get('/courses', authenticateToken, async (req, res) => {
  const courses = await queryAll(
    `SELECT c.*,
            (SELECT COUNT(*) FROM batches b WHERE b.course_id = c.id) as batch_count,
            (SELECT COUNT(*) FROM students s WHERE s.course_id = c.id) as student_count,
            (SELECT COUNT(*) FROM examinations e WHERE e.course_id = c.id) as exam_count
     FROM courses c
     ORDER BY c.course_name ASC`
  );
  res.json({ courses });
});

apiRouter.post('/courses', authenticateToken, requireRole(['CENTER_MANAGER', 'TEAM_LEAD', 'ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const { course_name, course_code, description, duration } = req.body;
  if (!course_name || !course_code || !duration) {
    res.status(400).json({ error: 'Course name, code, and duration are required.' });
    return;
  }

  const existing = await queryOne('SELECT id FROM courses WHERE LOWER(course_code) = LOWER(?)', [course_code.trim()]);
  if (existing) {
    res.status(400).json({ error: 'A course with this course code already exists.' });
    return;
  }

  const result = await execute(
    `INSERT INTO courses (course_name, course_code, description, duration, status)
     VALUES (?, ?, ?, ?, 'ACTIVE')`,
    [course_name.trim(), course_code.trim().toUpperCase(), description?.trim() || '', duration.trim()]
  );

  logActivity(
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'COURSE_CREATE',
    `Created course ${course_name} (${course_code.toUpperCase()}).`
  );

  res.status(201).json({ message: 'Course created successfully.', id: result.lastInsertRowId });
});

apiRouter.put('/courses/:id', authenticateToken, requireRole(['CENTER_MANAGER', 'TEAM_LEAD', 'ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { course_name, description, duration, status } = req.body;

  await execute(
    `UPDATE courses SET course_name = ?, description = ?, duration = ?, status = ? WHERE id = ?`,
    [course_name.trim(), description?.trim() || '', duration.trim(), status || 'ACTIVE', id]
  );

  logActivity(
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'COURSE_UPDATE',
    `Updated course details for course ID ${id}.`
  );

  res.json({ message: 'Course updated successfully.' });
});

apiRouter.delete('/courses/:id', authenticateToken, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  await execute(`UPDATE courses SET status = 'INACTIVE' WHERE id = ?`, [id]);
  logActivity(req.user!.id, req.user!.name, req.user!.role, 'COURSE_DEACTIVATE', `Deactivated course ID ${id}.`);
  res.json({ message: 'Course deactivated successfully.' });
});

// -------------------------------------------------------------
// BATCHES MANAGEMENT (Section 6)
// -------------------------------------------------------------

apiRouter.get('/batches', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let sql = `
    SELECT b.*, c.course_name, c.course_code, u.name as trainer_name, u.email as trainer_email,
           (SELECT COUNT(*) FROM students s WHERE s.batch_id = b.id) as student_count
    FROM batches b
    JOIN courses c ON b.course_id = c.id
    JOIN users u ON b.trainer_id = u.id
  `;
  const params: any[] = [];

  if (user.role === 'FACULTY') {
    sql += ` WHERE b.trainer_id = ?`;
    params.push(user.id);
  }

  sql += ` ORDER BY b.start_date DESC`;
  const batches = await queryAll(sql, params);
  res.json({ batches });
});

apiRouter.post('/batches', authenticateToken, requireRole(['FACULTY']), async (req: AuthenticatedRequest, res: Response) => {
  const { batch_name, batch_code, course_id, trainer_id, start_date, end_date, timing } = req.body;
  const effectiveFacultyId = req.user!.role === 'FACULTY' ? req.user!.id : trainer_id;
  if (!batch_name || !batch_code || !course_id || !effectiveFacultyId || !start_date || !timing) {
    res.status(400).json({ error: 'All batch fields (name, code, course, trainer, start date, timing) are required.' });
    return;
  }

  const existing = await queryOne('SELECT id FROM batches WHERE LOWER(batch_code) = LOWER(?)', [batch_code.trim()]);
  if (existing) {
    res.status(400).json({ error: 'A batch with this code already exists.' });
    return;
  }

  const result = await execute(
    `INSERT INTO batches (batch_name, batch_code, course_id, trainer_id, start_date, end_date, timing, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [batch_name.trim(), batch_code.trim().toUpperCase(), course_id, effectiveFacultyId, start_date, end_date || null, timing.trim()]
  );

  // Ensure trainer is also mapped to the course
  await execute(
    `INSERT INTO trainer_course_assignments (trainer_id, course_id) VALUES (?, ?) ON CONFLICT (trainer_id, course_id) DO NOTHING`,
    [effectiveFacultyId, course_id]
  );

  logActivity(
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'BATCH_CREATE',
    `Created batch ${batch_name} (${batch_code.toUpperCase()}).`
  );

  res.status(201).json({ message: 'Batch created successfully.', id: result.lastInsertRowId });
});

apiRouter.put('/batches/:id', authenticateToken, requireRole(['FACULTY']), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { batch_name, course_id, trainer_id, start_date, end_date, timing, status } = req.body;
  const effectiveFacultyId = req.user!.role === 'FACULTY' ? req.user!.id : trainer_id;

  await execute(
    `UPDATE batches 
     SET batch_name = ?, course_id = ?, trainer_id = ?, start_date = ?, end_date = ?, timing = ?, status = ?
     WHERE id = ?`,
    [batch_name.trim(), course_id, effectiveFacultyId, start_date, end_date || null, timing.trim(), status || 'ACTIVE', id]
  );

  logActivity(req.user!.id, req.user!.name, req.user!.role, 'BATCH_UPDATE', `Updated batch ID ${id}.`);
  res.json({ message: 'Batch updated successfully.' });
});

// -------------------------------------------------------------
// FACULTYS MANAGEMENT (Section 8)
// -------------------------------------------------------------

apiRouter.get('/trainers', authenticateToken, async (req, res) => {
  const trainers = await queryAll<any>(
    `SELECT u.id, u.name, u.username, u.email, u.mobile, u.status, u.created_at, u.last_login,
            (SELECT COUNT(*) FROM batches b WHERE b.trainer_id = u.id AND b.status = 'ACTIVE') as active_batches_count,
            (SELECT COUNT(*) FROM examinations e WHERE e.trainer_id = u.id) as exam_uploads_count
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.role_name = 'FACULTY'
     ORDER BY u.name ASC`
  );

  // Fetch assigned courses for each trainer
  for (const t of trainers) {
    t.assignedCourses = await queryAll(
      `SELECT c.id, c.course_name, c.course_code
       FROM courses c
       JOIN trainer_course_assignments tca ON tca.course_id = c.id
       WHERE tca.trainer_id = ?`,
      [t.id]
    );
  }

  res.json({ trainers });
});

apiRouter.post('/trainers', authenticateToken, requireRole(['CENTER_MANAGER', 'TEAM_LEAD', 'ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const { name, username, email, mobile, password, course_ids } = req.body;
  if (!name || !username || !email || !password) {
    res.status(400).json({ error: 'Name, username, email and password are required.' });
    return;
  }

  const existing = await queryOne('SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)', [username.trim(), email.trim()]);
  if (existing) {
    res.status(400).json({ error: 'User with this username or email already exists.' });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = await execute(
    `INSERT INTO users (name, username, email, password_hash, role_id, mobile, status)
     VALUES (?, ?, ?, ?, (SELECT id FROM roles WHERE role_name='FACULTY'), ?, 'ACTIVE')`,
    [name.trim(), username.trim(), email.trim(), hash, mobile?.trim() || null]
  );

  const trainerId = result.lastInsertRowId!;

  if (Array.isArray(course_ids)) {
    for (const cId of course_ids) {
      await execute(`INSERT INTO trainer_course_assignments (trainer_id, course_id) VALUES (?, ?) ON CONFLICT (trainer_id, course_id) DO NOTHING`, [trainerId, cId]);
    }
  }

  logActivity(
    req.user!.id,
    req.user!.name,
    req.user!.role,
    'FACULTY_CREATE',
    `Added new trainer: ${name} (${username}).`
  );

  res.status(201).json({ message: 'Trainer added successfully.', id: trainerId });
});

apiRouter.put('/trainers/:id', authenticateToken, requireRole(['CENTER_MANAGER', 'TEAM_LEAD', 'ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, mobile, status, course_ids } = req.body;

  await execute(
    `UPDATE users SET name = ?, email = ?, mobile = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role_id = (SELECT id FROM roles WHERE role_name='FACULTY')`,
    [name.trim(), email.trim(), mobile?.trim() || null, status || 'ACTIVE', id]
  );

  if (Array.isArray(course_ids)) {
    await execute(`DELETE FROM trainer_course_assignments WHERE trainer_id = ?`, [id]);
    for (const cId of course_ids) {
      await execute(`INSERT INTO trainer_course_assignments (trainer_id, course_id) VALUES (?, ?) ON CONFLICT (trainer_id, course_id) DO NOTHING`, [id, cId]);
    }
  }

  logActivity(req.user!.id, req.user!.name, req.user!.role, 'FACULTY_UPDATE', `Updated trainer profile for ID ${id}.`);
  res.json({ message: 'Trainer details updated successfully.' });
});

apiRouter.delete('/trainers/:id', authenticateToken, requireRole(['CENTER_MANAGER', 'TEAM_LEAD', 'ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const id = Number(req.params.id); const target = await queryOne<any>(`SELECT id,name FROM users WHERE id=? AND role_id=(SELECT id FROM roles WHERE role_name='FACULTY')`, [id]);
  if (!target) { res.status(404).json({ error: 'Faculty not found.' }); return; }
  await execute(`UPDATE users SET status='INACTIVE', updated_at=CURRENT_TIMESTAMP WHERE id=? AND role_id=(SELECT id FROM roles WHERE role_name='FACULTY')`, [id]);
  logActivity(req.user!.id, req.user!.name, req.user!.role, 'FACULTY_DELETE', `Deactivated faculty ${target.name} (ID ${id}).`);
  res.json({ message: 'Faculty deactivated successfully.' });
});

apiRouter.post('/trainers/:id/reset-password', authenticateToken, requireRole(['CENTER_MANAGER', 'TEAM_LEAD', 'ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  await execute(`UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [hash, id]);

  logActivity(req.user!.id, req.user!.name, req.user!.role, 'PASSWORD_RESET', `Reset password for user ID ${id}.`);
  res.json({ message: 'Password reset successfully.' });
});

apiRouter.post('/users/:id/reset-password', authenticateToken, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }

  const targetUser = await queryOne<any>('SELECT name, username FROM users WHERE id = ?', [id]);
  if (!targetUser) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  await execute(`UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [hash, id]);

  logActivity(req.user!.id, req.user!.name, req.user!.role, 'PASSWORD_RESET', `Admin reset password for ${targetUser.name} (@${targetUser.username}).`);
  res.json({ message: `Password reset successfully for ${targetUser.name}.` });
});

// -------------------------------------------------------------
// STUDENTS MANAGEMENT (Section 7)
// -------------------------------------------------------------

apiRouter.get('/students', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { search, course_id, batch_id, status } = req.query;

  let sql = `
    SELECT s.*, c.course_name, c.course_code, b.batch_name, b.batch_code, b.timing
    FROM students s
    JOIN courses c ON s.course_id = c.id
    JOIN batches b ON s.batch_id = b.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // If trainer, limit to batches assigned to this trainer
  if (user.role === 'FACULTY') {
    sql += ` AND b.trainer_id = ?`;
    params.push(user.id);
  }

  if (course_id) {
    sql += ` AND s.course_id = ?`;
    params.push(course_id);
  }
  if (batch_id) {
    sql += ` AND s.batch_id = ?`;
    params.push(batch_id);
  }
  if (status) {
    sql += ` AND s.status = ?`;
    params.push(status);
  }
  if (search && typeof search === 'string') {
    sql += ` AND (LOWER(s.name) LIKE ? OR LOWER(s.student_id) LIKE ? OR LOWER(s.registration_no) LIKE ? OR LOWER(s.mobile) LIKE ? OR LOWER(s.email) LIKE ?)`;
    const term = `%${search.trim().toLowerCase()}%`;
    params.push(term, term, term, term, term);
  }

  sql += ` ORDER BY s.id DESC`;
  const students = await queryAll(sql, params);
  res.json({ students });
});

apiRouter.post('/students', authenticateToken, async (_req: AuthenticatedRequest, res: Response) => { res.status(410).json({ error: 'Staff student registration is disabled. Students must register through /student/register.' }); });

apiRouter.put('/students/:id', authenticateToken, requireRole(['FACULTY', 'ADMIN', 'CENTER_MANAGER', 'COUNSELLOR']), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, mobile, course_id, batch_id, status, address, registration_no } = req.body;

  await execute(
    `UPDATE students 
     SET name = ?, email = ?, mobile = ?, course_id = ?, batch_id = ?, status = ?, address = ?, registration_no = ?
     WHERE id = ?`,
    [name.trim(), email.trim(), mobile.trim(), course_id, batch_id, status || 'ACTIVE', address?.trim() || null, registration_no?.trim(), id]
  );

  logActivity(req.user!.id, req.user!.name, req.user!.role, 'STUDENT_UPDATE', `Updated student details for ID ${id}.`);
  res.json({ message: 'Student details updated successfully.' });
});

// -------------------------------------------------------------
// EXAMINATION MANAGEMENT & UPLOAD (Section 9, 10, 11, 12)
// -------------------------------------------------------------

apiRouter.get('/examinations', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { course_id, batch_id, trainer_id, status, exam_type, search } = req.query;

  let sql = `
    SELECT e.*, c.course_name, c.course_code, b.batch_name, b.batch_code, b.timing,
           u.name as trainer_name, u.email as trainer_email
    FROM examinations e
    JOIN courses c ON e.course_id = c.id
    JOIN batches b ON e.batch_id = b.id
    JOIN users u ON e.trainer_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Trainer can only see examinations for their assigned course/batches (or uploaded by them)
  if (user.role === 'FACULTY') {
    sql += ` AND e.trainer_id = ?`;
    params.push(user.id);
  }

  if (course_id) {
    sql += ` AND e.course_id = ?`;
    params.push(course_id);
  }
  if (batch_id) {
    sql += ` AND e.batch_id = ?`;
    params.push(batch_id);
  }
  if (trainer_id) {
    sql += ` AND e.trainer_id = ?`;
    params.push(trainer_id);
  }
  if (status) {
    sql += ` AND e.status = ?`;
    params.push(status);
  }
  if (exam_type) {
    sql += ` AND e.exam_type = ?`;
    params.push(exam_type);
  }
  if (search && typeof search === 'string') {
    sql += ` AND (LOWER(e.title) LIKE ? OR LOWER(e.exam_id) LIKE ? OR LOWER(e.subject) LIKE ?)`;
    const term = `%${search.trim().toLowerCase()}%`;
    params.push(term, term, term);
  }

  sql += ` ORDER BY e.created_at DESC`;
  const examinations = await queryAll(sql, params);
  res.json({ examinations });
});

apiRouter.get('/examinations/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const exam = await queryOne<any>(
    `SELECT e.*, c.course_name, c.course_code, b.batch_name, b.batch_code, b.timing,
            u.name as trainer_name, u.email as trainer_email, u.mobile as trainer_mobile
     FROM examinations e
     JOIN courses c ON e.course_id = c.id
     JOIN batches b ON e.batch_id = b.id
     JOIN users u ON e.trainer_id = u.id
     WHERE e.id = ? OR e.exam_id = ?`,
    [id, id]
  );

  if (!exam) {
    res.status(404).json({ error: 'Examination record not found.' });
    return;
  }

  if (user.role === 'FACULTY' && exam.trainer_id !== user.id) {
    res.status(403).json({ error: 'Unauthorized to view this examination record.' });
    return;
  }

  res.json({ examination: exam });
});

// UPLOAD EXAMINATION PAPER (Section 9, 10, 11)
apiRouter.post(
  '/examinations',
  authenticateToken,
  requireRole(['FACULTY']),
  examUpload.single('exam_file'), async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;

    if (!req.file) {
      res.status(400).json({ error: 'Please upload an examination paper file (PDF, DOC, DOCX, JPG, PNG).' });
      return;
    }

    const {
      title,
      course_id,
      batch_id,
      subject,
      exam_type,
      exam_date,
      duration,
      total_marks,
      number_of_questions,
      instructions,
      additional_notes
    } = req.body;

    if (!title || !course_id || !batch_id || !subject || !exam_type || !exam_date || !duration || !total_marks) {
      // Cleanup uploaded file on error
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(400).json({ error: 'Missing required examination fields.' });
      return;
    }

    const parsedCourseId = parseInt(course_id, 10);
    const parsedBatchId = parseInt(batch_id, 10);

    // Business Rule 4: System validates trainer permissions & assignment
    if (user.role === 'FACULTY') {
      const batchCheck = await queryOne(
        `SELECT id FROM batches WHERE id = ? AND course_id = ? AND trainer_id = ?`,
        [parsedBatchId, parsedCourseId, user.id]
      );
      if (!batchCheck) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        res.status(403).json({
          error: 'Permission denied: You can only upload examination papers for courses and batches assigned to you.'
        });
        return;
      }
    }

    // Generate unique Examination ID: EXAM-2026-000XXX
    const countRow = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM examinations');
    const nextExamNum = (countRow?.count || 0) + 105;
    const exam_id = `EXAM-2026-${nextExamNum.toString().padStart(6, '0')}`;

    // Relative path for database reference
    const relativeFilePath = path.relative(process.cwd(), req.file.path);

    const trainerIdToRecord = user.role === 'FACULTY' ? user.id : (req.body.trainer_id ? parseInt(req.body.trainer_id, 10) : user.id);

    const result = await execute(
      `INSERT INTO examinations (
        exam_id, title, course_id, batch_id, trainer_id, subject, exam_type, exam_date,
        duration, total_marks, number_of_questions, instructions, additional_notes,
        file_name, file_path, file_type, file_size, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED')`,
      [
        exam_id,
        title.trim(),
        parsedCourseId,
        parsedBatchId,
        trainerIdToRecord,
        subject.trim(),
        exam_type.trim(),
        exam_date,
        duration.trim(),
        parseInt(total_marks, 10) || 100,
        parseInt(number_of_questions, 10) || 10,
        instructions?.trim() || '',
        additional_notes?.trim() || '',
        req.file.originalname,
        relativeFilePath,
        req.file.mimetype,
        req.file.size
      ]
    );

    const newExamDbId = result.lastInsertRowId!;

    // Fetch batch and course metadata for rich notification
    const meta = await queryOne<any>(
      `SELECT c.course_name, b.batch_code, b.batch_name FROM batches b JOIN courses c ON b.course_id = c.id WHERE b.id = ?`,
      [parsedBatchId]
    );

    const notifMessage = `New examination paper uploaded by ${user.name} for ${meta?.course_name || 'Course'} – Batch ${meta?.batch_code || ''}.`;

    // Business Rule: Create notifications for administrative users (Center Manager, Admin, Team Lead, Counsellor)
    const adminRoles = ['CENTER_MANAGER', 'ADMIN', 'TEAM_LEAD', 'COUNSELLOR'];
    for (const role of adminRoles) {
      await execute(
        `INSERT INTO notifications (target_role, examination_id, title, message, is_read)
         VALUES (?, ?, 'New Examination Paper Uploaded', ?, 0)`,
        [role, newExamDbId, notifMessage]
      );
    }

    // Business Rule 12: Record in activity log
    logActivity(
      user.id,
      user.name,
      user.role,
      'EXAMINATION_UPLOAD',
      `Uploaded examination paper ${exam_id} (${title}) for Batch ${meta?.batch_code || ''}.`
    );

    res.status(201).json({
      message: 'Examination paper uploaded successfully.',
      exam_id,
      id: newExamDbId
    });
  }
);

// SECURE EXAMINATION DOWNLOAD (Section 12 & 24 Business Rule 14)
apiRouter.get('/examinations/:id/download', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const exam = await queryOne<any>('SELECT * FROM examinations WHERE id = ? OR exam_id = ?', [id, id]);
  if (!exam) {
    res.status(404).json({ error: 'Examination record not found.' });
    return;
  }

  // Trainer can only download their own exam papers
  if (user.role === 'FACULTY' && exam.trainer_id !== user.id) {
    res.status(403).json({ error: 'Unauthorized to download this examination paper.' });
    return;
  }
  if (user.role === 'STUDENT') {
    const student = await queryOne<any>('SELECT id,batch_id,course_id FROM students WHERE user_id=?', [user.id]);
    if (!student || Number(exam.batch_id) !== Number(student.batch_id) || Number(exam.course_id) !== Number(student.course_id)) {
      res.status(403).json({ error: 'You are not authorized to access this examination paper.' }); return;
    }
  }

  const fullPath = path.resolve(process.cwd(), exam.file_path);
  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: 'The physical exam paper file was not found on the server.' });
    return;
  }

  // Record download activity log
  logActivity(
    user.id,
    user.name,
    user.role,
    'EXAMINATION_DOWNLOAD',
    `Downloaded exam paper for ${exam.exam_id} (${exam.title}).`
  );

  res.download(fullPath, exam.file_name);
});

// PREVIEW EXAMINATION PAPER
apiRouter.get('/examinations/:id/preview', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const exam = await queryOne<any>(
    `SELECT e.*, c.course_name, b.batch_code, b.batch_name, u.name as trainer_name
     FROM examinations e
     JOIN courses c ON e.course_id = c.id
     JOIN batches b ON e.batch_id = b.id
     JOIN users u ON e.trainer_id = u.id
     WHERE e.id = ? OR e.exam_id = ?`,
    [id, id]
  );
  if (!exam) {
    res.status(404).json({ error: 'Examination record not found.' });
    return;
  }

  if (user.role === 'FACULTY' && exam.trainer_id !== user.id) {
    res.status(403).json({ error: 'Unauthorized to preview this examination paper.' });
    return;
  }

  const fullPath = path.resolve(process.cwd(), exam.file_path);
  let fileContentText = '';
  if (fs.existsSync(fullPath)) {
    try {
      fileContentText = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      fileContentText = 'Binary file (PDF/DOCX) previewed via metadata.';
    }
  }

  res.json({
    examination: exam,
    previewContent: fileContentText
  });
});

// UPDATE EXAM STATUS (Admin / Center Manager review)
apiRouter.put('/examinations/:id/status', authenticateToken, requireRole(['ADMIN', 'CENTER_MANAGER', 'TEAM_LEAD']), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    res.status(400).json({ error: 'Status is required.' });
    return;
  }

  await execute(`UPDATE examinations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, id]);
  logActivity(req.user!.id, req.user!.name, req.user!.role, 'EXAMINATION_STATUS_UPDATE', `Updated examination ${id} status to ${status}.`);
  res.json({ message: 'Examination status updated.' });
});

// -------------------------------------------------------------
// ONLINE TIMED EXAMINATIONS (Trainer module)
// -------------------------------------------------------------

function durationMinutesFromExam(exam: any) {
  return Math.max(1, Number(exam.duration_minutes) || 30);
}

function getAppBaseUrl(req: AuthenticatedRequest | Request) {
  const configured = process.env.APP_URL?.trim();
  if (configured && configured !== 'MY_APP_URL') return configured.replace(/\/$/, '');
  const proto = (req as Request).protocol || 'http';
  const host = (req as Request).get('host') || 'localhost:3000';
  return `${proto.split(',')[0]}://${host}`;
}

apiRouter.get('/online-exams', authenticateToken, requireRole(['FACULTY']), async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let sql = `
    SELECT oe.*, c.course_name, c.course_code, b.batch_name, b.batch_code, u.name as trainer_name,
           (SELECT COUNT(*) FROM online_exam_questions q WHERE q.online_exam_id = oe.id) as question_count,
           (SELECT COUNT(*) FROM online_exam_assignments a WHERE a.online_exam_id = oe.id) as assignment_count,
           (SELECT COUNT(*) FROM online_exam_assignments a JOIN online_exam_attempts at ON at.assignment_id = a.id WHERE a.online_exam_id = oe.id AND at.status = 'SUBMITTED') as completed_count
    FROM online_exams oe
    JOIN courses c ON c.id = oe.course_id
    JOIN batches b ON b.id = oe.batch_id
    JOIN users u ON u.id = oe.trainer_id
  `;
  const params: any[] = [];
  if (user.role === 'FACULTY') { sql += ` WHERE oe.trainer_id = ?`; params.push(user.id); }
  sql += ` ORDER BY oe.created_at DESC`;
  res.json({ onlineExams: await queryAll(sql, params) });
});


// Parse a trainer-uploaded PDF and turn a conventional MCQ paper into online-exam questions.
// Supported formats include: Q1/1. question followed by A)/B)/C)/D) options, with optional
// Answer:/Ans:/Correct Answer: lines. If the PDF has no answer key, the trainer is told
// exactly what is missing rather than silently creating an unscorable examination.
apiRouter.post('/online-exams/parse-pdf', authenticateToken, requireRole(['FACULTY']), examUpload.single('exam_file'), async (req: AuthenticatedRequest, res: Response) => {
  const file = (req as any).file;
  if (!file) return res.status(400).json({ error: 'Please upload a PDF question paper.' });
  const ext = path.extname(file.originalname || file.path).toLowerCase();
  if (ext !== '.pdf' && file.mimetype !== 'application/pdf') {
    try { fs.unlinkSync(file.path); } catch { }
    return res.status(400).json({ error: 'Only PDF question papers can be converted into an online exam.' });
  }

  try {
    let text = '';
    let extractionMethod = '';

    // First choice on Windows/Linux when Poppler is installed.
    try {
      text = execFileSync('pdftotext', ['-layout', file.path, '-'], { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 });
      extractionMethod = 'pdftotext';
    } catch { }

    // Pure JavaScript fallback for text-based PDFs. This avoids requiring pdftotext on Windows.
    if (!text.trim()) {
      try {
        const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const data = new Uint8Array(fs.readFileSync(file.path));
        const pdf = await pdfjs.getDocument({ data, disableWorker: true }).promise;
        const pages: string[] = [];
        for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
          const page = await pdf.getPage(pageNo);
          const content = await page.getTextContent();
          pages.push(content.items.map((item: any) => String(item.str || '')).join(' '));
        }
        text = pages.join('\n');
        extractionMethod = 'pdfjs';
      } catch (e) {
        console.error('PDF.js extraction failed:', e);
      }
    }

    if (!text.trim()) {
      return res.status(422).json({
        error: 'The PDF contains no readable text. It may be a scanned/image-only PDF. OCR is required for this file.',
        code: 'PDF_TEXT_EMPTY'
      });
    }

    // Normalize PDF line layout without destroying A)/B)/C)/D) boundaries.
    const normalized = text
      .replace(/\r/g, '\n')
      .replace(/[\u00a0\t]+/g, ' ')
      .replace(/[ ]{2,}/g, ' ')
      .replace(/\n[ ]+/g, '\n')
      .trim();
    const rawLines = normalized.split(/\n+/).map((x: string) => x.trim()).filter(Boolean);

    // PDF.js can return several logical lines as one string. Split common MCQ markers onto lines.
    const lines: string[] = [];
    for (const raw of rawLines) {
      const expanded = raw
        .replace(/\s+(?=(?:Q(?:uestion)?\s*)?\d{1,3}[.)\-:])/gi, '\n')
        .replace(/\s+(?=\(?[ABCD]\)?[.)\-:])/g, '\n')
        .replace(/\s+(?=(?:Answer|Ans|Correct Answer)\s*[:\-])/gi, '\n');
      for (const line of expanded.split('\n')) if (line.trim()) lines.push(line.trim());
    }

    const questions: any[] = [];
    let current: any = null;
    let currentOption: string | null = null;
    const answerKey: Record<number, string> = {};
    let answerSection = false;

    const pushCurrent = () => {
      if (!current) return;
      current.question_text = String(current.question_text || '').trim();
      for (const k of ['A', 'B', 'C', 'D']) current['option_' + k.toLowerCase()] = String(current['option_' + k.toLowerCase()] || '').trim();
      if (current.question_text && current.option_a && current.option_b && current.option_c && current.option_d) questions.push(current);
      current = null;
      currentOption = null;
    };

    for (const line of lines) {
      const answer = line.match(/^(?:answer|ans|correct\s*answer)(?:\s*(?:for\s*)?(?:q(?:uestion)?\s*)?(\d+))?\s*[:\-.)]?\s*([ABCD])\b/i);
      if (answer) {
        // If an answer follows the current question, associate it with that question number.
        const n = answer[1] ? Number(answer[1]) : (current?.source_number ?? questions.length + 1);
        answerKey[n] = answer[2].toUpperCase();
        continue;
      }

      if (/^(?:answer\s*key|answers|correct\s*answers?)\s*:?$/i.test(line)) {
        answerSection = true;
        continue;
      }
      if (answerSection) {
        const pairs = [...line.matchAll(/(\d+)\s*[-.:)]\s*([ABCD])/gi)];
        if (pairs.length) {
          for (const m of pairs) answerKey[Number(m[1])] = m[2].toUpperCase();
          continue;
        }
        if (!/^\d+/.test(line)) answerSection = false;
      }

      const qmatch = line.match(/^(?:Q(?:uestion)?\s*)?(\d{1,3})\s*[.)\-:]\s*(.+)$/i);
      const omatch = line.match(/^\(?([ABCD])\)?\s*[.)\-:]\s*(.+)$/i);
      if (qmatch) {
        pushCurrent();
        current = {
          topic: String(req.body?.topics || 'General').split(',')[0].trim() || 'General',
          question_text: qmatch[2].trim(), option_a: '', option_b: '', option_c: '', option_d: '',
          correct_option: '', marks: 1, source_number: Number(qmatch[1])
        };
        currentOption = null;
      } else if (omatch && current) {
        currentOption = omatch[1].toUpperCase();
        current['option_' + currentOption.toLowerCase()] = omatch[2].trim();
      } else if (current && currentOption && !/^(?:answer|ans|correct)/i.test(line)) {
        const k = 'option_' + currentOption.toLowerCase();
        current[k] = `${current[k]} ${line}`.trim();
      } else if (current && !answerSection) {
        current.question_text = `${current.question_text} ${line}`.trim();
      }
    }
    pushCurrent();

    questions.forEach((q: any, i: number) => {
      q.correct_option = answerKey[q.source_number] || '';
      delete q.source_number;
      q.question_order = i + 1;
    });

    if (!questions.length) {
      return res.status(422).json({
        error: 'Text was extracted from the PDF, but no complete MCQ pattern was detected. Expected formats such as "1. Question", "A) Option", "B) Option", "C) Option", "D) Option".',
        code: 'MCQ_PATTERN_NOT_FOUND',
        extraction_method: extractionMethod,
        extracted_text_length: normalized.length,
        sample_text: normalized.slice(0, 2500)
      });
    }

    const missingAnswers = questions.filter(q => !['A', 'B', 'C', 'D'].includes(q.correct_option)).length;
    const inferredTitle = path.basename(file.originalname, '.pdf').replace(/[_-]+/g, ' ').trim();

    return res.json({
      message: missingAnswers
        ? 'Questions generated from PDF. Some correct answers require trainer review.'
        : 'Questions generated from PDF successfully.',
      title: inferredTitle,
      extracted_text_length: normalized.length,
      extraction_method: extractionMethod,
      questions,
      question_count: questions.length,
      missing_answers: missingAnswers,
      requires_answer_review: missingAnswers > 0
    });
  } catch (error: any) {
    console.error('PDF parse error:', error);
    return res.status(500).json({ error: `PDF processing failed: ${error?.message || 'Unknown error'}`, code: 'PDF_PARSE_FAILED' });
  } finally {
    try { fs.unlinkSync(file.path); } catch { }
  }
});

apiRouter.post('/online-exams', authenticateToken, requireRole(['FACULTY']), async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { title, course_id, batch_id, topics, duration_minutes, total_marks, passing_marks, instructions, questions } = req.body;
  if (!title || !course_id || !batch_id || !topics || !Array.isArray(questions) || questions.length === 0) {
    res.status(400).json({ error: 'Title, course, batch, topics, and at least one question are required.' }); return;
  }
  const courseId = Number(course_id), batchId = Number(batch_id);
  const batch = await queryOne<any>('SELECT id, course_id, trainer_id FROM batches WHERE id = ?', [batchId]);
  if (!batch || Number(batch.course_id) !== courseId) { res.status(400).json({ error: 'Selected batch does not belong to the selected course.' }); return; }
  if (user.role === 'FACULTY' && Number(batch.trainer_id) !== user.id) { res.status(403).json({ error: 'You can create online exams only for your assigned batches.' }); return; }
  const cleanQuestions = questions.map((q: any, i: number) => ({
    topic: String(q.topic || '').trim(), question_text: String(q.question_text || '').trim(), option_a: String(q.option_a || '').trim(), option_b: String(q.option_b || '').trim(), option_c: String(q.option_c || '').trim(), option_d: String(q.option_d || '').trim(), correct_option: String(q.correct_option || '').toUpperCase(), marks: Math.max(1, Number(q.marks) || 1), order: i + 1
  }));
  if (cleanQuestions.some((q: any) => !q.topic || !q.question_text || !q.option_a || !q.option_b || !q.option_c || !q.option_d || !['A', 'B', 'C', 'D'].includes(q.correct_option))) { res.status(400).json({ error: 'Every question must have a topic, question, four options, and a valid correct option.' }); return; }
  const totalQuestionMarks = cleanQuestions.reduce((sum: number, q: any) => sum + q.marks, 0);
  const finalTotalMarks = Number(total_marks) > 0 ? Number(total_marks) : totalQuestionMarks;
  const code = `ONL-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const result = await execute(`INSERT INTO online_exams (exam_code,title,course_id,batch_id,trainer_id,topics,duration_minutes,total_marks,passing_marks,instructions,status) VALUES (?,?,?,?,?,?,?,?,?,?, 'DRAFT')`, [code, String(title).trim(), courseId, batchId, user.id, String(topics).trim(), Math.min(300, Math.max(1, Number(duration_minutes) || 30)), finalTotalMarks, Math.max(0, Number(passing_marks) || 0), String(instructions || '').trim()]);
  const examId = Number(result.lastInsertRowId);
  for (const q of cleanQuestions) await execute(`INSERT INTO online_exam_questions (online_exam_id,topic,question_text,option_a,option_b,option_c,option_d,correct_option,marks,question_order) VALUES (?,?,?,?,?,?,?,?,?,?)`, [examId, q.topic, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.marks, q.order]);
  const students = await queryAll<any>('SELECT id FROM students WHERE batch_id = ? AND status = \'ACTIVE\'', [batchId]);
  for (const st of students) await execute(`INSERT INTO online_exam_assignments (online_exam_id,student_id,access_token) VALUES (?,?,?)`, [examId, st.id, crypto.randomBytes(24).toString('hex')]);
  logActivity(user.id, user.name, user.role, 'ONLINE_EXAM_CREATE', `Created online exam ${code} for batch ${batchId} with ${cleanQuestions.length} questions.`);
  res.status(201).json({ message: 'Online exam created and assigned to active batch students.', online_exam_id: examId, exam_code: code, assignment_count: students.length });
});

apiRouter.get('/online-exams/:id/assignments', authenticateToken, requireRole(['FACULTY']), async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!; const examId = Number(req.params.id);
  const exam = await queryOne<any>('SELECT * FROM online_exams WHERE id = ?', [examId]);
  if (!exam) { res.status(404).json({ error: 'Online exam not found.' }); return; }
  if (user.role === 'FACULTY' && exam.trainer_id !== user.id) { res.status(403).json({ error: 'Unauthorized.' }); return; }
  const base = getAppBaseUrl(req);
  const assignments = (await queryAll<any>(`SELECT a.*, s.student_id as student_code, s.name as student_name, s.email as student_email, s.mobile as student_mobile,
      at.status as attempt_status, at.score
    FROM online_exam_assignments a JOIN students s ON s.id = a.student_id
    LEFT JOIN online_exam_attempts at ON at.assignment_id = a.id
    WHERE a.online_exam_id = ? ORDER BY s.name`, [examId])).map((a: any) => ({ ...a, exam_link: `${base}/exam/${a.access_token}` }));
  res.json({ assignments });
});


async function syncPublishedExamAssignments(examId: number) {
  // Create a unique secure link for every ACTIVE student in the assigned batch
  // at publish time so the Student Portal has a secure link for every active student.
  // even when students were added/activated after the exam was created.
  const exam = await queryOne<any>('SELECT batch_id FROM online_exams WHERE id=?', [examId]);
  if (!exam) throw new Error('Online exam not found.');
  const students = await queryAll<any>(
    `SELECT id FROM students WHERE batch_id=? AND status='ACTIVE'`,
    [exam.batch_id]
  );
  for (const student of students) {
    const existing = await queryOne<any>(
      'SELECT id FROM online_exam_assignments WHERE online_exam_id=? AND student_id=?',
      [examId, student.id]
    );
    if (!existing) {
      await execute(
        'INSERT INTO online_exam_assignments (online_exam_id,student_id,access_token) VALUES (?,?,?)',
        [examId, student.id, crypto.randomBytes(24).toString('hex')]
      );
    }
  }
}


apiRouter.post('/online-exams/:id/publish', authenticateToken, requireRole(['FACULTY']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exam = await queryOne<any>('SELECT * FROM online_exams WHERE id = ?', [Number(req.params.id)]);
    if (!exam) { res.status(404).json({ error: 'Online exam not found.' }); return; }
    if (req.user!.role === 'FACULTY' && exam.trainer_id !== req.user!.id) { res.status(403).json({ error: 'Unauthorized.' }); return; }
    if (exam.status === 'PUBLISHED') { res.json({ message: 'Online exam is already published.' }); return; }

    await execute(`UPDATE online_exams SET status='PUBLISHED', updated_at=CURRENT_TIMESTAMP WHERE id=?`, [exam.id]);
    await syncPublishedExamAssignments(Number(exam.id));
    logActivity(req.user!.id, req.user!.name, 'FACULTY', 'ONLINE_EXAM_PUBLISHED', `Published ${exam.exam_code} and synchronized secure student exam links.`);
    res.json({ message: 'Online exam published and student exam links updated.', exam_id: exam.id });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Online exam publication failed.' });
  }
});

apiRouter.post('/online-exams/:id/close', authenticateToken, requireRole(['FACULTY']), async (req: AuthenticatedRequest, res: Response) => {
  const exam = await queryOne<any>('SELECT * FROM online_exams WHERE id = ?', [Number(req.params.id)]);
  if (!exam) { res.status(404).json({ error: 'Online exam not found.' }); return; }
  if (req.user!.role === 'FACULTY' && exam.trainer_id !== req.user!.id) { res.status(403).json({ error: 'Unauthorized.' }); return; }
  await execute(`UPDATE online_exams SET status='CLOSED', updated_at=CURRENT_TIMESTAMP WHERE id=?`, [exam.id]);
  res.json({ message: 'Online exam closed.' });
});



// Staff-facing online exam results. Trainers see only exams assigned to them;
// management/support roles see all completed online exam results.
apiRouter.get('/online-exam-results', authenticateToken,
  requireRole(['FACULTY', 'CENTER_MANAGER', 'ADMIN', 'TEAM_LEAD', 'COUNSELLOR']), async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const params: any[] = [];
    let where = `WHERE at.status = 'SUBMITTED'`;

    if (user.role === 'FACULTY') {
      where += ` AND oe.trainer_id = ?`;
      params.push(user.id);
    }

    const results = (await queryAll<any>(
      `SELECT
        at.id as attempt_id,
        at.submitted_at,
        at.score,
        at.correct_answers,
        at.wrong_answers,
        at.unanswered,
        at.status as attempt_status,
        a.id as assignment_id,
        s.student_id as student_code,
        s.name as student_name,
        oe.id as online_exam_id,
        oe.exam_code,
        oe.title as exam_title,
        oe.total_marks,
        oe.passing_marks,
        oe.trainer_id,
        trainer.name as trainer_name,
        c.course_name,
        b.batch_name,
        CASE WHEN at.score >= oe.passing_marks THEN 1 ELSE 0 END as passed
       FROM online_exam_attempts at
       JOIN online_exam_assignments a ON a.id = at.assignment_id
       JOIN online_exams oe ON oe.id = a.online_exam_id
       JOIN students s ON s.id = a.student_id
       JOIN courses c ON c.id = oe.course_id
       JOIN batches b ON b.id = oe.batch_id
       LEFT JOIN users trainer ON trainer.id = oe.trainer_id
       ${where}
       ORDER BY at.submitted_at DESC, at.id DESC`,
      params
    )).map((r: any) => ({
      ...r,
      percentage: Number(r.total_marks) > 0
        ? Math.round((Number(r.score) / Number(r.total_marks)) * 100)
        : 0,
      passed: Boolean(r.passed),
    }));

    res.json({ results });
  }
);

// Public student endpoints use the per-student token. No staff authentication is required.
apiRouter.get('/public/online-exams/:token', async (req, res) => {
  const a = await queryOne<any>(`SELECT a.*, oe.*, s.name as student_name, s.student_id as student_code, c.course_name, b.batch_name
    FROM online_exam_assignments a JOIN online_exams oe ON oe.id=a.online_exam_id JOIN students s ON s.id=a.student_id
    JOIN courses c ON c.id=oe.course_id JOIN batches b ON b.id=oe.batch_id WHERE a.access_token=?`, [req.params.token]);
  if (!a || a.status !== 'PUBLISHED') { res.status(404).json({ error: 'This exam link is invalid, not published, or has been closed.' }); return; }
  const questions = await queryAll<any>(`SELECT id,topic,question_text,option_a,option_b,option_c,option_d,marks,question_order FROM online_exam_questions WHERE online_exam_id=? ORDER BY question_order`, [a.online_exam_id]);
  res.json({ exam_code: a.exam_code, title: a.title, student_name: a.student_name, student_code: a.student_code, course_name: a.course_name, batch_name: a.batch_name, topics: a.topics, duration_minutes: a.duration_minutes, total_marks: a.total_marks, passing_marks: a.passing_marks, instructions: a.instructions, questions });
});

apiRouter.post('/public/online-exams/:token/start', async (req, res) => {
  const a = await queryOne<any>(`SELECT a.*, oe.status, oe.duration_minutes FROM online_exam_assignments a JOIN online_exams oe ON oe.id=a.online_exam_id WHERE a.access_token=?`, [req.params.token]);
  if (!a || a.status !== 'PUBLISHED') { res.status(404).json({ error: 'Exam link is invalid or unavailable.' }); return; }
  const existing = await queryOne<any>('SELECT * FROM online_exam_attempts WHERE assignment_id=?', [a.id]);
  if (existing) {
    if (existing.status === 'SUBMITTED') { res.status(409).json({ error: 'This examination has already been submitted.' }); return; }
    const expires = new Date(new Date(existing.started_at).getTime() + durationMinutesFromExam(a) * 60000).toISOString();
    if (Date.now() >= new Date(expires).getTime()) { await execute(`UPDATE online_exam_attempts SET status='SUBMITTED', submitted_at=CURRENT_TIMESTAMP WHERE id=?`, [existing.id]); res.status(409).json({ error: 'The examination time has expired.' }); return; }
    res.json({ attempt_id: existing.id, started_at: existing.started_at, expires_at: expires }); return;
  }
  const result = await execute(`INSERT INTO online_exam_attempts (assignment_id,started_at,status) VALUES (?,CURRENT_TIMESTAMP,'IN_PROGRESS')`, [a.id]);
  const started = await queryOne<any>('SELECT started_at FROM online_exam_attempts WHERE id=?', [result.lastInsertRowId]);

  const startedAt =
    started.started_at instanceof Date
      ? started.started_at
      : new Date(started.started_at);

  if (Number.isNaN(startedAt.getTime())) {
    throw new Error(
      `Invalid started_at timestamp: ${String(started.started_at)}`
    );
  }

  const expires = new Date(
    startedAt.getTime() + durationMinutesFromExam(a) * 60_000
  ).toISOString();

  res.json({ attempt_id: result.lastInsertRowId, started_at: started.started_at, expires_at: expires });
});

apiRouter.post('/public/online-exams/:token/submit', async (req, res) => {
  const a = await queryOne<any>(`SELECT a.*, oe.status, oe.duration_minutes, oe.passing_marks, oe.title as exam_title,
      oe.exam_code, oe.trainer_id, s.name as student_name, s.student_id as student_code,
      c.course_name, b.batch_name
    FROM online_exam_assignments a
    JOIN online_exams oe ON oe.id=a.online_exam_id
    JOIN students s ON s.id=a.student_id
    JOIN courses c ON c.id=oe.course_id
    JOIN batches b ON b.id=oe.batch_id
    WHERE a.access_token=?`, [req.params.token]);

  if (!a || a.status !== 'PUBLISHED') {
    res.status(404).json({ error: 'Exam link is invalid or unavailable.' });
    return;
  }

  const attempt = await queryOne<any>('SELECT * FROM online_exam_attempts WHERE assignment_id=?', [a.id]);
  if (!attempt) {
    res.status(400).json({ error: 'Start the examination before submitting.' });
    return;
  }
  if (attempt.status === 'SUBMITTED') {
    res.status(409).json({ error: 'This examination has already been submitted.' });
    return;
  }

  const startedMs = new Date(`${attempt.started_at.replace(' ', 'T')}Z`).getTime();
  const expired = Date.now() >= startedMs + durationMinutesFromExam(a) * 60000;
  const autoSubmit = req.body?.auto_submit === true;
  const answers = req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
  const questions = await queryAll<any>(
    'SELECT * FROM online_exam_questions WHERE online_exam_id=? ORDER BY question_order',
    [a.online_exam_id]
  );

  // Manual submission is allowed only after every question has an answer.
  // The server enforces this too, because disabling a browser button alone is not security.
  const answeredQuestionIds = new Set(
    Object.keys(answers).filter((key) => answers[key] !== null && String(answers[key]).trim() !== '')
  );
  if (!autoSubmit && !expired && answeredQuestionIds.size < questions.length) {
    res.status(400).json({
      error: `Please answer all ${questions.length} questions before submitting the examination.`,
      answered: answeredQuestionIds.size,
      total_questions: questions.length,
    });
    return;
  }

  // Only accept A/B/C/D answers for questions belonging to this exam.
  const questionIds = new Set(questions.map((q: any) => String(q.id)));
  for (const [questionId, value] of Object.entries(answers)) {
    if (!questionIds.has(String(questionId))) {
      delete answers[questionId];
      continue;
    }
    const option = String(value || '').toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(option)) {
      delete answers[questionId];
    }
  }

  let score = 0, correct = 0, wrong = 0, unanswered = 0;
  for (const q of questions) {
    const selected = answers[String(q.id)] ? String(answers[String(q.id)]).toUpperCase() : null;
    const isCorrect = selected && selected === q.correct_option ? 1 : 0;

    if (!selected) unanswered++;
    else if (isCorrect) { correct++; score += Number(q.marks); }
    else wrong++;

    await execute(
      `INSERT INTO online_exam_answers
        (attempt_id,question_id,selected_option,is_correct,marks_awarded)
       VALUES (?,?,?,?,?)
       ON CONFLICT(attempt_id,question_id) DO UPDATE SET
        selected_option=excluded.selected_option,
        is_correct=excluded.is_correct,
        marks_awarded=excluded.marks_awarded`,
      [attempt.id, q.id, selected, isCorrect, isCorrect ? Number(q.marks) : 0]
    );
  }

  const totalMarks = questions.reduce((sum: number, q: any) => sum + Number(q.marks || 0), 0);
  const passed = score >= Number(a.passing_marks);

  await execute(
    `UPDATE online_exam_attempts
     SET submitted_at=CURRENT_TIMESTAMP, score=?, correct_answers=?, wrong_answers=?,
         unanswered=?, status='SUBMITTED'
     WHERE id=?`,
    [score, correct, wrong, unanswered, attempt.id]
  );

  // Persist a staff-facing result notification immediately after a successful submission.
  // The assigned trainer gets a direct notification; management/support roles receive
  // role-based notifications so the result is visible without exposing the student's
  // private exam link or answer sheet.
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
  const resultLabel = passed ? 'PASS' : 'NOT CLEARED';
  const resultMessage =
    `${a.student_name} (${a.student_code}) completed ${a.exam_title} (${a.exam_code}). ` +
    `Score: ${score}/${totalMarks} (${percentage}%). ` +
    `Correct: ${correct}, Wrong: ${wrong}, Unanswered: ${unanswered}. Result: ${resultLabel}.`;

  if (a.trainer_id) {
    await execute(
      `INSERT INTO notifications (user_id, target_role, title, message, is_read)
       VALUES (?, NULL, ?, ?, 0)`,
      [a.trainer_id, `Online Exam Result: ${a.exam_title}`, resultMessage]
    );
  }

  for (const role of ['ADMIN', 'TEAM_LEAD', 'COUNSELLOR']) {
    await execute(
      `INSERT INTO notifications (user_id, target_role, title, message, is_read)
       VALUES (NULL, ?, ?, ?, 0)`,
      [role, `Online Exam Result: ${a.exam_title}`, resultMessage]
    );
  }

  logActivity(
    null,
    a.student_name,
    'STUDENT',
    'ONLINE_EXAM_SUBMIT',
    `${resultMessage} Attempt ${attempt.id}.`
  );

  res.json({
    student_name: a.student_name,
    student_code: a.student_code,
    exam_title: a.exam_title,
    score,
    total_marks: totalMarks,
    percentage,
    correct_answers: correct,
    wrong_answers: wrong,
    unanswered,
    total_questions: questions.length,
    passed,
    auto_submitted: autoSubmit || expired,
  });
});


// -------------------------------------------------------------
// FACULTY ATTENDANCE
// -------------------------------------------------------------
apiRouter.get('/attendance', authenticateToken, requireRole(['FACULTY', 'CENTER_MANAGER', 'ADMIN', 'TEAM_LEAD', 'COUNSELLOR', 'ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const batchId = Number(req.query.batch_id || 0), date = String(req.query.date || '');
  if (!batchId || !date) { res.status(400).json({ error: 'batch_id and date are required.' }); return; }
  if (req.user!.role === 'FACULTY') {
    const own = await queryOne(`SELECT id FROM batches WHERE id=? AND trainer_id=?`, [batchId, req.user!.id]); if (!own) { res.status(403).json({ error: 'You can only maintain attendance for your assigned batches.' }); return; }
  }
  const students = await queryAll<any>(`SELECT s.id,s.student_id,s.name,s.email,s.mobile,ar.status as attendance_status,ar.remarks FROM students s LEFT JOIN attendance_records ar ON ar.student_id=s.id AND ar.attendance_date=? WHERE s.batch_id=? AND s.status='ACTIVE' ORDER BY s.name`, [date, batchId]);
  res.json({ students });
});

apiRouter.post('/attendance/bulk', authenticateToken, requireRole(['FACULTY']), async (req: AuthenticatedRequest, res: Response) => {
  const { batch_id, attendance_date, records } = req.body || {};
  const batch = await queryOne<any>(`SELECT id,batch_name,batch_code FROM batches WHERE id=? AND trainer_id=?`, [batch_id, req.user!.id]);
  if (!batch) { res.status(403).json({ error: 'You can only maintain attendance for your assigned batches.' }); return; }
  if (!attendance_date || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(attendance_date)) || !Array.isArray(records)) { res.status(400).json({ error: 'Valid attendance date and attendance records are required.' }); return; }
  if (!records.length) { res.status(400).json({ error: 'No active students were loaded for this batch and date.' }); return; }
  const allowed = await queryAll<any>(`SELECT id FROM students WHERE batch_id=? AND status='ACTIVE'`, [batch_id]);
  const allowedIds = new Set(allowed.map((s: any) => Number(s.id)));
  for (const r of records) {
    const studentId = Number(r.student_id);
    if (!allowedIds.has(studentId)) continue;
    await execute(`INSERT INTO attendance_records(student_id,batch_id,attendance_date,status,remarks,marked_by) VALUES(?,?,?,?,?,?) ON CONFLICT(student_id,attendance_date) DO UPDATE SET batch_id=excluded.batch_id,status=excluded.status,remarks=excluded.remarks,marked_by=excluded.marked_by`, [studentId, batch_id, attendance_date, ['PRESENT', 'ABSENT', 'LEAVE'].includes(r.status) ? r.status : 'PRESENT', r.remarks || null, req.user!.id]);
  }
  res.json({ message: `Attendance saved successfully for ${allowedIds.size} active students.`, count: records.length, batch: batch.batch_name, date: attendance_date });
});

apiRouter.post('/attendance/submit', authenticateToken, requireRole(['FACULTY']), attendanceUpload.single('attendance_file'), async (req: AuthenticatedRequest, res: Response) => {
  const { batch_id, attendance_date } = req.body || {};
  const file_name = (req as any).file?.originalname || null;
  const file_path = (req as any).file?.path || null;
  if (!attendance_date || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(attendance_date))) { res.status(400).json({ error: 'A valid attendance date is required.' }); return; }
  if (!file_path) { res.status(400).json({ error: 'Attendance Excel file was not received.' }); return; }
  const batch = await queryOne<any>(`SELECT b.id,b.batch_name,b.batch_code FROM batches b WHERE b.id=? AND b.trainer_id=?`, [batch_id, req.user!.id]);
  if (!batch) { res.status(403).json({ error: 'You can only submit attendance for your assigned batches.' }); return; }
  await execute(`INSERT INTO attendance_submissions(batch_id,attendance_date,faculty_id,file_name,file_path) VALUES(?,?,?,?,?)`, [batch_id, attendance_date, req.user!.id, file_name, file_path]);
  const msg = `Attendance submitted by ${req.user!.name} for ${batch.batch_name} (${batch.batch_code}) for ${attendance_date}. Excel file: ${file_name || 'not attached'}.`;
  for (const role of ['CENTER_MANAGER', 'ADMIN', 'TEAM_LEAD']) await execute(`INSERT INTO notifications(user_id,target_role,title,message,is_read) VALUES(NULL,?,?,?,0)`, [role, 'Attendance Submission', msg]);
  logActivity(req.user!.id, req.user!.name, 'FACULTY', 'ATTENDANCE_SUBMIT', msg);
  res.json({ message: 'Attendance submitted to Center Manager, Admin and Team Lead.' });
});



apiRouter.get('/attendance/submissions', authenticateToken, requireRole(['CENTER_MANAGER', 'ADMIN', 'TEAM_LEAD', 'ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const rows = await queryAll<any>(`SELECT a.id,a.batch_id,a.attendance_date,a.faculty_id,a.file_name,a.file_path,a.submitted_at,
    b.batch_name,b.batch_code,c.course_name,u.name as faculty_name
    FROM attendance_submissions a
    JOIN batches b ON b.id=a.batch_id
    JOIN courses c ON c.id=b.course_id
    JOIN users u ON u.id=a.faculty_id
    ORDER BY a.submitted_at DESC`);
  res.json({ submissions: rows.map(r => ({ ...r, download_url: `/api/attendance-submissions/${r.id}/download` })) });
});

apiRouter.get('/attendance-submissions/:id/download', authenticateToken, requireRole(['CENTER_MANAGER', 'ADMIN', 'TEAM_LEAD', 'ADMIN', 'FACULTY']), async (req: AuthenticatedRequest, res: Response) => {
  const row = await queryOne<any>(`SELECT * FROM attendance_submissions WHERE id=?`, [Number(req.params.id)]);
  if (!row || !row.file_path || !fs.existsSync(row.file_path)) { res.status(404).json({ error: 'Attendance Excel file not found.' }); return; }
  if (req.user!.role === 'FACULTY' && Number(row.faculty_id) !== req.user!.id) { res.status(403).json({ error: 'Unauthorized.' }); return; }
  res.download(row.file_path, row.file_name || 'attendance.xls');
});

// -------------------------------------------------------------
// NOTIFICATIONS SYSTEM (Section 13)
// -------------------------------------------------------------

apiRouter.get('/notifications', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  // Fetch notifications targeted for this user or their role
  const notifications = await queryAll(
    `SELECT n.*, e.exam_id, e.title as exam_title
     FROM notifications n
     LEFT JOIN examinations e ON n.examination_id = e.id
     WHERE n.user_id = ? OR n.target_role = ? OR n.target_role = 'ALL'
     ORDER BY n.created_at DESC LIMIT 30`,
    [user.id, user.role]
  );

  const unreadCount = (await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count 
     FROM notifications 
     WHERE (user_id = ? OR target_role = ? OR target_role = 'ALL') AND is_read = 0`,
    [user.id, user.role]
  ))?.count || 0;

  res.json({ notifications, unreadCount });
});

apiRouter.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  const { id } = req.params;
  await execute(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [id]);
  res.json({ message: 'Notification marked as read.' });
});

apiRouter.put('/notifications/read-all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  await execute(
    `UPDATE notifications SET is_read = 1 WHERE user_id = ? OR target_role = ? OR target_role = 'ALL'`,
    [user.id, user.role]
  );
  res.json({ message: 'All notifications marked as read.' });
});

// -------------------------------------------------------------
// ACTIVITY LOGS (Section 14)
// -------------------------------------------------------------

apiRouter.get('/activity-logs', authenticateToken, requireRole(['ADMIN', 'CENTER_MANAGER']), async (req: AuthenticatedRequest, res: Response) => {
  const { search, action, user_role, limit = 50 } = req.query;

  let sql = `SELECT * FROM activity_logs WHERE 1=1`;
  const params: any[] = [];

  if (action) {
    sql += ` AND action = ?`;
    params.push(action);
  }
  if (user_role) {
    sql += ` AND user_role = ?`;
    params.push(user_role);
  }
  if (search && typeof search === 'string') {
    sql += ` AND (LOWER(user_name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(action) LIKE ?)`;
    const term = `%${search.trim().toLowerCase()}%`;
    params.push(term, term, term);
  }

  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(Number(limit) || 50);

  const logs = await queryAll(sql, params);
  res.json({ logs });
});

// -------------------------------------------------------------
// USER MANAGEMENT & ROLES (Section 1, 15)
// -------------------------------------------------------------

apiRouter.get('/users', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  const users = await queryAll(
    `SELECT u.id, u.name, u.username, u.email, u.mobile, u.status, u.role_id, r.role_name as role,
            u.created_at, u.last_login
     FROM users u
     JOIN roles r ON u.role_id = r.id
     ORDER BY u.id ASC`
  );
  res.json({ users });
});

apiRouter.get('/roles', authenticateToken, async (_req, res) => {
  const roles = await queryAll('SELECT * FROM roles ORDER BY id ASC');
  res.json({ roles });
});

apiRouter.post('/users', authenticateToken, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const { name, username, email, password, role_id, mobile } = req.body;
  if (!name || !username || !email || !password || !role_id) {
    res.status(400).json({ error: 'Name, username, email, password, and role are required.' });
    return;
  }

  const existing = await queryOne('SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)', [username.trim(), email.trim()]);
  if (existing) {
    res.status(400).json({ error: 'A user with this username or email already exists.' });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = await execute(
    `INSERT INTO users (name, username, email, password_hash, role_id, mobile, status)
     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [name.trim(), username.trim(), email.trim(), hash, role_id, mobile?.trim() || null]
  );

  logActivity(req.user!.id, req.user!.name, req.user!.role, 'USER_CREATE', `Created user account for ${name} (${username}).`);
  res.status(201).json({ message: 'User created successfully.', id: result.lastInsertRowId });
});

apiRouter.put('/users/:id/status', authenticateToken, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (Number(id) === req.user!.id) {
    res.status(400).json({ error: 'You cannot deactivate your own Admin account.' });
    return;
  }

  await execute(`UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, id]);
  logActivity(req.user!.id, req.user!.name, req.user!.role, 'USER_STATUS_CHANGE', `Set user ID ${id} status to ${status}.`);
  res.json({ message: `User status updated to ${status}.` });
});

// -------------------------------------------------------------
// REPORTS (Section 21)
// -------------------------------------------------------------

apiRouter.get('/reports', authenticateToken, requireRole(['ADMIN', 'CENTER_MANAGER', 'TEAM_LEAD']), async (_req, res) => {
  // Course-wise students & examinations
  const courseReports = await queryAll(
    `SELECT c.id, c.course_name, c.course_code, c.duration,
            COUNT(DISTINCT s.id) as total_students,
            COUNT(DISTINCT b.id) as total_batches,
            COUNT(DISTINCT e.id) as total_examinations
     FROM courses c
     LEFT JOIN students s ON s.course_id = c.id
     LEFT JOIN batches b ON b.course_id = c.id
     LEFT JOIN examinations e ON e.course_id = c.id
     GROUP BY c.id
     ORDER BY total_students DESC`
  );

  // Batch-wise student distribution
  const batchReports = await queryAll(
    `SELECT b.id, b.batch_name, b.batch_code, b.timing, b.start_date, b.status,
            c.course_name, u.name as trainer_name,
            COUNT(s.id) as student_count,
            (SELECT COUNT(*) FROM examinations e WHERE e.batch_id = b.id) as exam_count
     FROM batches b
     JOIN courses c ON b.course_id = c.id
     JOIN users u ON b.trainer_id = u.id
     LEFT JOIN students s ON s.batch_id = b.id
     GROUP BY b.id
     ORDER BY b.start_date DESC`
  );

  // Trainer-wise examination uploads
  const trainerReports = await queryAll(
    `SELECT u.id, u.name as trainer_name, u.email, u.mobile, u.status,
            COUNT(DISTINCT b.id) as assigned_batches,
            COUNT(DISTINCT e.id) as total_uploaded_exams,
            MAX(e.created_at) as last_exam_upload
     FROM users u
     LEFT JOIN batches b ON b.trainer_id = u.id
     LEFT JOIN examinations e ON e.trainer_id = u.id
     JOIN roles r ON r.id = u.role_id
     WHERE r.role_name = 'FACULTY'
     GROUP BY u.id
     ORDER BY total_uploaded_exams DESC`
  );

  // Monthly examination uploads
  const monthlyUploads = await queryAll(
    `SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
     FROM examinations
     GROUP BY month
     ORDER BY month DESC LIMIT 12`
  );

  res.json({
    courseReports,
    batchReports,
    trainerReports,
    monthlyUploads
  });
});
