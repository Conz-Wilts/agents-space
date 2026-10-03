ALTER TABLE "public"."Agent"
  ADD COLUMN "mode" text NOT NULL DEFAULT 'skill'::text;

ALTER TABLE "public"."Agent"
  ADD CONSTRAINT "Agent_mode_check" CHECK ((mode = ANY (ARRAY['skill'::text, 'scheduled'::text])));

CREATE TABLE "public"."AgentSchedule" (
  "id"         text                           NOT NULL DEFAULT (gen_random_uuid())::text,
  "agentId"    text                           NOT NULL,
  "task"       text                           NOT NULL,
  "cron"       text                           NOT NULL,
  "timezone"   text                           NOT NULL DEFAULT 'UTC'::text,
  "enabled"    boolean                        NOT NULL DEFAULT true,
  "nextRunAt"  timestamp(3) without time zone NOT NULL,
  "lastRunAt"  timestamp(3) without time zone,
  "lastStatus" text,
  "lastResult" text,
  "createdAt"  timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  timestamp(3) without time zone NOT NULL,
  CONSTRAINT "AgentSchedule_pkey" PRIMARY KEY (id),
  CONSTRAINT "AgentSchedule_lastStatus_check" CHECK (("lastStatus" = ANY (ARRAY['ok'::text, 'error'::text])))
);

ALTER TABLE "public"."AgentSchedule"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."AgentSchedule" FROM "anon", "authenticated";

ALTER TABLE "public"."AgentSchedule"
  ADD CONSTRAINT "AgentSchedule_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES public."Agent"(id) ON UPDATE CASCADE ON DELETE CASCADE;

CREATE INDEX "AgentSchedule_enabled_nextRunAt_idx" ON public."AgentSchedule" USING btree (enabled, "nextRunAt");

CREATE INDEX "AgentSchedule_agentId_idx" ON public."AgentSchedule" USING btree ("agentId");

REVOKE ALL ON TABLE "public"."AgentSchedule" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."AgentSchedule" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."AgentSchedule" TO "service_role";
