CREATE TABLE "public"."DeviceLogin" (
  "deviceCodeHash" text                           NOT NULL,
  "userCode"       text                           NOT NULL,
  "status"         text                           NOT NULL DEFAULT 'pending'::text,
  "userId"         text,
  "clientName"     text,
  "createdAt"      timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"      timestamp(3) without time zone NOT NULL,
  CONSTRAINT "DeviceLogin_pkey" PRIMARY KEY ("deviceCodeHash"),
  CONSTRAINT "DeviceLogin_status_check" CHECK (status IN ('pending', 'approved', 'denied')),
  CONSTRAINT "DeviceLogin_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE UNIQUE INDEX "DeviceLogin_userCode_key" ON public."DeviceLogin" USING btree ("userCode");

ALTER TABLE "public"."DeviceLogin" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."DeviceLogin" FROM "anon", "authenticated";
