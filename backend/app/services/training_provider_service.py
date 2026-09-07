"""Training Provider domain service handling profile, dashboard metrics, and enrollment views."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.course import Course, CourseStatus
from app.models.curriculum import CurriculumModule
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.profiles import CandidateProfile, TrainingProviderProfile
from app.models.user import User
from app.schemas.course import CourseResponse, CourseSkillResponse
from app.schemas.curriculum import CurriculumLessonResponse, CurriculumModuleResponse
from app.schemas.enrollment import EnrollmentCandidateInfo
from app.schemas.profiles import (
    TrainingProviderProfileResponse,
    TrainingProviderProfileUpdate,
)
from app.schemas.training_provider import (
    TrainingProviderDashboardMetrics,
    TrainingProviderDashboardResponse,
)


async def get_or_create_provider_profile(
    db: AsyncSession,
    user: User,
) -> TrainingProviderProfile:
    """Retrieve or initialize the 1-to-1 TrainingProviderProfile for the authenticated user."""
    stmt = select(TrainingProviderProfile).where(TrainingProviderProfile.user_id == user.id)
    res = await db.execute(stmt)
    profile = res.scalar_one_or_none()

    if not profile:
        profile = TrainingProviderProfile(
            user_id=user.id,
            institution_name=user.full_name or "Training Institution",
            description=None,
            provider_type=None,
            location_city=None,
            location_state=None,
            website_url=None,
            contact_email=user.email,
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    return profile


async def get_provider_profile_dto(
    db: AsyncSession,
    user: User,
) -> TrainingProviderProfileResponse:
    """Return strongly typed TrainingProviderProfileResponse DTO for current user."""
    profile = await get_or_create_provider_profile(db, user)
    return TrainingProviderProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        institution_name=profile.institution_name,
        provider_type=profile.provider_type,
        location_city=profile.location_city,
        location_state=profile.location_state,
        website_url=profile.website_url,
        contact_email=profile.contact_email,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


async def update_provider_profile(
    db: AsyncSession,
    user: User,
    data: TrainingProviderProfileUpdate,
) -> TrainingProviderProfileResponse:
    """Update training provider profile attributes."""
    profile = await get_or_create_provider_profile(db, user)

    if data.institution_name is not None and data.institution_name.strip():
        profile.institution_name = data.institution_name.strip()
    if data.provider_type is not None:
        profile.provider_type = data.provider_type.strip() if data.provider_type.strip() else None
    if data.location_city is not None:
        profile.location_city = data.location_city.strip() if data.location_city.strip() else None
    if data.location_state is not None:
        profile.location_state = (
            data.location_state.strip() if data.location_state.strip() else None
        )
    if data.website_url is not None:
        profile.website_url = data.website_url.strip() if data.website_url.strip() else None
    if data.contact_email is not None:
        profile.contact_email = data.contact_email.strip() if data.contact_email.strip() else None

    db.add(profile)
    await db.commit()
    await db.refresh(profile)

    return await get_provider_profile_dto(db, user)


async def get_provider_dashboard(
    db: AsyncSession,
    user: User,
) -> TrainingProviderDashboardResponse:
    """Aggregate live database metrics, recent courses, and recent enrollments for provider."""
    profile = await get_or_create_provider_profile(db, user)

    # 1. Course counts by status
    courses_stmt = select(Course).where(Course.provider_id == profile.id)
    res = await db.execute(courses_stmt)
    all_courses = res.scalars().all()

    total_courses = len(all_courses)
    draft_courses = sum(1 for c in all_courses if c.status == CourseStatus.DRAFT)
    published_courses = sum(1 for c in all_courses if c.status == CourseStatus.PUBLISHED)
    closed_courses = sum(1 for c in all_courses if c.status == CourseStatus.CLOSED)

    published_course_ids = [c.id for c in all_courses if c.status == CourseStatus.PUBLISHED]
    total_capacity = sum(c.capacity for c in all_courses if c.status == CourseStatus.PUBLISHED)

    # 2. Enrollment counts
    enrollments_stmt = (
        select(Enrollment)
        .join(Course, Course.id == Enrollment.course_id)
        .where(Course.provider_id == profile.id)
        .options(
            selectinload(Enrollment.candidate).selectinload(CandidateProfile.user),
            selectinload(Enrollment.course),
            selectinload(Enrollment.lesson_progress),
        )
        .order_by(Enrollment.created_at.desc())
    )
    res_enr = await db.execute(enrollments_stmt)
    all_enrollments = res_enr.scalars().all()

    total_enrollments = len(all_enrollments)
    active_enrollments = sum(
        1
        for e in all_enrollments
        if e.status in (EnrollmentStatus.ENROLLED, EnrollmentStatus.IN_PROGRESS)
    )
    completed_enrollments = sum(
        1 for e in all_enrollments if e.status == EnrollmentStatus.COMPLETED
    )

    active_published_enrollments = sum(
        1
        for e in all_enrollments
        if e.course_id in published_course_ids
        and e.status in (EnrollmentStatus.ENROLLED, EnrollmentStatus.IN_PROGRESS)
    )
    remaining_capacity = max(0, total_capacity - active_published_enrollments)

    metrics = TrainingProviderDashboardMetrics(
        total_courses=total_courses,
        draft_courses=draft_courses,
        published_courses=published_courses,
        closed_courses=closed_courses,
        total_enrollments=total_enrollments,
        active_enrollments=active_enrollments,
        completed_enrollments=completed_enrollments,
        total_capacity=total_capacity,
        remaining_capacity=remaining_capacity,
    )

    # 3. Recent 5 courses (with loaded skills & curriculum modules)
    recent_courses_stmt = (
        select(Course)
        .where(Course.provider_id == profile.id)
        .options(
            selectinload(Course.skills),
            selectinload(Course.curriculum_modules).selectinload(CurriculumModule.lessons),
            selectinload(Course.enrollments),
        )
        .order_by(Course.created_at.desc())
        .limit(5)
    )
    res_rc = await db.execute(recent_courses_stmt)
    recent_course_models = res_rc.scalars().all()

    recent_courses: list[CourseResponse] = []
    for c in recent_course_models:
        active_count = sum(
            1
            for e in c.enrollments
            if e.status in (EnrollmentStatus.ENROLLED, EnrollmentStatus.IN_PROGRESS)
        )
        recent_courses.append(
            CourseResponse(
                id=c.id,
                provider_id=c.provider_id,
                provider_name=profile.institution_name,
                title=c.title,
                description=c.description,
                category=c.category,
                duration_hours=c.duration_hours,
                difficulty=c.difficulty,
                mode=c.mode,
                status=c.status,
                capacity=c.capacity,
                location_city=c.location_city,
                location_state=c.location_state,
                start_date=c.start_date,
                end_date=c.end_date,
                enrollment_deadline=c.enrollment_deadline,
                is_active=c.is_active,
                enrolled_count=active_count,
                remaining_capacity=max(0, c.capacity - active_count),
                skills=[
                    CourseSkillResponse(
                        id=cs.id,
                        course_id=cs.course_id,
                        skill_id=cs.skill_id,
                    )
                    for cs in c.skills
                ],
                curriculum_modules=[
                    CurriculumModuleResponse(
                        id=m.id,
                        course_id=m.course_id,
                        title=m.title,
                        description=m.description,
                        order_index=m.order_index,
                        created_at=m.created_at,
                        updated_at=m.updated_at,
                        lessons=[
                            CurriculumLessonResponse(
                                id=les.id,
                                module_id=les.module_id,
                                title=les.title,
                                description=les.description,
                                content=les.content,
                                duration_minutes=les.duration_minutes,
                                order_index=les.order_index,
                                created_at=les.created_at,
                                updated_at=les.updated_at,
                            )
                            for les in m.lessons
                        ],
                    )
                    for m in c.curriculum_modules
                ],
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
        )

    # 4. Recent 5 enrollments
    recent_enrollments: list[EnrollmentCandidateInfo] = []
    for e in all_enrollments[:5]:
        cand_name = "Candidate"
        cand_email = "candidate@skillsync.internal"
        if e.candidate and e.candidate.user:
            cand_name = e.candidate.user.full_name or "Candidate"
            cand_email = e.candidate.user.email

        # Progress calculation
        progress_pct = 0.0
        if e.lesson_progress:
            total_lp = len(e.lesson_progress)
            comp_lp = sum(1 for lp in e.lesson_progress if lp.is_completed)
            progress_pct = round((comp_lp / total_lp) * 100, 1) if total_lp > 0 else 0.0
        elif e.status == EnrollmentStatus.COMPLETED:
            progress_pct = 100.0

        recent_enrollments.append(
            EnrollmentCandidateInfo(
                enrollment_id=e.id,
                candidate_id=e.candidate_id,
                candidate_name=cand_name,
                candidate_email=cand_email,
                course_id=e.course_id,
                course_title=e.course.title if e.course else "Course",
                status=e.status,
                progress_percent=progress_pct,
                enrolled_at=e.enrolled_at,
                completed_at=e.completed_at,
            )
        )

    return TrainingProviderDashboardResponse(
        metrics=metrics,
        recent_courses=recent_courses,
        recent_enrollments=recent_enrollments,
    )
