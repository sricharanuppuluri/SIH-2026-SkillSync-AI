"""Deterministic Verified Skill Passport and Evidence Service.

Implements deterministic, explainable verification rules:
- Rule A: Completed Course (100% lessons + Published Course) -> VERIFIED (COURSE_COMPLETION)
- Rule B: Candidate Self-Declaration -> UNVERIFIED (CANDIDATE_DECLARATION)
- Rule C: Resume Extraction -> UNVERIFIED (RESUME_EXTRACTION)
- Rule D: Certification -> VERIFIED (CERTIFICATION) (or EXPIRED if expired)
- Rule E: Assessment -> VERIFIED (ASSESSMENT)

All verification decisions are deterministic and evidence-backed.
AI never decides verification status.
"""

import logging
import secrets
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.application import Application
from app.models.candidate_skill import CandidateSkill
from app.models.course import Course, CourseSkill, CourseStatus
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.job import Job
from app.models.passport_share import SkillPassportShare
from app.models.profiles import CandidateProfile
from app.models.skill import Skill
from app.models.skill_evidence import EvidenceStatus, EvidenceType, SkillEvidence
from app.models.verified_skill import VerificationMethod, VerificationStatus, VerifiedSkill
from app.schemas.passport import (
    CandidatePassportResponse,
    PassportCandidateSummary,
    PassportShareResponse,
    PassportStats,
    PublicPassportResponse,
    SkillEvidenceCreate,
    SkillEvidenceRead,
    VerifiedSkillItem,
)

logger = logging.getLogger(__name__)


# Evidence precedence hierarchy for deterministic verification
EVIDENCE_PRECEDENCE = [
    EvidenceType.CERTIFICATION,
    EvidenceType.COURSE_COMPLETION,
    EvidenceType.ASSESSMENT,
    EvidenceType.RESUME_EXTRACTION,
    EvidenceType.CANDIDATE_DECLARATION,
]


