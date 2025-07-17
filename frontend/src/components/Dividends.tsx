import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Alert,
  Tooltip,
  CircularProgress,
  Grid,
} from '@mui/material';
import {
  Paid,
  Refresh,
  Add,
  TrendingUp,
  AccountBalance,
  Delete,
  AutoAwesome,
  Edit,
} from '@mui/icons-material';
import { dividendAPI } from '../services/dividendApi';
import { assetAPI } from '../services/assetApi';
import type { Dividend, CreateDividendRequest, ProcessDividendRequest } from '../types/dividends';
import type { Asset } from '../types/assets';

export const Dividends: React.FC = () => {
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [showAllDividends, setShowAllDividends] = useState(false);

  // Tax rate edit dialog state
  const [taxRateEditDialog, setTaxRateEditDialog] = useState<{
    open: boolean;
    dividend: Dividend | null;
    newTaxRate: string; // Changed to string to handle input better
  }>({
    open: false,
    dividend: null,
    newTaxRate: '20'
  });

  // Additional state for dividend response data
  const [dividendSummary, setDividendSummary] = useState<{
    total_pending: number;
    total_processed: number;
    base_currency?: string;
    exchange_rates_available?: boolean;
    summary?: {
      pending_count: number;
      processed_count: number;
      total_count: number;
      currencies_involved: string[];
    };
  }>({
    total_pending: 0,
    total_processed: 0
  });

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [selectedDividend, setSelectedDividend] = useState<Dividend | null>(null);

  // Form states
  const [addForm, setAddForm] = useState<CreateDividendRequest>({
    asset_id: 0,
    dividend_per_share: 0,
    ex_dividend_date: new Date().toISOString().split('T')[0],
    payment_date: new Date().toISOString().split('T')[0],
    tax_rate: 20, // Default 20% tax rate
    // Removed currency - will use asset's currency automatically
  });

  const [processForm, setProcessForm] = useState<ProcessDividendRequest>({
    dividend_id: 0,
    action: 'reinvest',
    reinvest_asset_id: undefined,
    cash_asset_id: undefined,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [dividendsData, assetsData] = await Promise.all([
        dividendAPI.getDividends(),
        assetAPI.getAssets()
      ]);
      
      setDividends(dividendsData.dividends);
      setAssets(assetsData.assets);
      
      // Store the summary data including currency conversion info
      setDividendSummary({
        total_pending: dividendsData.total_pending || 0,
        total_processed: dividendsData.total_processed || 0,
        base_currency: dividendsData.base_currency,
        exchange_rates_available: dividendsData.exchange_rates_available,
        summary: dividendsData.summary
      });
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dividend data');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoDetect = async () => {
    try {
      setAutoDetecting(true);
      const result = await dividendAPI.autoDetectDividends();
      await fetchData(); // Refresh data
      // Show success message
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to auto-detect dividends');
    } finally {
      setAutoDetecting(false);
    }
  };

  const handleAddDividend = async () => {
    try {
      await dividendAPI.createDividend(addForm);
      await fetchData();
      setShowAddDialog(false);
      resetAddForm();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add dividend');
    }
  };

  const handleProcessDividend = async () => {
    if (!selectedDividend) return;
    
    try {
      await dividendAPI.processDividend({
        ...processForm,
        dividend_id: selectedDividend.dividend_id,
      });
      await fetchData();
      setShowProcessDialog(false);
      setSelectedDividend(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process dividend');
    }
  };

  const handleDeleteDividend = async (dividendId: number) => {
    try {
      await dividendAPI.deleteDividend(dividendId);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete dividend');
    }
  };

  const handleTaxRateChange = async (dividendId: number, newTaxRate: number) => {
    try {
      // Update the dividend in the local state immediately for responsive UI
      setDividends(prevDividends => 
        prevDividends.map(dividend => 
          dividend.dividend_id === dividendId 
            ? { ...dividend, tax_rate: newTaxRate }
            : dividend
        )
      );
      
      // Save the change to the backend
      await dividendAPI.updateDividend(dividendId, { tax_rate: newTaxRate });
      
      // Show success message briefly
      setError(null);
      
    } catch (err: any) {
      // Revert the local state change if the API call failed
      setDividends(prevDividends => 
        prevDividends.map(dividend => 
          dividend.dividend_id === dividendId 
            ? { ...dividend, tax_rate: dividend.tax_rate } // Revert to original
            : dividend
        )
      );
      
      setError(err.response?.data?.message || 'Failed to update tax rate');
    }
  };

  const handleOpenTaxRateEdit = (dividend: Dividend) => {
    setTaxRateEditDialog({
      open: true,
      dividend,
      newTaxRate: (dividend.tax_rate ?? 20).toString() // Use nullish coalescing to handle 0 properly
    });
  };

  const handleCloseTaxRateEdit = () => {
    setTaxRateEditDialog({
      open: false,
      dividend: null,
      newTaxRate: '20'
    });
  };

  const handleSaveTaxRate = async () => {
    if (!taxRateEditDialog.dividend) return;

    try {
      const dividendId = taxRateEditDialog.dividend.dividend_id;
      const taxRateInput = taxRateEditDialog.newTaxRate.trim();
      
      // Handle empty input - default to 0
      const newTaxRate = taxRateInput === '' ? 0 : parseFloat(taxRateInput);

      // Validate the tax rate - explicitly allow 0
      if (isNaN(newTaxRate) || newTaxRate < 0 || newTaxRate > 100) {
        setError('Tax rate must be a valid number between 0 and 100 (inclusive)');
        return;
      }

      // Update the dividend in the local state immediately for responsive UI
      setDividends(prevDividends => 
        prevDividends.map(dividend => 
          dividend.dividend_id === dividendId 
            ? { ...dividend, tax_rate: newTaxRate }
            : dividend
        )
      );
      
      // Save the change to the backend
      await dividendAPI.updateDividend(dividendId, { tax_rate: newTaxRate });
      
      // Close dialog and show success
      handleCloseTaxRateEdit();
      setError(null);
      
    } catch (err: any) {
      // Revert the local state change on error
      setDividends(prevDividends => 
        prevDividends.map(dividend => 
          dividend.dividend_id === taxRateEditDialog.dividend!.dividend_id 
            ? { ...dividend, tax_rate: taxRateEditDialog.dividend!.tax_rate } // Revert to original
            : dividend
        )
      );
      
      setError(err.response?.data?.message || 'Failed to update tax rate');
    }
  };

  const resetAddForm = () => {
    setAddForm({
      asset_id: 0,
      dividend_per_share: 0,
      ex_dividend_date: new Date().toISOString().split('T')[0],
      payment_date: new Date().toISOString().split('T')[0],
      tax_rate: 20, // Default 20% tax rate
      // Removed currency - will use asset's currency automatically
    });
  };

  const openProcessDialog = (dividend: Dividend) => {
    setSelectedDividend(dividend);
    setProcessForm({
      dividend_id: dividend.dividend_id,
      action: 'reinvest',
      reinvest_asset_id: dividend.asset_id, // Default to same asset
      cash_asset_id: undefined,
    });
    setShowProcessDialog(true);
  };

  // Helper function to filter dividends by recent quarter (last 3 months)
  const filterRecentDividends = (dividendList: Dividend[]) => {
    if (showAllDividends) return dividendList;
    
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    return dividendList.filter(dividend => {
      const dividendDate = new Date(dividend.ex_dividend_date);
      return dividendDate >= threeMonthsAgo;
    });
  };

  const filteredDividends = filterRecentDividends(dividends);
  const pendingDividends = filteredDividends.filter(d => d.status === 'pending');
  const processedDividends = filteredDividends.filter(d => d.status === 'processed');

  // Helper function to calculate filtered totals
  const calculateFilteredTotals = () => {
    const filteredPending = pendingDividends.reduce((sum, d) => 
      sum + (d.total_dividend_base_currency || d.total_dividend), 0);
    const filteredProcessed = processedDividends.reduce((sum, d) => 
      sum + (d.total_dividend_base_currency || d.total_dividend), 0);
    
    return { filteredPending, filteredProcessed };
  };

  const { filteredPending, filteredProcessed } = calculateFilteredTotals();
  
  // Helper function to format currency
  const formatCurrency = (amount: number, currency?: string) => {
    const currencyCode = currency || dividendSummary.base_currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        flexDirection: 'column',
        gap: 2,
        p: { xs: 2, md: 3 }
      }}>
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Loading dividends...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'success.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}
          >
            <Paid />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              Dividend Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Track and manage dividend payments from your investments
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowAddDialog(true)}
            sx={{ borderRadius: 2 }}
          >
            Add Dividend
          </Button>
          <Button
            variant="outlined"
            startIcon={autoDetecting ? <CircularProgress size={16} /> : <AutoAwesome />}
            onClick={handleAutoDetect}
            disabled={autoDetecting}
            sx={{ borderRadius: 2 }}
          >
            {autoDetecting ? 'Detecting...' : 'Auto-Detect'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchData}
            disabled={refreshing}
            sx={{ borderRadius: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant={showAllDividends ? "contained" : "outlined"}
            onClick={() => setShowAllDividends(!showAllDividends)}
            sx={{ borderRadius: 2 }}
          >
            {showAllDividends ? 'Show Recent Quarter' : 'Show All Time'}
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Exchange Rate Warning */}
      {dividendSummary.base_currency && !dividendSummary.exchange_rates_available && dividends.some(d => d.currency !== dividendSummary.base_currency) && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Some dividends are in different currencies but exchange rates are not available. 
          Values may not be accurately converted to {dividendSummary.base_currency}.
        </Alert>
      )}

      {/* Debug Information - Remove in production */}
      {process.env.NODE_ENV === 'development' && dividendSummary.summary && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Debug Info: Base Currency: {dividendSummary.base_currency}, 
            Exchange Rates Available: {dividendSummary.exchange_rates_available ? 'Yes' : 'No'}, 
            Currencies Involved: {dividendSummary.summary.currencies_involved?.join(', ') || 'None'}
          </Typography>
        </Alert>
      )}

      {/* Filter Information */}
      {!showAllDividends && dividends.length > filteredDividends.length && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Showing dividends from the last 3 months ({filteredDividends.length} of {dividends.length} total). 
          Click "Show All Time" to see all dividends.
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(showAllDividends ? dividendSummary.total_pending : filteredPending)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Dividends
                {dividendSummary.base_currency && (
                  <Typography variant="caption" display="block" color="text.secondary">
                    in {dividendSummary.base_currency} {!showAllDividends && '(Last 3 months)'}
                  </Typography>
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {pendingDividends.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Payments {!showAllDividends && '(Last 3 months)'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(showAllDividends ? dividendSummary.total_processed : filteredProcessed)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Processed Dividends
                {dividendSummary.base_currency && (
                  <Typography variant="caption" display="block" color="text.secondary">
                    in {dividendSummary.base_currency} {!showAllDividends && '(Last 3 months)'}
                  </Typography>
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {assets.filter(a => a.asset_type === 'Stock' || a.asset_type === 'ETF').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Dividend Assets
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pending Dividends Table */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            Pending Dividends {!showAllDividends && '(Last 3 Months)'}
          </Typography>
          
          {pendingDividends.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No pending dividends found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Use "Auto-Detect" to find dividends or add them manually
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Asset</TableCell>
                    <TableCell>Per Share</TableCell>
                    <TableCell>Shares Owned</TableCell>
                    <TableCell>Total Dividend</TableCell>
                    <TableCell>Tax Rate</TableCell>
                    <TableCell>After Tax</TableCell>
                    <TableCell>Ex-Date</TableCell>
                    <TableCell>Pay Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingDividends.map((dividend) => (
                    <TableRow key={dividend.dividend_id}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {dividend.ticker_symbol}
                          </Typography>
                          <Chip 
                            label={dividend.status} 
                            size="small" 
                            color="warning"
                          />
                        </Stack>
                      </TableCell>
                      <TableCell>
                        ${dividend.dividend_per_share.toFixed(4)}
                      </TableCell>
                      <TableCell>
                        {dividend.shares_owned.toFixed(4)}
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                            {formatCurrency(dividend.total_dividend_base_currency || dividend.total_dividend, dividendSummary.base_currency)}
                          </Typography>
                          {dividend.currency !== dividendSummary.base_currency && dividend.total_dividend_base_currency && (
                            <Typography variant="caption" color="text.secondary">
                              {formatCurrency(dividend.total_dividend, dividend.currency)} {dividend.currency}
                              {dividend.exchange_rate_used && (
                                <span> @ {dividend.exchange_rate_used.toFixed(4)}</span>
                              )}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2">
                            {(dividend.tax_rate ?? 20).toFixed(1)}%
                          </Typography>
                          <Tooltip title="Edit tax rate">
                            <IconButton 
                              size="small" 
                              onClick={() => handleOpenTaxRateEdit(dividend)}
                              sx={{ padding: 0.5 }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            {formatCurrency(
                              (dividend.total_dividend_base_currency || dividend.total_dividend) * 
                              (1 - (dividend.tax_rate ?? 20) / 100), 
                              dividendSummary.base_currency
                            )}
                          </Typography>
                          {dividend.currency !== dividendSummary.base_currency && dividend.total_dividend_base_currency && (
                            <Typography variant="caption" color="text.secondary">
                              {formatCurrency(
                                dividend.total_dividend * (1 - (dividend.tax_rate ?? 20) / 100), 
                                dividend.currency
                              )} {dividend.currency}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {new Date(dividend.ex_dividend_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(dividend.payment_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="Process Dividend">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => openProcessDialog(dividend)}
                            >
                              <TrendingUp />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteDividend(dividend.dividend_id)}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Processed Dividends Table */}
      {processedDividends.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Processed Dividends {!showAllDividends && '(Last 3 Months)'}
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Asset</TableCell>
                    <TableCell>Per Share</TableCell>
                    <TableCell>Total Dividend</TableCell>
                    <TableCell>Tax Rate</TableCell>
                    <TableCell>After Tax</TableCell>
                    <TableCell>Ex-Date</TableCell>
                    <TableCell>Pay Date</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {processedDividends.map((dividend) => (
                    <TableRow key={dividend.dividend_id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {dividend.ticker_symbol}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        ${dividend.dividend_per_share.toFixed(4)}
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            {formatCurrency(dividend.total_dividend_base_currency || dividend.total_dividend, dividendSummary.base_currency)}
                          </Typography>
                          {dividend.currency !== dividendSummary.base_currency && dividend.total_dividend_base_currency && (
                            <Typography variant="caption" color="text.secondary">
                              {formatCurrency(dividend.total_dividend, dividend.currency)} {dividend.currency}
                              {dividend.exchange_rate_used && (
                                <span> @ {dividend.exchange_rate_used.toFixed(4)}</span>
                              )}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2">
                            {(dividend.tax_rate ?? 20).toFixed(1)}%
                          </Typography>
                          <Tooltip title="Edit tax rate">
                            <IconButton 
                              size="small" 
                              onClick={() => handleOpenTaxRateEdit(dividend)}
                              sx={{ padding: 0.5 }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                            {formatCurrency(
                              (dividend.total_dividend_base_currency || dividend.total_dividend) * 
                              (1 - (dividend.tax_rate ?? 20) / 100), 
                              dividendSummary.base_currency
                            )}
                          </Typography>
                          {dividend.currency !== dividendSummary.base_currency && dividend.total_dividend_base_currency && (
                            <Typography variant="caption" color="text.secondary">
                              {formatCurrency(
                                dividend.total_dividend * (1 - (dividend.tax_rate ?? 20) / 100), 
                                dividend.currency
                              )} {dividend.currency}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {new Date(dividend.ex_dividend_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(dividend.payment_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label="Processed" 
                          size="small" 
                          color="success"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Add Dividend Dialog */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Dividend Manually</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              select
              fullWidth
              label="Asset"
              value={addForm.asset_id}
              onChange={(e) => setAddForm(prev => ({ ...prev, asset_id: Number(e.target.value) }))}
            >
              {assets.filter(a => a.asset_type === 'Stock' || a.asset_type === 'ETF').map((asset) => (
                <MenuItem key={asset.asset_id} value={asset.asset_id}>
                  {asset.ticker_symbol} - {asset.total_shares.toFixed(4)} shares
                </MenuItem>
              ))}
            </TextField>
            
            <TextField
              fullWidth
              type="number"
              label="Dividend Per Share"
              value={addForm.dividend_per_share}
              onChange={(e) => setAddForm(prev => ({ ...prev, dividend_per_share: Number(e.target.value) }))}
              inputProps={{ step: 0.0001, min: 0 }}
            />
            
            <TextField
              fullWidth
              type="date"
              label="Ex-Dividend Date"
              value={addForm.ex_dividend_date}
              onChange={(e) => setAddForm(prev => ({ ...prev, ex_dividend_date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              fullWidth
              type="date"
              label="Payment Date"
              value={addForm.payment_date}
              onChange={(e) => setAddForm(prev => ({ ...prev, payment_date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              fullWidth
              type="number"
              label="Tax Rate (%)"
              value={addForm.tax_rate}
              onChange={(e) => {
                const value = e.target.value;
                const numericValue = value === '' ? 0 : parseFloat(value);
                if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 100) {
                  setAddForm(prev => ({ ...prev, tax_rate: numericValue }));
                }
              }}
              inputProps={{ min: 0, max: 100, step: 0.1 }}
              helperText="Enter 0 for tax-free dividends. Default is 20%. You can modify this later in the table."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddDividend}>
            Add Dividend
          </Button>
        </DialogActions>
      </Dialog>

      {/* Process Dividend Dialog */}
      <Dialog open={showProcessDialog} onClose={() => setShowProcessDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Process Dividend</DialogTitle>
        <DialogContent>
          {selectedDividend && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Alert severity="info">
                Processing {formatCurrency(selectedDividend.total_dividend_base_currency || selectedDividend.total_dividend, dividendSummary.base_currency)} dividend from {selectedDividend.ticker_symbol}
                {selectedDividend.currency !== dividendSummary.base_currency && (
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    Original amount: {formatCurrency(selectedDividend.total_dividend, selectedDividend.currency)} {selectedDividend.currency}
                  </Typography>
                )}
              </Alert>
              
              <TextField
                select
                fullWidth
                label="Action"
                value={processForm.action}
                onChange={(e) => setProcessForm(prev => ({ 
                  ...prev, 
                  action: e.target.value as 'reinvest' | 'cash' 
                }))}
              >
                <MenuItem value="reinvest">Reinvest in Asset</MenuItem>
                <MenuItem value="cash">Add to Cash</MenuItem>
              </TextField>
              
              {processForm.action === 'reinvest' && (
                <TextField
                  select
                  fullWidth
                  label="Reinvest in Asset"
                  value={processForm.reinvest_asset_id || ''}
                  onChange={(e) => setProcessForm(prev => ({ 
                    ...prev, 
                    reinvest_asset_id: Number(e.target.value) 
                  }))}
                >
                  {assets.map((asset) => (
                    <MenuItem key={asset.asset_id} value={asset.asset_id}>
                      {asset.ticker_symbol} ({asset.asset_type})
                    </MenuItem>
                  ))}
                </TextField>
              )}

              {processForm.action === 'cash' && (
                <TextField
                  select
                  fullWidth
                  label="Add to Cash Asset"
                  value={processForm.cash_asset_id || ''}
                  onChange={(e) => setProcessForm(prev => ({ 
                    ...prev, 
                    cash_asset_id: Number(e.target.value) 
                  }))}
                  helperText="Select which cash asset to add the dividend to"
                >
                  {assets
                    .filter(asset => {
                      const isCashType = asset.asset_type === 'Cash';
                      const hasCashInName = asset.ticker_symbol.toLowerCase().includes('cash');
                      const isSavings = asset.ticker_symbol.toLowerCase().includes('savings');
                      const isMoneyMarket = asset.ticker_symbol.toLowerCase().includes('money');
                      const isChecking = asset.ticker_symbol.toLowerCase().includes('checking');
                      return isCashType || hasCashInName || isSavings || isMoneyMarket || isChecking;
                    })
                    .map((asset) => (
                      <MenuItem key={asset.asset_id} value={asset.asset_id}>
                        {asset.ticker_symbol} ({asset.currency})
                        {asset.total_shares && (
                          <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                            - {formatCurrency(asset.total_shares, asset.currency)}
                          </Typography>
                        )}
                      </MenuItem>
                    ))}
                  {assets.filter(asset => {
                    const isCashType = asset.asset_type === 'Cash';
                    const hasCashInName = asset.ticker_symbol.toLowerCase().includes('cash');
                    const isSavings = asset.ticker_symbol.toLowerCase().includes('savings');
                    const isMoneyMarket = asset.ticker_symbol.toLowerCase().includes('money');
                    const isChecking = asset.ticker_symbol.toLowerCase().includes('checking');
                    return isCashType || hasCashInName || isSavings || isMoneyMarket || isChecking;
                  }).length === 0 && (
                    <MenuItem disabled value="">
                      No cash assets found - Create a cash asset first
                    </MenuItem>
                  )}
                </TextField>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowProcessDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleProcessDividend}>
            Process Dividend
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tax Rate Edit Dialog */}
      <Dialog open={taxRateEditDialog.open} onClose={handleCloseTaxRateEdit} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Tax Rate</DialogTitle>
        <DialogContent>
          {taxRateEditDialog.dividend && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Alert severity="info">
                Editing tax rate for {taxRateEditDialog.dividend.ticker_symbol} dividend
              </Alert>
              
              <TextField
                fullWidth
                type="number"
                label="Tax Rate (%)"
                value={taxRateEditDialog.newTaxRate}
                onChange={(e) => {
                  setTaxRateEditDialog(prev => ({ 
                    ...prev, 
                    newTaxRate: e.target.value
                  }));
                }}
                inputProps={{ min: 0, max: 100, step: 0.1 }}
                helperText="Enter the tax rate as a percentage (0-100%). Use 0 for tax-free dividends."
              />

              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Tax Impact Preview:
                </Typography>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Gross Dividend:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(
                        taxRateEditDialog.dividend.total_dividend_base_currency || taxRateEditDialog.dividend.total_dividend, 
                        dividendSummary.base_currency
                      )}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">
                      Tax ({parseFloat(taxRateEditDialog.newTaxRate || '0').toFixed(1)}%):
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color={parseFloat(taxRateEditDialog.newTaxRate || '0') === 0 ? 'text.secondary' : 'error.main'}
                    >
                      {parseFloat(taxRateEditDialog.newTaxRate || '0') === 0 ? 'Tax-free' : 
                        `-${formatCurrency(
                          (taxRateEditDialog.dividend.total_dividend_base_currency || taxRateEditDialog.dividend.total_dividend) * 
                          (parseFloat(taxRateEditDialog.newTaxRate || '0') / 100), 
                          dividendSummary.base_currency
                        )}`
                      }
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" sx={{ borderTop: 1, borderColor: 'divider', pt: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>After-Tax Amount:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {formatCurrency(
                        (taxRateEditDialog.dividend.total_dividend_base_currency || taxRateEditDialog.dividend.total_dividend) * 
                        (1 - parseFloat(taxRateEditDialog.newTaxRate || '0') / 100), 
                        dividendSummary.base_currency
                      )}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTaxRateEdit}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTaxRate}>
            Save Tax Rate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
