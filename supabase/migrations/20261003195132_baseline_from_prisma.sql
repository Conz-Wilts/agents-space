CREATE TABLE "public"."AccessRequest" (
  "id"          text                           NOT NULL,
  "message"     text                           NOT NULL DEFAULT ''::text,
  "createdAt"   timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt"   timestamp(3) without time zone,
  "agentId"     text                           NOT NULL,
  "requesterId" text                           NOT NULL,
  CONSTRAINT "AccessRequest_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."AgentConnector" (
  "agentId"       text   NOT NULL,
  "connectorName" text   NOT NULL,
  "actions"       text[],
  CONSTRAINT "AgentConnector_pkey" PRIMARY KEY ("agentId", "connectorName")
);

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
  CONSTRAINT "Agent_pkey" PRIMARY KEY (id)
);

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

CREATE TABLE "public"."ConnectorSecret" (
  "connectorName" text                           NOT NULL,
  "name"          text                           NOT NULL,
  "ciphertext"    text                           NOT NULL,
  "updatedAt"     timestamp(3) without time zone NOT NULL,
  CONSTRAINT "ConnectorSecret_pkey" PRIMARY KEY ("connectorName", name)
);

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
  CONSTRAINT "Connector_pkey" PRIMARY KEY (name)
);

CREATE TABLE "public"."ContextNote" (
  "agentId"   text                           NOT NULL,
  "slug"      text                           NOT NULL,
  "title"     text                           NOT NULL,
  "body"      text                           NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL,
  CONSTRAINT "ContextNote_pkey" PRIMARY KEY ("agentId", slug)
);

CREATE TABLE "public"."User" (
  "id"        text                           NOT NULL,
  "handle"    text                           NOT NULL,
  "keyHash"   text,
  "authId"    text,
  "email"     text,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY (id)
);

CREATE TYPE "public"."AccessStatus" AS ENUM (
  'pending',
  'approved',
  'denied'
);

ALTER TABLE "public"."AccessRequest"
  ADD COLUMN "status" public."AccessStatus" NOT NULL DEFAULT 'pending'::public."AccessStatus";

CREATE TYPE "public"."AgentKind" AS ENUM (
  'hosted',
  'external'
);

ALTER TABLE "public"."Agent"
  ADD COLUMN "kind" public."AgentKind" NOT NULL DEFAULT 'external'::public."AgentKind";

CREATE TYPE "public"."AgentStatus" AS ENUM (
  'draft',
  'published'
);

ALTER TABLE "public"."Agent"
  ADD COLUMN "status" public."AgentStatus" NOT NULL DEFAULT 'published'::public."AgentStatus";

CREATE TYPE "public"."Pricing" AS ENUM (
  'free',
  'usage',
  'subscription',
  'contact'
);

ALTER TABLE "public"."Agent"
  ADD COLUMN "pricing" public."Pricing" NOT NULL DEFAULT 'free'::public."Pricing";

CREATE TYPE "public"."Protocol" AS ENUM (
  'mcp',
  'a2a',
  'api',
  'web'
);

ALTER TABLE "public"."Agent"
  ADD COLUMN "protocol" public."Protocol" NOT NULL DEFAULT 'mcp'::public."Protocol";

CREATE TYPE "public"."Visibility" AS ENUM (
  'public',
  'private'
);

ALTER TABLE "public"."Agent"
  ADD COLUMN "visibility" public."Visibility" NOT NULL DEFAULT 'public'::public."Visibility";

ALTER TABLE "public"."AccessRequest"
  ADD CONSTRAINT "AccessRequest_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES public."Agent"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."AgentConnector"
  ADD CONSTRAINT "AgentConnector_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES public."Agent"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."AgentConnector"
  ADD CONSTRAINT "AgentConnector_connectorName_fkey" FOREIGN KEY ("connectorName") REFERENCES public."Connector"(name) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."ConnectorSecret"
  ADD CONSTRAINT "ConnectorSecret_connectorName_fkey" FOREIGN KEY ("connectorName") REFERENCES public."Connector"(name) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."ContextNote"
  ADD CONSTRAINT "ContextNote_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES public."Agent"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."AccessRequest"
  ADD CONSTRAINT "AccessRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."Agent"
  ADD CONSTRAINT "Agent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "public"."Connector"
  ADD CONSTRAINT "Connector_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

CREATE INDEX "AccessRequest_agentId_idx" ON public."AccessRequest" USING btree ("agentId");

CREATE INDEX "AccessRequest_requesterId_idx" ON public."AccessRequest" USING btree ("requesterId");

CREATE INDEX "Agent_ownerId_idx" ON public."Agent" USING btree ("ownerId");

CREATE INDEX "Agent_status_idx" ON public."Agent" USING btree (status);

CREATE INDEX "Connector_ownerId_idx" ON public."Connector" USING btree ("ownerId");

CREATE UNIQUE INDEX "User_authId_key" ON public."User" USING btree ("authId");

CREATE UNIQUE INDEX "User_handle_key" ON public."User" USING btree (handle);

CREATE UNIQUE INDEX "User_keyHash_key" ON public."User" USING btree ("keyHash");

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."AccessRequest" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."AccessRequest" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."AccessRequest" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."AccessRequest" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Agent" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."Agent" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Agent" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Agent" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."AgentConnector" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."AgentConnector" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."AgentConnector" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."AgentConnector" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Bottleneck" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."Bottleneck" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Bottleneck" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Bottleneck" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Connector" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."Connector" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Connector" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Connector" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ConnectorSecret" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."ConnectorSecret" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ConnectorSecret" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ConnectorSecret" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ContextNote" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."ContextNote" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ContextNote" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ContextNote" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."User" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."User" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."User" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."User" TO "service_role";
