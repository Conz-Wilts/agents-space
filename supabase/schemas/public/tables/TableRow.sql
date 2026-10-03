CREATE TABLE "public"."TableRow" (
  "id"        text                           NOT NULL DEFAULT (gen_random_uuid())::text,
  "agentId"   text                           NOT NULL,
  "tableName" text                           NOT NULL,
  "data"      jsonb                          NOT NULL DEFAULT '{}'::jsonb,
  "createdBy" text,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) without time zone NOT NULL,
  CONSTRAINT "TableRow_pkey" PRIMARY KEY (id),
  CONSTRAINT "TableRow_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES public."Agent"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "TableRow_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX "TableRow_agentId_tableName_createdAt_idx" ON public."TableRow" USING btree ("agentId", "tableName", "createdAt");

ALTER TABLE "public"."TableRow" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."TableRow" FROM "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."TableRow" TO "service_role";

REVOKE ALL ON TABLE "public"."TableRow" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."TableRow" TO "postgres";
