-- Old `private` on a space meant unlisted + request by link (now `restricted`); on any other agent,
-- listed + use needs approval (now `listed`). Separate file: a new enum value can't be used in the
-- transaction that adds it.
UPDATE "public"."Agent" SET "visibility" = 'restricted' WHERE "visibility" = 'private' AND "category" = 'Space';

UPDATE "public"."Agent" SET "visibility" = 'listed' WHERE "visibility" = 'private';
