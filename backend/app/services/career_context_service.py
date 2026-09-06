"""Career Context Service: Builds bounded, deterministic database facts for the AI Career Copilot.

Collects candidate profile data, verified skills, education, experience, optional job requirements,
Phase 8 deterministic skill gap reports, semantic evidence, and real Course database records.
"""

import logging
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.candidate_education import CandidateEducation
from app.models.candidate_experience import CandidateExperience
from app.models.candidate_skill import CandidateSkill
from app.models.course import Course, CourseSkill
from app.models.job import Job, JobSkill
from app.models.profiles import CandidateProfile
from app.models.user import User
from app.schemas.skill_gap import SkillGapReport
from app.services import candidate_service, skill_gap_service

logger = logging.getLogger(__name__)

# Bounding constants to ensure compact, predictable context sizes
MAX_RESUME_CHARS = 1500
MAX_JOB_DESC_CHARS = 1500
MAX_ENTRIES_LIST = 5
MAX_COURSES_LIMIT = 5


class CareerContextService:
    """Deterministic context builder assembling trusted PostgreSQL data for the Career Copilot."""

    async def build_copilot_context(
        self,
        db: AsyncSession,
        current_user: User,
        job_id: uuid.UUID | None = None,
    ) -> dict[str, Any]:
        """Collect bounded, structured database facts for candidate and optional job.

        Returns:
            Dictionary containing structured context elements, canonical skill whitelist,
            real course list, and a preformatted trusted system context string.
        """
        # 1. Authoritative Candidate Profile
        candidate_profile: CandidateProfile = (
            await candidate_service.get_or_create_candidate_profile(db, current_user)
        )

        # 2. Fetch Candidate Skills
        cand_skills_stmt = (
            select(CandidateSkill)
            .options(selectinload(CandidateSkill.skill))
            .where(CandidateSkill.candidate_id == candidate_profile.id)
            .order_by(CandidateSkill.created_at.desc())
        )
        cand_skills_res = await db.execute(cand_skills_stmt)
        cand_skills = cand_skills_res.scalars().all()

        # 3. Fetch Candidate Education (bounded)
        cand_edu_stmt = (
            select(CandidateEducation)
            .where(CandidateEducation.candidate_id == candidate_profile.id)
            .order_by(CandidateEducation.start_year.desc().nullslast())
            .limit(MAX_ENTRIES_LIST)
        )
        cand_edu_res = await db.execute(cand_edu_stmt)
        cand_educations = cand_edu_res.scalars().all()

        # 4. Fetch Candidate Experience (bounded)
        cand_exp_stmt = (
            select(CandidateExperience)
            .where(CandidateExperience.candidate_id == candidate_profile.id)
            .order_by(CandidateExperience.is_current.desc(), CandidateExperience.created_at.desc())
            .limit(MAX_ENTRIES_LIST)
        )
        cand_exp_res = await db.execute(cand_exp_stmt)
        cand_experiences = cand_exp_res.scalars().all()

        # Canonical skill whitelist collected from context (to validate AI output)
        known_canonical_skills: set[str] = set()
        for cs in cand_skills:
            if cs.skill:
                known_canonical_skills.add(cs.skill.name)

        # 5. Optional Job & Deterministic Skill Gap Context
        job: Job | None = None
        skill_gap_report: SkillGapReport | None = None
        missing_skill_ids: list[uuid.UUID] = []

        if job_id:
            job_stmt = (
                select(Job)
                .options(
                    selectinload(Job.skills).selectinload(JobSkill.skill),
                    selectinload(Job.employer),
                )
                .where(Job.id == job_id)
            )
            job_res = await db.execute(job_stmt)
            job = job_res.scalar_one_or_none()

            if job:
                # Add job skills to known canonical skills whitelist
                for js in job.skills:
                    if js.skill:
                        known_canonical_skills.add(js.skill.name)

                # Compute Phase 8 deterministic skill gap analysis
                try:
                    skill_gap_report = await skill_gap_service.calculate_job_skill_gap(
                        db, current_user, job.id
                    )
                    # Extract missing or partial skill IDs for course matching
                    for gap in skill_gap_report.gaps:
                        if gap.status in ("MISSING", "PARTIAL"):
                            missing_skill_ids.append(gap.skill_id)
                except Exception as exc:
                    logger.warning("Could not calculate skill gap for job %s: %s", job_id, exc)

        # 6. Fetch Real Course Records linked to relevant skills
        relevant_courses: list[dict[str, Any]] = []
        if missing_skill_ids:
            course_stmt = (
                select(Course)
                .join(CourseSkill, Course.id == CourseSkill.course_id)
                .options(selectinload(Course.skills).selectinload(CourseSkill.skill))
                .where(
                    CourseSkill.skill_id.in_(missing_skill_ids),
                    Course.is_active.is_(True),
                )
                .distinct()
                .limit(MAX_COURSES_LIMIT)
            )
            course_res = await db.execute(course_stmt)
            course_records = course_res.scalars().all()

            for c in course_records:
                taught_skills = [cs.skill.name for cs in c.skills if cs.skill]
                for s in taught_skills:
                    known_canonical_skills.add(s)
                relevant_courses.append(
                    {
                        "id": str(c.id),
                        "title": c.title,
                        "description": c.description[:200],
                        "duration_hours": c.duration_hours,
                        "mode": c.mode.value if hasattr(c.mode, "value") else str(c.mode),
                        "skills_taught": taught_skills,
                    }
                )

        # 7. Construct Formatted Trusted Context String
        formatted_context = self._format_trusted_context(
            candidate_profile=candidate_profile,
            cand_skills=cand_skills,
            cand_educations=cand_educations,
            cand_experiences=cand_experiences,
            job=job,
            skill_gap_report=skill_gap_report,
            relevant_courses=relevant_courses,
        )

        return {
            "candidate_profile_id": candidate_profile.id,
            "job_id": job.id if job else None,
            "known_canonical_skills": known_canonical_skills,
            "skill_gap_report": skill_gap_report,
            "relevant_courses": relevant_courses,
            "formatted_context": formatted_context,
        }

    def _format_trusted_context(
        self,
        candidate_profile: CandidateProfile,
        cand_skills: list[CandidateSkill],
        cand_educations: list[CandidateEducation],
        cand_experiences: list[CandidateExperience],
        job: Job | None,
        skill_gap_report: SkillGapReport | None,
        relevant_courses: list[dict[str, Any]],
    ) -> str:
        """Format database facts into structured, clean sections for prompt injection protection."""
        sections: list[str] = []

        # Candidate Profile Section
        city_state = (
            f"{candidate_profile.location_city or ''}, {candidate_profile.location_state or ''}"
        )
        loc_str = city_state.strip(", ") or "Not specified"
        profile_lines = [
            "### CANDIDATE PROFILE (TRUSTED DATABASE RECORD)",
            f"- Current Role / Target: {candidate_profile.current_role or 'Not specified'}",
            f"- Total Recorded Experience: {candidate_profile.experience_years} years",
            f"- Education Level: {candidate_profile.education_level or 'Not specified'}",
            f"- Location: {loc_str}",
        ]
        if candidate_profile.headline:
            profile_lines.append(f"- Headline: {candidate_profile.headline}")
        if candidate_profile.bio:
            profile_lines.append(f"- Bio: {candidate_profile.bio[:300]}")
        if candidate_profile.resume_text:
            cleaned_resume = candidate_profile.resume_text.strip()[:MAX_RESUME_CHARS]
            profile_lines.append(
                f'- Resume Extract (Untrusted Candidate Text): """\n{cleaned_resume}\n"""'
            )
        sections.append("\n".join(profile_lines))

        # Candidate Skills Section
        skills_lines = ["### CANDIDATE RECORDED SKILLS (AUTHORITATIVE)"]
        if cand_skills:
            for cs in cand_skills:
                skill_name = cs.skill.name if cs.skill else "Unknown"
                prof = cs.proficiency.value if hasattr(cs.proficiency, "value") else cs.proficiency
                verified_str = "Verified" if cs.is_verified else "Self-reported"
                exp_s = f"{cs.years_experience} yrs"
                skills_lines.append(
                    f"- {skill_name} | Level: {prof} | Experience: {exp_s} ({verified_str})"
                )
        else:
            skills_lines.append("- No skills currently recorded in profile.")
        sections.append("\n".join(skills_lines))

        # Candidate Education Section
        if cand_educations:
            edu_lines = ["### CANDIDATE EDUCATION HISTORY"]
            for edu in cand_educations:
                field = f" in {edu.field_of_study}" if edu.field_of_study else ""
                end_str = "Present" if edu.is_current else ""
                years = f" ({edu.start_year or ''} - {edu.end_year or end_str})"
                edu_lines.append(f"- {edu.degree}{field} at {edu.institution}{years}")
            sections.append("\n".join(edu_lines))

        # Candidate Experience Section
        if cand_experiences:
            exp_lines = ["### CANDIDATE WORK EXPERIENCE"]
            for exp in cand_experiences:
                end_str = "Present" if exp.is_current else ""
                period = f" ({exp.start_date or ''} - {exp.end_date or end_str})"
                exp_lines.append(f"- {exp.title} at {exp.company}{period}")
                if exp.description:
                    exp_lines.append(f"  Summary: {exp.description[:150]}")
            sections.append("\n".join(exp_lines))

        # Job Context Section (if provided)
        if job:
            company = job.employer.company_name if job.employer else "Employer"
            emp_t = (
                job.employment_type.value
                if hasattr(job.employment_type, "value")
                else job.employment_type
            )
            exp_l = (
                job.experience_level.value
                if hasattr(job.experience_level, "value")
                else job.experience_level
            )
            job_lines = [
                f"### TARGET JOB CONTEXT: {job.title} at {company}",
                f"- Employment Type: {emp_t}",
                f"- Experience Level: {exp_l}",
                f"- Remote: {'Yes' if job.is_remote else 'No'}",
                f"- Description Overview: {job.description[:MAX_JOB_DESC_CHARS]}",
                "- Required Skills for Job:",
            ]
            for js in job.skills:
                skill_name = js.skill.name if js.skill else "Unknown"
                req_str = "Mandatory" if js.is_required else "Preferred"
                job_lines.append(
                    f"  * {skill_name} (Required Level: {js.minimum_proficiency}, {req_str})"
                )
            sections.append("\n".join(job_lines))

        # Deterministic Skill Gap Report Section (if available)
        if skill_gap_report:
            gap_lines = [
                "### DETERMINISTIC SKILL GAP ANALYSIS (AUTHORITATIVE RESULTS)",
                f"- Overall Skill Alignment Score: {skill_gap_report.skill_alignment_score}%",
                f"- Matched Skills Count: {skill_gap_report.summary.matched_skills}",
                f"- Partial Gaps Count: {skill_gap_report.summary.partial_skills}",
                f"- Missing Skills Count: {skill_gap_report.summary.missing_skills}",
                "- Detailed Breakdown:",
            ]
            for g in skill_gap_report.gaps:
                cand_lvl = g.candidate_proficiency.value if g.candidate_proficiency else "None"
                req_lvl = g.required_proficiency.value if g.required_proficiency else "Required"
                sev = f" [Severity: {g.severity.value}]" if g.severity else ""
                expl = g.explanation
                gap_lines.append(
                    f"  * [{g.status.value}] {g.skill_name}: "
                    f"Req={req_lvl}, Cand={cand_lvl}{sev}. {expl}"
                )
            sections.append("\n".join(gap_lines))

        # Real Course Catalog Section
        if relevant_courses:
            course_lines = ["### AVAILABLE DATABASE COURSES FOR SKILL GAPS (REAL CATALOG RECORDS)"]
            for c in relevant_courses:
                skills_t = ", ".join(c["skills_taught"])
                c_dur = c["duration_hours"]
                c_mode = c["mode"]
                course_lines.append(
                    f"- Course: '{c['title']}' ({c_dur}h, {c_mode}) - Teaches: {skills_t}"
                )
            sections.append("\n".join(course_lines))
        else:
            course_msg = (
                "- No specific training courses currently registered in database for these gaps."
            )
            sections.append(f"### AVAILABLE COURSES\n{course_msg}")

        return "\n\n".join(sections)


career_context_service = CareerContextService()
