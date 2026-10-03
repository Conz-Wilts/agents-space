CREATE TABLE "public"."DeviceLogin" (
  "deviceCodeHash" text                           NOT NULL,
  "userCode"       text                           NOT NULL,
  "status"         text                           NOT NULL DEFAULT 'pending'::text,
  "userId"         text,
  "clientName"     text,
  "createdAt"      timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"      timestamp(3) without time zone NOT NULL,
  CONSTRAINT "DeviceLogin_pkey" PRIMARY KEY ("deviceCodeHash"),
  CONSTRAINT "DeviceLogin_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'denied'::text])))
);

ALTER TABLE "public"."DeviceLogin"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."DeviceLogin" FROM "anon", "authenticated";

ALTER TABLE "public"."DeviceLogin"
  ADD CONSTRAINT "DeviceLogin_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

CREATE UNIQUE INDEX "DeviceLogin_userCode_key" ON public."DeviceLogin" USING btree ("userCode");

REVOKE ALL ON TABLE "public"."DeviceLogin" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."DeviceLogin" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."DeviceLogin" TO "service_role";
