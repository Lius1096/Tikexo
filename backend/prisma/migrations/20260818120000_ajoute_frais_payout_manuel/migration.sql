-- Nouveau type d'écriture ledger pour les frais TIKEXO sur les reversements
-- commerçant déclenchés manuellement (bouton "Demander un reversement") —
-- le batch automatique quotidien reste gratuit, seul le reversement anticipé
-- à la demande du commerçant est facturé, pour couvrir le coût réel du
-- virement anticipé (voir prelevierCommissionDotation pour le même schéma
-- de traçabilité côté bénéficiaire).
ALTER TYPE "TypeLedger" ADD VALUE 'FRAIS_PAYOUT_MANUEL';
