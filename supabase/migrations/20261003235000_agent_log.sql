CREATE TABLE "public"."AgentLog" (
  "id"         text                           NOT NULL DEFAULT (gen_random_uuid())::text,
  "agentId"    text                           NOT NULL,
  "callerId"   text,
  "tool"       text                           NOT NULL,
  "args"       jsonb,
  "ok"         boolean                        NOT NULL,
  "result"     text                           NOT NULL DEFAULT ''::text,
  "durationMs" integer                        NOT NULL DEFAULT 0,
  "createdAt"  timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentLog_pkey" PRIMARY KEY (id),
  CONSTRAINT "AgentLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES public."Agent"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "AgentLog_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX "AgentLog_agentId_createdAt_idx" ON public."AgentLog" USING btree ("agentId", "createdAt" DESC);

CREATE INDEX "AgentLog_agentId_callerId_createdAt_idx" ON public."AgentLog" USING btree ("agentId", "callerId", "createdAt" DESC);

CREATE INDEX "AgentLog_createdAt_idx" ON public."AgentLog" USING btree ("createdAt");

ALTER TABLE "public"."AgentLog" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."AgentLog" FROM "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."AgentLog" TO "service_role";

REVOKE ALL ON TABLE "public"."AgentLog" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."AgentLog" TO "postgres";
