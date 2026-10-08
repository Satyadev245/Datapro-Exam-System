CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      role_name TEXT UNIQUE NOT NULL
    );

CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role_id INTEGER NOT NULL,
      mobile TEXT,
      status TEXT DEFAULT 'ACTIVE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );

CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      course_name TEXT NOT NULL,
      course_code TEXT UNIQUE NOT NULL,
      description TEXT,
      duration TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS batches (
      id SERIAL PRIMARY KEY,
      batch_name TEXT NOT NULL,
      batch_code TEXT UNIQUE NOT NULL,
      course_id INTEGER NOT NULL,
      trainer_id INTEGER NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE,
      timing TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id),
      FOREIGN KEY (trainer_id) REFERENCES users(id)
    );

CREATE TABLE IF NOT EXISTS trainer_course_assignments (
      id SERIAL PRIMARY KEY,
      trainer_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(trainer_id, course_id),
      FOREIGN KEY (trainer_id) REFERENCES users(id),
      FOREIGN KEY (course_id) REFERENCES courses(id)
    );

CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      student_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      mobile TEXT NOT NULL,
      course_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL,
      joining_date DATE NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      address TEXT,
      registration_no TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id),
      FOREIGN KEY (batch_id) REFERENCES batches(id)
    );

CREATE TABLE IF NOT EXISTS examinations (
      id SERIAL PRIMARY KEY,
      exam_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      course_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL,
      trainer_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      exam_type TEXT NOT NULL,
      exam_date DATE NOT NULL,
      duration TEXT NOT NULL,
      total_marks INTEGER NOT NULL,
      number_of_questions INTEGER NOT NULL,
      instructions TEXT,
      additional_notes TEXT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      status TEXT DEFAULT 'SUBMITTED',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id),
      FOREIGN KEY (batch_id) REFERENCES batches(id),
      FOREIGN KEY (trainer_id) REFERENCES users(id)
    );

CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      target_role TEXT,
      examination_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (examination_id) REFERENCES examinations(id)
    );

CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      user_name TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      description TEXT NOT NULL,
      ip_address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

CREATE TABLE IF NOT EXISTS online_exams (
      id SERIAL PRIMARY KEY,
      exam_code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      course_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL,
      trainer_id INTEGER NOT NULL,
      topics TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      total_marks INTEGER NOT NULL DEFAULT 100,
      passing_marks INTEGER NOT NULL DEFAULT 40,
      instructions TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id),
      FOREIGN KEY (batch_id) REFERENCES batches(id),
      FOREIGN KEY (trainer_id) REFERENCES users(id)
    );

CREATE TABLE IF NOT EXISTS online_exam_questions (
      id SERIAL PRIMARY KEY,
      online_exam_id INTEGER NOT NULL,
      topic TEXT NOT NULL,
      question_text TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_option TEXT NOT NULL,
      marks INTEGER NOT NULL DEFAULT 1,
      question_order INTEGER NOT NULL,
      FOREIGN KEY (online_exam_id) REFERENCES online_exams(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS online_exam_assignments (
      id SERIAL PRIMARY KEY,
      online_exam_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      access_token TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (online_exam_id) REFERENCES online_exams(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id),
      UNIQUE(online_exam_id, student_id)
    );

CREATE TABLE IF NOT EXISTS online_exam_attempts (
      id SERIAL PRIMARY KEY,
      assignment_id INTEGER UNIQUE NOT NULL,
      started_at TIMESTAMP NOT NULL,
      submitted_at TIMESTAMP,
      score INTEGER DEFAULT 0,
      correct_answers INTEGER DEFAULT 0,
      wrong_answers INTEGER DEFAULT 0,
      unanswered INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
      FOREIGN KEY (assignment_id) REFERENCES online_exam_assignments(id) ON DELETE CASCADE
    );

CREATE TABLE IF NOT EXISTS online_exam_answers (
      id SERIAL PRIMARY KEY,
      attempt_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      selected_option TEXT,
      is_correct INTEGER DEFAULT 0,
      marks_awarded INTEGER DEFAULT 0,
      FOREIGN KEY (attempt_id) REFERENCES online_exam_attempts(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES online_exam_questions(id),
      UNIQUE(attempt_id, question_id)
    );

CREATE TABLE IF NOT EXISTS attendance_records (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL,
      attendance_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'PRESENT',
      remarks TEXT,
      marked_by INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, attendance_date),
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(batch_id) REFERENCES batches(id),
      FOREIGN KEY(marked_by) REFERENCES users(id)
    );

CREATE TABLE IF NOT EXISTS attendance_submissions (
      id SERIAL PRIMARY KEY,
      batch_id INTEGER NOT NULL,
      attendance_date DATE NOT NULL,
      faculty_id INTEGER NOT NULL,
      file_name TEXT,
      file_path TEXT,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(batch_id) REFERENCES batches(id),
      FOREIGN KEY(faculty_id) REFERENCES users(id)
    );
CREATE INDEX IF NOT EXISTS idx_online_exams_batch ON online_exams(batch_id);
CREATE INDEX IF NOT EXISTS idx_online_assignments_token ON online_exam_assignments(access_token);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_batch_date ON attendance_records(batch_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_notifications_role_read ON notifications(target_role, is_read);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);

