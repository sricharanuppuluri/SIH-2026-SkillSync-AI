"""Deterministic and idempotent canonical skill catalog seeder."""

import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.skill import (
    Skill,
    SkillAlias,
    SkillRelationship,
    SkillRelationshipType,
    SkillStatus,
    SkillType,
)
from app.services.skill_service import (
    generate_slug,
    normalize_alias_text,
    normalize_skill_name,
)

logger = logging.getLogger(__name__)

# Canonical skills dataset
CANONICAL_SKILLS_DATA: list[dict] = [
    # Programming
    {
        "name": "Python",
        "category": "Programming",
        "subcategory": "Backend",
        "skill_type": SkillType.TECHNICAL,
        "description": "General-purpose language known for readability and vast ecosystem.",
        "aliases": ["python3", "python 3", "py"],
    },
    {
        "name": "Java",
        "category": "Programming",
        "subcategory": "Enterprise",
        "skill_type": SkillType.TECHNICAL,
        "description": "Object-oriented language commonly used for enterprise backend systems.",
        "aliases": ["java se", "java ee"],
    },
    {
        "name": "JavaScript",
        "category": "Programming",
        "subcategory": "Web",
        "skill_type": SkillType.TECHNICAL,
        "description": "High-level language powering interactive modern web applications.",
        "aliases": ["js", "ecmascript"],
    },
    {
        "name": "TypeScript",
        "category": "Programming",
        "subcategory": "Web",
        "skill_type": SkillType.TECHNICAL,
        "description": "Statically typed superset of JavaScript compiling to plain JavaScript.",
        "aliases": ["ts"],
        "parent": "JavaScript",
    },
    {
        "name": "C",
        "category": "Programming",
        "subcategory": "Systems",
        "skill_type": SkillType.TECHNICAL,
        "description": "Low-level procedural language for systems and embedded development.",
        "aliases": ["c lang", "ansi c"],
    },
    {
        "name": "C++",
        "category": "Programming",
        "subcategory": "Systems",
        "skill_type": SkillType.TECHNICAL,
        "description": "General-purpose language with low-level memory access and OOP.",
        "aliases": ["cpp", "cplusplus"],
    },
    {
        "name": "Go",
        "category": "Programming",
        "subcategory": "Cloud & Systems",
        "skill_type": SkillType.TECHNICAL,
        "description": "Statically typed language engineered by Google for concurrent computing.",
        "aliases": ["golang"],
    },
    {
        "name": "Rust",
        "category": "Programming",
        "subcategory": "Systems",
        "skill_type": SkillType.TECHNICAL,
        "description": "Systems programming language focusing on safety, speed, and concurrency.",
        "aliases": ["rustlang"],
    },
    # Web Development
    {
        "name": "HTML",
        "category": "Web",
        "subcategory": "Frontend",
        "skill_type": SkillType.TECHNICAL,
        "description": "Standard markup language for documents displayed in a browser.",
        "aliases": ["html5"],
    },
    {
        "name": "CSS",
        "category": "Web",
        "subcategory": "Frontend",
        "skill_type": SkillType.TECHNICAL,
        "description": "Style sheet language used for describing presentation of HTML documents.",
        "aliases": ["css3", "cascading style sheets"],
    },
    {
        "name": "React",
        "category": "Web",
        "subcategory": "Frontend",
        "skill_type": SkillType.TECHNICAL,
        "description": "Declarative front-end JavaScript library for building user interfaces.",
        "aliases": ["reactjs", "react.js"],
        "parent": "JavaScript",
    },
    {
        "name": "Next.js",
        "category": "Web",
        "subcategory": "Fullstack",
        "skill_type": SkillType.TECHNICAL,
        "description": "React framework for full-stack apps with server-side rendering.",
        "aliases": ["nextjs"],
        "parent": "React",
    },
    {
        "name": "Node.js",
        "category": "Web",
        "subcategory": "Backend",
        "skill_type": SkillType.TECHNICAL,
        "description": "Cross-platform JavaScript runtime environment outside a browser.",
        "aliases": ["nodejs", "node"],
        "parent": "JavaScript",
    },
    # Data
    {
        "name": "SQL",
        "category": "Data",
        "subcategory": "Relational Databases",
        "skill_type": SkillType.TECHNICAL,
        "description": "Domain-specific language for managing relational databases.",
        "aliases": ["structured query language"],
    },
    {
        "name": "PostgreSQL",
        "category": "Data",
        "subcategory": "Relational Databases",
        "skill_type": SkillType.TECHNICAL,
        "description": "Open-source object-relational database emphasizing SQL compliance.",
        "aliases": ["postgres", "pgsql"],
        "parent": "SQL",
    },
    {
        "name": "MySQL",
        "category": "Data",
        "subcategory": "Relational Databases",
        "skill_type": SkillType.TECHNICAL,
        "description": "Widely deployed open-source relational database management system.",
        "aliases": ["my-sql"],
        "parent": "SQL",
    },
    {
        "name": "Data Analysis",
        "category": "Data",
        "subcategory": "Analytics",
        "skill_type": SkillType.TECHNICAL,
        "description": "Inspecting, cleansing, and modeling data to discover useful insights.",
        "aliases": ["data analytics"],
    },
    {
        "name": "Data Visualization",
        "category": "Data",
        "subcategory": "Analytics",
        "skill_type": SkillType.TECHNICAL,
        "description": "Graphical representation of data to communicate trends clearly.",
        "aliases": ["data viz", "dataviz"],
    },
    # AI / ML
    {
        "name": "Machine Learning",
        "category": "AI/ML",
        "subcategory": "Core AI",
        "skill_type": SkillType.TECHNICAL,
        "description": "Algorithms giving computers ability to learn from data patterns.",
        "aliases": ["ml"],
    },
    {
        "name": "Deep Learning",
        "category": "AI/ML",
        "subcategory": "Neural Networks",
        "skill_type": SkillType.TECHNICAL,
        "description": "Subfield of ML based on artificial neural networks.",
        "aliases": ["dl"],
        "parent": "Machine Learning",
    },
    {
        "name": "Natural Language Processing",
        "category": "AI/ML",
        "subcategory": "Language",
        "skill_type": SkillType.TECHNICAL,
        "description": "Subfield of AI concerned with processing human language.",
        "aliases": ["nlp"],
        "parent": "Machine Learning",
    },
    {
        "name": "Computer Vision",
        "category": "AI/ML",
        "subcategory": "Vision",
        "skill_type": SkillType.TECHNICAL,
        "description": "Deals with how computers gain understanding from digital images.",
        "aliases": ["cv"],
        "parent": "Machine Learning",
    },
    {
        "name": "Generative AI",
        "category": "AI/ML",
        "subcategory": "Generative Models",
        "skill_type": SkillType.TECHNICAL,
        "description": "AI capable of generating text, images, or media using neural models.",
        "aliases": ["genai", "gen ai"],
        "parent": "Deep Learning",
    },
    {
        "name": "Large Language Models",
        "category": "AI/ML",
        "subcategory": "Language",
        "skill_type": SkillType.TECHNICAL,
        "description": "Deep learning models capable of language comprehension and generation.",
        "aliases": ["llm", "llms"],
        "parent": "Natural Language Processing",
    },
    # Cloud / DevOps
    {
        "name": "Docker",
        "category": "Cloud/DevOps",
        "subcategory": "Containers",
        "skill_type": SkillType.TOOL,
        "description": "Virtualization platform delivering applications in containers.",
        "aliases": ["docker container"],
    },
    {
        "name": "Kubernetes",
        "category": "Cloud/DevOps",
        "subcategory": "Orchestration",
        "skill_type": SkillType.TOOL,
        "description": "Container orchestration system for automating deployment and ops.",
        "aliases": ["k8s"],
    },
    {
        "name": "AWS",
        "category": "Cloud/DevOps",
        "subcategory": "Cloud Platforms",
        "skill_type": SkillType.TOOL,
        "description": "Comprehensive, evolving cloud computing platform from Amazon.",
        "aliases": ["amazon web services"],
    },
    {
        "name": "Microsoft Azure",
        "category": "Cloud/DevOps",
        "subcategory": "Cloud Platforms",
        "skill_type": SkillType.TOOL,
        "description": "Cloud computing platform provided by Microsoft for services.",
        "aliases": ["azure", "ms azure"],
    },
    {
        "name": "Google Cloud",
        "category": "Cloud/DevOps",
        "subcategory": "Cloud Platforms",
        "skill_type": SkillType.TOOL,
        "description": "Suite of cloud computing services running on Google infrastructure.",
        "aliases": ["gcp", "google cloud platform"],
    },
    {
        "name": "CI/CD",
        "category": "Cloud/DevOps",
        "subcategory": "Automation",
        "skill_type": SkillType.TECHNICAL,
        "description": "Practices of continuous integration and continuous deployment.",
        "aliases": ["cicd", "continuous integration"],
    },
    {
        "name": "Git",
        "category": "Cloud/DevOps",
        "subcategory": "Version Control",
        "skill_type": SkillType.TOOL,
        "description": "Distributed version control system for tracking source changes.",
        "aliases": ["git vcs"],
    },
    # Cybersecurity
    {
        "name": "Cybersecurity",
        "category": "Cybersecurity",
        "subcategory": "Security Fundamentals",
        "skill_type": SkillType.TECHNICAL,
        "description": "Protecting systems, networks, and programs from digital attacks.",
        "aliases": ["infosec", "information security"],
    },
    {
        "name": "Network Security",
        "category": "Cybersecurity",
        "subcategory": "Infrastructure Security",
        "skill_type": SkillType.TECHNICAL,
        "description": "Policies adopted to prevent unauthorized access to networks.",
        "aliases": ["netsec"],
        "parent": "Cybersecurity",
    },
    {
        "name": "Application Security",
        "category": "Cybersecurity",
        "subcategory": "Software Security",
        "skill_type": SkillType.TECHNICAL,
        "description": "Adding security controls in applications to prevent threats.",
        "aliases": ["appsec"],
        "parent": "Cybersecurity",
    },
    {
        "name": "Ethical Hacking",
        "category": "Cybersecurity",
        "subcategory": "Offensive Security",
        "skill_type": SkillType.TECHNICAL,
        "description": "Authorized testing of system security to identify vulnerabilities.",
        "aliases": ["penetration testing", "pen testing", "white hat"],
        "parent": "Cybersecurity",
    },
    # Soft Skills
    {
        "name": "Communication",
        "category": "Soft Skills",
        "subcategory": "Interpersonal",
        "skill_type": SkillType.SOFT,
        "description": "Conveying ideas and information effectively across diverse audiences.",
        "aliases": ["verbal communication", "written communication"],
    },
    {
        "name": "Leadership",
        "category": "Soft Skills",
        "subcategory": "Management",
        "skill_type": SkillType.SOFT,
        "description": "Motivating a team of people to act toward achieving a common goal.",
        "aliases": ["team leadership"],
    },
    {
        "name": "Teamwork",
        "category": "Soft Skills",
        "subcategory": "Interpersonal",
        "skill_type": SkillType.SOFT,
        "description": "Collaborative effort of a group to achieve common objectives.",
        "aliases": ["collaboration"],
    },
    {
        "name": "Problem Solving",
        "category": "Soft Skills",
        "subcategory": "Analytical",
        "skill_type": SkillType.SOFT,
        "description": "Defining a problem, determining cause, and executing a solution.",
        "aliases": ["critical thinking"],
    },
    {
        "name": "Time Management",
        "category": "Soft Skills",
        "subcategory": "Productivity",
        "skill_type": SkillType.SOFT,
        "description": "Planning and exercising conscious control of time spent on tasks.",
        "aliases": ["prioritization"],
    },
    {
        "name": "Project Management",
        "category": "Soft Skills",
        "subcategory": "Execution",
        "skill_type": SkillType.SOFT,
        "description": "Initiating, planning, and executing work to meet defined goals.",
        "aliases": ["project coordination"],
    },
]

