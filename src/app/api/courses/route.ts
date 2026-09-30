import { NextResponse } from 'next/server'
import { getActiveCourses, getActiveCategories } from '@/lib/courses-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const courses = getActiveCourses()
    const categories = getActiveCategories()
    return NextResponse.json({ success: true, courses, categories })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch courses' }, { status: 500 })
  }
}
