CREATE TABLE "public"."Agent" (
  "id"           text                           NOT NULL,
  "name"         text                           NOT NULL,
  "tagline"      text                           NOT NULL,
  "description"  text                           NOT NULL,
  "solves"       text[],
  "tools"        text[],
  "category"     text                           NOT NULL,
  "endpoint"     text,
  "owner"        text                           NOT NULL,
  "instructions" text                           NOT NULL DEFAULT ''::text,
  "createdAt"    timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ownerId"      text,
  CONSTRAINT "Agent_pkey" PRIMARY KEY (id),
  CONSTRAINT "Agent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL
);

ALTER TABLE "public"."Agent"
  ADD COLUMN "kind" public."AgentKind" NOT NULL DEFAULT 'external'::public."AgentKind";

ALTER TABLE "public"."Agent"
  ADD COLUMN "status" public."AgentStatus" NOT NULL DEFAULT 'published'::public."AgentStatus";

ALTER TABLE "public"."Agent"
  ADD COLUMN "pricing" public."Pricing" NOT NULL DEFAULT 'free'::public."Pricing";

ALTER TABLE "public"."Agent"
  ADD COLUMN "protocol" public."Protocol" NOT NULL DEFAULT 'mcp'::public."Protocol";

ALTER TABLE "public"."Agent"
  ADD COLUMN "visibility" public."Visibility" NOT NULL DEFAULT 'public'::public."Visibility";

CREATE INDEX "Agent_ownerId_idx" ON public."Agent" USING btree ("ownerId");

CREATE INDEX "Agent_status_idx" ON public."Agent" USING btree (status);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Agent" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Agent" TO "service_role";

REVOKE ALL ON TABLE "public"."Agent" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Agent" TO "postgres";
