-- Keep payment state separate from manual stock review state.
CREATE TYPE "FulfillmentStatus" AS ENUM ('NOT_REQUIRED', 'REVIEW_REQUIRED');

ALTER TABLE "Order"
ADD COLUMN "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'NOT_REQUIRED';
