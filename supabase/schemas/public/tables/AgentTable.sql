CREATE TABLE "public"."AgentTable" (
  "agentId"      text                           NOT NULL,
  "name"         text                           NOT NULL,
  "title"        text                           NOT NULL,
  "context"      text                           NOT NULL DEFAULT ''::text,
  "columns"      jsonb                          NOT NULL DEFAULT '[]'::jsonb,
  "callerAccess" text                           NOT NULL DEFAULT 'own'::text,
  "createdAt"    timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    timestamp(3) without time zone NOT NULL,
  CONSTRAINT "AgentTable_pkey" PRIMARY KEY ("agentId", name),
  CONSTRAINT "AgentTable_callerAccess_check" CHECK ("callerAccess" IN ('none', 'insert', 'own', 'book', 'read', 'write')),
  CONSTRAINT "AgentTable_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES public."Agent"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

ALTER TABLE "public"."AgentTable" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."AgentTable" FROM "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."AgentTable" TO "service_role";

REVOKE ALL ON TABLE "public"."AgentTable" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."AgentTable" TO "postgres";
