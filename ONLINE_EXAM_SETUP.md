# Online Timed Examination Feature

## Trainer flow
1. Log in as a Trainer.
2. Open **Online Exams & Send** in the Trainer module.
3. Create an exam and select the **Course** and **Batch**.
4. Enter the exam topics and add MCQ questions with four options and the correct answer.
5. Set duration, total marks, and passing marks.

Each active student receives a unique exam URL. The URL is generated from a private assignment token and is not shared between students.

## Student flow
1. Student opens the unique link.
2. Student sees course, batch, topics, instructions, question count, and duration.
3. Student clicks **Start Examination**.
4. The timer starts from the server-side attempt start time.
5. When time reaches zero, the exam is submitted automatically.
6. Scoring is performed on the server. Correct answers are never sent to the browser.
7. A student assignment can be submitted only once.



## URL configuration
Set `APP_URL` in production, for example:

`APP_URL=https://your-domain.example`

This makes generated student links use the public production domain instead of the current request host.

## Database
The server automatically creates the online-exam PostgreSQL tables when the API starts, so no manual SQL migration is required.

## PDF -> Online Exam Automation

When a trainer uploads a **PDF examination paper** from the Trainer > Upload Examination Paper screen, the system now automatically attempts to:

1. Read the PDF question text.
2. Detect numbered MCQ questions.
3. Detect A/B/C/D options.
4. Detect `Answer: B`, `Ans: B`, `Correct Answer: B`, or an `Answer Key` section.
5. Create a timed online exam for the selected course and batch.
6. Assign a unique exam link to each active student in that batch.

### PDF format expected

Example:

1. What is a Python variable?
A) A storage name
B) A database
C) A browser
D) An operating system
Answer: A

2. Which keyword defines a function in Python?
A) function
B) def
C) func
D) method
Answer: B

An Answer Key section such as `1-A 2-B 3-C` is also supported.

### Important

The automatic parser reads **text-based PDFs**. A scanned PDF made only of images requires OCR and will be rejected with a clear message instead of creating an incorrect exam.

### Windows server requirement

The PDF parser uses the `pdftotext` command from Poppler. On Linux/cloud deployments it is commonly available through the OS package manager. On Windows, install a Poppler distribution and make sure `pdftotext.exe` is available on the system PATH.
