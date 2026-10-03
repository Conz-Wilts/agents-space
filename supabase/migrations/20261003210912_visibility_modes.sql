ALTER TYPE "public"."Visibility" ADD VALUE 'listed' AFTER 'private';

ALTER TYPE "public"."Visibility" ADD VALUE 'restricted' AFTER 'listed';
