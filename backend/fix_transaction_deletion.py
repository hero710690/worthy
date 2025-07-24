#!/usr/bin/env python3

# This script shows the corrected transaction deletion logic
# The bug is in lines 2090-2135 of worthy_lambda_function.py

def handle_delete_transaction_fixed(transaction_id, user_id):
    """Fixed version of handle_delete_transaction"""
    try:
        # ... existing code for getting transaction details ...
        
        # Handle rollback based on transaction type
        rollback_applied = False
        
        if transaction['transaction_type'] == 'LumpSum':
            # ... existing LumpSum rollback logic ...
            rollback_applied = True
            
        elif transaction['transaction_type'] == 'Recurring':
            # ... existing Recurring rollback logic ...
            rollback_applied = True
            
        elif transaction['transaction_type'] == 'Initialization':
            # ... existing Initialization rollback logic ...
            rollback_applied = True
            
        elif transaction['transaction_type'] == 'Dividend':  # ← THIS WAS MISSING!
            # Rollback Dividend transactions - find and reset corresponding dividend record
            logger.info(f"Rolling back dividend transaction {transaction_id}")
            
            # Find dividend records that match this transaction
            dividend_records = execute_query(
                DATABASE_URL,
                """
                SELECT dividend_id, total_dividend_amount, is_reinvested 
                FROM dividends 
                WHERE asset_id = %s 
                  AND user_id = %s 
                  AND is_reinvested = TRUE
                  AND ABS(total_dividend_amount - %s) < 0.01
                  AND payment_date = %s
                ORDER BY updated_at DESC
                LIMIT 1
                """,
                (asset_id, user_id, abs(float(transaction['shares']) * float(transaction['price_per_share'])), 
                 transaction['transaction_date'])
            )
            
            if dividend_records:
                dividend_record = dividend_records[0]
                # Reset dividend to pending status
                execute_update(
                    DATABASE_URL,
                    """
                    UPDATE dividends 
                    SET is_reinvested = FALSE, updated_at = CURRENT_TIMESTAMP 
                    WHERE dividend_id = %s
                    """,
                    (dividend_record['dividend_id'],)
                )
                logger.info(f"Reset dividend {dividend_record['dividend_id']} to pending status")
            else:
                logger.warning(f"No matching dividend record found for transaction {transaction_id}")
            
            rollback_applied = True
        
        # Delete the transaction
        execute_update(
            DATABASE_URL,
            "DELETE FROM transactions WHERE transaction_id = %s",
            (transaction_id,)
        )
        
        return create_response(200, {
            "message": f"Transaction for {transaction['ticker_symbol']} deleted successfully",
            "rollback_applied": rollback_applied,
            "transaction_type": transaction['transaction_type']
        })
        
    except Exception as e:
        logger.error(f"Delete transaction error: {str(e)}")
        return create_error_response(500, "Failed to delete transaction")

print("The bug is in the transaction deletion logic:")
print("1. The dividend rollback code is incorrectly placed inside the Initialization block")
print("2. There's no separate 'elif' block for Dividend transactions")
print("3. This means LumpSum and Recurring transactions don't get proper rollback")
print("4. The asset totals remain unchanged when transactions are deleted")
