CREATE TABLE "public"."Connector" (
  "name"        text                           NOT NULL,
  "title"       text                           NOT NULL,
  "description" text                           NOT NULL,
  "hosts"       text[],
  "secrets"     text[],
  "actions"     jsonb                          NOT NULL,
  "createdAt"   timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   timestamp(3) without time zone NOT NULL,
  "ownerId"     text                           NOT NULL,
  CONSTRAINT "Connector_pkey" PRIMARY KEY (name),
  CONSTRAINT "Connector_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX "Connector_ownerId_idx" ON public."Connector" USING btree ("ownerId");

ALTER TABLE "public"."Connector" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."Connector" FROM "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Connector" TO "service_role";

REVOKE ALL ON TABLE "public"."Connector" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Connector" TO "postgres";
