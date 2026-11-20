import { createServerClient } from "@/lib/supabase/server";

export async function getActiveAgencyCampaignContext(): Promise<string> {
  try {
    const supabase = createServerClient() as any;
    const { data } = await supabase
      .from("deliverables")
      .select("hook_text, caption_text, platform")
      .eq("status", "approved")
      .order("published_at", { ascending: false })
      .limit(3);

    if (!Array.isArray(data) || data.length === 0) return "";
    return data
      .map((d: any) => `- [${d.platform}] ${d.hook_text}: ${d.caption_text}`)
      .join("\n");
  } catch {
    return "";
  }
}

export async function reportWhatsappLeadToAgency(leadSummary: string) {
  try {
    const supabase = createServerClient() as any;
    await supabase.from("activity_logs").insert({
      from_agent: "sofia",
      to_agent: "bruno",
      action_message: `Sofía (WhatsApp): ${leadSummary}`,
    });
  } catch {}
}
