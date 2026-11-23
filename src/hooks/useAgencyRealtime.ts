"use client";

import { useEffect, useState, useCallback } from "react";
import { getAgencyBrowserClient as getSupabaseBrowserClient } from "@/lib/supabase/agency";

export interface DbCampaign {
  id: string;
  week_label: string;
  theme: string;
  goal: string;
  status: "draft" | "active" | "completed";
  created_at: string;
}

export interface DbAgentState {
  agent_id: "mateo" | "valeria" | "diego" | "andres" | "camila" | "sofia" | "bruno";
  name: string;
  role: string;
  current_x: number;
  current_y: number;
  status: "idle" | "working" | "walking" | "waiting_approval";
  speech_bubble: string;
  updated_at: string;
}

export interface DbDeliverable {
  id: string;
  campaign_id: string | null;
  platform: "instagram_reel" | "instagram_post" | "tiktok" | "meta_ad";
  scheduled_date: string | null;
  hook_text: string;
  caption_text: string;
  flux_prompt: string;
  image_url: string;
  status: "draft" | "pending_approval" | "approved" | "published" | "rejected";
  created_by_agents: string[];
  feedback_notes: string;
  published_at: string | null;
  created_at: string;
}

export interface DbActivityLog {
  id: string;
  campaign_id: string | null;
  from_agent: string;
  to_agent: string;
  action_message: string;
  created_at: string;
}

export interface DbCampaignMetric {
  id: string;
  deliverable_id: string | null;
  reach: number;
  clicks_to_whatsapp: number;
  new_group_members: number;
  closed_sales_mxn: number;
  updated_at: string;
}

export function useAgencyRealtime() {
  const [campaigns, setCampaigns] = useState<DbCampaign[]>([]);
  const [agentStates, setAgentStates] = useState<DbAgentState[]>([]);
  const [deliverables, setDeliverables] = useState<DbDeliverable[]>([]);
  const [activityLogs, setActivityLogs] = useState<DbActivityLog[]>([]);
  const [metrics, setMetrics] = useState<DbCampaignMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const fetchAll = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const [campRes, agentRes, delivRes, logRes, metRes] = await Promise.all([
      supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("agent_states").select("*"),
      supabase.from("deliverables").select("*").order("created_at", { ascending: false }),
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("campaign_metrics").select("*"),
    ]);

    if (Array.isArray(campRes.data)) setCampaigns(campRes.data as DbCampaign[]);
    if (Array.isArray(agentRes.data)) setAgentStates(agentRes.data as DbAgentState[]);
    if (Array.isArray(delivRes.data)) setDeliverables(delivRes.data as DbDeliverable[]);
    if (Array.isArray(logRes.data)) setActivityLogs((logRes.data as DbActivityLog[]).reverse());
    if (Array.isArray(metRes.data)) setMetrics(metRes.data as DbCampaignMetric[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const supabase = getSupabaseBrowserClient();

    const channel = supabase
      .channel("agency-command-center")
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_states" }, (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const row = payload.new as DbAgentState;
          setAgentStates((prev) => {
            const exists = prev.some((a) => a.agent_id === row.agent_id);
            return exists
              ? prev.map((a) => (a.agent_id === row.agent_id ? row : a))
              : [...prev, row];
          });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "deliverables" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setDeliverables((prev) => [payload.new as DbDeliverable, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          const row = payload.new as DbDeliverable;
          setDeliverables((prev) => prev.map((d) => (d.id === row.id ? row : d)));
        } else if (payload.eventType === "DELETE") {
          const oldRow = payload.old as { id: string };
          setDeliverables((prev) => prev.filter((d) => d.id !== oldRow.id));
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, (payload) => {
        setActivityLogs((prev) => [...prev.slice(-19), payload.new as DbActivityLog]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, () => {
        fetchAll();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "campaign_metrics" }, () => {
        fetchAll();
      })
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const moveAgent = useCallback(
    async (
      agentId: DbAgentState["agent_id"],
      x: number,
      y: number,
      status: DbAgentState["status"],
      speechBubble: string
    ) => {
      const supabase = getSupabaseBrowserClient();
      await (supabase as any)
        .from("agent_states")
        .update({
          current_x: x,
          current_y: y,
          status,
          speech_bubble: speechBubble,
          updated_at: new Date().toISOString(),
        })
        .eq("agent_id", agentId);
    },
    []
  );

  const logActivity = useCallback(
    async (fromAgent: string, toAgent: string, actionMessage: string, campaignId?: string | null) => {
      const supabase = getSupabaseBrowserClient();
      await (supabase as any).from("activity_logs").insert({
        campaign_id: campaignId ?? null,
        from_agent: fromAgent,
        to_agent: toAgent,
        action_message: actionMessage,
      });
    },
    []
  );

  const updateDeliverableCaption = useCallback(async (id: string, captionText: string) => {
    const supabase = getSupabaseBrowserClient();
    await (supabase as any).from("deliverables").update({ caption_text: captionText }).eq("id", id);
  }, []);

  const approveDeliverable = useCallback(async (id: string) => {
    const supabase = getSupabaseBrowserClient();
    await (supabase as any)
      .from("deliverables")
      .update({ status: "approved", published_at: new Date().toISOString() })
      .eq("id", id);
  }, []);

  const sendAgentFeedback = useCallback(async (id: string, feedbackNotes: string) => {
    const supabase = getSupabaseBrowserClient();
    await (supabase as any)
      .from("deliverables")
      .update({ feedback_notes: feedbackNotes, status: "pending_approval" })
      .eq("id", id);
  }, []);

  const upsertMetric = useCallback(
    async (
      deliverableId: string,
      values: { clicks_to_whatsapp?: number; new_group_members?: number; closed_sales_mxn?: number }
    ) => {
      const supabase = getSupabaseBrowserClient();
      const { data: existing } = await (supabase as any)
        .from("campaign_metrics")
        .select("id")
        .eq("deliverable_id", deliverableId)
        .maybeSingle();

      if (existing?.id) {
        await (supabase as any)
          .from("campaign_metrics")
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await (supabase as any).from("campaign_metrics").insert({
          deliverable_id: deliverableId,
          clicks_to_whatsapp: values.clicks_to_whatsapp ?? 0,
          new_group_members: values.new_group_members ?? 0,
          closed_sales_mxn: values.closed_sales_mxn ?? 0,
        });
      }
    },
    []
  );

  return {
    campaigns,
    agentStates,
    deliverables,
    activityLogs,
    metrics,
    loading,
    isConnected,
    moveAgent,
    logActivity,
    updateDeliverableCaption,
    approveDeliverable,
    sendAgentFeedback,
    upsertMetric,
    refresh: fetchAll,
  };
}
