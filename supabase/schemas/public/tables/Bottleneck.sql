CREATE TABLE "public"."Bottleneck" (
  "id"              text                           NOT NULL,
  "role"            text                           NOT NULL,
  "description"     text                           NOT NULL,
  "tools"           text[],
  "hoursPerWeek"    double precision,
  "matchedAgentIds" text[],
  "createdAt"       timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Bottleneck_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."Bottleneck" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."Bottleneck" FROM "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Bottleneck" TO "service_role";

REVOKE ALL ON TABLE "public"."Bottleneck" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Bottleneck" TO "postgres";
