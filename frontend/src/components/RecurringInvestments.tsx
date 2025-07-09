import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Stack,
  Button,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Schedule,
  PlayArrow,
  Pause,
  Edit,
  Delete,
  TrendingUp,
  CalendarToday,
  AttachMoney,
} from '@mui/icons-material';
import { RecurringInvestment, CreateRecurringInvestmentRequest } from '../types/assets';
import { recurringInvestmentApi } from '../services/recurringInvestmentApi';
import { useAuthStore } from '../store/authStore';
import { exchangeRateService } from '../services/exchangeRateService';

export const RecurringInvestments: React.FC = () => {
  const { user } = useAuthStore();
  const [recurringInvestments, setRecurringInvestments] = useState<RecurringInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRates, setExchangeRates] = useState<{ [key: string]: number }>({});
  const [exchangeRatesLoading, setExchangeRatesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<RecurringInvestment | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateRecurringInvestmentRequest & { next_run_date?: string }>({
    ticker_symbol: '',
    amount: 0,
    currency: 'USD',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    next_run_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadRecurringInvestments();
    loadExchangeRates();
  }, []);

  const loadRecurringInvestments = async () => {
    try {
      setLoading(true);
      const response = await recurringInvestmentApi.getRecurringInvestments();
      setRecurringInvestments(response.recurring_investments);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load recurring investments');
    } finally {
      setLoading(false);
    }
  };

  const loadExchangeRates = async () => {
    try {
      setExchangeRatesLoading(true);
      const baseCurrency = user?.base_currency || 'USD';
      console.log('Loading exchange rates for base currency:', baseCurrency);
      const rates = await exchangeRateService.getRatesWithRefresh(baseCurrency);
      console.log('Exchange rates loaded:', rates);
      setExchangeRates(rates);
    } catch (err) {
      console.error('Failed to load exchange rates:', err);
      // Set empty object to indicate we tried but failed
      setExchangeRates({});
    } finally {
      setExchangeRatesLoading(false);
    }
  };

  const calculateMonthlyTotal = () => {
    const baseCurrency = user?.base_currency || 'USD';
    
    return recurringInvestments
      .filter(inv => inv.is_active)
      .reduce((sum, inv) => {
        let convertedAmount = inv.amount;
        
        // Convert to base currency if different and exchange rate is available
        if (inv.currency !== baseCurrency) {
          if (exchangeRates[inv.currency]) {
            convertedAmount = inv.amount / exchangeRates[inv.currency];
          } else {
            // If no exchange rate available, skip this investment from total
            // or you could show a warning
            console.warn(`No exchange rate available for ${inv.currency}`);
            return sum; // Skip this investment
          }
        }
        
        return sum + convertedAmount;
      }, 0);
  };

  const getMonthlyTotalDisplay = () => {
    const baseCurrency = user?.base_currency || 'USD';
    const activeInvestments = recurringInvestments.filter(inv => inv.is_active);
    
    if (activeInvestments.length === 0) {
      return exchangeRateService.formatCurrency(0, baseCurrency);
    }
    
    // Check if we have investments in different currencies
    const currencies = new Set(activeInvestments.map(inv => inv.currency));
    const hasMultipleCurrencies = currencies.size > 1;
    
    // If all investments are in the base currency, no conversion needed
    if (!hasMultipleCurrencies && currencies.has(baseCurrency)) {
      const total = activeInvestments.reduce((sum, inv) => sum + inv.amount, 0);
      return exchangeRateService.formatCurrency(total, baseCurrency);
    }
    
    // If we have multiple currencies or non-base currency, we need exchange rates
    if (hasMultipleCurrencies || !currencies.has(baseCurrency)) {
      // If exchange rates are still loading, show loading
      if (exchangeRatesLoading) {
        return 'Loading...';
      }
      
      // If exchange rates failed to load, show error or fallback
      if (Object.keys(exchangeRates).length === 0) {
        return 'Exchange rates unavailable';
      }
    }
    
    // Calculate with currency conversion
    return exchangeRateService.formatCurrency(calculateMonthlyTotal(), baseCurrency);
  };

  const handleCreateInvestment = async () => {
    try {
      await recurringInvestmentApi.createRecurringInvestment(formData);
      setOpenDialog(false);
      resetForm();
      loadRecurringInvestments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create recurring investment');
    }
  };

  const handleUpdateInvestment = async () => {
    if (!editingInvestment) return;
    
    try {
      await recurringInvestmentApi.updateRecurringInvestment(editingInvestment.recurring_id, {
        amount: formData.amount,
        frequency: formData.frequency,
        is_active: editingInvestment.is_active,
        start_date: formData.start_date,
        next_run_date: formData.next_run_date,
      });
      setOpenDialog(false);
      setEditingInvestment(null);
      resetForm();
      loadRecurringInvestments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update recurring investment');
    }
  };

  const handleToggleActive = async (investment: RecurringInvestment) => {
    try {
      await recurringInvestmentApi.toggleRecurringInvestment(
        investment.recurring_id,
        !investment.is_active
      );
      loadRecurringInvestments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle investment status');
    }
  };

  const handleDeleteInvestment = async (investmentId: number) => {
    if (!window.confirm('Are you sure you want to delete this recurring investment plan?')) {
      return;
    }

    try {
      await recurringInvestmentApi.deleteRecurringInvestment(investmentId);
      loadRecurringInvestments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete recurring investment');
    }
  };

  const resetForm = () => {
    setFormData({
      ticker_symbol: '',
      amount: 0,
      currency: 'USD',
      frequency: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
      next_run_date: new Date().toISOString().split('T')[0],
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingInvestment(null);
    setOpenDialog(true);
  };

  const openEditDialog = (investment: RecurringInvestment) => {
    setFormData({
      ticker_symbol: investment.ticker_symbol,
      amount: investment.amount,
      currency: investment.currency,
      frequency: investment.frequency,
      start_date: investment.start_date,
      next_run_date: investment.next_run_date,
    });
    setEditingInvestment(investment);
    setOpenDialog(true);
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'error';
      case 'weekly': return 'warning';
      case 'monthly': return 'primary';
      case 'quarterly': return 'success';
      default: return 'default';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
          Loading recurring investments...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            Recurring Investments
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Automate your investment strategy with recurring purchases
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openCreateDialog}
          sx={{ borderRadius: 2 }}
        >
          New Plan
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 1, bgcolor: 'primary.light', borderRadius: 2 }}>
                  <Schedule sx={{ color: 'primary.main' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {recurringInvestments.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Plans
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 1, bgcolor: 'success.light', borderRadius: 2 }}>
                  <PlayArrow sx={{ color: 'success.main' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {recurringInvestments.filter(inv => inv.is_active).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Plans
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 1, bgcolor: 'info.light', borderRadius: 2 }}>
                  <AttachMoney sx={{ color: 'info.main' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {getMonthlyTotalDisplay()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Monthly Total ({user?.base_currency || 'USD'})
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 1, bgcolor: 'warning.light', borderRadius: 2 }}>
                  <CalendarToday sx={{ color: 'warning.main' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {recurringInvestments.filter(inv => 
                      inv.is_active && new Date(inv.next_run_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    ).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Due This Week
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recurring Investments Table */}
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            Investment Plans
          </Typography>
          
          {recurringInvestments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Schedule sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No Recurring Investments Yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create your first recurring investment plan to automate your strategy
              </Typography>
              <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog}>
                Create First Plan
              </Button>
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Asset</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Frequency</TableCell>
                    <TableCell>Next Run</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recurringInvestments.map((investment) => (
                    <TableRow key={investment.recurring_id}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Box sx={{ p: 1, bgcolor: 'primary.light', borderRadius: 1 }}>
                            <TrendingUp sx={{ color: 'primary.main', fontSize: 20 }} />
                          </Box>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {investment.ticker_symbol}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Started {formatDate(investment.start_date)}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(investment.amount, investment.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={investment.frequency}
                          color={getFrequencyColor(investment.frequency) as any}
                          size="small"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(investment.next_run_date)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={investment.is_active ? 'Active' : 'Paused'}
                          color={investment.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1}>
                          <Tooltip title={investment.is_active ? 'Pause' : 'Resume'}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleActive(investment)}
                              color={investment.is_active ? 'warning' : 'success'}
                            >
                              {investment.is_active ? <Pause /> : <PlayArrow />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => openEditDialog(investment)}
                              color="primary"
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteInvestment(investment.recurring_id)}
                              color="error"
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

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingInvestment ? 'Edit Recurring Investment' : 'Create Recurring Investment'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Ticker Symbol"
              value={formData.ticker_symbol}
              onChange={(e) => setFormData({ ...formData, ticker_symbol: e.target.value.toUpperCase() })}
              placeholder="e.g., AAPL, TSLA"
              disabled={!!editingInvestment}
              fullWidth
            />
            
            <TextField
              label="Investment Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Currency</InputLabel>
              <Select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                label="Currency"
                disabled={!!editingInvestment}
              >
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="TWD">TWD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
                <MenuItem value="JPY">JPY</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Frequency</InputLabel>
              <Select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                label="Frequency"
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
              </Select>
            </FormControl>

            {!editingInvestment && (
              <TextField
                label="Start Date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            )}

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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={editingInvestment ? handleUpdateInvestment : handleCreateInvestment}
            disabled={!formData.ticker_symbol || formData.amount <= 0}
          >
            {editingInvestment ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
