-- Migration: remove goal_amount column from bank_account_boxes
ALTER TABLE bank_account_boxes DROP COLUMN IF EXISTS goal_amount;