# Portal Access Structure

The public entry page is `/`.

## Separate entry points

- `/management/login` — Management portal: Center Manager, Admin, Team Lead, Counsellor
- `/faculty/login` — Faculty-only login
- `/student/login` — Student-only login
- `/student/register` — New student registration
- `/exam/:token` — Public secure examination link sent to a student

## Role rules

The login screen is separated by portal, and the authenticated role is checked after login. API authorization remains the final enforcement layer.

### Management

Management users can monitor the system according to their role. Center Manager, Team Lead and Admin manage Faculty accounts. Counsellor has management visibility but cannot create Faculty unless the backend permission is explicitly granted.

### Faculty

Faculty can create/update batches, manage their students, upload question papers, create/publish online examinations, send exam links, view results and maintain attendance.

### Student

Students register separately, log in separately, see assigned examinations, take timed examinations and view submitted results.

## Examination delivery

- Students see published exam links automatically after Student Login.
- Final submitted results notify Faculty, Admin, Counsellor and Team Lead.
- Faculty maintains attendance and submits the generated Excel-compatible sheet to Center Manager, Admin and Team Lead.
- Staff portals do not create students. New students must use `/student/register`.
