import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { toEmbedSrc } from '../utils/embed';
import { ArrowLeft, ArrowRight, Award, CheckCircle2, ChevronRight, Download, FileArchive, FileText, Loader2, Megaphone, MessageSquareText, PlayCircle, Star, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './WatchCourse.css';

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

export function WatchCourse() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(true);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResults, setQuizResults] = useState({});
  const [expandedTopics, setExpandedTopics] = useState({});
  const [contentBarOpen, setContentBarOpen] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(true);
  const [topicExtrasOpen, setTopicExtrasOpen] = useState({});
  const [activeInVideoQuiz, setActiveInVideoQuiz] = useState(null);
  const [inVideoQuizSelection, setInVideoQuizSelection] = useState(null);
  const [inVideoQuizFeedback, setInVideoQuizFeedback] = useState(null);
  const [currentPlaybackSeconds, setCurrentPlaybackSeconds] = useState(0);
  const [discussions, setDiscussions] = useState([]);
  const [discussionLoading, setDiscussionLoading] = useState(false);
  const [threadTitle, setThreadTitle] = useState('');
  const [threadQuestion, setThreadQuestion] = useState('');
  const [replyDraft, setReplyDraft] = useState({});
  const [courseAnnouncements, setCourseAnnouncements] = useState([]);
  const [announcementDraft, setAnnouncementDraft] = useState({ title: '', message: '', priority: 'normal' });
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false);
  const [resourceDownloadingId, setResourceDownloadingId] = useState(null);
  const lessonItemRefs = useRef({});
  const playerIframeRef = useRef(null);
  const autoAdvancedLessonRef = useRef('');
  const seenQuizRef = useRef({});
  const previousPlaybackSecondsRef = useRef(0);

  useEffect(() => {
    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    document.body.style.background = '#eef2f7';
    document.body.style.color = '#1e293b';
    return () => {
      document.body.style.background = prevBg;
      document.body.style.color = prevColor;
    };
  }, []);

  useEffect(() => {
    async function loadCourse() {
      try {
        const { data } = await api.get(`/courses/${courseId}`);
        const isPaidCourse = String(data.pricing_type || '').toLowerCase() === 'paid' || Number(data.price || 0) > 0;
        if (isPaidCourse && user?.role === 'student') {
          let approvedEnrollment = false;
          try {
            const enrollmentRes = await api.get(`/enrollments/course/${courseId}/mine`);
            approvedEnrollment = enrollmentRes.data?.status === 'approved';
          } catch {
            approvedEnrollment = false;
          }
          if (!approvedEnrollment) {
            toast.error('This is a paid course. Please purchase to access full content.');
            navigate(`/courses/${courseId}`, { replace: true });
            return;
          }
        }
        setCourse(data);
        const topicLessons =
          Array.isArray(data.course_topics) && data.course_topics.length > 0
            ? data.course_topics.flatMap((topic) =>
                Array.isArray(topic?.lessons) ? [...topic.lessons].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : []
              )
            : [];
        const ls =
          topicLessons.length > 0
            ? topicLessons
            : data.lessons?.length
              ? [...data.lessons].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              : data.video_url
                ? [{ _id: 'single', title: 'Lesson', video_url: data.video_url }]
                : [];
        if (ls[0]) setActiveLesson(ls[0]);
      } catch {
        toast.error('Could not load course');
      } finally {
        setLoading(false);
      }
    }
    loadCourse();
  }, [courseId, navigate, user?.role]);

  useEffect(() => {
    if (!courseId || !OBJECT_ID_RE.test(String(courseId))) return;
    api
      .get(`/progress/course/${courseId}`)
      .then((res) => setProgress(res.data))
      .catch(() => {});
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    setDiscussionLoading(true);
    Promise.all([api.get(`/discussions/course/${courseId}`), api.get(`/discussions/course/${courseId}/announcements`)])
      .then(([discussionRes, announcementRes]) => {
        if (cancelled) return;
        setDiscussions(Array.isArray(discussionRes.data) ? discussionRes.data : []);
        setCourseAnnouncements(Array.isArray(announcementRes.data) ? announcementRes.data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setDiscussions([]);
        setCourseAnnouncements([]);
      })
      .finally(() => {
        if (!cancelled) setDiscussionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const currentSrc = activeLesson ? toEmbedSrc(activeLesson.video_url) : '';
  const topicSections = useMemo(() => {
    if (!course) return [];
    if (Array.isArray(course.course_topics) && course.course_topics.length > 0) {
      return course.course_topics.map((topic, idx) => {
        const topicLessons = Array.isArray(topic?.lessons)
          ? [...topic.lessons].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          : [];
        return {
          id: String(topic?._id || `topic-${idx}`),
          title: String(topic?.title || `Chapter ${idx + 1}`),
          lessons: topicLessons,
          quizzes: Array.isArray(topic?.quizzes) ? topic.quizzes : [],
          in_video_quizzes: Array.isArray(topic?.in_video_quizzes) ? topic.in_video_quizzes : [],
          assignments: Array.isArray(topic?.assignments) ? topic.assignments : [],
          resources: Array.isArray(topic?.resources) ? topic.resources : [],
        };
      });
    }

    const quizzes = Array.isArray(course.quizzes) ? course.quizzes : [];
    const assignments = Array.isArray(course.assignments) ? course.assignments : [];
    const fallbackLessons =
      course.lessons?.length > 0
        ? [...course.lessons].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        : course.video_url
          ? [{ _id: 'single', title: 'Lesson', video_url: course.video_url, order: 0 }]
          : [];
    const fallbackResources = [
      ...(Array.isArray(course.all_resources) ? course.all_resources : []),
      ...(Array.isArray(course.topic_resources) ? course.topic_resources.flatMap((row) => row?.resources || []) : []),
    ];
    return [
      {
        id: 'topic-fallback',
        title: 'Chapter 1',
        lessons: fallbackLessons,
        quizzes,
        in_video_quizzes: [],
        assignments,
        resources: fallbackResources,
      },
    ];
  }, [course]);

  const lessons = useMemo(() => topicSections.flatMap((topic) => topic.lessons || []), [topicSections]);
  const lessonTopicMap = useMemo(() => {
    const map = {};
    topicSections.forEach((topic) => {
      (topic.lessons || []).forEach((lesson) => {
        map[String(lesson?._id)] = topic.id;
      });
    });
    return map;
  }, [topicSections]);
  const activeLessonTopicId = activeLesson?._id != null ? lessonTopicMap[String(activeLesson._id)] ?? null : null;
  const inVideoQuizzes = useMemo(() => {
    const rows = [];
    topicSections.forEach((topic) => {
      (topic.in_video_quizzes || []).forEach((quiz) => {
        rows.push({
          ...quiz,
          topic_id: topic.id,
        });
      });
    });
    return rows;
  }, [topicSections]);
  const activeLessonIndex = useMemo(() => lessons.findIndex((lesson) => String(lesson._id) === String(activeLesson?._id)), [lessons, activeLesson]);

  useEffect(() => {
    if (topicSections.length === 0) return;
    setExpandedTopics((prev) => {
      const next = {};
      topicSections.forEach((topic, idx) => {
        next[topic.id] = prev[topic.id] ?? idx === 0;
      });
      return next;
    });
  }, [topicSections]);

  useEffect(() => {
    if (!lessons.length) return;
    const exists = lessons.some((lesson) => String(lesson._id) === String(activeLesson?._id));
    if (!exists) setActiveLesson(lessons[0]);
  }, [lessons, activeLesson]);

  useEffect(() => {
    if (!topicSections.length) return;
    setTopicExtrasOpen((prev) => {
      const next = { ...prev };
      topicSections.forEach((topic) => {
        ['quiz', 'assignment', 'resource'].forEach((sectionKey) => {
          const key = `${topic.id}:${sectionKey}`;
          if (!(key in next)) next[key] = true;
        });
      });
      return next;
    });
  }, [topicSections]);

  function questionTypeOf(question) {
    return String(question?.question_type || 'circle_right_answer');
  }

  function questionKey(quizScope, questionIdx) {
    return `q-${quizScope}-${questionIdx}`;
  }

  function normalizeTextAnswer(value) {
    return String(value || '').trim().toLowerCase();
  }

  function quizKey(quizScope) {
    return `quiz-${quizScope}`;
  }

  function clearQuizResult(quizScope) {
    const key = quizKey(quizScope);
    setQuizResults((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function selectOption(quizScope, questionIdx, optionIdx) {
    const key = questionKey(quizScope, questionIdx);
    clearQuizResult(quizScope);
    setQuizAnswers((prev) => ({ ...prev, [key]: optionIdx }));
  }

  function setTextAnswer(quizScope, questionIdx, value) {
    const key = questionKey(quizScope, questionIdx);
    clearQuizResult(quizScope);
    setQuizAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function submitQuiz(quizScope, quiz) {
    const questions = Array.isArray(quiz?.questions) ? quiz.questions : [];
    const detail = {};
    let correctCount = 0;

    questions.forEach((question, questionIdx) => {
      const key = questionKey(quizScope, questionIdx);
      const type = questionTypeOf(question);
      const selected = quizAnswers[key];

      let isCorrect = false;
      if (type === 'circle_right_answer' || type === 'true_false') {
        const correctIndex = Number(question?.answer_index ?? 0);
        isCorrect = Number(selected) === correctIndex;
      } else {
        const expected = normalizeTextAnswer(question?.answer_text);
        const given = normalizeTextAnswer(selected);
        isCorrect = Boolean(expected) && expected === given;
      }

      if (isCorrect) correctCount += 1;
      detail[key] = { correct: isCorrect };
    });

    const total = questions.length;
    const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    setQuizResults((prev) => ({
      ...prev,
      [quizKey(quizScope)]: {
        submitted: true,
        correctCount,
        total,
        scorePercent,
        detail,
      },
    }));
  }

  function toggleTopic(topicId) {
    setExpandedTopics((prev) => ({ ...prev, [topicId]: !prev[topicId] }));
  }

  function toggleTopicExtra(topicId, sectionKey) {
    const key = `${topicId}:${sectionKey}`;
    setTopicExtrasOpen((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  }

  async function markLessonDone(lessonId, complete) {
    try {
      const body =
        lessonId === 'single'
          ? { complete: complete !== false }
          : { lesson_id: lessonId, complete: complete === false ? false : true };
      const { data } = await api.put(`/progress/course/${courseId}`, body);
      setProgress(data);
      if (complete !== false && String(lessonId) === String(activeLesson?._id)) {
        const nextLesson = lessons[activeLessonIndex + 1];
        if (nextLesson) {
          setActiveLesson(nextLesson);
          toast.success('Lesson marked complete. Moved to next lesson.');
        }
      }
      if (data.progress_percentage >= 100) {
        toast.success('Course completed — certificate available');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not update progress');
    }
  }

  async function submitReview(e) {
    e.preventDefault();
    try {
      await api.post('/reviews', { course_id: courseId, rating, comment: reviewText });
      toast.success('Review saved');
      setReviewText('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save review');
    }
  }

  async function createThread(e) {
    e.preventDefault();
    if (!threadTitle.trim() || !threadQuestion.trim()) return;
    try {
      const { data } = await api.post(`/discussions/course/${courseId}`, {
        title: threadTitle,
        question: threadQuestion,
        lesson_id: activeLesson?._id && activeLesson?._id !== 'single' ? activeLesson._id : undefined,
      });
      setDiscussions((prev) => [data, ...prev]);
      setThreadTitle('');
      setThreadQuestion('');
      toast.success('Question posted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not post question');
    }
  }

  async function addReply(threadId) {
    const text = String(replyDraft[threadId] || '').trim();
    if (!text) return;
    try {
      const { data } = await api.post(`/discussions/${threadId}/replies`, { message: text });
      setDiscussions((prev) => prev.map((thread) => (thread._id === threadId ? data : thread)));
      setReplyDraft((prev) => ({ ...prev, [threadId]: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add reply');
    }
  }

  async function toggleResolved(thread) {
    try {
      const { data } = await api.patch(`/discussions/${thread._id}/resolve`, {
        is_resolved: !thread.is_resolved,
      });
      setDiscussions((prev) => prev.map((row) => (row._id === thread._id ? { ...row, is_resolved: data.is_resolved } : row)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update status');
    }
  }

  async function submitCourseAnnouncement(e) {
    e.preventDefault();
    if (!announcementDraft.title.trim() || !announcementDraft.message.trim()) return;
    setAnnouncementSubmitting(true);
    try {
      const { data } = await api.post(`/discussions/course/${courseId}/announcements`, announcementDraft);
      setCourseAnnouncements((prev) => [data, ...prev]);
      setAnnouncementDraft({ title: '', message: '', priority: 'normal' });
      toast.success('Announcement published');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not publish announcement');
    } finally {
      setAnnouncementSubmitting(false);
    }
  }

  async function downloadCert() {
    try {
      const res = await api.get(`/certificates/course/${courseId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${courseId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Certificate downloaded');
    } catch {
      toast.error('Complete the course to download');
    }
  }

  function resourceUsesSecureDownload(resource) {
    const sp = String(resource.storage_path || '');
    const u = String(resource.url || '').trim();
    if (u.startsWith('https://') || u.startsWith('http://')) return true;
    return sp.includes('/uploads/resources/') || u.includes('/uploads/resources/');
  }

  function formatResourceSize(bytes) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return null;
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

  async function downloadResourceFile(resource) {
    const rid = resource?._id;
    if (!course?._id || !rid) {
      toast.error('Resource is not available to download');
      return;
    }
    setResourceDownloadingId(String(rid));
    try {
      if (resourceUsesSecureDownload(resource)) {
        const res = await api.get(`/courses/${course._id}/resources/${rid}/download`, { responseType: 'blob' });
        const disposition = String(res.headers['content-disposition'] || '');
        let filename = resource.name || 'download';
        const star = disposition.match(/filename\*=UTF-8''([^;\s]+)/i);
        if (star?.[1]) {
          try {
            filename = decodeURIComponent(star[1].replace(/['"]/g, ''));
          } catch {
            filename = star[1];
          }
        } else {
          const plain = disposition.match(/filename="?([^";\n]+)"?/i);
          if (plain?.[1]) filename = plain[1];
        }
        const href = URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = href;
        a.download = filename;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
        toast.success('Download started');
      } else if (resource.url) {
        window.open(resource.url, '_blank', 'noopener,noreferrer');
      } else {
        toast.error('No file URL for this resource');
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      if (typeof msg === 'string') toast.error(msg);
      else if (msg && typeof msg === 'object') toast.error(msg.message || 'Download failed');
      else toast.error('Download failed');
    } finally {
      setResourceDownloadingId(null);
    }
  }

  useEffect(() => {
    const key = String(activeLesson?._id || '');
    const node = lessonItemRefs.current[key];
    if (node) {
      node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeLesson]);

  const pct = progress?.progress_percentage ?? 0;
  const currentCompleted =
    activeLesson?._id === 'single'
      ? pct >= 100
      : progress?.completed_lesson_ids?.some((id) => String(id) === String(activeLesson?._id));
  const nextLesson = activeLessonIndex >= 0 ? lessons[activeLessonIndex + 1] : null;
  const isTeacherOfCourse = user?.role === 'teacher' && String(course?.teacher_id?._id || course?.teacher_id || '') === String(user?._id || '');
  const canResolveThread = user?.role === 'admin' || isTeacherOfCourse;

  useEffect(() => {
    autoAdvancedLessonRef.current = '';
    previousPlaybackSecondsRef.current = 0;
    setCurrentPlaybackSeconds(0);
  }, [activeLesson?._id]);

  function tryAutoAdvanceToNext() {
    const lessonId = String(activeLesson?._id || '');
    if (!lessonId || !nextLesson) return;
    if (autoAdvancedLessonRef.current === lessonId) return;
    autoAdvancedLessonRef.current = lessonId;
    markLessonDone(lessonId, true);
  }

  useEffect(() => {
    function parseMessage(data) {
      if (!data) return null;
      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch {
          return null;
        }
      }
      if (typeof data === 'object') return data;
      return null;
    }

    function onPlayerMessage(event) {
      const payload = parseMessage(event.data);
      if (!payload) return;
      const origin = String(event.origin || '');

      const isYouTube = origin.includes('youtube.com') || origin.includes('youtube-nocookie.com');
      const youtubeEnded = isYouTube && payload.event === 'onStateChange' && Number(payload.info) === 0;
      const youtubeCurrentTime = isYouTube ? Number(payload?.info?.currentTime) : NaN;
      if (Number.isFinite(youtubeCurrentTime)) {
        setCurrentPlaybackSeconds(youtubeCurrentTime);
      }

      const isVimeo = origin.includes('vimeo.com');
      const vimeoEnded = isVimeo && payload.event === 'ended';
      const vimeoCurrentTime = isVimeo ? Number(payload?.data?.seconds ?? payload?.seconds) : NaN;
      if (Number.isFinite(vimeoCurrentTime)) {
        setCurrentPlaybackSeconds(vimeoCurrentTime);
      }

      if (youtubeEnded || vimeoEnded) {
        tryAutoAdvanceToNext();
      }
    }

    window.addEventListener('message', onPlayerMessage);
    return () => window.removeEventListener('message', onPlayerMessage);
  }, [activeLesson?._id, nextLesson?._id, lessons.length]);

  function registerPlayerListeners() {
    const iframe = playerIframeRef.current;
    if (!iframe?.contentWindow) return;

    iframe.contentWindow.postMessage(
      JSON.stringify({
        event: 'listening',
        id: 'watch-player',
      }),
      '*'
    );

    // Enable YouTube state-change events so we can detect "ended".
    iframe.contentWindow.postMessage(
      JSON.stringify({
        event: 'command',
        func: 'addEventListener',
        args: ['onStateChange'],
      }),
      '*'
    );
    iframe.contentWindow.postMessage(
      JSON.stringify({
        event: 'command',
        func: 'addEventListener',
        args: ['onPlaybackRateChange'],
      }),
      '*'
    );

    // Vimeo emits events after listener registration.
    iframe.contentWindow.postMessage({ method: 'addEventListener', value: 'ended' }, '*');
    iframe.contentWindow.postMessage({ method: 'addEventListener', value: 'timeupdate' }, '*');
    iframe.contentWindow.postMessage({ method: 'addEventListener', value: 'play' }, '*');
  }

  function pauseActivePlayer() {
    const iframe = playerIframeRef.current;
    if (!iframe?.contentWindow) return;
    const src = String(currentSrc || '').toLowerCase();
    if (src.includes('youtube.com/embed')) {
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'pauseVideo',
          id: 'watch-player',
          args: [],
        }),
        '*'
      );
      return;
    }
    if (src.includes('vimeo.com/video') || src.includes('player.vimeo.com')) {
      iframe.contentWindow.postMessage({ method: 'pause' }, '*');
    }
  }

  function forcePauseActivePlayer() {
    pauseActivePlayer();
    // Some embedded players ignore the first pause command until JS API is fully ready.
    window.setTimeout(pauseActivePlayer, 120);
    window.setTimeout(pauseActivePlayer, 280);
    window.setTimeout(pauseActivePlayer, 520);
    window.setTimeout(pauseActivePlayer, 900);
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      const iframe = playerIframeRef.current;
      if (!iframe?.contentWindow) return;
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'getCurrentTime',
          args: [],
        }),
        '*'
      );
      iframe.contentWindow.postMessage({ method: 'getCurrentTime' }, '*');
    }, 1200);
    return () => window.clearInterval(timer);
  }, [activeLesson?._id]);

  useEffect(() => {
    if (!Array.isArray(progress?.in_video_quiz_attempts)) return;
    const map = {};
    progress.in_video_quiz_attempts.forEach((attempt) => {
      if (!attempt?.quiz_id) return;
      map[String(attempt.quiz_id)] = {
        status: String(attempt.status || ''),
        can_repeat: Boolean(attempt.can_repeat),
        next_retry_at: attempt.next_retry_at || null,
      };
    });
    seenQuizRef.current = map;
  }, [progress?.in_video_quiz_attempts]);

  useEffect(() => {
    if (!activeLesson?._id) return;
    if (activeInVideoQuiz) return;
    if (!activeLessonTopicId) return;
    const now = Number(currentPlaybackSeconds || 0);
    if (!Number.isFinite(now) || now < 0) return;

    const previousSeconds = Number(previousPlaybackSecondsRef.current || 0);
    const candidate = inVideoQuizzes.find((quiz) => {
      const quizId = String(quiz?._id || '');
      if (!quizId) return false;
      if (String(quiz.topic_id) !== String(activeLessonTopicId)) return false;
      if (quiz.lesson_id && String(quiz.lesson_id) !== String(activeLesson._id)) return false;
      if (
        !quiz.lesson_id &&
        Number.isFinite(Number(quiz.lesson_order)) &&
        Number(quiz.lesson_order) !== Number(activeLesson.order ?? 0)
      ) {
        return false;
      }
      const prior = seenQuizRef.current[quizId];
      const retryTime = prior?.next_retry_at ? new Date(prior.next_retry_at).getTime() : 0;
      const retryReady = !retryTime || Date.now() >= retryTime;
      if (prior && prior.can_repeat && !retryReady) return false;
      if (prior && !prior.can_repeat) return false;
      const ts = Number(quiz.timestamp_seconds || 0);
      if (!Number.isFinite(ts)) return false;
      if (now >= ts && now <= ts + 3) return true;
      return previousSeconds < ts && now > ts;
    });

    if (candidate) {
      const quizId = String(candidate._id);
      seenQuizRef.current[quizId] = seenQuizRef.current[quizId] || { status: 'shown' };
      forcePauseActivePlayer();
      setActiveInVideoQuiz(candidate);
      setInVideoQuizSelection(null);
      setInVideoQuizFeedback(null);
    }
    previousPlaybackSecondsRef.current = now;
  }, [currentPlaybackSeconds, inVideoQuizzes, activeLesson?._id, activeLessonTopicId, activeInVideoQuiz]);

  useEffect(() => {
    if (!activeInVideoQuiz) return;
    forcePauseActivePlayer();
  }, [activeInVideoQuiz]);

  async function submitInVideoQuizAttempt(quiz, status, selectedOptionIndex, isCorrect) {
    try {
      const { data } = await api.post(`/progress/course/${courseId}/in-video-quiz`, {
        quiz_id: quiz._id,
        status,
        selected_option_index: selectedOptionIndex,
        is_correct: isCorrect,
      });
      setProgress(data);
    } catch {
      // Keep the learning flow uninterrupted if attempt save fails.
    }
  }

  async function onSkipInVideoQuiz() {
    if (!activeInVideoQuiz) return;
    await submitInVideoQuizAttempt(activeInVideoQuiz, 'skipped', null, null);
    const quizId = String(activeInVideoQuiz._id);
    seenQuizRef.current[quizId] = {
      status: 'skipped',
      can_repeat: false,
    };
    setActiveInVideoQuiz(null);
    setInVideoQuizSelection(null);
    setInVideoQuizFeedback(null);
  }

  async function onSubmitInVideoQuiz() {
    if (!activeInVideoQuiz) return;
    const options = Array.isArray(activeInVideoQuiz.options) ? activeInVideoQuiz.options : [];
    if (!options.length) return;
    if (!Number.isFinite(Number(inVideoQuizSelection))) {
      toast.error('Please select an option');
      return;
    }
    const selectedIdx = Number(inVideoQuizSelection);
    const correctIdx = Number(activeInVideoQuiz.correct_answer_index || 0);
    const isCorrect = selectedIdx === correctIdx;
    setInVideoQuizFeedback({
      isCorrect,
      message: isCorrect ? 'Correct answer.' : 'Incorrect answer.',
      explanation: String(activeInVideoQuiz.explanation || ''),
    });
    await submitInVideoQuizAttempt(activeInVideoQuiz, isCorrect ? 'correct' : 'incorrect', selectedIdx, isCorrect);
    seenQuizRef.current[String(activeInVideoQuiz._id)] = {
      status: isCorrect ? 'correct' : 'incorrect',
      can_repeat: false,
    };
  }

  function closeInVideoQuiz() {
    setActiveInVideoQuiz(null);
    setInVideoQuizSelection(null);
    setInVideoQuizFeedback(null);
  }

  if (loading || !course) {
    return (
      <div className="page-shell">
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="watch-shell">
      <div className="watch-inner">
        <Link to="/student/courses" className="watch-back">
          <ArrowLeft size={17} strokeWidth={2.25} aria-hidden />
          My learning
        </Link>
        <div className="watch-layout-wrap">
        <div className="watch-layout">
          <aside className="watch-side-card">
            <div className="watch-side-top">
              <h3>{course.title}</h3>
              <p>Course content · {pct}% complete</p>
              <button
                type="button"
                className="watch-section-toggle"
                onClick={() => setContentBarOpen((prev) => !prev)}
                aria-expanded={contentBarOpen}
              >
                {contentBarOpen ? 'Hide content' : 'Show content'}
                <ChevronRight size={14} className={contentBarOpen ? 'is-open' : ''} />
              </button>
            </div>
            {contentBarOpen && <div className="watch-topics-list">
              {topicSections.map((topic, topicIdx) => {
                const topicLessonRows = Array.isArray(topic.lessons) ? topic.lessons : [];
                const completedInTopic = topicLessonRows.filter((lesson) =>
                  lesson._id === 'single'
                    ? pct >= 100
                    : progress?.completed_lesson_ids?.some((id) => String(id) === String(lesson._id))
                ).length;
                const topicPct = topicLessonRows.length > 0 ? Math.round((completedInTopic / topicLessonRows.length) * 100) : 0;
                const isOpen = expandedTopics[topic.id] ?? topicIdx === 0;
                const quizSectionOpen = topicExtrasOpen[`${topic.id}:quiz`] ?? true;
                const assignmentSectionOpen = topicExtrasOpen[`${topic.id}:assignment`] ?? true;
                const resourceSectionOpen = topicExtrasOpen[`${topic.id}:resource`] ?? true;

                return (
                  <section key={topic.id} className="watch-topic-card">
                    <button type="button" className={`watch-topic-head ${isOpen ? 'is-open' : ''}`} onClick={() => toggleTopic(topic.id)}>
                      <div>
                        <strong>
                          Chapter {topicIdx + 1}: {topic.title}
                        </strong>
                        <small>{topicPct}% complete</small>
                      </div>
                      <ChevronRight size={16} />
                    </button>
                    {isOpen && (
                      <div className="watch-topic-body">
                        <ul className="watch-lessons">
                          {topicLessonRows.map((l, idx) => {
                            const done =
                              l._id === 'single'
                                ? pct >= 100
                                : progress?.completed_lesson_ids?.some((id) => String(id) === String(l._id));
                            const isActive = String(activeLesson?._id) === String(l._id);
                            return (
                              <li key={String(l._id || `${topic.id}-lesson-${idx}`)}>
                                <button
                                  ref={(node) => {
                                    lessonItemRefs.current[String(l._id)] = node;
                                  }}
                                  type="button"
                                  className={`watch-lesson-btn ${isActive ? 'is-active' : ''}`}
                                  onClick={() => {
                                    setActiveLesson(l);
                                  }}
                                >
                                  <div className="watch-lesson-main">
                                    <span className={`watch-lesson-index ${isActive ? 'is-active' : ''}`}>{idx + 1}</span>
                                    <span className="watch-lesson-label">
                                      <span className="watch-lesson-title">{l.title}</span>
                                      <span className="watch-lesson-meta">Video • {Math.max(6, 8 + idx * 2)}m</span>
                                    </span>
                                  </div>
                                  <div className="watch-lesson-state">
                                    {done ? (
                                      <span className="watch-done" title="Completed">
                                        <CheckCircle2 size={15} />
                                      </span>
                                    ) : isActive ? (
                                      <span className="watch-current">
                                        <PlayCircle size={15} />
                                      </span>
                                    ) : (
                                      <ChevronRight size={15} />
                                    )}
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>

                        {topic.quizzes?.length > 0 && (
                          <div className="watch-topic-quiz-list">
                            <button
                              type="button"
                              className="watch-topic-extra-toggle"
                              onClick={() => toggleTopicExtra(topic.id, 'quiz')}
                              aria-expanded={quizSectionOpen}
                            >
                              <span className="watch-topic-extra-label">Quiz</span>
                              <ChevronRight size={14} className={quizSectionOpen ? 'is-open' : ''} />
                            </button>
                            {quizSectionOpen && topic.quizzes.map((quiz, quizIdx) => {
                              const quizScope = `${topic.id}-quiz-${quizIdx}`;
                              const quizResult = quizResults[quizKey(quizScope)];
                              return (
                                <article key={quiz._id || quizScope} className="watch-quiz-card">
                                  <h4>{quiz.title || `Quiz ${quizIdx + 1}`}</h4>
                                  {quiz.description && <p className="watch-quiz-desc">{quiz.description}</p>}
                                  {quizResult?.submitted && (
                                    <div className="watch-quiz-result">
                                      Score: {quizResult.correctCount}/{quizResult.total} ({quizResult.scorePercent}%)
                                    </div>
                                  )}
                                  <div className="watch-quiz-questions">
                                    {(quiz.questions || []).map((question, questionIdx) => {
                                      const type = questionTypeOf(question);
                                      const key = questionKey(quizScope, questionIdx);
                                      const selected = quizAnswers[key];
                                      const result = quizResult?.detail?.[key];
                                      const options =
                                        type === 'true_false' ? ['True', 'False'] : Array.isArray(question.options) ? question.options : [];
                                      return (
                                        <div
                                          key={question._id || `${key}-item`}
                                          className={`watch-question-card ${result ? (result.correct ? 'is-correct' : 'is-wrong') : ''}`}
                                        >
                                          <div className="watch-question-title">
                                            {questionIdx + 1}. {question.question}
                                          </div>
                                          {(type === 'circle_right_answer' || type === 'true_false') && (
                                            <div className="watch-choice-group" role="radiogroup" aria-label={`Question ${questionIdx + 1} options`}>
                                              {options.map((option, optionIdx) => (
                                                <label
                                                  key={`${key}-opt-${optionIdx}`}
                                                  className={`watch-choice-btn ${selected === optionIdx ? 'is-selected' : ''}`}
                                                >
                                                  <input
                                                    className="watch-choice-radio"
                                                    type="radio"
                                                    name={key}
                                                    checked={selected === optionIdx}
                                                    onChange={() => selectOption(quizScope, questionIdx, optionIdx)}
                                                  />
                                                  <span>{option}</span>
                                                </label>
                                              ))}
                                            </div>
                                          )}
                                          {(type === 'fill_blank' || type === 'short_answer') && (
                                            <div className="watch-answer-input-wrap">
                                              <label className="label">
                                                {type === 'fill_blank' ? 'Your answer' : 'Short answer'}
                                                <input
                                                  className="input"
                                                  value={typeof selected === 'string' ? selected : ''}
                                                  onChange={(e) => setTextAnswer(quizScope, questionIdx, e.target.value)}
                                                  placeholder={type === 'fill_blank' ? 'Fill in the blank' : 'Write your short answer'}
                                                />
                                              </label>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="watch-quiz-actions">
                                    <button type="button" className="watch-quiz-submit" onClick={() => submitQuiz(quizScope, quiz)}>
                                      Start Quiz
                                    </button>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        )}

                        {topic.assignments?.length > 0 && (
                          <div className="watch-topic-assignment-list">
                            <button
                              type="button"
                              className="watch-topic-extra-toggle"
                              onClick={() => toggleTopicExtra(topic.id, 'assignment')}
                              aria-expanded={assignmentSectionOpen}
                            >
                              <span className="watch-topic-extra-label">Assignment</span>
                              <ChevronRight size={14} className={assignmentSectionOpen ? 'is-open' : ''} />
                            </button>
                            {assignmentSectionOpen && topic.assignments.map((assignment, assignmentIdx) => (
                              <article key={assignment._id || `${topic.id}-assignment-${assignmentIdx}`} className="watch-assignment-card">
                                <h4>{assignment.title || `Assignment ${assignmentIdx + 1}`}</h4>
                                {assignment.description && <p className="watch-assignment-desc">{assignment.description}</p>}
                                <div className="watch-assignment-meta">
                                  <span>Points: {Number(assignment.points || 0)}</span>
                                  <span>Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}</span>
                                </div>
                              </article>
                            ))}
                          </div>
                        )}

                        {topic.resources?.length > 0 && (
                          <div className="watch-topic-resource-list">
                            <button
                              type="button"
                              className="watch-topic-extra-toggle"
                              onClick={() => toggleTopicExtra(topic.id, 'resource')}
                              aria-expanded={resourceSectionOpen}
                            >
                              <span className="watch-topic-extra-label">Downloads & resources</span>
                              <ChevronRight size={14} className={resourceSectionOpen ? 'is-open' : ''} />
                            </button>
                            {resourceSectionOpen &&
                              topic.resources.map((resource, resourceIdx) => {
                                const sizeLabel = formatResourceSize(resource.size_bytes);
                                const isZip = String(resource.file_type || '').toLowerCase() === 'zip';
                                const busy = resourceDownloadingId === String(resource._id || '');
                                return (
                                  <div
                                    key={String(resource._id || `${topic.id}-resource-${resourceIdx}`)}
                                    className="watch-resource-row"
                                  >
                                    <div className="watch-resource-row-icon" aria-hidden>
                                      {isZip ? <FileArchive size={18} strokeWidth={2} /> : <FileText size={18} strokeWidth={2} />}
                                    </div>
                                    <div className="watch-resource-row-main">
                                      <div className="watch-resource-name">{resource.name || `Resource ${resourceIdx + 1}`}</div>
                                      <div className="watch-resource-meta">
                                        {sizeLabel ? <span>{sizeLabel}</span> : null}
                                        {sizeLabel && isZip ? <span aria-hidden> · </span> : null}
                                        {isZip ? <span>ZIP archive</span> : <span>File</span>}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      className="btn btn-secondary watch-resource-download"
                                      onClick={() => downloadResourceFile(resource)}
                                      disabled={busy}
                                    >
                                      {busy ? <Loader2 size={16} className="watch-resource-spin" aria-hidden /> : <Download size={16} aria-hidden />}
                                      {busy ? 'Preparing…' : 'Download'}
                                    </button>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>}
          </aside>

          <section className="watch-main-area">
            <div className="embed-wrap">
              {currentSrc ? (
                <iframe
                  ref={playerIframeRef}
                  id="watch-player"
                  title="lesson"
                  src={currentSrc}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  onLoad={registerPlayerListeners}
                />
              ) : (
                <div className="watch-video-empty">This lesson video URL is invalid or unsupported.</div>
              )}
            </div>

            <div className="watch-actions-row">
              <button type="button" className="btn btn-secondary watch-mark-btn" onClick={() => markLessonDone(activeLesson?._id, true)}>
                <CheckCircle2 size={18} strokeWidth={2.2} aria-hidden />
                {currentCompleted ? 'Completed' : 'Mark as Complete'}
              </button>
              <button
                type="button"
                className="btn btn-primary watch-next-btn"
                onClick={() => (nextLesson ? setActiveLesson(nextLesson) : markLessonDone(activeLesson?._id, true))}
              >
                Go to next item
                <ArrowRight size={18} strokeWidth={2.2} aria-hidden />
              </button>
            </div>

            {pct >= 100 && (
              <div className="watch-certificate-row">
                <button type="button" className="btn btn-secondary" onClick={downloadCert}>
                  <Award size={18} strokeWidth={2.2} aria-hidden />
                  Download certificate
                </button>
              </div>
            )}
          </section>
        </div>
        </div>

        {activeInVideoQuiz && (
          <div className="watch-in-video-quiz-overlay" role="dialog" aria-modal="true" aria-label="In-video quiz">
            <div className="watch-in-video-quiz-modal">
              <button type="button" className="watch-in-video-quiz-close" onClick={closeInVideoQuiz} aria-label="Close quiz">
                <X size={16} />
              </button>
              <p className="watch-in-video-quiz-kicker">Question</p>
              <h4>{activeInVideoQuiz.question}</h4>

              <div className="watch-in-video-quiz-options">
                {(activeInVideoQuiz.options || []).map((option, optionIdx) => (
                  <label key={`${activeInVideoQuiz._id}-option-${optionIdx}`} className={`watch-in-video-option ${inVideoQuizSelection === optionIdx ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name={`in-video-quiz-${activeInVideoQuiz._id}`}
                      checked={inVideoQuizSelection === optionIdx}
                      onChange={() => setInVideoQuizSelection(optionIdx)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>

              {inVideoQuizFeedback ? (
                <div className={`watch-in-video-feedback ${inVideoQuizFeedback.isCorrect ? 'is-correct' : 'is-wrong'}`}>
                  <strong>{inVideoQuizFeedback.isCorrect ? 'Correct' : 'Incorrect'}</strong>
                  <p>{inVideoQuizFeedback.message}</p>
                  {inVideoQuizFeedback.explanation && <small>{inVideoQuizFeedback.explanation}</small>}
                </div>
              ) : null}

              <div className="watch-in-video-actions">
                {!inVideoQuizFeedback ? (
                  <>
                    <button type="button" className="btn btn-primary" onClick={onSubmitInVideoQuiz}>
                      Submit
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={onSkipInVideoQuiz}>
                      Skip
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn btn-primary" onClick={closeInVideoQuiz}>
                    Continue
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <section className="watch-review">
          <button
            type="button"
            className="watch-review-head"
            onClick={() => setReviewOpen((prev) => !prev)}
            aria-expanded={reviewOpen}
          >
            <h3>
              <Star size={18} strokeWidth={2.2} aria-hidden />
              Rate this course
            </h3>
            <ChevronRight size={16} className={reviewOpen ? 'is-open' : ''} />
          </button>
          {reviewOpen && <form onSubmit={submitReview} className="watch-review-form">
            <div className="watch-rating-wrap">
              <label className="label">Stars</label>
              <select className="input" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} star{n > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              className="input"
              rows={3}
              placeholder="Your review"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              Submit review
            </button>
          </form>}
        </section>

        <section className="watch-review">
          <button type="button" className="watch-review-head" aria-expanded="true">
            <h3>
              <MessageSquareText size={18} strokeWidth={2.2} aria-hidden />
              Course Q&A
            </h3>
          </button>
          <div className="watch-review-form">
            <form className="watch-inline-form" onSubmit={createThread}>
              <input
                className="input"
                placeholder="Question title"
                value={threadTitle}
                onChange={(e) => setThreadTitle(e.target.value)}
                required
              />
              <textarea
                className="input"
                rows={2}
                placeholder="Ask your question here..."
                value={threadQuestion}
                onChange={(e) => setThreadQuestion(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary">
                Post Question
              </button>
            </form>
            {discussionLoading ? <p style={{ color: 'var(--muted)' }}>Loading Q&A...</p> : null}
            {discussions.map((thread) => (
              <article key={thread._id} className="watch-discussion-item">
                <div className="watch-discussion-top">
                  <strong>{thread.title}</strong>
                  <span className={`watch-thread-pill ${thread.is_resolved ? 'is-resolved' : 'is-open'}`}>
                    {thread.is_resolved ? 'Resolved' : 'Open'}
                  </span>
                </div>
                <p>{thread.question}</p>
                <small className="watch-discussion-meta">
                  By {thread.author_id?.name || 'User'} · {new Date(thread.createdAt).toLocaleString()}
                </small>
                <div className="watch-discussion-replies">
                  {(thread.replies || []).map((reply) => (
                    <div key={reply._id} className="watch-discussion-reply">
                      <strong>{reply.author_id?.name || 'User'}:</strong> {reply.message}
                    </div>
                  ))}
                </div>
                <div className="watch-discussion-actions">
                  <input
                    className="input"
                    placeholder="Write a reply..."
                    value={replyDraft[thread._id] || ''}
                    onChange={(e) => setReplyDraft((prev) => ({ ...prev, [thread._id]: e.target.value }))}
                  />
                  <button type="button" className="btn btn-secondary" onClick={() => addReply(thread._id)}>
                    Reply
                  </button>
                  {canResolveThread ? (
                    <button type="button" className="btn btn-ghost" onClick={() => toggleResolved(thread)}>
                      {thread.is_resolved ? 'Reopen' : 'Mark Resolved'}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="watch-review">
          <button type="button" className="watch-review-head" aria-expanded="true">
            <h3>
              <Megaphone size={18} strokeWidth={2.2} aria-hidden />
              Course Announcements
            </h3>
          </button>
          <div className="watch-review-form">
            {isTeacherOfCourse || user?.role === 'admin' ? (
              <form className="watch-inline-form" onSubmit={submitCourseAnnouncement}>
                <input
                  className="input"
                  placeholder="Announcement title"
                  value={announcementDraft.title}
                  onChange={(e) => setAnnouncementDraft((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Announcement message"
                  value={announcementDraft.message}
                  onChange={(e) => setAnnouncementDraft((prev) => ({ ...prev, message: e.target.value }))}
                  required
                />
                <select
                  className="input"
                  value={announcementDraft.priority}
                  onChange={(e) => setAnnouncementDraft((prev) => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
                <button type="submit" className="btn btn-primary" disabled={announcementSubmitting}>
                  {announcementSubmitting ? 'Publishing...' : 'Publish'}
                </button>
              </form>
            ) : null}

            {(courseAnnouncements || []).map((item) => (
              <article key={item._id} className="watch-announcement-item">
                <div className="watch-discussion-top">
                  <strong>{item.title}</strong>
                  <span className={`watch-thread-pill ${item.priority === 'high' ? 'is-open' : 'is-resolved'}`}>{item.priority}</span>
                </div>
                <p>{item.message}</p>
                <small className="watch-discussion-meta">
                  By {item.created_by?.name || 'Instructor'} · {new Date(item.createdAt).toLocaleString()}
                </small>
              </article>
            ))}
            {courseAnnouncements.length === 0 ? <p style={{ color: 'var(--muted)' }}>No announcements yet.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