async def sync_candidate_evidence_from_sources(db: AsyncSession, candidate_id: uuid.UUID) -> None:
    """Idempotently harvest evidence from declarations and completed courses."""
    # 1. Gather CandidateSkill declarations
    cand_skills_stmt = (
        select(CandidateSkill)
        .options(selectinload(CandidateSkill.skill))
        .where(CandidateSkill.candidate_id == candidate_id)
    )
    cand_skills_res = await db.execute(cand_skills_stmt)
    cand_skills = cand_skills_res.scalars().all()

    for cs in cand_skills:
        # Check if declaration evidence already exists
        existing_stmt = select(SkillEvidence).where(
            SkillEvidence.candidate_id == candidate_id,
            SkillEvidence.skill_id == cs.skill_id,
            SkillEvidence.evidence_type == EvidenceType.CANDIDATE_DECLARATION,
            SkillEvidence.source_id.is_(None),
        )
        existing = (await db.execute(existing_stmt)).scalar_one_or_none()
        skill_name = cs.skill.name if cs.skill else "Skill"
        prof_val = cs.proficiency.value if hasattr(cs.proficiency, "value") else str(cs.proficiency)
        title = f"Self-Declared: {skill_name} ({prof_val}, {cs.years_experience}y)"
        desc = (
            f"Candidate self-reported {prof_val} proficiency with "
            f"{cs.years_experience} years experience."
        )

        if not existing:
            ev = SkillEvidence(
                candidate_id=candidate_id,
                skill_id=cs.skill_id,
                evidence_type=EvidenceType.CANDIDATE_DECLARATION,
                source_id=None,
                title=title,
                description=desc,
                status=EvidenceStatus.VALID,
                meta={"proficiency": prof_val, "years_experience": cs.years_experience},
            )
            db.add(ev)
        else:
            existing.title = title
            existing.description = desc
            existing.meta = {"proficiency": prof_val, "years_experience": cs.years_experience}
            existing.status = EvidenceStatus.VALID
            db.add(existing)

    # 2. Gather completed published course enrollments
    enrollments_stmt = (
        select(Enrollment)
        .options(
            selectinload(Enrollment.course)
            .selectinload(Course.skills)
            .selectinload(CourseSkill.skill)
        )
        .where(
            Enrollment.candidate_id == candidate_id,
            Enrollment.status == EnrollmentStatus.COMPLETED,
        )
    )
    enrollments_res = await db.execute(enrollments_stmt)
    enrollments = enrollments_res.scalars().all()

    for enr in enrollments:
        if not enr.course or enr.course.status != CourseStatus.PUBLISHED:
            continue

        for cs in enr.course.skills or []:
            if not cs.skill_id:
                continue

            existing_course_ev_stmt = select(SkillEvidence).where(
                SkillEvidence.candidate_id == candidate_id,
                SkillEvidence.skill_id == cs.skill_id,
                SkillEvidence.evidence_type == EvidenceType.COURSE_COMPLETION,
                SkillEvidence.source_id == enr.course_id,
            )
            existing_course_ev = (await db.execute(existing_course_ev_stmt)).scalar_one_or_none()

            skill_name = cs.skill.name if cs.skill else "Skill"
            course_title = enr.course.title
            title = f"Completed Course: {course_title}"
            desc = (
                f"Candidate completed 100% curriculum of training course '{course_title}' "
                f"covering canonical skill '{skill_name}'."
            )
            completed_time = enr.completed_at or enr.updated_at or datetime.now(UTC)

            if not existing_course_ev:
                ev = SkillEvidence(
                    candidate_id=candidate_id,
                    skill_id=cs.skill_id,
                    evidence_type=EvidenceType.COURSE_COMPLETION,
                    source_id=enr.course_id,
                    title=title,
                    description=desc,
                    completed_at=completed_time,
                    status=EvidenceStatus.VALID,
                    meta={
                        "course_id": str(enr.course_id),
                        "course_title": course_title,
                        "enrollment_id": str(enr.id),
                    },
                )
                db.add(ev)
            else:
                existing_course_ev.title = title
                existing_course_ev.description = desc
                existing_course_ev.completed_at = completed_time
                existing_course_ev.status = EvidenceStatus.VALID
                db.add(existing_course_ev)

    await db.flush()


