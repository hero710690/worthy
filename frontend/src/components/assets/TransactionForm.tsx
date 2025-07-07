import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Grid,
  Alert,
  InputAdornment,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import {
  Receipt,
  AttachMoney,
  ShowChart,
  CalendarToday,
} from '@mui/icons-material';
import { assetAPI } from '../../services/assetApi';
import type { CreateTransactionRequest, Asset } from '../../types/assets';

interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  asset: Asset;
}

const currencies = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'TWD', label: 'TWD - Taiwan Dollar' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
];

const transactionTypes = [
  { value: 'LumpSum', label: 'Lump Sum Purchase' },
  { value: 'Recurring', label: 'Recurring Investment' },
];

export const TransactionForm: React.FC<TransactionFormProps> = ({ 
  open, 
  onClose, 
  onSuccess, 
  asset 
}) => {
  const [formData, setFormData] = useState<CreateTransactionRequest>({
    asset_id: asset.asset_id,
    transaction_type: 'LumpSum',
    shares: 0,
    price_per_share: 0,
    currency: asset.currency,
    transaction_date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof CreateTransactionRequest) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: field === 'shares' || field === 'price_per_share' 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.shares <= 0) {
      setError('Shares must be greater than 0');
      return;
    }
    if (formData.price_per_share <= 0) {
      setError('Price per share must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      await assetAPI.createTransaction(formData);
      
      // Reset form
      setFormData({
        asset_id: asset.asset_id,
        transaction_type: 'LumpSum',
        shares: 0,
        price_per_share: 0,
        currency: asset.currency,
        transaction_date: new Date().toISOString().split('T')[0],
      });
      
      onSuccess();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  const totalCost = formData.shares * formData.price_per_share;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Receipt color="primary" />
          <Typography variant="h6">Add Transaction</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <ShowChart color="action" />
          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
            {asset.ticker_symbol}
          </Typography>
          <Chip label={asset.asset_type} size="small" color="primary" variant="outlined" />
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Transaction Type"
                value={formData.transaction_type}
                onChange={handleChange('transaction_type')}
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              >
                {transactionTypes.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Transaction Date"
                type="date"
                value={formData.transaction_date}
                onChange={handleChange('transaction_date')}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarToday color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Number of Shares"
                type="number"
                value={formData.shares || ''}
                onChange={handleChange('shares')}
                required
                disabled={loading}
                inputProps={{ min: 0, step: 0.000001 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Price per Share"
                type="number"
                value={formData.price_per_share || ''}
                onChange={handleChange('price_per_share')}
                required
                disabled={loading}
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoney color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Currency"
                value={formData.currency}
                onChange={handleChange('currency')}
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              >
                {currencies.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'grey.50', 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200'
              }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Transaction Cost
                </Typography>
                <Typography variant="h6" color="primary">
                  {formData.currency} {totalCost.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </Typography>
              </Box>
            </Grid>

            {/* Current Asset Info */}
            <Grid item xs={12}>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'info.50', 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'info.200'
              }}>
                <Typography variant="subtitle2" color="info.main" gutterBottom>
                  Current Asset Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Current Shares
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {asset.total_shares.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Avg Cost Basis
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {asset.currency} {asset.average_cost_basis.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Total Value
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {asset.currency} {(asset.total_shares * asset.average_cost_basis).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Transactions
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {asset.transaction_count || 0}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={handleClose} 
            disabled={loading}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
              },
            }}
          >
            {loading ? 'Adding...' : 'Add Transaction'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
