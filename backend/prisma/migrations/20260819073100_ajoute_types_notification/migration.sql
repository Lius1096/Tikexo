-- Nouveaux types de notification pour le centre de notifications in-app
-- (cloche) : dotation reçue, reversement commerçant effectué, statut KYC.
ALTER TYPE "TypeNotification" ADD VALUE 'DOTATION';
ALTER TYPE "TypeNotification" ADD VALUE 'REVERSEMENT';
ALTER TYPE "TypeNotification" ADD VALUE 'KYC';
