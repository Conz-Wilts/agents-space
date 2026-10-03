ALTER TABLE "public"."User" ADD COLUMN "stripeAccountId" text;

CREATE UNIQUE INDEX "User_stripeAccountId_key" ON public."User" USING btree ("stripeAccountId");

CREATE TABLE "public"."Price" (
  "agentId"     text                           NOT NULL,
  "name"        text                           NOT NULL,
  "title"       text                           NOT NULL,
  "description" text                           NOT NULL DEFAULT ''::text,
  "amount"      integer                        NOT NULL,
  "currency"    text                           NOT NULL,
  "updatedAt"   timestamp(3) without time zone NOT NULL,
  CONSTRAINT "Price_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES public."Agent"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "Price_pkey" PRIMARY KEY ("agentId", name),
  CONSTRAINT "Price_amount_check" CHECK (amount > 0)
);

ALTER TABLE "public"."Price" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."Price" FROM "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Price" TO "service_role";

REVOKE ALL ON TABLE "public"."Price" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Price" TO "postgres";

CREATE TABLE "public"."Payment" (
  "id"              text                           NOT NULL,
  "agentId"         text                           NOT NULL,
  "price"           text                           NOT NULL,
  "payerId"         text,
  "amount"          integer                        NOT NULL,
  "currency"        text                           NOT NULL,
  "note"            text                           NOT NULL DEFAULT ''::text,
  "stripeSessionId" text                           NOT NULL,
  "url"             text                           NOT NULL,
  "status"          text                           NOT NULL DEFAULT 'open'::text,
  "createdAt"       timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt"          timestamp(3) without time zone,
  CONSTRAINT "Payment_pkey" PRIMARY KEY (id),
  CONSTRAINT "Payment_status_check" CHECK (status IN ('open', 'paid', 'expired')),
  CONSTRAINT "Payment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES public."Agent"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "Payment_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE UNIQUE INDEX "Payment_stripeSessionId_key" ON public."Payment" USING btree ("stripeSessionId");

CREATE INDEX "Payment_agentId_idx" ON public."Payment" USING btree ("agentId");

CREATE INDEX "Payment_payerId_idx" ON public."Payment" USING btree ("payerId");

ALTER TABLE "public"."Payment" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."Payment" FROM "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Payment" TO "service_role";

REVOKE ALL ON TABLE "public"."Payment" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."Payment" TO "postgres";
