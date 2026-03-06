-- Migration: Remove Voting Enabled Setting
-- Created at: 2026-03-06 21:47:00

DELETE FROM public.system_settings WHERE key = 'voting_enabled';
