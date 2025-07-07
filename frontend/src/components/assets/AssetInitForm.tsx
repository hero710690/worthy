import React, { useState, useEffect } from 'react';
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
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp,
  AttachMoney,
  ShowChart,
  AccountBalance,
} from '@mui/icons-material';
import { assetAPI } from '../../services/assetApi';
import type { CreateAssetRequest, Asset } from '../../types/assets';

interface AssetInitFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editAsset?: Asset | null;
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
  { value: 'Cash', label: 'Cash' },
  { value: 'Mutual Fund', label: 'Mutual Fund' },
  { value: 'Bond', label: 'Bond' },
  { value: 'REIT', label: 'REIT' },
];

export const AssetInitForm: React.FC<AssetInitFormProps> = ({ 
  open, 
  onClose, 
  onSuccess, 
  editAsset 
}) => {
  const [formData, setFormData] = useState<CreateAssetRequest>({
    ticker_symbol: '',
    asset_type: 'Stock',
    total_shares: 0,
    average_cost_basis: 0,
    currency: 'USD',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!editAsset;

  // Initialize form data when editing
  useEffect(() => {
    if (editAsset) {
      setFormData({
        ticker_symbol: editAsset.ticker_symbol,
        asset_type: editAsset.asset_type,
        total_shares: editAsset.total_shares,
        average_cost_basis: editAsset.average_cost_basis,
        currency: editAsset.currency,
      });
    } else {
      // Reset form for new asset
      setFormData({
        ticker_symbol: '',
        asset_type: 'Stock',
        total_shares: 0,
        average_cost_basis: 0,
        currency: 'USD',
      });
    }
    setError(null);
  }, [editAsset, open]);

  const handleInputChange = (field: keyof CreateAssetRequest) => (
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

  const validateForm = (): boolean => {
    if (!formData.ticker_symbol.trim()) {
      setError('Ticker symbol is required');
      return false;
    }
    if (formData.total_shares <= 0) {
      setError('Total shares must be greater than 0');
      return false;
    }
    if (formData.average_cost_basis <= 0) {
      setError('Average cost basis must be greater than 0');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      if (isEditMode) {
        // TODO: Implement update API call when backend supports it
        // await assetAPI.updateAsset(editAsset.asset_id, formData);
        setError('Edit functionality will be implemented in a future update. For now, you can add a new asset with the updated information.');
        setLoading(false);
        return;
      } else {
        await assetAPI.createAsset(formData);
      }
      
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save asset:', error);
      setError(error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} asset`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'Stock':
        return <TrendingUp />;
      case 'ETF':
        return <ShowChart />;
      case 'Cash':
        return <AttachMoney />;
      default:
        return <AccountBalance />;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}
          >
            {getAssetIcon(formData.asset_type)}
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {isEditMode ? 'Edit Asset' : 'Initialize Asset Position'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isEditMode 
                ? 'Update your existing asset information'
                : 'Add an existing investment to your portfolio'
              }
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Ticker Symbol"
              value={formData.ticker_symbol}
              onChange={handleInputChange('ticker_symbol')}
              placeholder="e.g., AAPL, TSLA, VTI"
              disabled={loading || isEditMode} // Disable editing ticker in edit mode
              helperText={isEditMode ? "Ticker symbol cannot be changed" : "Enter the stock/ETF ticker symbol"}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <TrendingUp color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Asset Type"
              value={formData.asset_type}
              onChange={handleInputChange('asset_type')}
              disabled={loading}
              helperText="Select the type of investment"
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
              type="number"
              label="Total Shares/Amount"
              value={formData.total_shares}
              onChange={handleInputChange('total_shares')}
              disabled={loading}
              helperText="Total shares or amount you currently own"
              inputProps={{ 
                min: 0, 
                step: 0.000001,
                style: { textAlign: 'right' }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ShowChart color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Average Cost Basis"
              value={formData.average_cost_basis}
              onChange={handleInputChange('average_cost_basis')}
              disabled={loading}
              helperText="Average price per share you paid"
              inputProps={{ 
                min: 0, 
                step: 0.01,
                style: { textAlign: 'right' }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AttachMoney color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Currency"
              value={formData.currency}
              onChange={handleInputChange('currency')}
              disabled={loading}
              helperText="Currency of the investment"
            >
              {currencies.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'grey.50',
                border: '1px solid',
                borderColor: 'grey.200'
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Total Investment Value
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {(formData.total_shares * formData.average_cost_basis).toLocaleString(undefined, {
                  style: 'currency',
                  currency: formData.currency,
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          sx={{ borderRadius: 2 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
          sx={{ 
            borderRadius: 2,
            px: 3,
            textTransform: 'none',
            fontWeight: 'bold'
          }}
        >
          {loading 
            ? (isEditMode ? 'Updating...' : 'Adding...') 
            : (isEditMode ? 'Update Asset' : 'Add Asset')
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};
