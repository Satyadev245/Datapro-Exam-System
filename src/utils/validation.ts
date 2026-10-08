export type FormErrors = Record<string, string>;
export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value.trim());
export const isValidMobile = (value: string) => /^(?:\+91[-\s]?)?[6-9]\d{9}$/.test(value.trim());
export const isStrongPassword = (value: string) => /^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(value);
export const cleanText = (value: string) => value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
export function validateStudentRegistration(form: {name:string;email:string;mobile:string;password:string;course_id:string;batch_id:string}): FormErrors {
  const errors: FormErrors = {};
  if (cleanText(form.name).length < 2) errors.name = 'Enter your full name.';
  else if (cleanText(form.name).length > 80) errors.name = 'Name must be 80 characters or less.';
  if (!isValidEmail(form.email)) errors.email = 'Enter a valid email address.';
  if (!isValidMobile(form.mobile)) errors.mobile = 'Enter a valid 10-digit Indian mobile number.';
  if (!isStrongPassword(form.password)) errors.password = 'Password must be at least 6 characters and include a letter and a number.';
  if (!form.course_id) errors.course_id = 'Select a course.';
  if (!form.batch_id) errors.batch_id = 'Select a batch.';
  return errors;
}
export function validateUserForm(form: {name:string;email:string;mobile:string;password?:string;role_id?:string}): FormErrors {
  const errors: FormErrors = {};
  if (cleanText(form.name).length < 2) errors.name = 'Enter a valid name.';
  if (!isValidEmail(form.email)) errors.email = 'Enter a valid email address.';
  if (form.mobile && !isValidMobile(form.mobile)) errors.mobile = 'Enter a valid 10-digit mobile number.';
  if (form.password !== undefined && !isStrongPassword(form.password)) errors.password = 'Use 6+ characters with at least one letter and one number.';
  if (form.role_id !== undefined && !form.role_id) errors.role_id = 'Select a role.';
  return errors;
}
