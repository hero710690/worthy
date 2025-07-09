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
    currency: 'USD',
  });

  const [processForm, setProcessForm] = useState<ProcessDividendRequest>({
    dividend_id: 0,
    action: 'reinvest',
    reinvest_asset_id: undefined,
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

  const resetAddForm = () => {
    setAddForm({
      asset_id: 0,
      dividend_per_share: 0,
      ex_dividend_date: new Date().toISOString().split('T')[0],
      payment_date: new Date().toISOString().split('T')[0],
      currency: 'USD',
    });
  };

  const openProcessDialog = (dividend: Dividend) => {
    setSelectedDividend(dividend);
    setProcessForm({
      dividend_id: dividend.dividend_id,
      action: 'reinvest',
      reinvest_asset_id: dividend.asset_id, // Default to same asset
    });
    setShowProcessDialog(true);
  };

  const pendingDividends = dividends.filter(d => d.status === 'pending');
  const processedDividends = dividends.filter(d => d.status === 'processed');
  
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
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
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(dividendSummary.total_pending)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Dividends
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
                Pending Payments
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {processedDividends.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Processed This Month
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
            Pending Dividends
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
              select
              fullWidth
              label="Currency"
              value={addForm.currency}
              onChange={(e) => setAddForm(prev => ({ ...prev, currency: e.target.value }))}
            >
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="EUR">EUR</MenuItem>
              <MenuItem value="GBP">GBP</MenuItem>
              <MenuItem value="JPY">JPY</MenuItem>
              <MenuItem value="TWD">TWD</MenuItem>
            </TextField>
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
    </Box>
  );
};
