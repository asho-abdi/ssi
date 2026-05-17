import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Archive,
  BookOpenText,
  Check,
  Clock3,
  ChevronDown,
  DollarSign,
  ImageIcon,
  ListChecks,
  Plus,
  Trash2,
  Video,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { formatManualLessonDuration } from '../../utils/formatDuration';

const emptyLesson = { title: '', video_url: '', duration: '', order: 0 };
const emptyAssignment = { title: '', description: '', due_date: '', points: 100 };
const emptyResource = { name: '', url: '', file_type: 'other', size_bytes: 0, storage_path: '' };
const emptyQuizQuestion = {
  question: '',
  question_type: 'circle_right_answer',
  options_text: '',
  answer_index: 0,
  answer_text: '',
};
const emptyQuiz = { title: '', description: '', time_limit_minutes: '', questions: [{ ...emptyQuizQuestion }] };
const emptyInVideoQuiz = {
  question: '',
  options_text: '',
  correct_answer_index: 0,
  explanation: '',
  timestamp: '',
  lesson_id: '',
  lesson_order: '',
  repeat_on_skip: false,
  retry_policy: 'retry_on_skip',
  max_attempts: 2,
  retry_cooldown_seconds: 0,
};
const emptyTopic = { title: '', lessons: [], assignments: [], quizzes: [], in_video_quizzes: [], resources: [] };
let localItemCounter = 0;
function createClientId(prefix) {
  localItemCounter += 1;
  return `${prefix}-${Date.now()}-${localItemCounter}`;
}
function withClientId(item, prefix) {
  return {
    ...item,
    _client_id: item?._client_id || item?._id || createClientId(prefix),
  };
}

function formatFileSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const rounded = i === 0 ? Math.round(v) : v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
  return `${rounded} ${units[i]}`;
}

function matchesResourceUploadTarget(target, scope, topicIdx, resourceIdx) {
  if (!target || target.scope !== scope) return false;
  if (scope === 'topic') return target.topicIdx === topicIdx && target.resourceIdx === resourceIdx;
  return target.resourceIdx === resourceIdx;
}

