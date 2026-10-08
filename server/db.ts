import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const EXAM_UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || path.join(process.env.DATA_DIR || path.join(process.cwd(),'data'),'uploads','examinations'));
if (!fs.existsSync(EXAM_UPLOADS_DIR)) fs.mkdirSync(EXAM_UPLOADS_DIR, { recursive: true });

let initialized = false;

const SCHEMA = "CREATE TABLE IF NOT EXISTS roles (\n      id SERIAL PRIMARY KEY,\n      role_name TEXT UNIQUE NOT NULL\n    );\n\nCREATE TABLE IF NOT EXISTS users (\n      id SERIAL PRIMARY KEY,\n      name TEXT NOT NULL,\n      username TEXT UNIQUE NOT NULL,\n      email TEXT UNIQUE NOT NULL,\n      password_hash TEXT NOT NULL,\n      role_id INTEGER NOT NULL,\n      mobile TEXT,\n      status TEXT DEFAULT 'ACTIVE',\n      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n      last_login TIMESTAMP,\n      FOREIGN KEY (role_id) REFERENCES roles(id)\n    );\n\nCREATE TABLE IF NOT EXISTS courses (\n      id SERIAL PRIMARY KEY,\n      course_name TEXT NOT NULL,\n      course_code TEXT UNIQUE NOT NULL,\n      description TEXT,\n      duration TEXT NOT NULL,\n      status TEXT DEFAULT 'ACTIVE',\n      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n    );\n\nCREATE TABLE IF NOT EXISTS batches (\n      id SERIAL PRIMARY KEY,\n      batch_name TEXT NOT NULL,\n      batch_code TEXT UNIQUE NOT NULL,\n      course_id INTEGER NOT NULL,\n      trainer_id INTEGER NOT NULL,\n      start_date DATE NOT NULL,\n      end_date DATE,\n      timing TEXT NOT NULL,\n      status TEXT DEFAULT 'ACTIVE',\n      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n      FOREIGN KEY (course_id) REFERENCES courses(id),\n      FOREIGN KEY (trainer_id) REFERENCES users(id)\n    );\n\nCREATE TABLE IF NOT EXISTS trainer_course_assignments (\n      id SERIAL PRIMARY KEY,\n      trainer_id INTEGER NOT NULL,\n      course_id INTEGER NOT NULL,\n      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n      UNIQUE(trainer_id, course_id),\n      FOREIGN KEY (trainer_id) REFERENCES users(id),\n      FOREIGN KEY (course_id) REFERENCES courses(id)\n    );\n\nCREATE TABLE IF NOT EXISTS students (\n      id SERIAL PRIMARY KEY,\n      student_id TEXT UNIQUE NOT NULL,\n      name TEXT NOT NULL,\n      email TEXT NOT NULL,\n      mobile TEXT NOT NULL,\n      course_id INTEGER NOT NULL,\n      batch_id INTEGER NOT NULL,\n      joining_date DATE NOT NULL,\n      status TEXT DEFAULT 'ACTIVE',\n      address TEXT,\n      registration_no TEXT UNIQUE NOT NULL,\n      user_id INTEGER,\n      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n      FOREIGN KEY (course_id) REFERENCES courses(id),\n      FOREIGN KEY (batch_id) REFERENCES batches(id)\n    );\n\nCREATE TABLE IF NOT EXISTS examinations (\n      id SERIAL PRIMARY KEY,\n      exam_id TEXT UNIQUE NOT NULL,\n      title TEXT NOT NULL,\n      course_id INTEGER NOT NULL,\n      batch_id INTEGER NOT NULL,\n      trainer_id INTEGER NOT NULL,\n      subject TEXT NOT NULL,\n      exam_type TEXT NOT NULL,\n      exam_date DATE NOT NULL,\n      duration TEXT NOT NULL,\n      total_marks INTEGER NOT NULL,\n      number_of_questions INTEGER NOT NULL,\n      instructions TEXT,\n      additional_notes TEXT,\n      file_name TEXT NOT NULL,\n      file_path TEXT NOT NULL,\n      file_type TEXT NOT NULL,\n      file_size INTEGER NOT NULL,\n      status TEXT DEFAULT 'SUBMITTED',\n      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n      FOREIGN KEY (course_id) REFERENCES courses(id),\n      FOREIGN KEY (batch_id) REFERENCES batches(id),\n      FOREIGN KEY (trainer_id) REFERENCES users(id)\n    );\n\nCREATE TABLE IF NOT EXISTS notifications (\n      id SERIAL PRIMARY KEY,\n      user_id INTEGER,\n      target_role TEXT,\n      examination_id INTEGER,\n      title TEXT NOT NULL,\n      message TEXT NOT NULL,\n      is_read INTEGER DEFAULT 0,\n      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n      FOREIGN KEY (user_id) REFERENCES users(id),\n      FOREIGN KEY (examination_id) REFERENCES examinations(id)\n    );\n\nCREATE TABLE IF NOT EXISTS activity_logs (\n      id SERIAL PRIMARY KEY,\n      user_id INTEGER,\n      user_name TEXT,\n      user_role TEXT,\n      action TEXT NOT NULL,\n      description TEXT NOT NULL,\n      ip_address TEXT,\n      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n      FOREIGN KEY (user_id) REFERENCES users(id)\n    );\n\nCREATE TABLE IF NOT EXISTS online_exams (\n      id SERIAL PRIMARY KEY,\n      exam_code TEXT UNIQUE NOT NULL,\n      title TEXT NOT NULL,\n      course_id INTEGER NOT NULL,\n      batch_id INTEGER NOT NULL,\n      trainer_id INTEGER NOT NULL,\n      topics TEXT NOT NULL,\n      duration_minutes INTEGER NOT NULL DEFAULT 30,\n      total_marks INTEGER NOT NULL DEFAULT 100,\n      passing_marks INTEGER NOT NULL DEFAULT 40,\n      instructions TEXT,\n      status TEXT NOT NULL DEFAULT 'DRAFT',\n      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n      FOREIGN KEY (course_id) REFERENCES courses(id),\n      FOREIGN KEY (batch_id) REFERENCES batches(id),\n      FOREIGN KEY (trainer_id) REFERENCES users(id)\n    );\n\nCREATE TABLE IF NOT EXISTS online_exam_questions (\n      id SERIAL PRIMARY KEY,\n      online_exam_id INTEGER NOT NULL,\n      topic TEXT NOT NULL,\n      question_text TEXT NOT NULL,\n      option_a TEXT NOT NULL,\n      option_b TEXT NOT NULL,\n      option_c TEXT NOT NULL,\n      option_d TEXT NOT NULL,\n      correct_option TEXT NOT NULL,\n      marks INTEGER NOT NULL DEFAULT 1,\n      question_order INTEGER NOT NULL,\n      FOREIGN KEY (online_exam_id) REFERENCES online_exams(id) ON DELETE CASCADE\n    );\n\nCREATE TABLE IF NOT EXISTS online_exam_assignments (\n      id SERIAL PRIMARY KEY,\n      online_exam_id INTEGER NOT NULL,\n      student_id INTEGER NOT NULL,\n      access_token TEXT UNIQUE NOT NULL,\n      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n      FOREIGN KEY (online_exam_id) REFERENCES online_exams(id) ON DELETE CASCADE,\n      FOREIGN KEY (student_id) REFERENCES students(id),\n      UNIQUE(online_exam_id, student_id)\n    );\n\nCREATE TABLE IF NOT EXISTS online_exam_attempts (\n      id SERIAL PRIMARY KEY,\n      assignment_id INTEGER UNIQUE NOT NULL,\n      started_at TIMESTAMP NOT NULL,\n      submitted_at TIMESTAMP,\n      score INTEGER DEFAULT 0,\n      correct_answers INTEGER DEFAULT 0,\n      wrong_answers INTEGER DEFAULT 0,\n      unanswered INTEGER DEFAULT 0,\n      status TEXT NOT NULL DEFAULT 'IN_PROGRESS',\n      FOREIGN KEY (assignment_id) REFERENCES online_exam_assignments(id) ON DELETE CASCADE\n    );\n\nCREATE TABLE IF NOT EXISTS online_exam_answers (\n      id SERIAL PRIMARY KEY,\n      attempt_id INTEGER NOT NULL,\n      question_id INTEGER NOT NULL,\n      selected_option TEXT,\n      is_correct INTEGER DEFAULT 0,\n      marks_awarded INTEGER DEFAULT 0,\n      FOREIGN KEY (attempt_id) REFERENCES online_exam_attempts(id) ON DELETE CASCADE,\n      FOREIGN KEY (question_id) REFERENCES online_exam_questions(id),\n      UNIQUE(attempt_id, question_id)\n    );\n\nCREATE TABLE IF NOT EXISTS attendance_records (\n      id SERIAL PRIMARY KEY,\n      student_id INTEGER NOT NULL,\n      batch_id INTEGER NOT NULL,\n      attendance_date DATE NOT NULL,\n      status TEXT NOT NULL DEFAULT 'PRESENT',\n      remarks TEXT,\n      marked_by INTEGER NOT NULL,\n      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n      UNIQUE(student_id, attendance_date),\n      FOREIGN KEY(student_id) REFERENCES students(id),\n      FOREIGN KEY(batch_id) REFERENCES batches(id),\n      FOREIGN KEY(marked_by) REFERENCES users(id)\n    );\n\nCREATE TABLE IF NOT EXISTS attendance_submissions (\n      id SERIAL PRIMARY KEY,\n      batch_id INTEGER NOT NULL,\n      attendance_date DATE NOT NULL,\n      faculty_id INTEGER NOT NULL,\n      file_name TEXT,\n      file_path TEXT,\n      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n      FOREIGN KEY(batch_id) REFERENCES batches(id),\n      FOREIGN KEY(faculty_id) REFERENCES users(id)\n    );\nCREATE INDEX IF NOT EXISTS idx_online_exams_batch ON online_exams(batch_id);\nCREATE INDEX IF NOT EXISTS idx_online_assignments_token ON online_exam_assignments(access_token);\nCREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id) WHERE user_id IS NOT NULL;\nCREATE INDEX IF NOT EXISTS idx_attendance_batch_date ON attendance_records(batch_id, attendance_date);\nCREATE INDEX IF NOT EXISTS idx_notifications_role_read ON notifications(target_role, is_read);\nCREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);\n";

