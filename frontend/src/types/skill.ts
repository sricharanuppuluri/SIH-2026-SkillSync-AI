/**
 * Skill Intelligence domain types.
 */

export type SkillType = "TECHNICAL" | "SOFT" | "DOMAIN" | "TOOL" | "CERTIFICATION" | "OTHER";

export type SkillStatus = "ACTIVE" | "INACTIVE";

export type SkillRelationshipType = "RELATED" | "PREREQUISITE" | "COMPLEMENTARY";

export interface SkillCatalogItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  subcategory?: string | null;
  skill_type: SkillType;
}

export interface SkillAlias {
  id: string;
  skill_id: string;
  alias: string;
  normalized_alias: string;
  created_at: string;
}

export interface SkillRelationship {
  id: string;
  source_skill_id: string;
  target_skill_id: string;
  relationship_type: SkillRelationshipType;
  weight: number;
  created_at: string;
  source_skill_name?: string | null;
  target_skill_name?: string | null;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  normalized_name: string;
  category: string;
  subcategory?: string | null;
  description?: string | null;
  skill_type: SkillType;
  status: SkillStatus;
  parent_skill_id?: string | null;
  parent_name?: string | null;
  aliases_count?: number;
  created_at: string;
  updated_at: string;
}

export interface SkillDetail extends Skill {
  parent?: Skill | null;
  children: Skill[];
  aliases: SkillAlias[];
  outbound_relationships: SkillRelationship[];
  inbound_relationships: SkillRelationship[];
}

export interface SkillCreateInput {
  name: string;
  slug?: string;
  category: string;
  subcategory?: string;
  description?: string;
  skill_type?: SkillType;
  status?: SkillStatus;
  parent_skill_id?: string;
}

export interface SkillUpdateInput {
  name?: string;
  slug?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  skill_type?: SkillType;
  status?: SkillStatus;
  parent_skill_id?: string | null;
}

export interface SkillAliasCreateInput {
  alias: string;
}

export interface SkillRelationshipCreateInput {
  target_skill_id: string;
  relationship_type?: SkillRelationshipType;
  weight?: number;
}
