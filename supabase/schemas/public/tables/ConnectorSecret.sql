CREATE TABLE "public"."ConnectorSecret" (
  "connectorName" text                           NOT NULL,
  "name"          text                           NOT NULL,
  "ciphertext"    text                           NOT NULL,
  "updatedAt"     timestamp(3) without time zone NOT NULL,
  CONSTRAINT "ConnectorSecret_connectorName_fkey" FOREIGN KEY ("connectorName") REFERENCES public."Connector"(name) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "ConnectorSecret_pkey" PRIMARY KEY ("connectorName", name)
);

ALTER TABLE "public"."ConnectorSecret" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."ConnectorSecret" FROM "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ConnectorSecret" TO "service_role";

REVOKE ALL ON TABLE "public"."ConnectorSecret" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ConnectorSecret" TO "postgres";
