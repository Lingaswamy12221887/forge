import { supabase } from '../lib/supabase'
export const trainingService = {
  async courses() { const { data, error } = await supabase.from('courses').select('*, lessons(count)').order('created_at', { ascending: false }); if (error) throw new Error('Could not load courses.'); return data ?? [] },
  async detail(id: string) {
    const [l, e, p, c] = await Promise.all([
      supabase.from('lessons').select('id,position,title,content,video_url').eq('course_id', id).order('position'),
      supabase.from('enrollments').select('id,completed_at').eq('course_id', id).maybeSingle(),
      supabase.from('lesson_progress').select('lesson_id'),
      supabase.from('certificates').select('code').eq('course_id', id).maybeSingle()])
    if (l.error) throw new Error('Could not load the course.')
    return { lessons: l.data ?? [], enrolled: !!e.data, done: new Set((p.data ?? []).map(x => x.lesson_id)), certificate: c.data?.code as string | undefined }
  },
  async createCourse(orgId: string, title: string, description: string) { const { error } = await supabase.from('courses').insert({ organization_id: orgId, title, description }); if (error) throw new Error('You may not have permission to create courses.') },
  async addLesson(courseId: string, position: number, title: string, content: string) { const { error } = await supabase.from('lessons').insert({ course_id: courseId, position, title, content }); if (error) throw new Error('Could not add the lesson.') },
  async publish(id: string) { const { error } = await supabase.from('courses').update({ published: true }).eq('id', id); if (error) throw new Error('Could not publish.') },
  async enroll(id: string) { const { error } = await supabase.rpc('enroll', { p_course: id }); if (error) throw new Error('Could not enroll.') },
  async complete(lessonId: string) { const { data, error } = await supabase.rpc('complete_lesson', { p_lesson: lessonId }); if (error) throw new Error('Enroll in the course first.'); return data as string | null },
  async verify(code: string) { const { data } = await supabase.rpc('verify_certificate', { p_code: code }); return (data as { holder: string; course: string; issuer: string; issued_at: string }[] | null)?.[0] ?? null },
  async quiz(courseId: string) { const { data } = await supabase.from('quizzes').select('id,title,quiz_questions(id,prompt,options)').eq('course_id', courseId).maybeSingle(); return data as { id: string; title: string; quiz_questions: { id: string; prompt: string; options: string[] }[] } | null },
  async submitQuiz(quizId: string, answers: Record<string, number>) { const { data, error } = await supabase.rpc('submit_quiz', { p_quiz: quizId, p_answers: answers }); if (error) throw new Error('Enroll in the course before taking the quiz.'); return data as { score: number; total: number } },
  async addQuestion(courseId: string, prompt: string, options: string[], correct: number) { const { error } = await supabase.rpc('add_quiz_question', { p_course: courseId, p_prompt: prompt, p_options: options, p_correct: correct }); if (error) throw new Error('Could not add the question. Check that you have 2-6 options.') },
}