async def recalculate_candidate_passport(
    db: AsyncSession, candidate_id: uuid.UUID
) -> CandidatePassportResponse:
    """Deterministic, idempotent recalculation of all candidate verified skills and passport.

    Evaluates explicit verification rules against evidence items and ensures zero duplicate records.
    """
    # 1. Reconcile evidence sources
    await sync_candidate_evidence_from_sources(db, candidate_id)

    # 2. Fetch all valid evidence items for candidate
    evidence_stmt = (
        select(SkillEvidence)
        .options(selectinload(SkillEvidence.skill))
        .where(
            SkillEvidence.candidate_id == candidate_id,
            SkillEvidence.status == EvidenceStatus.VALID,
        )
    )
    evidence_res = await db.execute(evidence_stmt)
    all_evidence = evidence_res.scalars().all()

    # Group evidence items by canonical skill_id
    evidence_by_skill: dict[uuid.UUID, list[SkillEvidence]] = {}
    for ev in all_evidence:
        evidence_by_skill.setdefault(ev.skill_id, []).append(ev)

    # Also collect any skills declared in CandidateSkill
    cand_skills_stmt = select(CandidateSkill.skill_id).where(
        CandidateSkill.candidate_id == candidate_id
    )
    declared_skill_ids = set((await db.execute(cand_skills_stmt)).scalars().all())

    all_candidate_skill_ids = set(evidence_by_skill.keys()) | declared_skill_ids

    # 3. Evaluate deterministic verification for each skill
    now = datetime.now(UTC)

    for skill_id in all_candidate_skill_ids:
        ev_list = evidence_by_skill.get(skill_id, [])

        # Partition evidence by type
        cert_ev = [e for e in ev_list if e.evidence_type == EvidenceType.CERTIFICATION]
        course_ev = [e for e in ev_list if e.evidence_type == EvidenceType.COURSE_COMPLETION]
        assess_ev = [e for e in ev_list if e.evidence_type == EvidenceType.ASSESSMENT]
        resume_ev = [e for e in ev_list if e.evidence_type == EvidenceType.RESUME_EXTRACTION]
        decl_ev = [e for e in ev_list if e.evidence_type == EvidenceType.CANDIDATE_DECLARATION]

        status = VerificationStatus.UNVERIFIED
        method = VerificationMethod.NONE
        summary = "No verification evidence on record."
        verified_at: datetime | None = None
        expires_at: datetime | None = None
        score: float | None = None

        # Rule D: Certification (highest priority)
        if cert_ev:
            # Sort newest first
            latest_cert = sorted(cert_ev, key=lambda x: x.issued_at or x.created_at, reverse=True)[
                0
            ]
            # Check expiration if meta has expiration date
            exp_date_str = (latest_cert.meta or {}).get("expires_at")
            is_expired = False
            if exp_date_str:
                try:
                    exp_dt = datetime.fromisoformat(str(exp_date_str))
                    if exp_dt < now:
                        is_expired = True
                        expires_at = exp_dt
                except Exception:
                    pass

            if is_expired:
                status = VerificationStatus.EXPIRED
                method = VerificationMethod.CERTIFICATION
                summary = f"Certification expired: {latest_cert.title}"
            else:
                status = VerificationStatus.VERIFIED
                method = VerificationMethod.CERTIFICATION
                summary = f"Verified through certification: {latest_cert.title}"
                verified_at = latest_cert.issued_at or latest_cert.created_at

        # Rule A: Completed Course (if not verified by certification)
        elif course_ev:
            status = VerificationStatus.VERIFIED
            method = VerificationMethod.COURSE_COMPLETION
            if len(course_ev) == 1:
                clean_title = course_ev[0].title.replace("Completed Course: ", "")
                summary = f"Verified through completed course: {clean_title}"
            else:
                titles = [e.title.replace("Completed Course: ", "") for e in course_ev[:2]]
                summary = (
                    f"Verified through {len(course_ev)} completed courses "
                    f"including {', '.join(titles)}"
                )
            # Verified date is earliest completion date
            completed_dates = [e.completed_at for e in course_ev if e.completed_at]
            verified_at = min(completed_dates) if completed_dates else course_ev[0].created_at

        # Rule E: Assessment
        elif assess_ev:
            status = VerificationStatus.VERIFIED
            method = VerificationMethod.ASSESSMENT
            summary = f"Verified via assessment: {assess_ev[0].title}"
            verified_at = assess_ev[0].completed_at or assess_ev[0].created_at

        # Rule C: Resume Extraction
        elif resume_ev:
            status = VerificationStatus.UNVERIFIED
            method = VerificationMethod.RESUME_EXTRACTION
            summary = f"Extracted from resume ({resume_ev[0].title}). Formal verification pending."

        # Rule B: Candidate Self-Declaration
        elif decl_ev or skill_id in declared_skill_ids:
            status = VerificationStatus.UNVERIFIED
            method = VerificationMethod.CANDIDATE_DECLARATION
            summary = "Self-declared by candidate. Formal verification pending."

        # Upsert VerifiedSkill record
        existing_vs_stmt = select(VerifiedSkill).where(
            VerifiedSkill.candidate_id == candidate_id,
            VerifiedSkill.skill_id == skill_id,
        )
        existing_vs = (await db.execute(existing_vs_stmt)).scalar_one_or_none()

        if not existing_vs:
            vs = VerifiedSkill(
                candidate_id=candidate_id,
                skill_id=skill_id,
                verification_status=status,
                verification_method=method,
                verification_score=score,
                verified_at=verified_at,
                expires_at=expires_at,
                verification_summary=summary,
            )
            db.add(vs)
        else:
            existing_vs.verification_status = status
            existing_vs.verification_method = method
            existing_vs.verification_score = score
            existing_vs.verified_at = verified_at
            existing_vs.expires_at = expires_at
            existing_vs.verification_summary = summary
            db.add(existing_vs)

    # 4. Clean up any VerifiedSkill records that no longer have skills or evidence
    if all_candidate_skill_ids:
        del_stmt = delete(VerifiedSkill).where(
            VerifiedSkill.candidate_id == candidate_id,
            VerifiedSkill.skill_id.not_in(all_candidate_skill_ids),
        )
        await db.execute(del_stmt)

    await db.commit()

    return await get_candidate_passport(db, candidate_id)


