CREATE TABLE "public"."Price" (
  "agentId"     text                           NOT NULL,
  "name"        text                           NOT NULL,
  "title"       text                           NOT NULL,
  "description" text                           NOT NULL DEFAULT ''::text,
  "amount"      integer                        NOT NULL,
  "currency"    text                           NOT NULL,
  "updatedAt"   timestamp(3) without time zone NOT NULL,
  CONSTRAINT "Price_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES public."Agent"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "Price_pkey" PRIMARY KEY ("agentId", name),
  CONSTRAINT "Price_amount_check" CHECK (amount > 0)
);

ALTER TABLE "public"."Price" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."Price" FROM "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Price" TO "service_role";

REVOKE ALL ON TABLE "public"."Price" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Price" TO "postgres";