function pgSql(sql:string) {
  let i=0;
  return sql.replace(/\?/g, () => '$' + (++i));
}

export async function getDb() {
  if (initialized) return;
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for PostgreSQL.');
  await pool.query('SELECT 1');
  await pool.query(SCHEMA);
  await seedDatabase();
  initialized = true;
}

export async function queryAll<T=any>(sql:string, params:any[]=[]):Promise<T[]> {
  const result=await pool.query(pgSql(sql), params);
  return result.rows as T[];
}

export async function queryOne<T=any>(sql:string, params:any[]=[]):Promise<T|null> {
  const rows=await queryAll<T>(sql, params);
  return rows.length ? rows[0] : null;
}

export async function execute(sql:string, params:any[]=[]):Promise<{lastInsertRowId?:number; changes?:number}> {
  let q=pgSql(sql).trim();
  q=q.replace(/^INSERT OR IGNORE/i,'INSERT');
  if (/INSERT\s+INTO/i.test(q) && !/RETURNING\s+/i.test(q)) q += ' RETURNING id';
  const result=await pool.query(q, params);
  const id=result.rows?.[0]?.id;
  return { lastInsertRowId: id !== undefined ? Number(id) : undefined, changes: result.rowCount ?? 0 };
}

async function seedDatabase() {
  const roles=['CENTER_MANAGER','ADMIN','TEAM_LEAD','COUNSELLOR','FACULTY','STUDENT'];
  for (const role of roles) {
    await pool.query('INSERT INTO roles (role_name) VALUES ($1) ON CONFLICT (role_name) DO NOTHING',[role]);
  }
  const seedUsers=[
    ['Vara Prasad Sir','varaprasad.manager','varaprasad.manager@datapro.in','VaraPrasad@Mgr26','CENTER_MANAGER','+91 98480 54321'],
    ['Vinith Sir','vinith','vinith@datapro.in','Vinith@Adm26','ADMIN','+91 94401 23456'],
    ['Azmal Sir','azmal','azmal@datapro.in','Azmal@Lead26','TEAM_LEAD','+91 98850 67890'],
    ['Manasa Madam','manasa','manasa@datapro.in','Manasa@Couns26','COUNSELLOR','+91 91234 56789'],
    ['Srinivas Sir','srinivas','srinivas@datapro.in','Srinivas@Trn26','FACULTY','+91 98661 11223']
  ];
  for (const [name,username,email,password,roleName,mobile] of seedUsers) {
    const role=await queryOne<any>('SELECT id FROM roles WHERE role_name=$1',[roleName]);
    if (!role) continue;
    const hash=bcrypt.hashSync(String(password),10);
    await pool.query(`INSERT INTO users (name,username,email,password_hash,role_id,mobile,status)
      VALUES ($1,$2,$3,$4,$5,$6,'ACTIVE') ON CONFLICT (username) DO NOTHING`,
      [name,username,email,hash,role.id,mobile]);
  }
  const courses=[
    ['Python Full Stack Development','PFS','6 Months (120 Hours)','Comprehensive Python stack including Core Python, Advanced OOP, Django, FastAPI, React, PostgreSQL & Cloud Deployment.'],
    ['Java Full Stack Development','JFS','6 Months (120 Hours)','Enterprise Java architecture including Core Java, Spring Boot, Microservices, Hibernate, Angular/React & Docker.'],
    ['MERN Stack Web Development','MERN','4 Months (90 Hours)','Full JavaScript ecosystem including MongoDB, Express.js, React.js, Node.js, Next.js and RESTful API architecture.'],
    ['Data Analytics & Power BI','DA','3 Months (60 Hours)','Business data analytics, Advanced SQL, Excel dashboarding, Power BI, DAX modeling and Tableau visualization.'],
    ['Data Science & Machine Learning','DS','6 Months (120 Hours)','Statistical modeling, Python, NumPy, Pandas, Scikit-Learn, Deep Learning with TensorFlow and NLP basics.'],
    ['C & C++ Programming Foundation','CPP','2 Months (45 Hours)','Core logic building, pointers, memory management, object-oriented concepts and algorithms.'],
    ['SQL & Database Engineering','SQL','2 Months (40 Hours)','Relational database schema design, stored procedures, indexing, performance query tuning and MySQL administration.'],
    ['Advanced Excel & Business Modeling','EXCEL','1.5 Months (30 Hours)','VLOOKUP, XLOOKUP, Pivot tables, Power Query, Macros, VBA scripting and automated financial modeling.']
  ];
  for (const [name,code,duration,description] of courses) {
    await pool.query(`INSERT INTO courses (course_name,course_code,duration,description)
      VALUES ($1,$2,$3,$4) ON CONFLICT (course_code) DO NOTHING`,[name,code,duration,description]);
  }
  const faculty=await queryOne<any>(`SELECT id FROM users WHERE username='srinivas'`);
  if(faculty) {
    const courseRows=await queryAll<any>('SELECT id FROM courses ORDER BY id');
    for(const course of courseRows) {
      await pool.query(`INSERT INTO trainer_course_assignments(trainer_id,course_id)
        VALUES($1,$2) ON CONFLICT(trainer_id,course_id) DO NOTHING`,[faculty.id,course.id]);
    }
  }
}

export async function closeDb() { await pool.end(); initialized=false; }
