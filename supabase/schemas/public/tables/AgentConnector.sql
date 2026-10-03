CREATE TABLE "public"."AgentConnector" (
  "agentId"       text   NOT NULL,
  "connectorName" text   NOT NULL,
  "actions"       text[],
  CONSTRAINT "AgentConnector_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES public."Agent"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "AgentConnector_pkey" PRIMARY KEY ("agentId", "connectorName"),
  CONSTRAINT "AgentConnector_connectorName_fkey" FOREIGN KEY ("connectorName") REFERENCES public."Connector"(name) ON UPDATE CASCADE ON DELETE CASCADE
);

ALTER TABLE "public"."AgentConnector" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."AgentConnector" FROM "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."AgentConnector" TO "service_role";

REVOKE ALL ON TABLE "public"."AgentConnector" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."AgentConnector" TO "postgres";
