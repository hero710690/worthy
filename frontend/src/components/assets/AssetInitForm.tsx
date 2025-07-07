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
} from '@mui/material';
import {
  TrendingUp,
  AttachMoney,
  ShowChart,
} from '@mui/icons-material';
import { assetAPI } from '../../services/assetApi';
import type { CreateAssetRequest } from '../../types/assets';

interface AssetInitFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

const assetTypes = [
  { value: 'Stock', label: 'Stock' },
  { value: 'ETF', label: 'ETF' },
  { value: 'Mutual Fund', label: 'Mutual Fund' },
  { value: 'Bond', label: 'Bond' },
  { value: 'REIT', label: 'REIT' },
];

export const AssetInitForm: React.FC<AssetInitFormProps> = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CreateAssetRequest>({
    ticker_symbol: '',
    asset_type: 'Stock',
    total_shares: 0,
    average_cost_basis: 0,
    currency: 'USD',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof CreateAssetRequest) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: field === 'total_shares' || field === 'average_cost_basis' 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.ticker_symbol.trim()) {
      setError('Ticker symbol is required');
      return;
    }
    if (formData.total_shares <= 0) {
      setError('Total shares must be greater than 0');
      return;
    }
    if (formData.average_cost_basis <= 0) {
      setError('Average cost basis must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      await assetAPI.createAsset({
        ...formData,
        ticker_symbol: formData.ticker_symbol.toUpperCase().trim(),
      });
      
      // Reset form
      setFormData({
        ticker_symbol: '',
        asset_type: 'Stock',
        total_shares: 0,
        average_cost_basis: 0,
        currency: 'USD',
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create asset');
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

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp color="primary" />
          <Typography variant="h6">Initialize Asset</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Add an existing asset to your portfolio without entering historical transactions
        </Typography>
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
                label="Ticker Symbol"
                value={formData.ticker_symbol}
                onChange={handleChange('ticker_symbol')}
                required
                disabled={loading}
                placeholder="e.g., AAPL, TSLA, VTI"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ShowChart color="action" />
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
                label="Asset Type"
                value={formData.asset_type}
                onChange={handleChange('asset_type')}
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              >
                {assetTypes.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Total Shares"
                type="number"
                value={formData.total_shares || ''}
                onChange={handleChange('total_shares')}
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
                label="Average Cost Basis"
                type="number"
                value={formData.average_cost_basis || ''}
                onChange={handleChange('average_cost_basis')}
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
                  Total Investment Value
                </Typography>
                <Typography variant="h6" color="primary">
                  {formData.currency} {(formData.total_shares * formData.average_cost_basis).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </Typography>
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
            {loading ? 'Creating...' : 'Initialize Asset'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
