-- Reserve stock for pending orders until their payment preference expires.
ALTER TABLE "Order"
ADD COLUMN "reservationExpiresAt" TIMESTAMP(3);

CREATE INDEX "Order_status_reservationExpiresAt_idx"
ON "Order"("status", "reservationExpiresAt");
