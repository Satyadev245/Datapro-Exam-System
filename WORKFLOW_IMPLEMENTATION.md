# Examination & Attendance Workflow

## Faculty exam paper upload
1. Faculty uploads the paper.
2. The uploaded paper is stored in the examination repository.
3. Management notifications are created for Center Manager, Admin, Team Lead and Counsellor.
4. If the uploaded paper is a readable MCQ PDF with answer keys, the system creates a timed online exam.
5. The online exam is automatically published.
6. Active students in the selected batch receive secure unique exam assignments.
7. The Student Portal immediately exposes the published online exam and also lists the uploaded examination paper.
10. Delivery timestamps are saved separately for each student assignment.


The template should contain two body variables in this order:
1. Student name
2. Secure exam link

If no template name is configured, the backend uses a text message request. Meta may reject business-initiated text messages outside an active customer conversation window.

## email production requirement
Configure:


## Attendance workflow
1. Faculty selects a batch and date.
2. Faculty marks Present / Absent / Leave.
3. Save writes every student record into `attendance_records`.
4. Submit Attendance generates the Excel record and writes an `attendance_submissions` row.
5. Notifications are created for Center Manager, Admin and Team Lead.
6. Management portals have an `Attendance Submissions` page.
7. Management can refresh the list and download each submitted Excel file with authenticated access.

## Database
The database initialization creates/migrates:
- `attendance_records`
- `attendance_submissions`
- online examination tables

On startup, the PostgreSQL schema is created automatically when missing.
