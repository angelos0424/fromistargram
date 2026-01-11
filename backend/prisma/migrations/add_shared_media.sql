-- Create SharedMedia table
CREATE TABLE IF NOT EXISTS "SharedMedia" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "caption" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SharedMedia_filename_key" ON "SharedMedia"("filename");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SharedMedia_uploadedAt_idx" ON "SharedMedia"("uploadedAt");
