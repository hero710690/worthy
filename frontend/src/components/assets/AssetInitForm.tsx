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
  Stack,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  TrendingUp,
  AttachMoney,
  ShowChart,
  AccountBalance,
  Add,
  Receipt,
  Paid,
  SellOutlined,
} from '@mui/icons-material';
import { assetAPI } from '../../services/assetApi';
import type { CreateAssetRequest, Asset, CreateTransactionRequest } from '../../types/assets';

interface SellData {
  asset_id: number;
  shares: number;
  price_per_share: number;
  currency: string;
  transaction_date: string;
  cash_asset_id: number;
}

interface AssetInitFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editAsset?: Asset | null;
  existingAssets?: Asset[]; // For lump sum purchases
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
  { value: 'CD', label: 'Certificate of Deposit (CD)' },
];

export const AssetInitForm: React.FC<AssetInitFormProps> = ({ 
  open, 
  onClose, 
  onSuccess, 
  editAsset,
  existingAssets = []
}) => {
  // Operation type: 'init' for new asset, 'purchase' for lump sum purchase, 'sell' for selling
  const [operationType, setOperationType] = useState<'init' | 'purchase' | 'sell'>('init');

  const [sellData, setSellData] = useState<SellData>({
    asset_id: 0,
    shares: 0,
    price_per_share: 0,
    currency: 'USD',
    transaction_date: new Date().toISOString().split('T')[0],
    cash_asset_id: 0,
  });

  const [formData, setFormData] = useState<CreateAssetRequest>({
    ticker_symbol: '',
    asset_type: 'Stock',
    total_shares: 0,
    average_cost_basis: 0,
    currency: 'USD',
    interest_rate: undefined,
    maturity_date: undefined,
    start_date: undefined,
  });

  // Transaction data for lump sum purchases
  const [transactionData, setTransactionData] = useState<CreateTransactionRequest>({
    asset_id: 0,
    transaction_type: 'LumpSum',
    shares: 0,
    price_per_share: 0,
    currency: 'USD',
    transaction_date: new Date().toISOString().split('T')[0],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!editAsset;

  // Initialize form data when editing or opening
  useEffect(() => {
    if (editAsset) {
      setOperationType('init'); // Edit mode is always asset initialization
      setFormData({
        ticker_symbol: editAsset.ticker_symbol,
        asset_type: editAsset.asset_type,
        total_shares: editAsset.total_shares,
        average_cost_basis: editAsset.average_cost_basis,
        currency: editAsset.currency,
        // Include CD-specific fields when editing
        interest_rate: editAsset.interest_rate || undefined,
        maturity_date: editAsset.maturity_date || undefined,
      });
    } else {
      // Reset form for new operations
      setOperationType('init');
      setFormData({
        ticker_symbol: '',
        asset_type: 'Stock',
        total_shares: 0,
        average_cost_basis: 0,
        currency: 'USD',
      });
      setTransactionData({
        asset_id: 0,
        transaction_type: 'LumpSum',
        shares: 0,
        price_per_share: 0,
        currency: 'USD',
        transaction_date: new Date().toISOString().split('T')[0],
      });
      setSellData({
        asset_id: 0,
        shares: 0,
        price_per_share: 0,
        currency: 'USD',
        transaction_date: new Date().toISOString().split('T')[0],
        cash_asset_id: 0,
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

  const handleTransactionChange = (field: keyof CreateTransactionRequest) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setTransactionData(prev => ({
      ...prev,
      [field]: field === 'shares' || field === 'price_per_share' || field === 'asset_id'
        ? parseFloat(value) || 0
        : value
    }));
  };

  const handleSellChange = (field: keyof SellData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    const updates: Partial<SellData> = {
      [field]: field === 'shares' || field === 'price_per_share' || field === 'asset_id' || field === 'cash_asset_id'
        ? parseFloat(value) || 0
        : value
    };
    // Auto-set currency from selected asset
    if (field === 'asset_id') {
      const asset = existingAssets.find(a => a.asset_id === (parseFloat(value) || 0));
      if (asset) {
        updates.currency = asset.currency;
      }
    }
    setSellData(prev => ({ ...prev, ...updates }));
  };

  const nonCashAssets = existingAssets.filter(a => a.asset_type !== 'Cash');
  const cashAssets = existingAssets.filter(a => a.asset_type === 'Cash');
  const selectedSellAsset = existingAssets.find(a => a.asset_id === sellData.asset_id);

  const validateForm = (): boolean => {
    if (operationType === 'init') {
      // Validate asset initialization
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
      
      // CD-specific validation
      if (formData.asset_type === 'CD') {
        if (!formData.interest_rate || formData.interest_rate <= 0) {
          setError('Interest rate is required for CD assets and must be greater than 0');
          return false;
        }
        if (formData.interest_rate > 100) {
          setError('Interest rate cannot exceed 100%');
          return false;
        }
        if (!formData.maturity_date) {
          setError('Maturity date is required for CD assets');
          return false;
        }
        if (!formData.start_date) {
          setError('Start date is required for CD assets');
          return false;
        }
        
        // Validate dates
        const maturityDate = new Date(formData.maturity_date);
        const startDate = new Date(formData.start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to compare dates only
        
        if (maturityDate <= today) {
          setError('Maturity date must be in the future');
          return false;
        }
        
        if (startDate > today) {
          setError('Start date cannot be in the future');
          return false;
        }
        
        if (startDate >= maturityDate) {
          setError('Start date must be before maturity date');
          return false;
        }
      }
    } else if (operationType === 'purchase') {
      // Validate lump sum purchase
      if (!transactionData.asset_id) {
        setError('Please select an asset');
        return false;
      }
      if (transactionData.shares <= 0) {
        setError('Shares must be greater than 0');
        return false;
      }
      if (transactionData.price_per_share <= 0) {
        setError('Price per share must be greater than 0');
        return false;
      }
    } else if (operationType === 'sell') {
      if (!sellData.asset_id) {
        setError('Please select an asset to sell');
        return false;
      }
      if (sellData.shares <= 0) {
        setError('Shares must be greater than 0');
        return false;
      }
      if (selectedSellAsset && sellData.shares > selectedSellAsset.total_shares) {
        setError(`Cannot sell more than ${selectedSellAsset.total_shares} shares`);
        return false;
      }
      if (sellData.price_per_share <= 0) {
        setError('Price per share must be greater than 0');
        return false;
      }
      if (!sellData.cash_asset_id) {
        setError('Please select a cash account for proceeds');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      if (isEditMode && editAsset) {
        // Update existing asset - include CD fields if applicable
        const updateData = {
          asset_type: formData.asset_type,
          total_shares: formData.total_shares,
          average_cost_basis: formData.average_cost_basis,
          currency: formData.currency,
          // Include CD-specific fields for CD assets
          ...(formData.asset_type === 'CD' && {
            interest_rate: formData.interest_rate 
              ? parseFloat(formData.interest_rate.toString()) 
              : undefined,
            maturity_date: formData.maturity_date
          })
        };
        
        await assetAPI.updateAsset(editAsset.asset_id, updateData);
      } else if (operationType === 'init') {
        // Create new asset - convert CD fields to proper types
        const assetData = {
          ...formData,
          // Convert interest_rate from string to number for CD assets
          interest_rate: formData.asset_type === 'CD' && formData.interest_rate 
            ? parseFloat(formData.interest_rate.toString()) 
            : formData.interest_rate
        };
        
        await assetAPI.createAsset(assetData);
      } else if (operationType === 'purchase') {
        // Create lump sum transaction
        await assetAPI.createTransaction(transactionData);
      } else if (operationType === 'sell') {
        // Sell asset and deposit to cash account
        await assetAPI.sellAsset(sellData);
      }
      
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save:', error);
      const operation = isEditMode ? 'update asset' :
                       operationType === 'init' ? 'create asset' :
                       operationType === 'sell' ? 'sell asset' : 'record purchase';
      setError(error.response?.data?.message || `Failed to ${operation}`);
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
            {operationType === 'sell' ? <SellOutlined /> : operationType === 'purchase' ? <Receipt /> : getAssetIcon(formData.asset_type)}
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {isEditMode ? 'Edit Asset' :
               operationType === 'init' ? 'Initialize Asset Position' :
               operationType === 'sell' ? 'Sell Asset' : 'Record Lump Sum Purchase'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isEditMode
                ? 'Update your existing asset information'
                : operationType === 'init'
                ? 'Add an existing investment to your portfolio'
                : operationType === 'sell'
                ? 'Sell shares and deposit proceeds to a cash account'
                : 'Buy more shares of an existing asset'
              }
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, px: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Operation Type Selection (only for new operations) */}
        {!isEditMode && (
          <Box sx={{ mb: 3 }}>
            <Tabs 
              value={operationType} 
              onChange={(_, newValue) => setOperationType(newValue)}
              sx={{ mb: 2 }}
            >
              <Tab 
                value="init" 
                label="Initialize Asset" 
                icon={<Add />}
                iconPosition="start"
              />
              <Tab
                value="purchase"
                label="Lump Sum Purchase"
                icon={<Receipt />}
                iconPosition="start"
                disabled={existingAssets.length === 0}
              />
              <Tab
                value="sell"
                label="Sell Asset"
                icon={<SellOutlined />}
                iconPosition="start"
                disabled={nonCashAssets.length === 0 || cashAssets.length === 0}
              />
            </Tabs>
            {operationType === 'purchase' && existingAssets.length === 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                You need to initialize at least one asset before recording purchases.
              </Alert>
            )}
          </Box>
        )}

        <Grid container spacing={4} sx={{ mt: 3 }}>
          {/* Asset Initialization Form */}
          {operationType === 'init' && (
            <>
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

          {/* CD-specific fields */}
          {formData.asset_type === 'CD' && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Annual Interest Rate (%)"
                  value={formData.interest_rate || ''}
                  onChange={handleInputChange('interest_rate')}
                  disabled={loading}
                  helperText="Annual interest rate (e.g., 4.5 for 4.5%)"
                  inputProps={{ 
                    min: 0, 
                    max: 100,
                    step: 0.01,
                    style: { textAlign: 'right' }
                  }}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Start Date"
                  value={formData.start_date || ''}
                  onChange={handleInputChange('start_date')}
                  disabled={loading}
                  helperText="When you purchased the CD"
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    max: new Date().toISOString().split('T')[0], // Today's date as maximum
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Maturity Date"
                  value={formData.maturity_date || ''}
                  onChange={handleInputChange('maturity_date')}
                  disabled={loading}
                  helperText="When the CD matures"
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    min: new Date().toISOString().split('T')[0], // Today's date as minimum
                  }}
                />
              </Grid>
            </>
          )}

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
          </>
          )}

          {/* Lump Sum Purchase Form */}
          {operationType === 'purchase' && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Select Asset"
                  value={transactionData.asset_id}
                  onChange={handleTransactionChange('asset_id')}
                  disabled={loading}
                  helperText="Choose which asset to purchase more shares of"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <TrendingUp color="action" />
                      </InputAdornment>
                    ),
                  }}
                >
                  {existingAssets.map((asset) => (
                    <MenuItem key={asset.asset_id} value={asset.asset_id}>
                      {asset.ticker_symbol} - {asset.asset_type}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Shares to Purchase"
                  value={transactionData.shares}
                  onChange={handleTransactionChange('shares')}
                  disabled={loading}
                  helperText="Number of shares you're buying"
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
                  label="Price per Share"
                  value={transactionData.price_per_share}
                  onChange={handleTransactionChange('price_per_share')}
                  disabled={loading}
                  helperText="Purchase price per share"
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
                  type="date"
                  label="Transaction Date"
                  value={transactionData.transaction_date}
                  onChange={handleTransactionChange('transaction_date')}
                  disabled={loading}
                  helperText="Date of purchase"
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Currency"
                  value={transactionData.currency}
                  onChange={handleTransactionChange('currency')}
                  disabled={loading}
                  helperText="Currency of the transaction"
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
                    Total Purchase Amount
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {(transactionData.shares * transactionData.price_per_share).toLocaleString(undefined, {
                      style: 'currency',
                      currency: transactionData.currency,
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </Box>
              </Grid>
            </>
          )}

          {/* Sell Asset Form */}
          {operationType === 'sell' && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Asset to Sell"
                  value={sellData.asset_id}
                  onChange={handleSellChange('asset_id')}
                  disabled={loading}
                  helperText={selectedSellAsset ? `Available: ${selectedSellAsset.total_shares} shares` : 'Choose which asset to sell'}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <TrendingUp color="action" />
                      </InputAdornment>
                    ),
                  }}
                >
                  {nonCashAssets.map((asset) => (
                    <MenuItem key={asset.asset_id} value={asset.asset_id}>
                      {asset.ticker_symbol} - {asset.asset_type} ({asset.total_shares} shares)
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Deposit Proceeds To"
                  value={sellData.cash_asset_id}
                  onChange={handleSellChange('cash_asset_id')}
                  disabled={loading}
                  helperText="Cash account to receive sale proceeds"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Paid color="action" />
                      </InputAdornment>
                    ),
                  }}
                >
                  {cashAssets.map((asset) => (
                    <MenuItem key={asset.asset_id} value={asset.asset_id}>
                      {asset.ticker_symbol} - {asset.currency}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Shares to Sell"
                  value={sellData.shares}
                  onChange={handleSellChange('shares')}
                  disabled={loading}
                  helperText={selectedSellAsset ? `Max: ${selectedSellAsset.total_shares}` : 'Number of shares to sell'}
                  inputProps={{
                    min: 0,
                    max: selectedSellAsset?.total_shares || undefined,
                    step: 0.000001,
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
                  label="Sale Price per Share"
                  value={sellData.price_per_share}
                  onChange={handleSellChange('price_per_share')}
                  disabled={loading}
                  helperText="Price you're selling at"
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
                  type="date"
                  label="Transaction Date"
                  value={sellData.transaction_date}
                  onChange={handleSellChange('transaction_date')}
                  disabled={loading}
                  helperText="Date of sale"
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'grey.50',
                    border: '1px solid',
                    borderColor: 'grey.200',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Proceeds
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {(sellData.shares * sellData.price_per_share).toLocaleString(undefined, {
                        style: 'currency',
                        currency: sellData.currency,
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                  </Box>
                  {selectedSellAsset && sellData.shares > 0 && (
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" color="text.secondary">
                        Estimated Gain/Loss
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 'bold',
                          color: (sellData.price_per_share - selectedSellAsset.average_cost_basis) >= 0
                            ? 'success.main' : 'error.main'
                        }}
                      >
                        {((sellData.price_per_share - selectedSellAsset.average_cost_basis) * sellData.shares).toLocaleString(undefined, {
                          style: 'currency',
                          currency: sellData.currency,
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                          signDisplay: 'always',
                        })}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Grid>
            </>
          )}
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
            ? (isEditMode ? 'Updating...' : operationType === 'sell' ? 'Selling...' : 'Adding...')
            : (isEditMode ? 'Update Asset' : operationType === 'sell' ? 'Sell Asset' : 'Add Asset')
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};
