import { ExtractionSourceType, SkillExtractionResponse } from "@/types/extraction";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function extractSkills(
  text: string,
  sourceType: ExtractionSourceType,
  token: string
): Promise<SkillExtractionResponse> {
  const resp = await fetch(`${API_BASE}/api/v1/skills/extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text, source_type: sourceType }),
  });

  if (resp.status === 401) throw new Error("Unauthorized");
  if (resp.status === 422) {
    const data = await resp.json();
    const detail =
      data?.detail?.[0]?.msg || data?.detail || "Validation error";
    throw new Error(String(detail));
  }
  if (!resp.ok) throw new Error(`Server error: ${resp.status}`);

  return resp.json() as Promise<SkillExtractionResponse>;
}
