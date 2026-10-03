CREATE TABLE "public"."ContextNote" (
  "agentId"   text                           NOT NULL,
  "slug"      text                           NOT NULL,
  "title"     text                           NOT NULL,
  "body"      text                           NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL,
  CONSTRAINT "ContextNote_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES public."Agent"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "ContextNote_pkey" PRIMARY KEY ("agentId", slug)
);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ContextNote" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ContextNote" TO "service_role";

REVOKE ALL ON TABLE "public"."ContextNote" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ContextNote" TO "postgres";
