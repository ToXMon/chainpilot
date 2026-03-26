-- Create User table
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "privyId" TEXT,
    "walletAddress" TEXT,
    "isPrefunded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create unique indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_privyId_key" ON "User"("privyId");

-- Add userId column to Conversation
ALTER TABLE "Conversation" ADD COLUMN "userId" TEXT;

-- Add foreign key
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique index
CREATE UNIQUE INDEX "Conversation_userId_key" ON "Conversation"("userId");
