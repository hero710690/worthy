# DATABASE MIGRATION REQUIRED:
# 
# The FIRE profile table needs a new column to store the currency of barista_annual_income:
# 
# ALTER TABLE fire_profile ADD COLUMN barista_income_currency VARCHAR(3) DEFAULT 'USD';
# 
# This allows users to specify their part-time income in a different currency 
# than their base currency (e.g., part-time work in USD but base currency in TWD).