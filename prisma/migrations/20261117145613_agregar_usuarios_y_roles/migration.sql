/*
  Warnings:

  - A unique constraint covering the columns `[usuario_id]` on the table `estudiantes` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMINISTRADOR', 'ESTUDIANTE');

-- AlterTable
ALTER TABLE "estudiantes" ADD COLUMN     "usuario_id" INTEGER;

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'ESTUDIANTE',

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "estudiantes_usuario_id_key" ON "estudiantes"("usuario_id");

-- AddForeignKey
ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