async def get_candidate_passport(
    db: AsyncSession, candidate_id: uuid.UUID
) -> CandidatePassportResponse:
    """Retrieve full candidate passport with verification breakdown and statistics."""
    # 1. Fetch Candidate Profile with User
    cand_stmt = (
        select(CandidateProfile)
        .options(selectinload(CandidateProfile.user))
        .where(CandidateProfile.id == candidate_id)
    )
    cand_res = await db.execute(cand_stmt)
    candidate = cand_res.scalar_one_or_none()

    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found.",
        )

    # 2. Fetch all verified skills with canonical skills
    vs_stmt = (
        select(VerifiedSkill)
        .options(selectinload(VerifiedSkill.skill))
        .where(VerifiedSkill.candidate_id == candidate_id)
        .order_by(
            VerifiedSkill.verification_status.asc(),
            VerifiedSkill.created_at.desc(),
        )
    )
    vs_res = await db.execute(vs_stmt)
    verified_skills = vs_res.scalars().all()

    # 3. Fetch all active evidence items
    ev_stmt = (
        select(SkillEvidence)
        .options(selectinload(SkillEvidence.skill))
        .where(
            SkillEvidence.candidate_id == candidate_id,
            SkillEvidence.status == EvidenceStatus.VALID,
        )
        .order_by(SkillEvidence.created_at.desc())
    )
    ev_res = await db.execute(ev_stmt)
    evidence_items = ev_res.scalars().all()

    evidence_by_skill: dict[uuid.UUID, list[SkillEvidence]] = {}
    for ev in evidence_items:
        evidence_by_skill.setdefault(ev.skill_id, []).append(ev)

    # 4. Build Skill Items
    skill_items: list[VerifiedSkillItem] = []
    verified_count = 0
    unverified_count = 0
    expired_count = 0

    for vs in verified_skills:
        sk = vs.skill
        if not sk:
            continue

        if vs.verification_status == VerificationStatus.VERIFIED:
            verified_count += 1
        elif vs.verification_status == VerificationStatus.EXPIRED:
            expired_count += 1
        else:
            unverified_count += 1

        skill_ev_list = evidence_by_skill.get(vs.skill_id, [])
        ev_reads = [
            SkillEvidenceRead(
                id=e.id,
                candidate_id=e.candidate_id,
                skill_id=e.skill_id,
                skill_name=e.skill.name if e.skill else sk.name,
                evidence_type=e.evidence_type,
                source_id=e.source_id,
                title=e.title,
                description=e.description,
                evidence_url=e.evidence_url,
                issued_at=e.issued_at,
                completed_at=e.completed_at,
                meta=e.meta,
                status=e.status,
                created_at=e.created_at,
                updated_at=e.updated_at,
            )
            for e in skill_ev_list
        ]

        strongest_ev_type: EvidenceType | None = None
        for pref in EVIDENCE_PRECEDENCE:
            if any(e.evidence_type == pref for e in skill_ev_list):
                strongest_ev_type = pref
                break

        skill_items.append(
            VerifiedSkillItem(
                skill_id=vs.skill_id,
                skill_name=sk.name,
                skill_slug=sk.slug,
                category=sk.category or "General",
                skill_type=sk.skill_type.value
                if hasattr(sk.skill_type, "value")
                else str(sk.skill_type),
                status=vs.verification_status,
                verification_method=vs.verification_method,
                verification_score=vs.verification_score,
                verified_at=vs.verified_at,
                expires_at=vs.expires_at,
                verification_summary=vs.verification_summary,
                evidence_count=len(skill_ev_list),
                strongest_evidence_type=strongest_ev_type,
                evidence_items=ev_reads,
            )
        )

    # 5. Fetch share status
    share_stmt = select(SkillPassportShare).where(SkillPassportShare.candidate_id == candidate_id)
    share = (await db.execute(share_stmt)).scalar_one_or_none()

    total_skills = len(skill_items)
    coverage_pct = round((verified_count / total_skills) * 100, 1) if total_skills > 0 else 0.0

    stats = PassportStats(
        total_skills=total_skills,
        verified_skills=verified_count,
        unverified_skills=unverified_count,
        expired_skills=expired_count,
        total_evidence_items=len(evidence_items),
        verification_coverage_pct=coverage_pct,
    )

    candidate_summary = PassportCandidateSummary(
        candidate_id=candidate.id,
        user_id=candidate.user_id,
        full_name=candidate.user.full_name if candidate.user else "Candidate",
        headline=candidate.headline,
        current_role=candidate.current_role,
        location_city=candidate.location_city,
        location_state=candidate.location_state,
    )

    last_recalc = (
        max([vs.updated_at for vs in verified_skills] or [datetime.now(UTC)])
        if verified_skills
        else None
    )

    return CandidatePassportResponse(
        candidate=candidate_summary,
        stats=stats,
        skills=skill_items,
        last_recalculated_at=last_recalc,
        share_token=share.share_token if share else None,
        is_share_enabled=share.is_enabled if share else False,
    )


