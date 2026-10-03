CREATE TABLE "public"."User" (
  "id"        text                           NOT NULL,
  "handle"    text                           NOT NULL,
  "keyHash"   text,
  "authId"    text,
  "email"     text,
  "stripeAccountId" text,
  "avatarUrl" text,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY (id)
);

CREATE UNIQUE INDEX "User_authId_key" ON public."User" USING btree ("authId");

CREATE UNIQUE INDEX "User_handle_key" ON public."User" USING btree (handle);

CREATE UNIQUE INDEX "User_stripeAccountId_key" ON public."User" USING btree ("stripeAccountId");

CREATE UNIQUE INDEX "User_keyHash_key" ON public."User" USING btree ("keyHash");

ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."User" FROM "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."User" TO "service_role";

REVOKE ALL ON TABLE "public"."User" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."User" TO "postgres";
