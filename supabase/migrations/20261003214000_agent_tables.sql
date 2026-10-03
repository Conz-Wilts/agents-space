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
  CONSTRAINT "AgentTable_callerAccess_check" CHECK (("callerAccess" = ANY (ARRAY['none'::text, 'insert'::text, 'own'::text, 'read'::text, 'write'::text])))
);

ALTER TABLE "public"."AgentTable"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."AgentTable" FROM "anon", "authenticated";

ALTER TABLE "public"."AgentTable"
  ADD CONSTRAINT "AgentTable_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES public."Agent"(id) ON UPDATE CASCADE ON DELETE CASCADE;

REVOKE ALL ON TABLE "public"."AgentTable" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."AgentTable" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."AgentTable" TO "service_role";

CREATE TABLE "public"."TableRow" (
  "id"        text                           NOT NULL DEFAULT (gen_random_uuid())::text,
  "agentId"   text                           NOT NULL,
  "tableName" text                           NOT NULL,
  "data"      jsonb                          NOT NULL DEFAULT '{}'::jsonb,
  "createdBy" text,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) without time zone NOT NULL,
  CONSTRAINT "TableRow_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."TableRow"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."TableRow" FROM "anon", "authenticated";

ALTER TABLE "public"."TableRow"
  ADD CONSTRAINT "TableRow_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES public."Agent"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."TableRow"
  ADD CONSTRAINT "TableRow_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX "TableRow_agentId_tableName_createdAt_idx" ON public."TableRow" USING btree ("agentId", "tableName", "createdAt");

REVOKE ALL ON TABLE "public"."TableRow" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."TableRow" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."TableRow" TO "service_role";