function makeLesson(item = {}) {
  return withClientId({ ...emptyLesson, ...item }, 'lesson');
}
function makeAssignment(item = {}) {
  return withClientId({ ...emptyAssignment, ...item }, 'assignment');
}
function makeResource(item = {}) {
  return withClientId({ ...emptyResource, ...item }, 'resource');
}
function makeQuizQuestion(item = {}) {
  return withClientId({ ...emptyQuizQuestion, ...item }, 'question');
}
function makeQuiz(item = {}) {
  return withClientId(
    {
      ...emptyQuiz,
      ...item,
      questions: Array.isArray(item.questions) && item.questions.length ? item.questions.map((q) => makeQuizQuestion(q)) : [makeQuizQuestion()],
    },
    'quiz'
  );
}
function makeInVideoQuiz(item = {}) {
  return withClientId({ ...emptyInVideoQuiz, ...item }, 'in-video-quiz');
}
function makeTopic(item = {}) {
  return withClientId(
    {
      ...emptyTopic,
      ...item,
      lessons: Array.isArray(item.lessons) ? item.lessons.map((l) => makeLesson(l)) : [],
      assignments: Array.isArray(item.assignments) ? item.assignments.map((a) => makeAssignment(a)) : [],
      quizzes: Array.isArray(item.quizzes) ? item.quizzes.map((q) => makeQuiz(q)) : [],
      in_video_quizzes: Array.isArray(item.in_video_quizzes) ? item.in_video_quizzes.map((q) => makeInVideoQuiz(q)) : [],
      resources: Array.isArray(item.resources) ? item.resources.map((r) => makeResource(r)) : [],
    },
    'topic'
  );
}
const quizQuestionTypeOptions = [
  { value: 'circle_right_answer', label: 'Circle the right answer' },
  { value: 'true_false', label: 'True / False' },
  { value: 'fill_blank', label: 'Fill the blank' },
  { value: 'short_answer', label: 'Short answer' },
];
const difficultyOptions = [
  { value: 'all', label: 'All levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'expert', label: 'Expert' },
];

export function CourseManager({ mode = 'editor' }) {
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isCreateRoute = location.pathname.endsWith('/new');
  const isTeacher = mode === 'teacher';
  const isAdmin = mode === 'admin';
  const canAssignTeacher = !isTeacher;
  const canCreateCourse = isAdmin || hasPermission('createCourse');
  const canEditCourse = isAdmin || hasPermission('editCourse');
  const canDelete = isAdmin || hasPermission('deleteCourse');
  const canPublishCourse = isAdmin || hasPermission('publishCourse');
  const canManageLessons = isAdmin || hasPermission('manageLessons');
  const canUploadResources = isAdmin || hasPermission('uploadResources');

  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [courseSearch, setCourseSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailInputKey, setThumbnailInputKey] = useState(0);
  const [resourceInputKeySeed, setResourceInputKeySeed] = useState(0);
  const [resourceUploadState, setResourceUploadState] = useState({ target: null, pct: 0 });
  const [topicUiState, setTopicUiState] = useState({});
  const [resourceDoneState, setResourceDoneState] = useState({});
  const [lessonUiState, setLessonUiState] = useState({});
  const [instructorPercentage, setInstructorPercentage] = useState(70);
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    sale_price: '',
    difficulty_level: 'all',
    duration: '',
    thumbnail: '',
    video_url: '',
    category_id: '',
    teacher_id: '',
    topics: [],
    all_resources: [],
  });

  useEffect(() => {
    setTopicUiState((prev) => {
      const next = {};
      (form.topics || []).forEach((topic, topicIdx) => {
        const key = String(topic?._client_id || topic?._id || `topic-${topicIdx}`);
        const current = prev[key];
        next[key] = {
          isOpen: current?.isOpen ?? true,
          done: current?.done ?? false,
        };
      });
      return next;
    });
  }, [form.topics]);

  useEffect(() => {
    setResourceDoneState((prev) => {
      const next = {};
      (form.all_resources || []).forEach((resource, resourceIdx) => {
        const key = resourceUiKey('global', null, resource, resourceIdx);
        const prevState = prev[key];
        if (typeof prevState === 'boolean') {
          next[key] = { done: prevState, isOpen: !prevState };
        } else {
          next[key] = prevState || { done: false, isOpen: true };
        }
      });
      (form.topics || []).forEach((topic, topicIdx) => {
        (topic?.resources || []).forEach((resource, resourceIdx) => {
          const key = resourceUiKey('topic', topicIdx, resource, resourceIdx);
          const prevState = prev[key];
          if (typeof prevState === 'boolean') {
            next[key] = { done: prevState, isOpen: !prevState };
          } else {
            next[key] = prevState || { done: false, isOpen: true };
          }
        });
      });
      return next;
    });
  }, [form.all_resources, form.topics]);

  useEffect(() => {
    setLessonUiState((prev) => {
      const next = {};
      (form.topics || []).forEach((topic, topicIdx) => {
        const tk = topicUiKey(topic, topicIdx);
        (topic.lessons || []).forEach((lesson, lessonIdx) => {
          const lk = `${tk}::${String(lesson?._client_id || lesson?._id || `lesson-${lessonIdx}`)}`;
          const cur = prev[lk];
          next[lk] = {
            isOpen: cur?.isOpen ?? true,
            done: cur?.done ?? false,
          };
        });
      });
      return next;
    });
  }, [form.topics]);

  const heading = useMemo(() => {
    if (isAdmin) return { title: 'All courses' };
    if (isTeacher) return { title: 'My courses' };
    return { title: 'Courses' };
  }, [isAdmin, isTeacher]);

  const filteredCourses = useMemo(() => {
    const query = courseSearch.trim().toLowerCase();
    return courses.filter((c) => {
      const titleMatch = !query || String(c.title || '').toLowerCase().includes(query);
      const categoryId = c.category_id?._id || c.category_id || '';
      const categoryMatch = !categoryFilter || String(categoryId) === String(categoryFilter);
      return titleMatch && categoryMatch;
    });
  }, [courses, courseSearch, categoryFilter]);

  function basePath() {
    if (isTeacher) return '/dashboard/teacher/courses';
    if (isAdmin) return '/dashboard/admin/courses';
    return '/dashboard/editor/courses';
  }

  async function load() {
    const courseReq = isTeacher ? api.get('/teacher/courses') : api.get('/courses');
    const teacherReq = canAssignTeacher ? api.get('/auth/teachers') : Promise.resolve({ data: [] });
    const categoryReq = api.get('/categories');
    const earningsConfigReq = isTeacher ? api.get('/teacher/earnings-config').catch(() => ({ data: { instructor_percentage: 70 } })) : Promise.resolve({ data: {} });
    const [coursesRes, teachersRes, categoriesRes, earningsConfigRes] = await Promise.all([courseReq, teacherReq, categoryReq, earningsConfigReq]);
    setCourses(coursesRes.data);
    setTeachers(teachersRes.data || []);
    setCategories(categoriesRes.data || []);
    if (isTeacher) {
      setInstructorPercentage(Math.max(0, Math.min(100, Number(earningsConfigRes?.data?.instructor_percentage ?? 70))));
    }
    if (canAssignTeacher && teachersRes.data?.[0]) {
      setForm((f) => ({ ...f, teacher_id: f.teacher_id || teachersRes.data[0]._id }));
    }
    if (categoriesRes.data?.[0]) {
      setForm((f) => ({ ...f, category_id: f.category_id || categoriesRes.data[0]._id }));
    }
  }

  useEffect(() => {
    load().catch(() => toast.error('Could not load data'));
  }, [isTeacher, canAssignTeacher]);

  useEffect(() => {
    if (!isTeacher && teachers.length && showForm && !editingId) {
      setForm((f) => (f.teacher_id ? f : { ...f, teacher_id: teachers[0]._id }));
    }
  }, [isTeacher, teachers, showForm, editingId]);

  useEffect(() => {
    if (categories.length && showForm && !editingId) {
      setForm((f) => (f.category_id ? f : { ...f, category_id: categories[0]._id }));
    }
  }, [categories, showForm, editingId]);

  useEffect(() => {
    if (isCreateRoute) {
      if (!canCreateCourse) {
        toast.error('You do not have permission to create courses');
        navigate(basePath(), { replace: true });
        return;
      }
      resetForm();
      setShowForm(true);
    }
  }, [isCreateRoute, canCreateCourse]);

  function resetForm() {
    setTopicUiState({});
    setResourceDoneState({});
    setForm({
      title: '',
      description: '',
      price: '',
      sale_price: '',
      difficulty_level: 'all',
      duration: '',
      thumbnail: '',
      video_url: '',
      category_id: categories[0]?._id || '',
      teacher_id: isTeacher ? user?._id || '' : teachers[0]?._id || '',
      topics: [],
      all_resources: [],
    });
    setEditingId(null);
  }

  function startCreate() {
    if (!canCreateCourse) {
      toast.error('You do not have permission to create courses');
      return;
    }
    resetForm();
    setShowForm(true);
    navigate(`${basePath()}/new`);
  }

  function startEdit(c) {
    if (!canEditCourse) {
      toast.error('You do not have permission to edit courses');
      return;
    }
    setTopicUiState({});
    setResourceDoneState({});
    const hydratedTopics =
      Array.isArray(c.course_topics) && c.course_topics.length > 0
        ? c.course_topics.map((topic, topicIdx) =>
            makeTopic({
              _client_id: topic._id,
              title: topic.title || `Chapter ${topicIdx + 1}`,
              lessons: Array.isArray(topic.lessons)
                ? topic.lessons.map((l, i) => ({
                    _client_id: l._id,
                    title: l.title || '',
                    video_url: l.video_url || '',
                    duration: l.duration || '',
                    order: l.order ?? i,
                  }))
                : [],
              assignments: Array.isArray(topic.assignments)
                ? topic.assignments.map((a) => ({
                    _client_id: a._id,
                    title: a.title || '',
                    description: a.description || '',
                    due_date: a.due_date ? new Date(a.due_date).toISOString().slice(0, 10) : '',
                    points: a.points ?? 100,
                  }))
                : [],
              quizzes: Array.isArray(topic.quizzes)
                ? topic.quizzes.map((q) => ({
                    _client_id: q._id,
                    title: q.title || '',
                    description: q.description || '',
                    time_limit_minutes: q.time_limit_minutes ?? '',
                    questions:
                      q.questions?.length > 0
                        ? q.questions.map((qq) => ({
                            _client_id: qq._id,
                            question: qq.question || '',
                            question_type:
                              qq.question_type || (Array.isArray(qq.options) && qq.options.length >= 2 ? 'circle_right_answer' : 'short_answer'),
                            options_text: Array.isArray(qq.options) ? qq.options.join(', ') : '',
                            answer_index: qq.answer_index ?? 0,
                            answer_text: qq.answer_text || '',
                          }))
                        : [makeQuizQuestion()],
                  }))
                : [],
              in_video_quizzes: Array.isArray(topic.in_video_quizzes)
                ? topic.in_video_quizzes.map((quiz) => ({
                    _client_id: quiz._id,
                    question: quiz.question || '',
                    options_text: Array.isArray(quiz.options) ? quiz.options.join(', ') : '',
                    correct_answer_index: quiz.correct_answer_index ?? 0,
                    explanation: quiz.explanation || '',
                    timestamp: quiz.timestamp_seconds != null ? String(quiz.timestamp_seconds) : '',
                    lesson_id: quiz.lesson_id || '',
                    lesson_order: quiz.lesson_order ?? '',
                    repeat_on_skip: Boolean(quiz.repeat_on_skip),
                    retry_policy: quiz.retry_policy || (quiz.repeat_on_skip ? 'retry_on_skip' : 'no_retry'),
                    max_attempts: quiz.max_attempts ?? 2,
                    retry_cooldown_seconds: quiz.retry_cooldown_seconds ?? 0,
                  }))
                : [],
              resources: Array.isArray(topic.resources)
                ? topic.resources.map((resource) => ({
                    _client_id: resource._id,
                    name: resource?.name || '',
                    url: resource?.url || '',
                    file_type: resource?.file_type || 'other',
                    size_bytes: Number(resource?.size_bytes) || 0,
                    storage_path: String(resource?.storage_path || ''),
                  }))
                : [],
            })
          )
        : [
            makeTopic({
              title: '',
              lessons:
                c.lessons?.length > 0
                  ? c.lessons.map((l, i) => ({
                      _client_id: l._id,
                      title: l.title,
                      video_url: l.video_url,
                      duration: l.duration || '',
                      order: l.order ?? i,
                    }))
                  : c.video_url
                    ? [{ title: 'Introduction', video_url: c.video_url || '', order: 0 }]
                    : [],
              assignments:
                c.assignments?.length > 0
                  ? c.assignments.map((a) => ({
                      _client_id: a._id,
                      title: a.title || '',
                      description: a.description || '',
                      due_date: a.due_date ? new Date(a.due_date).toISOString().slice(0, 10) : '',
                      points: a.points ?? 100,
                    }))
                  : [],
              quizzes:
                c.quizzes?.length > 0
                  ? c.quizzes.map((q) => ({
                      _client_id: q._id,
                      title: q.title || '',
                      description: q.description || '',
                      time_limit_minutes: q.time_limit_minutes ?? '',
                      questions:
                        q.questions?.length > 0
                          ? q.questions.map((qq) => ({
                              _client_id: qq._id,
                              question: qq.question || '',
                              question_type:
                                qq.question_type ||
                                (Array.isArray(qq.options) && qq.options.length >= 2 ? 'circle_right_answer' : 'short_answer'),
                              options_text: Array.isArray(qq.options) ? qq.options.join(', ') : '',
                              answer_index: qq.answer_index ?? 0,
                              answer_text: qq.answer_text || '',
                            }))
                          : [makeQuizQuestion()],
                    }))
                  : [],
              resources: Array.isArray(c.topic_resources)
                ? c.topic_resources
                    .flatMap((topicResource) => topicResource?.resources || [])
                    .map((resource) => ({
                      _client_id: resource._id,
                      name: resource?.name || '',
                      url: resource?.url || '',
                      file_type: resource?.file_type || 'other',
                      size_bytes: Number(resource?.size_bytes) || 0,
                      storage_path: String(resource?.storage_path || ''),
                    }))
                : [],
            }),
          ];

    setEditingId(c._id);
    setShowForm(true);
    setForm({
      title: c.title,
      description: c.description,
      price: String(c.price),
      sale_price: c.sale_price ? String(c.sale_price) : '',
      difficulty_level: c.difficulty_level || 'all',
      duration: String(c.duration),
      thumbnail: c.thumbnail || '',
      video_url: c.video_url || '',
      category_id: c.category_id?._id || c.category_id || '',
      teacher_id: c.teacher_id?._id || c.teacher_id || '',
      topics: hydratedTopics,
      all_resources: Array.isArray(c.all_resources)
        ? c.all_resources.map((resource) =>
            makeResource({
              _client_id: resource._id,
              name: resource?.name || '',
              url: resource?.url || '',
              file_type: resource?.file_type || 'other',
              size_bytes: Number(resource?.size_bytes) || 0,
              storage_path: String(resource?.storage_path || ''),
            })
          )
        : [],
    });
  }

  function cancelEditor() {
    setShowForm(false);
    resetForm();
    if (isCreateRoute) navigate(basePath(), { replace: true });
  }

  async function remove(id) {
    if (!canDelete) {
      toast.error('You do not have permission to delete courses');
      return;
    }
    if (!confirm('Delete this course?')) return;
    try {
      await api.delete(`/courses/${id}`);
      toast.success('Course deleted');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Delete failed');
    }
  }

  function topicUiKey(topic, topicIdx) {
    return String(topic?._client_id || topic?._id || `topic-${topicIdx}`);
  }

  function resourceUiKey(scope, topicIdx, resource, resourceIdx) {
    const base = String(resource?._client_id || resource?._id || `resource-${resourceIdx}`);
    if (scope === 'global') return `global-${base}`;
    return `topic-${topicIdx}-${base}`;
  }

  function markResourceDone(scope, topicIdx, resource, resourceIdx) {
    const key = resourceUiKey(scope, topicIdx, resource, resourceIdx);
    setResourceDoneState((prev) => ({
      ...prev,
      [key]: {
        done: true,
        isOpen: false,
      },
    }));
  }

  function toggleResourceOpen(scope, topicIdx, resource, resourceIdx) {
    const key = resourceUiKey(scope, topicIdx, resource, resourceIdx);
    setResourceDoneState((prev) => {
      const current = prev[key] || { done: false, isOpen: true };
      return {
        ...prev,
        [key]: {
          done: current.done ?? false,
          isOpen: !(current.isOpen ?? true),
        },
      };
    });
  }

  function toggleTopicOpen(topic, topicIdx) {
    const key = topicUiKey(topic, topicIdx);
    setTopicUiState((prev) => ({
      ...prev,
      [key]: {
        isOpen: !(prev[key]?.isOpen ?? true),
        done: prev[key]?.done ?? false,
      },
    }));
  }

  function markTopicDone(topic, topicIdx) {
    const key = topicUiKey(topic, topicIdx);
    setTopicUiState((prev) => ({
      ...prev,
      [key]: {
        isOpen: false,
        done: true,
      },
    }));
  }

  function lessonUiKey(topic, topicIdx, lesson, lessonIdx) {
    const tk = topicUiKey(topic, topicIdx);
    return `${tk}::${String(lesson?._client_id || lesson?._id || `lesson-${lessonIdx}`)}`;
  }

  function markLessonDone(topic, topicIdx, lesson, lessonIdx) {
    const key = lessonUiKey(topic, topicIdx, lesson, lessonIdx);
    setLessonUiState((prev) => ({
      ...prev,
      [key]: {
        isOpen: false,
        done: true,
      },
    }));
  }

  function toggleLessonOpen(topic, topicIdx, lesson, lessonIdx) {
    const key = lessonUiKey(topic, topicIdx, lesson, lessonIdx);
    setLessonUiState((prev) => {
      const cur = prev[key] || { done: false, isOpen: true };
      return {
        ...prev,
        [key]: {
          done: cur.done ?? false,
          isOpen: !(cur.isOpen ?? true),
        },
      };
    });
  }

  function addTopic() {
    const newTopic = makeTopic({ title: '' });
    const key = topicUiKey(newTopic, form.topics.length);
    setTopicUiState((prev) => ({
      ...prev,
      [key]: { isOpen: true, done: false },
    }));
    setForm((prev) => ({
      ...prev,
      topics: [...prev.topics, newTopic],
    }));
  }

  function setTopicAt(topicIdx, patch) {
    setForm((prev) => {
      const topics = [...prev.topics];
      topics[topicIdx] = { ...topics[topicIdx], ...patch };
      return { ...prev, topics };
    });
  }

  function removeTopic(topicIdx) {
    setForm((prev) => {
      const topic = prev.topics[topicIdx];
      const key = topicUiKey(topic, topicIdx);
      setTopicUiState((uiPrev) => {
        const next = { ...uiPrev };
        delete next[key];
        return next;
      });
      return { ...prev, topics: prev.topics.filter((_, idx) => idx !== topicIdx) };
    });
  }

  function addTopicLesson(topicIdx) {
    setForm((prev) => {
      const topics = [...prev.topics];
      const lessons = [...(topics[topicIdx].lessons || [])];
      lessons.push(makeLesson({ title: '', order: lessons.length }));
      topics[topicIdx] = { ...topics[topicIdx], lessons };
      return { ...prev, topics };
    });
  }

  function setTopicLessonAt(topicIdx, lessonIdx, patch) {
    setForm((prev) => {
      const topics = [...prev.topics];
      const lessons = [...(topics[topicIdx].lessons || [])];
      lessons[lessonIdx] = { ...lessons[lessonIdx], ...patch };
      topics[topicIdx] = { ...topics[topicIdx], lessons };
      return { ...prev, topics };
    });
  }

  function removeTopicLesson(topicIdx, lessonIdx) {
    setForm((prev) => {
      const topics = [...prev.topics];
      const lessons = (topics[topicIdx].lessons || []).filter((_, idx) => idx !== lessonIdx);
      topics[topicIdx] = { ...topics[topicIdx], lessons };
      return { ...prev, topics };
    });
  }

  function addTopicAssignment(topicIdx) {
    setForm((prev) => {
      const topics = [...prev.topics];
      topics[topicIdx] = {
        ...topics[topicIdx],
        assignments: [...(topics[topicIdx].assignments || []), makeAssignment()],
      };
      return { ...prev, topics };
    });
  }

  function setTopicAssignmentAt(topicIdx, assignmentIdx, patch) {
    setForm((prev) => {
      const topics = [...prev.topics];
      const assignments = [...(topics[topicIdx].assignments || [])];
      assignments[assignmentIdx] = { ...assignments[assignmentIdx], ...patch };
      topics[topicIdx] = { ...topics[topicIdx], assignments };
      return { ...prev, topics };
    });
  }

  function removeTopicAssignment(topicIdx, assignmentIdx) {
    setForm((prev) => {
      const topics = [...prev.topics];
      const assignments = (topics[topicIdx].assignments || []).filter((_, idx) => idx !== assignmentIdx);
      topics[topicIdx] = { ...topics[topicIdx], assignments };
      return { ...prev, topics };
    });
  }

  function addTopicQuiz(topicIdx) {
    setForm((prev) => {
      const topics = [...prev.topics];
      topics[topicIdx] = {
        ...topics[topicIdx],
        quizzes: [...(topics[topicIdx].quizzes || []), makeQuiz()],
      };
      return { ...prev, topics };
    });
  }

  function setTopicQuizAt(topicIdx, quizIdx, patch) {
    setForm((prev) => {
      const topics = [...prev.topics];
      const quizzes = [...(topics[topicIdx].quizzes || [])];
      quizzes[quizIdx] = { ...quizzes[quizIdx], ...patch };
      topics[topicIdx] = { ...topics[topicIdx], quizzes };
      return { ...prev, topics };
    });
  }

  function removeTopicQuiz(topicIdx, quizIdx) {
    setForm((prev) => {
      const topics = [...prev.topics];
      const quizzes = (topics[topicIdx].quizzes || []).filter((_, idx) => idx !== quizIdx);
      topics[topicIdx] = { ...topics[topicIdx], quizzes };
      return { ...prev, topics };
    });
  }

  function setTopicQuizQuestionAt(topicIdx, quizIdx, questionIdx, patch) {
    setForm((prev) => {
      const topics = [...prev.topics];
      const quizzes = [...(topics[topicIdx].quizzes || [])];
      const questions = [...(quizzes[quizIdx].questions || [])];
      questions[questionIdx] = { ...questions[questionIdx], ...patch };
      quizzes[quizIdx] = { ...quizzes[quizIdx], questions };
      topics[topicIdx] = { ...topics[topicIdx], quizzes };
      return { ...prev, topics };
    });
  }

  function addTopicQuizQuestion(topicIdx, quizIdx) {
    setForm((prev) => {
      const topics = [...prev.topics];
      const quizzes = [...(topics[topicIdx].quizzes || [])];
      const questions = [...(quizzes[quizIdx].questions || []), makeQuizQuestion()];
      quizzes[quizIdx] = { ...quizzes[quizIdx], questions };
      topics[topicIdx] = { ...topics[topicIdx], quizzes };
      return { ...prev, topics };
    });
  }

  function removeTopicQuizQuestion(topicIdx, quizIdx, questionIdx) {
    setForm((prev) => {
      const topics = [...prev.topics];
      const quizzes = [...(topics[topicIdx].quizzes || [])];
      const questions = (quizzes[quizIdx].questions || []).filter((_, idx) => idx !== questionIdx);
      quizzes[quizIdx] = { ...quizzes[quizIdx], questions: questions.length ? questions : [makeQuizQuestion()] };
      topics[topicIdx] = { ...topics[topicIdx], quizzes };
      return { ...prev, topics };
    });
  }

  function addTopicInVideoQuiz(topicIdx, lesson, lessonIdx) {
    setForm((prev) => {
      const topics = [...prev.topics];
      const lessonId = lesson?._id || lesson?._client_id || '';
      const lessonOrder = Number.isFinite(Number(lesson?.order)) ? Number(lesson.order) : lessonIdx;
      topics[topicIdx] = {
        ...topics[topicIdx],
        in_video_quizzes: [
          ...(topics[topicIdx].in_video_quizzes || []),
          makeInVideoQuiz({
            lesson_id: lessonId,
            lesson_order: lessonOrder,
          }),
        ],
      };
      return { ...prev, topics };
    });
  }

  function setTopicInVideoQuizAt(topicIdx, inVideoQuizIdx, patch) {
    setForm((prev) => {
      const topics = [...prev.topics];
      const inVideoQuizzes = [...(topics[topicIdx].in_video_quizzes || [])];
      inVideoQuizzes[inVideoQuizIdx] = { ...inVideoQuizzes[inVideoQuizIdx], ...patch };
      topics[topicIdx] = { ...topics[topicIdx], in_video_quizzes: inVideoQuizzes };
      return { ...prev, topics };
    });
  }

  function removeTopicInVideoQuiz(topicIdx, inVideoQuizIdx) {
    setForm((prev) => {
      const topics = [...prev.topics];
      const inVideoQuizzes = (topics[topicIdx].in_video_quizzes || []).filter((_, idx) => idx !== inVideoQuizIdx);
      topics[topicIdx] = { ...topics[topicIdx], in_video_quizzes: inVideoQuizzes };
      return { ...prev, topics };
    });
  }

  function addTopicResource(topicIdx) {
    setForm((prev) => {
      const topics = [...prev.topics];
      const resources = [...(topics[topicIdx].resources || []), makeResource()];
      topics[topicIdx] = { ...topics[topicIdx], resources };
      return { ...prev, topics };
    });
  }

  function setTopicResourceAt(topicIdx, resourceIdx, patch) {
    setForm((prev) => {
      const topics = [...prev.topics];
      const resources = [...(topics[topicIdx].resources || [])];
      resources[resourceIdx] = { ...resources[resourceIdx], ...patch };
      topics[topicIdx] = { ...topics[topicIdx], resources };
      return { ...prev, topics };
    });
  }

  function removeTopicResource(topicIdx, resourceIdx) {
    setForm((prev) => {
      const topics = [...prev.topics];
      const resources = (topics[topicIdx].resources || []).filter((_, idx) => idx !== resourceIdx);
      topics[topicIdx] = { ...topics[topicIdx], resources };
      return { ...prev, topics };
    });
  }

  function addGlobalResource() {
    setForm((prev) => ({ ...prev, all_resources: [...(prev.all_resources || []), makeResource()] }));
  }

  function setGlobalResourceAt(resourceIdx, patch) {
    setForm((prev) => {
      const all_resources = [...(prev.all_resources || [])];
      all_resources[resourceIdx] = { ...all_resources[resourceIdx], ...patch };
      return { ...prev, all_resources };
    });
  }

  function removeGlobalResource(resourceIdx) {
    setForm((prev) => ({ ...prev, all_resources: (prev.all_resources || []).filter((_, idx) => idx !== resourceIdx) }));
  }

  async function uploadResourceFile(file, target) {
    if (!canUploadResources) {
      toast.error('You do not have permission to upload resources');
      return;
    }
    if (!file) return;
    const lowerName = String(file.name || '').toLowerCase();
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'application/x-zip-compressed',
    ];
    const extensionAllowed = ['.pdf', '.ppt', '.pptx', '.xls', '.xlsx', '.zip'].some((ext) => lowerName.endsWith(ext));
    if (!allowedTypes.includes(file.type) && !extensionAllowed) {
      toast.error('Only PDF, PowerPoint, Excel, and ZIP files are allowed');
      return;
    }

    const data = new FormData();
    data.append('file', file);
    setResourceInputKeySeed((k) => k + 1);
    setResourceUploadState({ target, pct: 0 });
    try {
      const { data: uploaded } = await api.post('/uploads/files', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (ev) => {
          if (!ev.total) return;
          setResourceUploadState({ target, pct: Math.round((ev.loaded * 100) / ev.total) });
        },
      });
      const patch = {
        name: uploaded.original_name || file.name,
        url: uploaded.url || '',
        file_type: uploaded.file_type || 'other',
        size_bytes: Number(uploaded.size_bytes ?? uploaded.size) || 0,
        storage_path: String(uploaded.storage_path || uploaded.path || ''),
      };
      if (target.scope === 'topic') {
        setTopicResourceAt(target.topicIdx, target.resourceIdx, patch);
      } else {
        setGlobalResourceAt(target.resourceIdx, patch);
      }
      toast.success('Resource file uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Resource upload failed');
    } finally {
      setResourceUploadState({ target: null, pct: 0 });
      setResourceInputKeySeed((k) => k + 1);
    }
  }


  async function uploadThumbnailFile(file) {
    if (!canUploadResources) {
      toast.error('You do not have permission to upload resources');
      return;
    }
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only jpg, jpeg, png, and webp files are allowed');
      return;
    }

    const data = new FormData();
    data.append('image', file);
    setThumbnailUploading(true);
    try {
      const { data: upload } = await api.post('/uploads/images', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((prev) => ({ ...prev, thumbnail: upload.url || '' }));
      toast.success('Thumbnail uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thumbnail upload failed');
    } finally {
      setThumbnailUploading(false);
      setThumbnailInputKey((k) => k + 1);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!canPublishCourse) {
      toast.error('You do not have permission to publish/update courses');
      return;
    }
    if (form.sale_price !== '' && Number(form.sale_price) > Number(form.price)) {
      toast.error('Sale price cannot be greater than regular price');
      return;
    }
    const flattenedLessons = [];
    const flattenedAssignments = [];
    const flattenedQuizzes = [];
    const topicResources = [];
    const courseTopics = [];

    (form.topics || []).forEach((topic, topicIdx) => {
      const topicLessons = [];
      const topicAssignments = [];
      const topicQuizzes = [];
      const topicInVideoQuizzes = [];
      const topicResourceRows = [];

      (topic.lessons || [])
        .filter((l) => l.title && l.video_url)
        .forEach((lesson) => {
          const normalizedLesson = {
            title: lesson.title,
            video_url: lesson.video_url,
            duration: lesson.duration || '',
            order: flattenedLessons.length,
          };
          flattenedLessons.push(normalizedLesson);
          topicLessons.push({
            ...normalizedLesson,
            order: topicLessons.length,
          });
        });

      (topic.assignments || [])
        .map((a) => ({
          title: a.title,
          description: a.description || '',
          due_date: a.due_date || undefined,
          points: a.points === '' ? 100 : Number(a.points),
        }))
        .filter((a) => a.title)
        .forEach((assignment) => {
          flattenedAssignments.push(assignment);
          topicAssignments.push(assignment);
        });

      (topic.quizzes || [])
        .map((q) => ({
          title: q.title,
          description: q.description || '',
          time_limit_minutes: q.time_limit_minutes === '' ? undefined : Number(q.time_limit_minutes),
          questions: (q.questions || [])
            .map((qq) => {
              const questionType = String(qq.question_type || 'circle_right_answer');
              const base = {
                question: String(qq.question || '').trim(),
                question_type: questionType,
              };

              if (questionType === 'true_false') {
                return {
                  ...base,
                  options: ['True', 'False'],
                  answer_index: qq.answer_index === 1 || String(qq.answer_index) === '1' ? 1 : 0,
                  answer_text: '',
                };
              }

              if (questionType === 'fill_blank' || questionType === 'short_answer') {
                return {
                  ...base,
                  options: [],
                  answer_index: 0,
                  answer_text: String(qq.answer_text || '').trim(),
                };
              }

              const options = (qq.options_text || '')
                .split(',')
                .map((o) => o.trim())
                .filter(Boolean);
              return {
                ...base,
                options,
                answer_index: qq.answer_index === '' ? 0 : Number(qq.answer_index),
                answer_text: '',
              };
            })
            .filter((qq) => {
              if (!qq.question) return false;
              if (qq.question_type === 'true_false') return true;
              if (qq.question_type === 'fill_blank' || qq.question_type === 'short_answer') return Boolean(qq.answer_text);
              return Array.isArray(qq.options) && qq.options.length >= 2;
            }),
        }))
        .filter((q) => q.title)
        .forEach((quiz) => {
          flattenedQuizzes.push(quiz);
          topicQuizzes.push(quiz);
        });

      (topic.in_video_quizzes || [])
        .map((quiz) => {
          const options = (quiz.options_text || '')
            .split(',')
            .map((opt) => opt.trim())
            .filter(Boolean);
          const rawTs = String(quiz.timestamp || '').trim();
          if (!quiz.question || options.length < 2 || !rawTs) return null;
          const parsedTs = Number(rawTs);
          const parsedLessonOrder = Number(quiz.lesson_order);
          return {
            question: String(quiz.question || '').trim(),
            options,
            correct_answer_index: Number.isFinite(parsedTs)
              ? Number(quiz.correct_answer_index || 0)
              : Number(quiz.correct_answer_index || 0),
            explanation: String(quiz.explanation || '').trim(),
            timestamp: rawTs,
            timestamp_seconds: Number.isFinite(parsedTs) ? parsedTs : rawTs,
            lesson_id: quiz.lesson_id || null,
            lesson_order: Number.isFinite(parsedLessonOrder) && parsedLessonOrder >= 0 ? parsedLessonOrder : null,
            repeat_on_skip: Boolean(quiz.repeat_on_skip),
            retry_policy: String(quiz.retry_policy || (quiz.repeat_on_skip ? 'retry_on_skip' : 'no_retry')),
            max_attempts: Number.isFinite(Number(quiz.max_attempts)) ? Number(quiz.max_attempts) : 2,
            retry_cooldown_seconds: Number.isFinite(Number(quiz.retry_cooldown_seconds)) ? Number(quiz.retry_cooldown_seconds) : 0,
          };
        })
        .filter(Boolean)
        .forEach((quiz) => {
          topicInVideoQuizzes.push(quiz);
        });

      const normalizedResources = (topic.resources || [])
        .map((resource) => ({
          name: String(resource.name || '').trim(),
          url: String(resource.url || '').trim(),
          file_type: resource.file_type || 'other',
          size_bytes: Number.isFinite(Number(resource.size_bytes)) ? Math.max(0, Math.floor(Number(resource.size_bytes))) : 0,
          storage_path: String(resource.storage_path || '').trim(),
        }))
        .filter((resource) => resource.name && resource.url);
      if (normalizedResources.length > 0) {
        topicResources.push({
          topic_index: topicIdx,
          topic_title: String(topic.title || '').trim(),
          resources: normalizedResources,
        });
        topicResourceRows.push(...normalizedResources);
      }

      courseTopics.push({
        title: String(topic.title || '').trim() || `Chapter ${topicIdx + 1}`,
        lessons: topicLessons,
        assignments: topicAssignments,
        quizzes: topicQuizzes,
        in_video_quizzes: topicInVideoQuizzes,
        resources: topicResourceRows,
      });
    });

    const allResources = (form.all_resources || [])
      .map((resource) => ({
        name: String(resource.name || '').trim(),
        url: String(resource.url || '').trim(),
        file_type: resource.file_type || 'other',
        size_bytes: Number.isFinite(Number(resource.size_bytes)) ? Math.max(0, Math.floor(Number(resource.size_bytes))) : 0,
        storage_path: String(resource.storage_path || '').trim(),
      }))
      .filter((resource) => resource.name && resource.url);

    const payload = {
      title: form.title,
      description: form.description,
      price: Number(form.price),
      sale_price: form.sale_price === '' ? 0 : Number(form.sale_price),
      difficulty_level: form.difficulty_level || 'all',
      duration: Number(form.duration),
      thumbnail: form.thumbnail,
      video_url: form.video_url,
      category_id: form.category_id || null,
      lessons: flattenedLessons,
      assignments: flattenedAssignments,
      quizzes: flattenedQuizzes,
      course_topics: courseTopics,
      all_resources: allResources,
      topic_resources: topicResources,
    };
    if (canAssignTeacher) payload.teacher_id = form.teacher_id;

    try {
      if (editingId) {
        await api.put(`/courses/${editingId}`, payload);
        toast.success('Course updated');
      } else {
        await api.post('/courses', payload);
        toast.success('Course created');
      }
      setShowForm(false);
      resetForm();
      if (isCreateRoute) navigate(basePath(), { replace: true });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  }

  return (
    <div>
      <div className="cm-top-row">
        <div>
          <h1 style={{ margin: 0 }}>{heading.title}</h1>
        </div>
        {canCreateCourse && (
          <button type="button" className="btn btn-primary cm-add-btn" onClick={startCreate}>
            <Plus size={16} />
            Add course
          </button>
        )}
      </div>

      {showForm && (
        <form className="cm-builder" onSubmit={onSubmit}>
          <div className="cm-main">
            <section className="card cm-section">
              <div className="cm-section-title">
                <BookOpenText size={18} />
                Course content
              </div>
              <div className="cm-grid">
                <div className="cm-full">
                  <label className="label">Course title</label>
                  <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="cm-full">
                  <label className="label">Description</label>
                  <textarea
                    className="input"
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
            </section>

            <section className="card cm-section">
              <div className="cm-section-title">Course resources</div>
              <p className="cm-side-note" style={{ marginTop: '-0.35rem' }}>
                Attach PDFs, Office files, or ZIP packages (tools, installers, project files). Students download from the course player; hosted files require enrollment on paid courses. ZIP up to 100&nbsp;MB.
              </p>
              {(form.all_resources || []).length === 0 && (
                <p className="cm-side-note">Add global resources that apply to the full course.</p>
              )}
              {(form.all_resources || []).map((resource, resourceIdx) => (
                (() => {
                  const resourceState = resourceDoneState[resourceUiKey('global', null, resource, resourceIdx)] || {
                    done: false,
                    isOpen: true,
                  };
                  return (
                <div
                  key={`global-resource-${resource._client_id || resource._id || resourceIdx}`}
                  className={`cm-item ${resourceState.done ? 'is-done' : ''}`}
                >
                  <div className="cm-item-head">
                    <span>Resource {resourceIdx + 1}</span>
                    <div className="cm-item-head-actions">
                      {resourceState.done && (
                        <span className="cm-resource-done-badge">
                          <Check size={12} />
                          Done
                        </span>
                      )}
                      <button
                        type="button"
                        className="btn btn-secondary cm-resource-done-btn"
                        onClick={() => markResourceDone('global', null, resource, resourceIdx)}
                      >
                        <Check size={13} />
                        Done
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost cm-resource-toggle-btn"
                        aria-expanded={resourceState.isOpen}
                        onClick={() => toggleResourceOpen('global', null, resource, resourceIdx)}
                      >
                        <ChevronDown className={resourceState.isOpen ? 'is-open' : ''} size={15} />
                      </button>
                      <button type="button" className="cm-link-btn" onClick={() => removeGlobalResource(resourceIdx)}>
                        <Trash2 size={14} />
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className={`cm-resource-content-wrap ${resourceState.isOpen ? 'is-open' : ''}`}>
                    <div className="cm-resource-content">
                  <div className="cm-grid">
                    <div>
                      <label className="label">RESOURCE NAME</label>
                      <input
                        className="input"
                        value={resource.name}
                        onChange={(e) => setGlobalResourceAt(resourceIdx, { name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">UPLOAD FILE</label>
                      <input
                        key={`global-resource-file-${resourceInputKeySeed}-${resource._client_id || resourceIdx}`}
                        className="input"
                        type="file"
                        accept=".pdf,.ppt,.pptx,.xls,.xlsx,.zip,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,application/x-zip-compressed"
                        onChange={(e) =>
                          uploadResourceFile(e.target.files?.[0], {
                            scope: 'global',
                            resourceIdx,
                          })
                        }
                        disabled={!canUploadResources}
                      />
                    </div>
                    <div className="cm-full cm-upload-meta">
                      {resourceUploadState.target &&
                        matchesResourceUploadTarget(resourceUploadState.target, 'global', null, resourceIdx) &&
                        resourceUploadState.pct > 0 &&
                        resourceUploadState.pct < 100 && (
                          <div className="cm-upload-progress" style={{ marginBottom: '0.35rem' }}>
                            Uploading… {resourceUploadState.pct}%
                          </div>
                        )}
                      {resource.url ? (
                        <span>
                          <Archive size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} aria-hidden />
                          <strong>{resource.name || resource.url.split('/').pop()}</strong>
                          {Number(resource.size_bytes) > 0 ? (
                            <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{formatFileSize(resource.size_bytes)}</span>
                          ) : null}
                        </span>
                      ) : (
                        <span>No file uploaded yet</span>
                      )}
                    </div>
                  </div>
                    </div>
                  </div>
                </div>
                  );
                })()
              ))}
              <div className="cm-curriculum-actions" role="group" aria-label="Global resource actions">
                {canManageLessons && (
                  <button type="button" className="btn btn-secondary cm-curriculum-btn" onClick={addGlobalResource}>
                    <Archive size={15} aria-hidden />
                    Add resource
                  </button>
                )}
              </div>
            </section>

            <section className="card cm-section">
              <div className="cm-section-title">
                <ListChecks size={18} />
                Add Topic
              </div>
              {form.topics.length === 0 && <p className="cm-side-note">Create a topic to add lessons, assignments, quizzes, and resources.</p>}
              {form.topics.map((topic, topicIdx) => {
                const key = topicUiKey(topic, topicIdx);
                const topicUi = topicUiState[key] || { isOpen: true, done: false };
                const topicTitle = topic.title?.trim() || `Topic ${topicIdx + 1}`;
                return (
                <div
                  key={`topic-${topic._client_id || topic._id || topicIdx}`}
                  className={`cm-topic-card ${topicUi.isOpen ? 'is-open' : ''} ${topicUi.done ? 'is-done' : ''}`}
                >
                  <div className="cm-topic-head">
                    <div className="cm-topic-head-left">
                      <strong>{topicTitle}</strong>
                      <small>Topic {topicIdx + 1}</small>
                    </div>
                    <div className="cm-topic-head-right">
                      {topicUi.done && (
                        <span className="cm-topic-done-badge">
                          <Check size={13} />
                          Done
                        </span>
                      )}
                      <button type="button" className="btn btn-secondary cm-topic-head-btn" onClick={() => markTopicDone(topic, topicIdx)}>
                        <Check size={14} />
                        {topicUi.done ? 'Done' : 'Mark Done'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost cm-topic-toggle-btn"
                        onClick={() => toggleTopicOpen(topic, topicIdx)}
                        aria-expanded={topicUi.isOpen}
                        aria-label={`${topicUi.isOpen ? 'Collapse' : 'Expand'} topic`}
                      >
                        <ChevronDown className={topicUi.isOpen ? 'is-open' : ''} size={15} />
                      </button>
                      <button type="button" className="cm-link-btn" onClick={() => removeTopic(topicIdx)}>
                        <Trash2 size={14} />
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className={`cm-topic-content-wrap ${topicUi.isOpen ? 'is-open' : ''}`}>
                    <div className="cm-topic-content">
                      <div className="cm-grid">
                        <div className="cm-full">
                          <label className="label">Topic title</label>
                          <input
                            className="input"
                            value={topic.title}
                            onChange={(e) => setTopicAt(topicIdx, { title: e.target.value })}
                            placeholder=""
                          />
                        </div>
                      </div>
                  {topic.lessons?.length > 0 && (
                    <div className="cm-topic-block">
                      <h4>Lessons</h4>
                      {topic.lessons.map((lesson, lessonIdx) => {
                        const lk = lessonUiKey(topic, topicIdx, lesson, lessonIdx);
                        const lessonState = lessonUiState[lk] || { done: false, isOpen: true };
                        const lessonTitleShort = lesson.title?.trim() || `Lesson ${lessonIdx + 1}`;
                        return (
                        <div
                          key={`topic-${topic._client_id || topicIdx}-lesson-${lesson._client_id || lesson._id || lessonIdx}`}
                          className={`cm-item ${lessonState.done ? 'is-done' : ''}`}
                        >
                          <div className="cm-item-head">
                            <span
                              style={{
                                maxWidth: '52%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={lessonTitleShort}
                            >
                              Lesson {lessonIdx + 1}: {lessonTitleShort}
                            </span>
                            <div className="cm-item-head-actions">
                              {lessonState.done && (
                                <span className="cm-resource-done-badge">
                                  <Check size={12} />
                                  Done
                                </span>
                              )}
                              <button
                                type="button"
                                className="btn btn-secondary cm-resource-done-btn"
                                onClick={() => markLessonDone(topic, topicIdx, lesson, lessonIdx)}
                              >
                                <Check size={13} />
                                {lessonState.done ? 'Done' : 'Mark Done'}
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost cm-resource-toggle-btn"
                                aria-expanded={lessonState.isOpen}
                                aria-label={`${lessonState.isOpen ? 'Collapse' : 'Expand'} lesson`}
                                onClick={() => toggleLessonOpen(topic, topicIdx, lesson, lessonIdx)}
                              >
                                <ChevronDown className={lessonState.isOpen ? 'is-open' : ''} size={15} />
                              </button>
                              <button type="button" className="cm-link-btn" onClick={() => removeTopicLesson(topicIdx, lessonIdx)}>
                                <Trash2 size={14} />
                                Remove
                              </button>
                            </div>
                          </div>
                          <div className={`cm-resource-content-wrap ${lessonState.isOpen ? 'is-open' : ''}`}>
                            <div className="cm-resource-content">
                          <div className="cm-grid">
                            <div>
                              <label className="label">Lesson title</label>
                              <input
                                className="input"
                                value={lesson.title}
                                onChange={(e) => setTopicLessonAt(topicIdx, lessonIdx, { title: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="label">Embed URL</label>
                              <input
                                className="input"
                                placeholder="YouTube or Vimeo link — for private Vimeo, paste full URL with ?h=…"
                                value={lesson.video_url}
                                onChange={(e) => setTopicLessonAt(topicIdx, lessonIdx, { video_url: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="label">Duration (minutes:seconds)</label>
                              <input
                                className="input"
                                placeholder="e.g. 8:45 (8 min, 45 sec)"
                                inputMode="text"
                                autoComplete="off"
                                value={lesson.duration || ''}
                                onChange={(e) => setTopicLessonAt(topicIdx, lessonIdx, { duration: e.target.value })}
                                onBlur={(e) => {
                                  const v = e.target.value.trim();
                                  if (!v) return;
                                  const norm = formatManualLessonDuration(v);
                                  if (norm) setTopicLessonAt(topicIdx, lessonIdx, { duration: norm });
                                }}
                              />
                            </div>
                          </div>
                          <div className="cm-lesson-pop-wrap">
                            <div className="cm-lesson-pop-head">
                              <strong>Pop Questions for this Video</strong>
                              <button
                                type="button"
                                className="btn btn-secondary cm-curriculum-btn"
                                onClick={() => addTopicInVideoQuiz(topicIdx, lesson, lessonIdx)}
                              >
                                <Plus size={15} />
                                Add Pop Question
                              </button>
                            </div>
                            {(topic.in_video_quizzes || [])
                              .filter(
                                (inVideoQuiz) =>
                                  String(inVideoQuiz.lesson_id || '') === String(lesson._id || lesson._client_id || '') ||
                                  Number(inVideoQuiz.lesson_order) === Number(lesson.order ?? lessonIdx)
                              )
                              .map((inVideoQuiz, quizRowIdx) => {
                                const sourceIdx = (topic.in_video_quizzes || []).findIndex(
                                  (row) => String(row._client_id || row._id || '') === String(inVideoQuiz._client_id || inVideoQuiz._id || '')
                                );
                                if (sourceIdx < 0) return null;
                                return (
                                  <div
                                    key={`topic-${topic._client_id || topicIdx}-lesson-${lesson._client_id || lessonIdx}-pop-${
                                      inVideoQuiz._client_id || inVideoQuiz._id || quizRowIdx
                                    }`}
                                    className="cm-item cm-lesson-pop-item"
                                  >
                                    <div className="cm-item-head">
                                      <span>Pop Question {quizRowIdx + 1}</span>
                                      <button type="button" className="cm-link-btn" onClick={() => removeTopicInVideoQuiz(topicIdx, sourceIdx)}>
                                        <Trash2 size={14} />
                                        Remove
                                      </button>
                                    </div>
                                    <div className="cm-grid">
                                      <div className="cm-full">
                                        <label className="label">Question</label>
                                        <input
                                          className="input"
                                          value={inVideoQuiz.question}
                                          onChange={(e) => setTopicInVideoQuizAt(topicIdx, sourceIdx, { question: e.target.value })}
                                          placeholder="Enter question"
                                        />
                                      </div>
                                      <div className="cm-full">
                                        <label className="label">Options (comma separated)</label>
                                        <input
                                          className="input"
                                          value={inVideoQuiz.options_text}
                                          onChange={(e) => setTopicInVideoQuizAt(topicIdx, sourceIdx, { options_text: e.target.value })}
                                          placeholder="Option A, Option B, Option C, Option D"
                                        />
                                      </div>
                                      <div>
                                        <label className="label">Correct answer index</label>
                                        <input
                                          className="input"
                                          type="number"
                                          min="0"
                                          value={inVideoQuiz.correct_answer_index}
                                          onChange={(e) => setTopicInVideoQuizAt(topicIdx, sourceIdx, { correct_answer_index: e.target.value })}
                                        />
                                      </div>
                                      <div>
                                        <label className="label">Timestamp (seconds or mm:ss)</label>
                                        <input
                                          className="input"
                                          value={inVideoQuiz.timestamp}
                                          onChange={(e) => setTopicInVideoQuizAt(topicIdx, sourceIdx, { timestamp: e.target.value })}
                                          placeholder="116 or 1:56"
                                        />
                                      </div>
                                      <div className="cm-inline-check">
                                        <label className="cm-check">
                                          <input
                                            type="checkbox"
                                            checked={Boolean(inVideoQuiz.repeat_on_skip)}
                                            onChange={(e) => setTopicInVideoQuizAt(topicIdx, sourceIdx, { repeat_on_skip: e.target.checked })}
                                          />
                                          <span>Show again if skipped</span>
                                        </label>
                                      </div>
                                      <div>
                                        <label className="label">Retry policy</label>
                                        <select
                                          className="input"
                                          value={inVideoQuiz.retry_policy || 'retry_on_skip'}
                                          onChange={(e) => setTopicInVideoQuizAt(topicIdx, sourceIdx, { retry_policy: e.target.value })}
                                        >
                                          <option value="no_retry">No retry</option>
                                          <option value="retry_on_skip">Retry on skip</option>
                                          <option value="retry_on_incorrect">Retry on incorrect</option>
                                          <option value="retry_always">Retry always</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="label">Max attempts</label>
                                        <input
                                          className="input"
                                          type="number"
                                          min="1"
                                          max="10"
                                          value={inVideoQuiz.max_attempts ?? 2}
                                          onChange={(e) => setTopicInVideoQuizAt(topicIdx, sourceIdx, { max_attempts: e.target.value })}
                                        />
                                      </div>
                                      <div>
                                        <label className="label">Retry cooldown (seconds)</label>
                                        <input
                                          className="input"
                                          type="number"
                                          min="0"
                                          value={inVideoQuiz.retry_cooldown_seconds ?? 0}
                                          onChange={(e) => setTopicInVideoQuizAt(topicIdx, sourceIdx, { retry_cooldown_seconds: e.target.value })}
                                        />
                                      </div>
                                      <div className="cm-full">
                                        <label className="label">Explanation (shown after submit)</label>
                                        <textarea
                                          className="input"
                                          rows={2}
                                          value={inVideoQuiz.explanation}
                                          onChange={(e) => setTopicInVideoQuizAt(topicIdx, sourceIdx, { explanation: e.target.value })}
                                          placeholder="Explain why this answer is correct"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}

                  {topic.assignments?.length > 0 && (
                    <div className="cm-topic-block">
                      <h4>Assignments</h4>
                      {topic.assignments.map((assignment, assignmentIdx) => (
                        <div
                          key={`topic-${topic._client_id || topicIdx}-assignment-${assignment._client_id || assignment._id || assignmentIdx}`}
                          className="cm-item"
                        >
                          <div className="cm-item-head">
                            <span>Assignment {assignmentIdx + 1}</span>
                            <button type="button" className="cm-link-btn" onClick={() => removeTopicAssignment(topicIdx, assignmentIdx)}>
                              <Trash2 size={14} />
                              Remove
                            </button>
                          </div>
                          <div className="cm-grid">
                            <div>
                              <label className="label">Title</label>
                              <input
                                className="input"
                                value={assignment.title}
                                onChange={(e) => setTopicAssignmentAt(topicIdx, assignmentIdx, { title: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="label">Due date</label>
                              <input
                                className="input"
                                type="date"
                                value={assignment.due_date || ''}
                                onChange={(e) => setTopicAssignmentAt(topicIdx, assignmentIdx, { due_date: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="label">Points</label>
                              <input
                                className="input"
                                type="number"
                                min="0"
                                value={assignment.points}
                                onChange={(e) => setTopicAssignmentAt(topicIdx, assignmentIdx, { points: e.target.value })}
                              />
                            </div>
                            <div className="cm-full">
                              <label className="label">Description</label>
                              <textarea
                                className="input"
                                rows={2}
                                value={assignment.description}
                                onChange={(e) => setTopicAssignmentAt(topicIdx, assignmentIdx, { description: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {topic.quizzes?.length > 0 && (
                    <div className="cm-topic-block">
                      <h4>Quizzes</h4>
                      {topic.quizzes.map((quiz, quizIdx) => (
                        <div key={`topic-${topic._client_id || topicIdx}-quiz-${quiz._client_id || quiz._id || quizIdx}`} className="cm-item">
                          <div className="cm-item-head">
                            <span>Quiz {quizIdx + 1}</span>
                            <button type="button" className="cm-link-btn" onClick={() => removeTopicQuiz(topicIdx, quizIdx)}>
                              <Trash2 size={14} />
                              Remove
                            </button>
                          </div>
                          <div className="cm-grid">
                            <div>
                              <label className="label">Quiz title</label>
                              <input
                                className="input"
                                value={quiz.title}
                                onChange={(e) => setTopicQuizAt(topicIdx, quizIdx, { title: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="label">Time limit (minutes)</label>
                              <input
                                className="input"
                                type="number"
                                min="0"
                                value={quiz.time_limit_minutes}
                                onChange={(e) => setTopicQuizAt(topicIdx, quizIdx, { time_limit_minutes: e.target.value })}
                              />
                            </div>
                            <div className="cm-full">
                              <label className="label">Description</label>
                              <textarea
                                className="input"
                                rows={2}
                                value={quiz.description}
                                onChange={(e) => setTopicQuizAt(topicIdx, quizIdx, { description: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="cm-question-wrap">
                            {(quiz.questions || []).map((question, questionIdx) => (
                              <div
                                key={`topic-${topic._client_id || topicIdx}-quiz-${quiz._client_id || quizIdx}-question-${
                                  question._client_id || question._id || questionIdx
                                }`}
                                className="cm-question-item"
                              >
                                <div className="cm-item-head">
                                  <span>Question {questionIdx + 1}</span>
                                  <button
                                    type="button"
                                    className="cm-link-btn"
                                    onClick={() => removeTopicQuizQuestion(topicIdx, quizIdx, questionIdx)}
                                  >
                                    <Trash2 size={14} />
                                    Remove
                                  </button>
                                </div>
                                <div className="cm-grid">
                                  <div className="cm-full">
                                    <label className="label">Question</label>
                                    <input
                                      className="input"
                                      value={question.question}
                                      onChange={(e) =>
                                        setTopicQuizQuestionAt(topicIdx, quizIdx, questionIdx, { question: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <label className="label">Question type</label>
                                    <select
                                      className="input"
                                      value={question.question_type || 'circle_right_answer'}
                                      onChange={(e) =>
                                        setTopicQuizQuestionAt(topicIdx, quizIdx, questionIdx, {
                                          question_type: e.target.value,
                                          options_text: '',
                                          answer_index: 0,
                                          answer_text: '',
                                        })
                                      }
                                    >
                                      {quizQuestionTypeOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  {(question.question_type || 'circle_right_answer') === 'circle_right_answer' && (
                                    <>
                                      <div>
                                        <label className="label">Options (comma separated)</label>
                                        <input
                                          className="input"
                                          value={question.options_text}
                                          onChange={(e) =>
                                            setTopicQuizQuestionAt(topicIdx, quizIdx, questionIdx, { options_text: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div>
                                        <label className="label">Correct answer index</label>
                                        <input
                                          className="input"
                                          type="number"
                                          min="0"
                                          value={question.answer_index}
                                          onChange={(e) =>
                                            setTopicQuizQuestionAt(topicIdx, quizIdx, questionIdx, { answer_index: e.target.value })
                                          }
                                        />
                                      </div>
                                    </>
                                  )}
                                  {(question.question_type || 'circle_right_answer') === 'true_false' && (
                                    <div>
                                      <label className="label">Correct answer</label>
                                      <select
                                        className="input"
                                        value={String(question.answer_index ?? 0)}
                                        onChange={(e) =>
                                          setTopicQuizQuestionAt(topicIdx, quizIdx, questionIdx, {
                                            answer_index: Number(e.target.value),
                                          })
                                        }
                                      >
                                        <option value="0">True</option>
                                        <option value="1">False</option>
                                      </select>
                                    </div>
                                  )}
                                  {['fill_blank', 'short_answer'].includes(question.question_type || 'circle_right_answer') && (
                                    <div className="cm-full">
                                      <label className="label">
                                        {(question.question_type || 'circle_right_answer') === 'fill_blank'
                                          ? 'Correct word/phrase'
                                          : 'Expected short answer'}
                                      </label>
                                      <input
                                        className="input"
                                        value={question.answer_text || ''}
                                        onChange={(e) =>
                                          setTopicQuizQuestionAt(topicIdx, quizIdx, questionIdx, { answer_text: e.target.value })
                                        }
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              className="btn btn-secondary cm-curriculum-btn"
                              onClick={() => addTopicQuizQuestion(topicIdx, quizIdx)}
                            >
                              <Plus size={15} />
                              Add Question
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {topic.resources?.length > 0 && (
                    <div className="cm-topic-block">
                      <h4>Resources</h4>
                      {topic.resources.map((resource, resourceIdx) => (
                        (() => {
                          const resourceState = resourceDoneState[resourceUiKey('topic', topicIdx, resource, resourceIdx)] || {
                            done: false,
                            isOpen: true,
                          };
                          return (
                        <div
                          key={`topic-${topic._client_id || topicIdx}-resource-${resource._client_id || resource._id || resourceIdx}`}
                          className={`cm-item ${resourceState.done ? 'is-done' : ''}`}
                        >
                          <div className="cm-item-head">
                            <span>Resource {resourceIdx + 1}</span>
                            <div className="cm-item-head-actions">
                              {resourceState.done && (
                                <span className="cm-resource-done-badge">
                                  <Check size={12} />
                                  Done
                                </span>
                              )}
                              <button
                                type="button"
                                className="btn btn-secondary cm-resource-done-btn"
                                onClick={() => markResourceDone('topic', topicIdx, resource, resourceIdx)}
                              >
                                <Check size={13} />
                                Done
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost cm-resource-toggle-btn"
                                aria-expanded={resourceState.isOpen}
                                onClick={() => toggleResourceOpen('topic', topicIdx, resource, resourceIdx)}
                              >
                                <ChevronDown className={resourceState.isOpen ? 'is-open' : ''} size={15} />
                              </button>
                              <button type="button" className="cm-link-btn" onClick={() => removeTopicResource(topicIdx, resourceIdx)}>
                                <Trash2 size={14} />
                                Remove
                              </button>
                            </div>
                          </div>
                          <div className={`cm-resource-content-wrap ${resourceState.isOpen ? 'is-open' : ''}`}>
                            <div className="cm-resource-content">
                          <div className="cm-grid">
                            <div>
                              <label className="label">RESOURCE NAME</label>
                              <input
                                className="input"
                                value={resource.name}
                                onChange={(e) => setTopicResourceAt(topicIdx, resourceIdx, { name: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="label">UPLOAD FILE</label>
                              <input
                                key={`topic-resource-file-${resourceInputKeySeed}-${topic._client_id || topicIdx}-${resource._client_id || resourceIdx}`}
                                className="input"
                                type="file"
                                accept=".pdf,.ppt,.pptx,.xls,.xlsx,.zip,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,application/x-zip-compressed"
                                onChange={(e) =>
                                  uploadResourceFile(e.target.files?.[0], {
                                    scope: 'topic',
                                    topicIdx,
                                    resourceIdx,
                                  })
                                }
                                disabled={!canUploadResources}
                              />
                            </div>
                            <div className="cm-full cm-upload-meta">
                              {resourceUploadState.target &&
                                matchesResourceUploadTarget(resourceUploadState.target, 'topic', topicIdx, resourceIdx) &&
                                resourceUploadState.pct > 0 &&
                                resourceUploadState.pct < 100 && (
                                  <div className="cm-upload-progress" style={{ marginBottom: '0.35rem' }}>
                                    Uploading… {resourceUploadState.pct}%
                                  </div>
                                )}
                              {resource.url ? (
                                <span>
                                  <Archive size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} aria-hidden />
                                  <strong>{resource.name || resource.url.split('/').pop()}</strong>
                                  {Number(resource.size_bytes) > 0 ? (
                                    <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{formatFileSize(resource.size_bytes)}</span>
                                  ) : null}
                                </span>
                              ) : (
                                <span>No file uploaded yet</span>
                              )}
                            </div>
                          </div>
                            </div>
                          </div>
                        </div>
                          );
                        })()
                      ))}
                    </div>
                  )}

                  <div className="cm-topic-actions" role="group" aria-label={`Topic ${topicIdx + 1} content actions`}>
                    {canManageLessons && (
                      <>
                        <button type="button" className="btn btn-secondary cm-curriculum-btn" onClick={() => addTopicLesson(topicIdx)}>
                          <Plus size={15} />
                          Add Lesson
                        </button>
                        <button type="button" className="btn btn-secondary cm-curriculum-btn" onClick={() => addTopicAssignment(topicIdx)}>
                          <Plus size={15} />
                          Add Assignment
                        </button>
                        <button type="button" className="btn btn-secondary cm-curriculum-btn" onClick={() => addTopicQuiz(topicIdx)}>
                          <Plus size={15} />
                          Add Quiz
                        </button>
                        <button type="button" className="btn btn-secondary cm-curriculum-btn" onClick={() => addTopicResource(topicIdx)}>
                          <Archive size={15} aria-hidden />
                          Add resource
                        </button>
                      </>
                    )}
                  </div>
                    </div>
                  </div>
                </div>
                );
              })}
              <div className="cm-curriculum-actions" role="group" aria-label="Topic actions">
                {canManageLessons && (
                  <button type="button" className="btn btn-secondary cm-curriculum-btn" onClick={addTopic}>
                    <Plus size={15} />
                    Add Topic
                  </button>
                )}
              </div>
            </section>
          </div>

          <aside className="cm-side">
            <section className="card cm-section">
              <div className="cm-section-title">Publish</div>
              <button type="submit" className="btn btn-primary cm-action-btn" disabled={!canPublishCourse}>
                {editingId ? 'Update course' : 'Save course'}
              </button>
              <button type="button" className="btn btn-secondary cm-action-btn" onClick={cancelEditor}>
                Cancel
              </button>
            </section>

            <section className="card cm-section">
              <div className="cm-section-title">
                <DollarSign size={18} />
                Pricing
              </div>
              <div className="cm-grid">
                <div>
                  <label className="label">Regular price</label>
                  <input className="input" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Sale price</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.sale_price}
                    onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="label">
                    <Clock3 size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    Duration (hours)
                  </label>
                  <input className="input" type="number" step="0.1" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} required />
                </div>
              </div>
            </section>

            <section className="card cm-section">
              <div className="cm-section-title">
                <ImageIcon size={18} />
                Media & instructor
              </div>
              <div className="cm-grid one-col">
                <div>
                  <label className="label">Category</label>
                  <select
                    className="input"
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  >
                    <option value="">General</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Difficulty level</label>
                  <select
                    className="input"
                    value={form.difficulty_level}
                    onChange={(e) => setForm({ ...form, difficulty_level: e.target.value })}
                  >
                    {difficultyOptions.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
                {canAssignTeacher && (
                  <div>
                    <label className="label">Instructor</label>
                    <select className="input" value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} required>
                      {teachers.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name} ({t.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="label">Thumbnail image</label>
                  <input
                    key={thumbnailInputKey}
                    className="input"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={(e) => uploadThumbnailFile(e.target.files?.[0])}
                    disabled={thumbnailUploading || !canUploadResources}
                  />
                  <small className="cm-side-note" style={{ display: 'block', marginTop: '0.35rem' }}>
                    JPG, PNG, WEBP · Max 5MB
                  </small>
                  {thumbnailUploading && (
                    <small className="cm-side-note" style={{ display: 'block', marginTop: '0.15rem' }}>
                      Uploading image...
                    </small>
                  )}
                  {form.thumbnail && (
                    <div style={{ marginTop: '0.55rem' }}>
                      <img
                        src={form.thumbnail}
                        alt="Uploaded thumbnail"
                        style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="label">
                    <Video size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    Intro video URL
                  </label>
                  <input
                    className="input"
                    value={form.video_url}
                    onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/… (include ?h= for private Vimeo)"
                  />
                  <p className="cm-side-note" style={{ marginTop: '0.45rem' }}>
                    Vimeo: allow your LMS domain under the video&apos;s <strong>Privacy</strong> → where it can be embedded. Private links need the full share URL including <code style={{ fontSize: '0.85em' }}>?h=…</code>.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </form>
      )}

      <div className="cm-list-toolbar">
        <input
          className="input"
          placeholder="Search courses by title..."
          value={courseSearch}
          onChange={(e) => setCourseSearch(e.target.value)}
        />
        <select className="input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="table-wrap card cm-list-wrap" style={{ marginTop: '0.85rem', padding: 0, overflow: 'auto' }}>
        <table className="data-table cm-course-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Category</th>
              <th>Price</th>
              {!isTeacher && <th>Instructor</th>}
              <th>Created</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredCourses.map((c) => (
              <tr key={c._id}>
                <td>
                  <div className="cm-course-cell">
                    <img
                      src={resolveMediaUrl(c.thumbnail) || '/placeholder-course.svg'}
                      alt={c.title}
                      className="cm-course-thumb"
                    />
                    <div>
                      <Link to={`/courses/${c._id}`} className="cm-course-title">
                        {c.title}
                      </Link>
                      <div className="cm-course-meta">
                        <span>Topic: 1</span>
                        <span>Lesson: {c.lessons?.length || 0}</span>
                        <span>Quiz: {c.quizzes?.length || 0}</span>
                        <span>Assignment: {c.assignments?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td>{c.category_id?.name || 'General'}</td>
                <td>
                  <div className="cm-price-cell">
                    {Number(c.sale_price || 0) > 0 && Number(c.sale_price) < Number(c.price) ? (
                      <>
                        <span>${Number(c.sale_price).toFixed(2)}</span>
                        <small>${Number(c.price).toFixed(2)}</small>
                      </>
                    ) : (
                      <span>${Number(c.price).toFixed(2)}</span>
                    )}
                    {isTeacher && (
                      <small className="cm-earn-hint">
                        You earn {instructorPercentage}% (~$
                        {(
                          (Number(
                            Number(c.sale_price || 0) > 0 && Number(c.sale_price) < Number(c.price)
                              ? c.sale_price
                              : c.price
                          ) *
                            instructorPercentage) /
                          100
                        ).toFixed(2)}
                        )
                      </small>
                    )}
                  </div>
                </td>
                {!isTeacher && (
                  <td>
                    <div className="cm-instructor-cell">
                      <span className="cm-avatar">
                        {(c.teacher_id?.name || 'U')
                          .split(' ')
                          .slice(0, 2)
                          .map((x) => x[0])
                          .join('')
                          .toUpperCase()}
                      </span>
                      <span>{c.teacher_id?.name || '—'}</span>
                    </div>
                  </td>
                )}
                <td>{new Date(c.createdAt || Date.now()).toLocaleDateString()}</td>
                <td>
                  <span className={`cm-status ${(c.lessons?.length || 0) > 0 ? 'published' : 'draft'}`}>
                    {(c.lessons?.length || 0) > 0 ? 'Publish' : 'Draft'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    {canEditCourse && (
                      <button type="button" className="btn btn-ghost" onClick={() => startEdit(c)}>
                        Edit
                      </button>
                    )}
                    {canDelete && (
                      <button type="button" className="btn btn-ghost" onClick={() => remove(c._id)}>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredCourses.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: 'var(--muted)' }}>
                  No courses found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .cm-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .cm-subtitle {
          margin: 0.35rem 0 0;
          color: var(--muted);
        }
        .cm-add-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }
        .cm-builder {
          margin-top: 1.2rem;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 1rem;
          align-items: start;
        }
        .cm-main,
        .cm-side {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .cm-section {
          padding: 1rem;
        }
        .cm-section-title {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-weight: 700;
          margin-bottom: 0.8rem;
        }
        .cm-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.85rem;
        }
        .cm-grid.one-col {
          grid-template-columns: 1fr;
        }
        .cm-full {
          grid-column: 1 / -1;
        }
        .cm-item {
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 0.8rem;
          margin-bottom: 0.75rem;
          background: var(--bg-elevated);
        }
        .cm-item-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.6rem;
          font-weight: 600;
          color: #334155;
        }
        .cm-item.is-done {
          border-color: rgba(22, 163, 74, 0.34);
          background: color-mix(in srgb, #16a34a 5%, #ffffff);
        }
        .cm-item-head-actions {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .cm-resource-done-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
          padding: 0.12rem 0.42rem;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 700;
          color: #15803d;
          background: rgba(22, 163, 74, 0.14);
          border: 1px solid rgba(22, 163, 74, 0.26);
        }
        .cm-resource-done-btn {
          min-height: 30px;
          padding: 0.28rem 0.56rem;
          font-size: 0.76rem;
          border-radius: 9px;
        }
        .cm-resource-toggle-btn {
          min-height: 30px;
          min-width: 30px;
          padding: 0;
          justify-content: center;
        }
        .cm-resource-toggle-btn svg {
          transition: transform 0.2s ease;
        }
        .cm-resource-toggle-btn svg.is-open {
          transform: rotate(180deg);
        }
        .cm-resource-content-wrap {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.24s ease;
        }
        .cm-resource-content-wrap.is-open {
          grid-template-rows: 1fr;
        }
        .cm-resource-content {
          min-height: 0;
          overflow: hidden;
          opacity: 0;
          transform: translateY(-4px);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .cm-resource-content-wrap.is-open .cm-resource-content {
          opacity: 1;
          transform: translateY(0);
        }
        .cm-link-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.28rem;
          border: none;
          background: transparent;
          color: #dc2626;
          cursor: pointer;
          font-size: 0.83rem;
          font-weight: 600;
        }
        .cm-question-wrap {
          margin-top: 0.75rem;
        }
        .cm-curriculum-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.48rem;
          margin-top: 0.6rem;
        }
        .cm-topic-card {
          margin-top: 0.8rem;
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 0.75rem;
          background: var(--bg-elevated);
          box-shadow: var(--shadow-sm);
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        }
        .cm-topic-card.is-open {
          border-color: color-mix(in srgb, var(--primary) 38%, var(--border));
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
        }
        .cm-topic-card.is-done {
          background: color-mix(in srgb, #16a34a 5%, #ffffff);
        }
        .cm-topic-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }
        .cm-topic-head-left {
          min-width: 0;
          display: inline-flex;
          flex-direction: column;
          gap: 0.08rem;
        }
        .cm-topic-head-left strong {
          color: #0f172a;
          font-size: 0.9rem;
          line-height: 1.2;
        }
        .cm-topic-head-left small {
          color: var(--muted);
          font-size: 0.74rem;
        }
        .cm-topic-head-right {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .cm-topic-done-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.22rem;
          padding: 0.2rem 0.5rem;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #15803d;
          background: rgba(22, 163, 74, 0.12);
          border: 1px solid rgba(22, 163, 74, 0.25);
        }
        .cm-topic-head-btn,
        .cm-topic-toggle-btn {
          min-height: 32px;
          padding: 0.36rem 0.62rem;
          font-size: 0.78rem;
        }
        .cm-topic-toggle-btn {
          min-width: 32px;
          padding: 0;
          justify-content: center;
        }
        .cm-topic-toggle-btn svg {
          transition: transform 0.2s ease;
        }
        .cm-topic-toggle-btn svg.is-open {
          transform: rotate(180deg);
        }
        .cm-topic-content-wrap {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.26s ease, opacity 0.22s ease;
        }
        .cm-topic-content-wrap.is-open {
          grid-template-rows: 1fr;
        }
        .cm-topic-content {
          min-height: 0;
          overflow: hidden;
          opacity: 0;
          transform: translateY(-4px);
          transition: opacity 0.2s ease, transform 0.2s ease;
          padding-top: 0;
        }
        .cm-topic-content-wrap.is-open .cm-topic-content {
          opacity: 1;
          transform: translateY(0);
          padding-top: 0.65rem;
        }
        .cm-topic-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.48rem;
          margin-top: 0.7rem;
        }
        .cm-topic-block {
          margin-top: 0.8rem;
        }
        .cm-topic-block h4 {
          margin: 0 0 0.55rem;
          color: #334155;
          font-size: 0.92rem;
        }
        .cm-curriculum-btn {
          min-height: 34px;
          padding: 0.38rem 0.7rem;
          border-radius: 10px;
          font-size: 0.8rem;
          justify-content: center;
          font-weight: 600;
          width: auto;
          transition: transform 0.18s ease, background-color 0.18s ease, border-color 0.18s ease;
        }
        .cm-curriculum-btn svg {
          width: 14px;
          height: 14px;
        }
        .cm-curriculum-btn:hover {
          transform: translateY(-1px);
          border-color: color-mix(in srgb, var(--primary) 45%, var(--border));
          background: color-mix(in srgb, var(--primary) 8%, #ffffff);
        }
        .cm-question-item {
          padding: 0.75rem;
          border: 1px dashed var(--border);
          border-radius: 10px;
          margin-bottom: 0.7rem;
        }
        .cm-lesson-pop-wrap {
          margin-top: 0.7rem;
          border-top: 1px dashed var(--border);
          padding-top: 0.65rem;
          display: grid;
          gap: 0.55rem;
        }
        .cm-lesson-pop-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.6rem;
          flex-wrap: wrap;
        }
        .cm-lesson-pop-head strong {
          font-size: 0.82rem;
          color: #334155;
        }
        .cm-lesson-pop-item {
          margin-bottom: 0;
          background: #fff;
        }
        .cm-upload-meta {
          color: var(--muted);
          font-size: 0.88rem;
          margin-top: -0.15rem;
        }
        .cm-inline-check {
          display: flex;
          align-items: flex-end;
        }
        .cm-check {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          color: #334155;
        }
        .cm-check input[type='checkbox'] {
          accent-color: var(--primary);
        }
        .cm-side-note {
          margin: 0 0 0.8rem;
          color: var(--muted);
          font-size: 0.9rem;
        }
        .cm-action-btn {
          width: 100%;
          justify-content: center;
          margin-bottom: 0.55rem;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.95rem;
        }
        .data-table th,
        .data-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border);
          text-align: left;
        }
        .data-table th {
          color: var(--muted);
          font-weight: 500;
        }
        .cm-list-wrap {
          border-radius: 14px;
          overflow: hidden;
        }
        .cm-list-toolbar {
          margin-top: 1.25rem;
          display: grid;
          grid-template-columns: minmax(240px, 1fr) minmax(220px, 280px);
          gap: 0.65rem;
          align-items: center;
        }
        .cm-course-table tbody tr:hover {
          background: rgba(15, 23, 42, 0.025);
        }
        .cm-course-cell {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          min-width: 280px;
        }
        .cm-course-thumb {
          width: 56px;
          height: 40px;
          border-radius: 8px;
          object-fit: cover;
          border: 1px solid var(--border);
          flex-shrink: 0;
          background: #fff;
        }
        .cm-course-title {
          font-weight: 600;
          color: #0f172a;
          text-decoration: none;
        }
        .cm-course-meta {
          margin-top: 0.25rem;
          display: flex;
          gap: 0.55rem;
          flex-wrap: wrap;
          color: var(--muted);
          font-size: 0.79rem;
        }
        .cm-price-cell {
          display: flex;
          flex-direction: column;
          gap: 0.12rem;
        }
        .cm-price-cell span {
          font-weight: 600;
        }
        .cm-price-cell small {
          color: var(--muted);
          text-decoration: line-through;
        }
        .cm-earn-hint {
          color: #1d4ed8;
          text-decoration: none !important;
          font-weight: 600;
        }
        .cm-instructor-cell {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-weight: 500;
        }
        .cm-avatar {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          background: #2563eb;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 700;
          flex-shrink: 0;
        }
        .cm-status {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 0.28rem 0.65rem;
          font-size: 0.8rem;
          font-weight: 700;
          border: 1px solid transparent;
        }
        .cm-status.published {
          color: #15803d;
          background: rgba(34, 197, 94, 0.12);
          border-color: rgba(34, 197, 94, 0.3);
        }
        .cm-status.draft {
          color: #475569;
          background: rgba(148, 163, 184, 0.2);
          border-color: rgba(100, 116, 139, 0.25);
        }
        @media (max-width: 980px) {
          .cm-builder {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 700px) {
          .cm-grid {
            grid-template-columns: 1fr;
          }
          .cm-curriculum-actions {
            justify-content: flex-start;
          }
          .cm-topic-actions {
            justify-content: flex-start;
          }
          .cm-topic-head {
            flex-direction: column;
            align-items: flex-start;
          }
          .cm-topic-head-right {
            width: 100%;
            justify-content: flex-start;
          }
          .cm-list-toolbar {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