# Canonical relationships dataset: (source_name, target_name, type, weight)
CANONICAL_RELATIONSHIPS_DATA: list[tuple[str, str, SkillRelationshipType, float]] = [
    ("Python", "Machine Learning", SkillRelationshipType.RELATED, 1.0),
    ("Python", "Data Analysis", SkillRelationshipType.RELATED, 1.0),
    ("SQL", "PostgreSQL", SkillRelationshipType.PREREQUISITE, 1.2),
    ("SQL", "MySQL", SkillRelationshipType.PREREQUISITE, 1.2),
    ("Docker", "Kubernetes", SkillRelationshipType.PREREQUISITE, 1.3),
    ("JavaScript", "React", SkillRelationshipType.PREREQUISITE, 1.5),
    ("React", "Next.js", SkillRelationshipType.PREREQUISITE, 1.4),
    ("JavaScript", "TypeScript", SkillRelationshipType.PREREQUISITE, 1.2),
    ("JavaScript", "Node.js", SkillRelationshipType.PREREQUISITE, 1.3),
    ("HTML", "CSS", SkillRelationshipType.COMPLEMENTARY, 1.1),
    ("HTML", "JavaScript", SkillRelationshipType.COMPLEMENTARY, 1.2),
    ("Machine Learning", "Deep Learning", SkillRelationshipType.PREREQUISITE, 1.3),
    ("Deep Learning", "Large Language Models", SkillRelationshipType.PREREQUISITE, 1.2),
    ("Deep Learning", "Generative AI", SkillRelationshipType.PREREQUISITE, 1.2),
    ("Deep Learning", "Computer Vision", SkillRelationshipType.RELATED, 1.1),
    ("Git", "CI/CD", SkillRelationshipType.COMPLEMENTARY, 1.1),
    ("Docker", "CI/CD", SkillRelationshipType.COMPLEMENTARY, 1.2),
    ("AWS", "Docker", SkillRelationshipType.COMPLEMENTARY, 1.0),
    ("Cybersecurity", "Network Security", SkillRelationshipType.PREREQUISITE, 1.2),
    ("Cybersecurity", "Application Security", SkillRelationshipType.PREREQUISITE, 1.2),
    ("Cybersecurity", "Ethical Hacking", SkillRelationshipType.PREREQUISITE, 1.3),
    ("Communication", "Leadership", SkillRelationshipType.COMPLEMENTARY, 1.0),
    ("Teamwork", "Leadership", SkillRelationshipType.COMPLEMENTARY, 1.0),
    ("Problem Solving", "Leadership", SkillRelationshipType.COMPLEMENTARY, 1.0),
]