async def get_candidate_evidence_list(
    db: AsyncSession, candidate_id: uuid.UUID
) -> list[SkillEvidenceRead]:
    """Retrieve all evidence records belonging to a candidate."""
    stmt = (
        select(SkillEvidence)
        .options(selectinload(SkillEvidence.skill))
        .where(
            SkillEvidence.candidate_id == candidate_id,
            SkillEvidence.status == EvidenceStatus.VALID,
        )
        .order_by(SkillEvidence.created_at.desc())
    )
    res = await db.execute(stmt)
    evs = res.scalars().all()
    return [
        SkillEvidenceRead(
            id=e.id,
            candidate_id=e.candidate_id,
            skill_id=e.skill_id,
            skill_name=e.skill.name if e.skill else None,
            evidence_type=e.evidence_type,
            source_id=e.source_id,
            title=e.title,
            description=e.description,
            evidence_url=e.evidence_url,
            issued_at=e.issued_at,
            completed_at=e.completed_at,
            meta=e.meta,
            status=e.status,
            created_at=e.created_at,
            updated_at=e.updated_at,
        )
        for e in evs
    ]


async def create_candidate_evidence(
    db: AsyncSession, candidate_id: uuid.UUID, data: SkillEvidenceCreate
) -> SkillEvidenceRead:
    """Candidate submits verifiable evidence (e.g., certification) and triggers recalculation."""
    # Verify skill exists
    skill_stmt = select(Skill).where(Skill.id == data.skill_id)
    skill = (await db.execute(skill_stmt)).scalar_one_or_none()
    if not skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canonical skill not found.",
        )

    ev = SkillEvidence(
        candidate_id=candidate_id,
        skill_id=data.skill_id,
        evidence_type=data.evidence_type,
        title=data.title,
        description=data.description,
        evidence_url=data.evidence_url,
        issued_at=data.issued_at,
        completed_at=data.completed_at,
        meta=data.meta,
        status=EvidenceStatus.VALID,
    )
    db.add(ev)
    await db.flush()

    # Automatically re-run passport recalculation
    await recalculate_candidate_passport(db, candidate_id)

    return SkillEvidenceRead(
        id=ev.id,
        candidate_id=ev.candidate_id,
        skill_id=ev.skill_id,
        skill_name=skill.name,
        evidence_type=ev.evidence_type,
        source_id=ev.source_id,
        title=ev.title,
        description=ev.description,
        evidence_url=ev.evidence_url,
        issued_at=ev.issued_at,
        completed_at=ev.completed_at,
        meta=ev.meta,
        status=ev.status,
        created_at=ev.created_at,
        updated_at=ev.updated_at,
    )


