'use client'

import React, { useState, useMemo } from 'react'
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Award,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  X,
  BookOpen,
  ShieldCheck,
} from 'lucide-react'
import { MatnCourse } from '@/lib/curriculum-data'
import { getCourseQuiz, gradeCourseQuiz, QuizQuestion, QuizResult } from '@/lib/course-quizzes'
import { issueCourseCertificateAction } from '@/app/actions/certificate-actions'
import { VerifiedCertificate } from '@/lib/certificate-service'
import VerifiedDigitalIjaza from '@/components/verified-digital-ijaza'

interface CourseQuizModalProps {
  course: MatnCourse
  studentName: string
  isOpen: boolean
  onClose: () => void
  onCertificationIssued?: (cert: VerifiedCertificate) => void
}

export default function CourseQuizModal({
  course,
  studentName,
  isOpen,
  onClose,
  onCertificationIssued,
}: CourseQuizModalProps) {
  const questions = useMemo(() => getCourseQuiz(course), [course])
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(
    () => new Array(questions.length).fill(null)
  )
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null)
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [issuedCert, setIssuedCert] = useState<VerifiedCertificate | null>(null)
  const [isIjazaOpen, setIsIjazaOpen] = useState(false)

  if (!isOpen) return null

  const handleSelectOption = (optionIndex: number) => {
    if (quizResult) return // إذا انتهى الاختبار لا يسمح بالتغيير
    const updated = [...selectedAnswers]
    updated[currentQuestionIdx] = optionIndex
    setSelectedAnswers(updated)
  }

  const handleNext = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx((prev) => prev - 1)
    }
  }

  const handleSubmitQuiz = () => {
    const result = gradeCourseQuiz(questions, selectedAnswers)
    setQuizResult(result)
  }

  const handleRetake = () => {
    setSelectedAnswers(new Array(questions.length).fill(null))
    setQuizResult(null)
    setCurrentQuestionIdx(0)
    setIssuedCert(null)
  }

  const handleClaimIjaza = async () => {
    setIsSubmitting(true)
    try {
      const res = await issueCourseCertificateAction(course.slug, studentName)
      if (res.success && res.certificate) {
        setIssuedCert(res.certificate)
        setIsIjazaOpen(true)
        if (onCertificationIssued) {
          onCertificationIssued(res.certificate)
        }
      }
    } catch (e) {
      console.error('Error claiming ijaza:', e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentQ = questions[currentQuestionIdx]
  const allAnswered = selectedAnswers.every((ans) => ans !== null)

  return (
    <>
      <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto animate-in fade-in">
        <div className="relative w-full max-w-2xl rounded-3xl border border-amber-300/60 bg-white shadow-2xl dark:border-amber-900/60 dark:bg-stone-900 my-auto overflow-hidden">
          
          {/* شريط العنوان العلوي */}
          <div className="flex items-center justify-between border-b border-stone-200/80 bg-stone-50/90 px-6 py-4 dark:border-stone-800 dark:bg-stone-850">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                <HelpCircle className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-stone-900 dark:text-white">
                  اختبار التحقق والضبط المنهجي
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  متن: {course.title} · نسبة الاجتياز المطلوبة: 80%
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-6">

            {/* حالة عدم انتهاء الاختبار (الأسئلة الحية) */}
            {!quizResult ? (
              <div className="space-y-6">
                
                {/* شريط تقدم الأسئلة */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-600 dark:text-stone-300">
                    <span>السؤال {currentQuestionIdx + 1} من {questions.length}</span>
                    <span className="text-emerald-800 dark:text-emerald-400 font-mono">
                      {Math.round(((currentQuestionIdx + 1) / questions.length) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                    <div
                      className="h-full bg-linear-to-r from-emerald-700 to-amber-500 transition-all duration-300"
                      style={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* نص السؤال الحالي */}
                <div className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-5 dark:border-stone-800 dark:bg-stone-800/40 space-y-3">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block font-mono">
                    #Q{currentQuestionIdx + 1}
                  </span>
                  <h4 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white leading-relaxed font-amiri">
                    {currentQ.question}
                  </h4>
                </div>

                {/* خيارات الإجابة */}
                <div className="space-y-2.5">
                  {currentQ.options.map((opt, oIdx) => {
                    const isSelected = selectedAnswers[currentQuestionIdx] === oIdx
                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => handleSelectOption(oIdx)}
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-right transition cursor-pointer ${
                          isSelected
                            ? 'border-emerald-700 bg-emerald-50/80 text-emerald-950 font-bold dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-200'
                            : 'border-stone-200/90 bg-white hover:border-emerald-300 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-850 dark:text-stone-200'
                        }`}
                      >
                        <span className="text-xs sm:text-sm leading-relaxed">{opt}</span>
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                            isSelected
                              ? 'border-emerald-700 bg-emerald-700 text-white dark:border-emerald-500 dark:bg-emerald-500'
                              : 'border-stone-300 dark:border-stone-600'
                          }`}
                        >
                          {isSelected ? '✓' : ''}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* أزرار التنقل والإنهاء */}
                <div className="flex items-center justify-between pt-4 border-t border-stone-200/80 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentQuestionIdx === 0}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-30 disabled:pointer-events-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 cursor-pointer"
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span>السابق</span>
                  </button>

                  {currentQuestionIdx < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-900 transition cursor-pointer dark:bg-emerald-700"
                    >
                      <span>التالي</span>
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmitQuiz}
                      disabled={!allAnswered}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-emerald-800 to-amber-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:from-emerald-900 hover:to-amber-700 transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>تصحيح الاختبار وعرض النتيجة</span>
                    </button>
                  )}
                </div>

              </div>
            ) : (
              /* حالة ظهور النتيجة والتصحيح */
              <div className="space-y-6">
                
                {/* بطاقة النتيجة الكبرى */}
                <div
                  className={`rounded-3xl border-2 p-6 text-center space-y-4 ${
                    quizResult.passed
                      ? 'border-emerald-500/60 bg-emerald-50/60 dark:border-emerald-800/80 dark:bg-emerald-950/30'
                      : 'border-amber-400/60 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20'
                  }`}
                >
                  <div
                    className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-inner ${
                      quizResult.passed
                        ? 'bg-emerald-700 text-white'
                        : 'bg-amber-600 text-white'
                    }`}
                  >
                    {quizResult.passed ? <Award className="h-8 w-8" /> : <RotateCcw className="h-8 w-8" />}
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xl sm:text-2xl font-bold font-amiri text-stone-900 dark:text-white">
                      {quizResult.passed ? 'مبارك! اجتزت اختبار المتن بنجاح' : 'لم تستوفِ حد الاجتياز (80%)'}
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-stone-400">
                      درجتك: <strong className="font-mono text-base font-black text-emerald-800 dark:text-emerald-400">{quizResult.score}%</strong> ({quizResult.correctCount} من {quizResult.totalCount} صحيحة)
                    </p>
                  </div>

                  {quizResult.passed ? (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleClaimIjaza}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-amber-600 via-emerald-800 to-amber-700 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-lg hover:shadow-xl transition cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="h-4 w-4 text-amber-300" />
                        <span>{isSubmitting ? 'جارٍ تسجيل الإجازة السحابية...' : 'إصدار الإجازة العلمية الموثقة بـ QR'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleRetake}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-800 transition cursor-pointer"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>إعادة محاولة الاختبار</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* مراجعة تفاصيل الأسئلة والإجابات والتفسير */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    مراجعة وتأصيل المسائل:
                  </h5>
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {quizResult.details.map((d, i) => (
                      <div
                        key={i}
                        className={`rounded-2xl border p-3.5 space-y-1.5 text-xs ${
                          d.isCorrect
                            ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                            : 'border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {d.isCorrect ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                          )}
                          <span className="font-bold text-stone-900 dark:text-white">
                            {d.question}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 dark:text-stone-400 pr-6">
                          💡 <strong>البيان العلمي:</strong> {d.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>
      </div>

      {/* نافذة الإجازة الموثقة الرقمية الكاملة المنبثقة فور الاجتياز */}
      {issuedCert && isIjazaOpen && (
        <VerifiedDigitalIjaza
          certificate={issuedCert}
          isOpen={isIjazaOpen}
          onClose={() => setIsIjazaOpen(false)}
        />
      )}
    </>
  )
}
