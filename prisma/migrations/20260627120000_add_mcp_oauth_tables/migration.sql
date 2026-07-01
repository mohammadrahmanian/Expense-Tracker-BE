-- CreateTable
CREATE TABLE "public"."McpOAuthClient" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientName" TEXT,
    "redirectUris" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpOAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."McpRefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scope" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "McpRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "McpOAuthClient_clientId_key" ON "public"."McpOAuthClient"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "McpRefreshToken_tokenHash_key" ON "public"."McpRefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "McpRefreshToken_userId_idx" ON "public"."McpRefreshToken"("userId");

-- AddForeignKey
ALTER TABLE "public"."McpRefreshToken" ADD CONSTRAINT "McpRefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
