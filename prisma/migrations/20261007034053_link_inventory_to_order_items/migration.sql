/*
  Warnings:

  - A unique constraint covering the columns `[orderItemId]` on the table `InventoryMovement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[orderId,variantId]` on the table `OrderItem` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN     "orderItemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_orderItemId_key" ON "InventoryMovement"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_orderId_variantId_key" ON "OrderItem"("orderId", "variantId");

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
