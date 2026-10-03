CREATE TABLE "public"."AiModel" (
  "name"          text                           NOT NULL,
  "title"         text                           NOT NULL,
  "provider"      text                           NOT NULL,
  "modelId"       text                           NOT NULL,
  "baseUrl"       text,
  "keyCiphertext" text,
  "ownerId"       text                           NOT NULL,
  "createdAt"     timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     timestamp(3) without time zone NOT NULL,
  CONSTRAINT "AiModel_pkey" PRIMARY KEY (name),
  CONSTRAINT "AiModel_provider_check" CHECK ((provider = ANY (ARRAY['gateway'::text, 'openai'::text, 'anthropic'::text, 'google'::text, 'openrouter'::text, 'custom'::text])))
);

ALTER TABLE "public"."AiModel"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."AiModel" FROM "anon", "authenticated";

ALTER TABLE "public"."AiModel"
  ADD CONSTRAINT "AiModel_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

CREATE INDEX "AiModel_ownerId_idx" ON public."AiModel" USING btree ("ownerId");

REVOKE ALL ON TABLE "public"."AiModel" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."AiModel" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."AiModel" TO "service_role";

ALTER TABLE "public"."Agent"
  ADD COLUMN "model" text;

ALTER TABLE "public"."Agent"
  ADD CONSTRAINT "Agent_model_fkey" FOREIGN KEY (model) REFERENCES public."AiModel"(name) ON UPDATE CASCADE ON DELETE SET NULL;