async def delete_candidate_evidence(
    db: AsyncSession, candidate_id: uuid.UUID, evidence_id: uuid.UUID
) -> None:
    """Candidate deletes an evidence item they own and recalculates passport."""
    stmt = select(SkillEvidence).where(
        SkillEvidence.id == evidence_id,
        SkillEvidence.candidate_id == candidate_id,
    )
    res = await db.execute(stmt)
    ev = res.scalar_one_or_none()

    if not ev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found or unauthorized.",
        )

    await db.delete(ev)
    await db.flush()

    # Re-evaluate verification rules
    await recalculate_candidate_passport(db, candidate_id)


async def get_or_create_passport_share(
    db: AsyncSession, candidate_id: uuid.UUID
) -> SkillPassportShare:
    """Get or generate secure public sharing token for candidate."""
    stmt = select(SkillPassportShare).where(SkillPassportShare.candidate_id == candidate_id)
    share = (await db.execute(stmt)).scalar_one_or_none()

    if not share:
        token = secrets.token_urlsafe(32)
        share = SkillPassportShare(
            candidate_id=candidate_id,
            share_token=token,
            is_enabled=False,
        )
        db.add(share)
        await db.commit()
        await db.refresh(share)

    return share


async def toggle_passport_share(
    db: AsyncSession, candidate_id: uuid.UUID, is_enabled: bool
) -> PassportShareResponse:
    """Enable or disable public share link for candidate passport."""
    share = await get_or_create_passport_share(db, candidate_id)
    share.is_enabled = is_enabled
    db.add(share)
    await db.commit()
    await db.refresh(share)

    share_url = f"/passport/share/{share.share_token}" if is_enabled else None
    return PassportShareResponse(
        share_token=share.share_token,
        is_enabled=share.is_enabled,
        share_url=share_url,
    )


async def get_public_passport_by_token(
    db: AsyncSession, share_token: str
) -> PublicPassportResponse:
    """Fetch public read-only passport via cryptographically secure share token."""
    share_stmt = select(SkillPassportShare).where(
        SkillPassportShare.share_token == share_token,
        SkillPassportShare.is_enabled.is_(True),
    )
    share = (await db.execute(share_stmt)).scalar_one_or_none()

    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared skill passport not found or sharing has been revoked.",
        )

    passport = await get_candidate_passport(db, share.candidate_id)

    return PublicPassportResponse(
        candidate=passport.candidate,
        stats=passport.stats,
        skills=passport.skills,
        shared_at=share.updated_at,
    )


async def get_employer_candidate_passport(
    db: AsyncSession, employer_id: uuid.UUID, candidate_id: uuid.UUID
) -> CandidatePassportResponse:
    """Employer view of applicant passport strictly guarded by application connection."""
    # Check if candidate has applied to any job owned by this employer
    app_stmt = (
        select(Application)
        .join(Job, Application.job_id == Job.id)
        .where(
            Application.candidate_id == candidate_id,
            Job.employer_id == employer_id,
        )
    )
    app_res = await db.execute(app_stmt)
    has_application = app_res.scalars().first()

    if not has_application:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Employer is not authorized to view this candidate's passport. "
                "No active job application exists."
            ),
        )

    return await get_candidate_passport(db, candidate_id)
