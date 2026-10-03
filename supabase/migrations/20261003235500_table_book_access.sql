ALTER TABLE "public"."AgentTable" DROP CONSTRAINT "AgentTable_callerAccess_check";

ALTER TABLE "public"."AgentTable"
  ADD CONSTRAINT "AgentTable_callerAccess_check" CHECK ("callerAccess" IN ('none', 'insert', 'own', 'book', 'read', 'write'));
