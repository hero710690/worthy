# Recurring Investments Date Editing Feature

**Date**: July 8, 2025  
**Status**: ✅ **IMPLEMENTED AND DEPLOYED**

## 🎯 **Feature Overview**

Enhanced the recurring investments edit functionality to allow users to edit both **Start Date** and **Next Run Date** when clicking the pencil (edit) icon in the Actions column.

## 🔧 **Changes Made**

### **1. Frontend Changes**

#### **Updated Types** (`/frontend/src/types/assets.ts`)
```typescript
export interface UpdateRecurringInvestmentRequest {
  amount?: number;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  is_active?: boolean;
  start_date?: string;        // ✅ NEW
  next_run_date?: string;     // ✅ NEW
}
```

#### **Enhanced Form State** (`/frontend/src/components/RecurringInvestments.tsx`)
```typescript
// Extended form data to include next_run_date
const [formData, setFormData] = useState<CreateRecurringInvestmentRequest & { next_run_date?: string }>({
  ticker_symbol: '',
  amount: 0,
  currency: 'USD',
  frequency: 'monthly',
  start_date: new Date().toISOString().split('T')[0],
  next_run_date: new Date().toISOString().split('T')[0],  // ✅ NEW
});
```

#### **Updated Edit Dialog**
- **Before**: Only showed start_date for new investments (hidden when editing)
- **After**: Shows both start_date and next_run_date when editing with helpful descriptions

```typescript
{editingInvestment && (
  <>
    <TextField
      label="Start Date"
      type="date"
      value={formData.start_date}
      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
      InputLabelProps={{ shrink: true }}
      fullWidth
      helperText="Original start date of the recurring investment"
    />
    <TextField
      label="Next Run Date"
      type="date"
      value={formData.next_run_date}
      onChange={(e) => setFormData({ ...formData, next_run_date: e.target.value })}
      InputLabelProps={{ shrink: true }}
      fullWidth
      helperText="Next scheduled execution date"
    />
  </>
)}
```

#### **Enhanced Update Function**
```typescript
const handleUpdateInvestment = async () => {
  if (!editingInvestment) return;
  
  try {
    await recurringInvestmentApi.updateRecurringInvestment(editingInvestment.recurring_id, {
      amount: formData.amount,
      frequency: formData.frequency,
      is_active: editingInvestment.is_active,
      start_date: formData.start_date,      // ✅ NEW
      next_run_date: formData.next_run_date, // ✅ NEW
    });
    // ... rest of the function
  } catch (err: any) {
    setError(err.response?.data?.message || 'Failed to update recurring investment');
  }
};
```

### **2. Backend Changes**

#### **Enhanced Update Handler** (`/backend/worthy_lambda_function.py`)
```python
def handle_update_recurring_investment(recurring_id, body, user_id):
    """Update a recurring investment plan"""
    try:
        # ... existing code ...
        
        # Update fields (NEW: Added date fields)
        amount = body.get('amount', investment['amount'])
        frequency = body.get('frequency', investment['frequency']).lower()
        is_active = body.get('is_active', investment['is_active'])
        start_date = body.get('start_date', investment['start_date'])          # ✅ NEW
        next_run_date = body.get('next_run_date', investment['next_run_date']) # ✅ NEW
        
        # Parse dates if provided (NEW: Date validation)
        if 'start_date' in body:
            try:
                from datetime import datetime
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            except ValueError:
                return create_error_response(400, "Invalid start_date format. Use YYYY-MM-DD")
        
        if 'next_run_date' in body:
            try:
                from datetime import datetime
                next_run_date = datetime.strptime(next_run_date, '%Y-%m-%d').date()
            except ValueError:
                return create_error_response(400, "Invalid next_run_date format. Use YYYY-MM-DD")
        
        # Update the recurring investment (NEW: Include date fields)
        execute_update(
            DATABASE_URL,
            """
            UPDATE recurring_investments 
            SET amount = %s, frequency = %s, is_active = %s, start_date = %s, next_run_date = %s, updated_at = CURRENT_TIMESTAMP
            WHERE recurring_id = %s AND user_id = %s
            """,
            (amount, frequency, is_active, start_date, next_run_date, recurring_id, user_id)
        )
        
        # ... rest of the function
    except Exception as e:
        logger.error(f"Update recurring investment error: {str(e)}")
        return create_error_response(500, "Failed to update recurring investment plan")
```

## 🎯 **User Experience Improvements**

### **Before**
- ❌ Edit dialog only showed amount and frequency
- ❌ Start date was hidden when editing
- ❌ No way to adjust next run date
- ❌ Limited control over scheduling

### **After**
- ✅ Edit dialog shows both start date and next run date
- ✅ Clear helper text explaining each date field
- ✅ Full control over investment scheduling
- ✅ Ability to reschedule next execution
- ✅ Maintain historical start date while adjusting future runs

## 📊 **Use Cases Enabled**

1. **Reschedule Next Execution**: User can delay or advance the next investment run
2. **Correct Historical Data**: User can fix incorrect start dates
3. **Seasonal Adjustments**: User can skip holiday periods by adjusting next run date
4. **Frequency Changes**: When changing frequency, user can set appropriate next run date
5. **Portfolio Rebalancing**: User can coordinate multiple investments by setting specific dates

## 🧪 **Testing**

### **Frontend Testing**
1. ✅ Edit dialog opens with current dates populated
2. ✅ Both date fields are editable with date pickers
3. ✅ Helper text provides clear guidance
4. ✅ Form validation works for date formats
5. ✅ Update request includes both date fields

### **Backend Testing**
1. ✅ API accepts start_date and next_run_date parameters
2. ✅ Date validation ensures YYYY-MM-DD format
3. ✅ Database update includes both date fields
4. ✅ Response returns updated dates
5. ✅ Error handling for invalid date formats

## 🚀 **Deployment Status**

- ✅ **Backend**: Deployed to AWS Lambda (worthy-api-development)
- ✅ **Frontend**: Deployed to S3 + CloudFront
- ✅ **Database**: Schema supports date field updates
- ✅ **API**: All endpoints updated and tested

## 📝 **API Documentation**

### **PUT /recurring-investments/:id**

**Request Body** (Updated):
```json
{
  "amount": 1000,
  "frequency": "monthly",
  "is_active": true,
  "start_date": "2025-07-01",      // NEW: Optional
  "next_run_date": "2025-08-01"    // NEW: Optional
}
```

**Response**:
```json
{
  "message": "Recurring investment plan updated successfully",
  "recurring_investment": {
    "recurring_id": 1,
    "ticker_symbol": "AAPL",
    "amount": 1000.0,
    "currency": "USD",
    "frequency": "monthly",
    "start_date": "2025-07-01",
    "next_run_date": "2025-08-01",
    "is_active": true,
    "updated_at": "2025-07-08T16:00:00.000Z"
  }
}
```

## 🎉 **Success Summary**

The recurring investments edit functionality now provides complete control over investment scheduling:

✅ **Enhanced Edit Dialog**: Both start date and next run date are editable  
✅ **Clear User Guidance**: Helper text explains each date field  
✅ **Backend Support**: Full API support for date field updates  
✅ **Data Validation**: Proper date format validation and error handling  
✅ **Production Ready**: Fully deployed and tested  

Users can now click the pencil icon in the Actions column and have full control over their recurring investment scheduling, including the ability to reschedule future executions and correct historical start dates.

---

**Status**: 🟢 **FULLY OPERATIONAL**  
**Last Updated**: July 8, 2025  
**Next Review**: As needed based on user feedback
