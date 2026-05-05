export const PERMISSION_CATALOG = [
  { key: 'createCourse', label: 'Create Course', category: 'Course Permissions', description: 'Create new courses and curriculum shells.' },
  { key: 'editCourse', label: 'Edit Course', category: 'Course Permissions', description: 'Edit course content and metadata.' },
  { key: 'deleteCourse', label: 'Delete Course', category: 'Course Permissions', description: 'Delete existing courses.' },
  { key: 'publishCourse', label: 'Publish Course', category: 'Course Permissions', description: 'Publish or save courses for learners.' },
  { key: 'manageLessons', label: 'Manage Lessons', category: 'Content Permissions', description: 'Add, edit, and organize lessons/quizzes/assignments.' },
  { key: 'uploadResources', label: 'Upload Resources', category: 'Content Permissions', description: 'Upload files and learning resources.' },
  { key: 'viewStudents', label: 'View Students', category: 'Student Permissions', description: 'View enrolled students and reports.' },
  { key: 'viewEarnings', label: 'View Earnings', category: 'Earnings Permissions', description: 'Access earnings and commission reports.' },
];

export const ROLE_PERMISSION_DEFAULTS = {
  admin: {
    createCourse: true,
    editCourse: true,
    deleteCourse: true,
    publishCourse: true,
    viewStudents: true,
    viewEarnings: true,
    manageLessons: true,
    uploadResources: true,
  },
  teacher: {
    createCourse: true,
    editCourse: true,
    deleteCourse: false,
    publishCourse: true,
    viewStudents: true,
    viewEarnings: true,
    manageLessons: true,
    uploadResources: true,
  },
  editor: {
    createCourse: true,
    editCourse: true,
    deleteCourse: false,
    publishCourse: true,
    viewStudents: false,
    viewEarnings: false,
    manageLessons: true,
    uploadResources: true,
  },
  student: {
    createCourse: false,
    editCourse: false,
    deleteCourse: false,
    publishCourse: false,
    viewStudents: false,
    viewEarnings: false,
    manageLessons: false,
    uploadResources: false,
  },
};

export function resolvePermissions(role, input) {
  const normalizedRole = String(role || 'student').toLowerCase();
  const defaults = ROLE_PERMISSION_DEFAULTS[normalizedRole] || ROLE_PERMISSION_DEFAULTS.student;
  const incoming = input && typeof input === 'object' ? input : {};
  const next = { ...defaults };
  PERMISSION_CATALOG.forEach(({ key }) => {
    if (Object.prototype.hasOwnProperty.call(incoming, key)) {
      next[key] = Boolean(incoming[key]);
    }
  });
  return next;
}

export function canUser(user, key) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const permissions = resolvePermissions(user.role, user.permissions);
  return Boolean(permissions?.[key]);
}
