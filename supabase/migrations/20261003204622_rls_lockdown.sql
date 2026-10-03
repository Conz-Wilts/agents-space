SET lock_timeout = '5s';

ALTER TABLE "public"."User"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."User" FROM "anon", "authenticated";

ALTER TABLE "public"."Agent"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."Agent" FROM "anon", "authenticated";

ALTER TABLE "public"."ContextNote"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."ContextNote" FROM "anon", "authenticated";

ALTER TABLE "public"."Connector"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."Connector" FROM "anon", "authenticated";

ALTER TABLE "public"."ConnectorSecret"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."ConnectorSecret" FROM "anon", "authenticated";

ALTER TABLE "public"."AgentConnector"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."AgentConnector" FROM "anon", "authenticated";

ALTER TABLE "public"."AccessRequest"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."AccessRequest" FROM "anon", "authenticated";

ALTER TABLE "public"."Bottleneck"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."Bottleneck" FROM "anon", "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLES FROM "authenticated";
