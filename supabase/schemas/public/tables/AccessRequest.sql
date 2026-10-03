CREATE TABLE "public"."AccessRequest" (
  "id"          text                           NOT NULL,
  "message"     text                           NOT NULL DEFAULT ''::text,
  "createdAt"   timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt"   timestamp(3) without time zone,
  "agentId"     text                           NOT NULL,
  "requesterId" text                           NOT NULL,
  CONSTRAINT "AccessRequest_pkey" PRIMARY KEY (id),
  CONSTRAINT "AccessRequest_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES public."Agent"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "AccessRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

ALTER TABLE "public"."AccessRequest"
  ADD COLUMN "status" public."AccessStatus" NOT NULL DEFAULT 'pending'::public."AccessStatus";

CREATE INDEX "AccessRequest_agentId_idx" ON public."AccessRequest" USING btree ("agentId");

CREATE INDEX "AccessRequest_requesterId_idx" ON public."AccessRequest" USING btree ("requesterId");

ALTER TABLE "public"."AccessRequest" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."AccessRequest" FROM "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."AccessRequest" TO "service_role";

REVOKE ALL ON TABLE "public"."AccessRequest" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."AccessRequest" TO "postgres";