async def seed_canonical_skills(db: AsyncSession) -> dict[str, int]:
    """Idempotently seed canonical skills, hierarchy, aliases, and relationships."""
    skills_created = 0
    aliases_created = 0
    relationships_created = 0

    name_to_skill: dict[str, Skill] = {}

    # Pass 1: Upsert Skills
    for data in CANONICAL_SKILLS_DATA:
        norm_name = normalize_skill_name(data["name"])
        slug = generate_slug(data["name"])

        # Check existing skill
        existing = await db.execute(select(Skill).where(Skill.normalized_name == norm_name))
        skill = existing.scalars().first()

        if not skill:
            skill = Skill(
                name=data["name"],
                slug=slug,
                normalized_name=norm_name,
                category=data["category"],
                subcategory=data.get("subcategory"),
                description=data.get("description"),
                skill_type=data["skill_type"],
                status=SkillStatus.ACTIVE,
            )
            db.add(skill)
            await db.flush()
            skills_created += 1
        else:
            # Update canonical fields if needed
            if not skill.slug:
                skill.slug = slug
            if data.get("subcategory") and not skill.subcategory:
                skill.subcategory = data["subcategory"]
            if data.get("description") and not skill.description:
                skill.description = data["description"]
            skill.category = data["category"]
            skill.skill_type = data["skill_type"]
            skill.status = SkillStatus.ACTIVE

        name_to_skill[data["name"]] = skill

    await db.flush()

    # Pass 2: Set Hierarchy (parent_skill_id)
    for data in CANONICAL_SKILLS_DATA:
        parent_name = data.get("parent")
        if parent_name and parent_name in name_to_skill:
            skill = name_to_skill[data["name"]]
            parent_skill = name_to_skill[parent_name]
            if skill.id != parent_skill.id:
                skill.parent_skill_id = parent_skill.id

    await db.flush()

    # Pass 3: Upsert Aliases
    for data in CANONICAL_SKILLS_DATA:
        skill = name_to_skill[data["name"]]
        aliases = data.get("aliases", [])

        for alias_text in aliases:
            norm_alias = normalize_alias_text(alias_text)
            existing_alias = await db.execute(
                select(SkillAlias).where(SkillAlias.normalized_alias == norm_alias)
            )
            if not existing_alias.scalars().first():
                new_alias = SkillAlias(
                    skill_id=skill.id,
                    alias=alias_text.strip(),
                    normalized_alias=norm_alias,
                )
                db.add(new_alias)
                aliases_created += 1

    await db.flush()

    # Pass 4: Upsert Relationships
    for src_name, tgt_name, rel_type, weight in CANONICAL_RELATIONSHIPS_DATA:
        if src_name in name_to_skill and tgt_name in name_to_skill:
            src_skill = name_to_skill[src_name]
            tgt_skill = name_to_skill[tgt_name]

            if src_skill.id == tgt_skill.id:
                continue

            existing_rel = await db.execute(
                select(SkillRelationship).where(
                    SkillRelationship.source_skill_id == src_skill.id,
                    SkillRelationship.target_skill_id == tgt_skill.id,
                    SkillRelationship.relationship_type == rel_type,
                )
            )
            if not existing_rel.scalars().first():
                rel = SkillRelationship(
                    source_skill_id=src_skill.id,
                    target_skill_id=tgt_skill.id,
                    relationship_type=rel_type,
                    weight=weight,
                )
                db.add(rel)
                relationships_created += 1

    await db.commit()
    logger.info(
        "Seeding completed: %d skills created, %d aliases created, %d relationships created",
        skills_created,
        aliases_created,
        relationships_created,
    )

    return {
        "skills_created": skills_created,
        "aliases_created": aliases_created,
        "relationships_created": relationships_created,
    }


if __name__ == "__main__":
    from app.core.database import AsyncSessionLocal

    async def main() -> None:
        async with AsyncSessionLocal() as session:
            res = await seed_canonical_skills(session)
            print(f"Seed completed: {res}")

    asyncio.run(main())
