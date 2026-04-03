const parseAdminEmails = () => {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
};

const inferAdminByEmail = (email) => {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const envAdmins = parseAdminEmails();

  if (envAdmins.includes(normalized)) return true;
  return normalized.startsWith('admin');
};

const isAdminUser = (user) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return inferAdminByEmail(user.email);
};

const inferRoleForEmail = (email) => (inferAdminByEmail(email) ? 'admin' : 'student');

module.exports = { isAdminUser, inferRoleForEmail };