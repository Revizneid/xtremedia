-- CreateTable
CREATE TABLE "hero_banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "songId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hero_banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hero_banners_isActive_sortOrder_idx"
    ON "hero_banners"("isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "hero_banners"
ADD CONSTRAINT "hero_banners_songId_fkey"
FOREIGN KEY ("songId") REFERENCES "songs"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
