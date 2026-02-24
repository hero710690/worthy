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
  IconButton,
  Alert,
  CircularProgress,
  Stack,
  Container,
  Chip,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  InputAdornment,
  Grid,
} from '@mui/material';
import {
  Edit,
  Delete,
  Add,
  Search,
  FilterList,
  TrendingUp,
  AttachMoney,
  CalendarToday,
  Refresh,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { assetAPI } from '../../services/assetApi';
import { exchangeRateService } from '../../services/exchangeRateService';

interface Transaction {
  transaction_id: number;
  asset_id: number;
  ticker_symbol: string;
  asset_type: string;
  transaction_type: string;
  transaction_date: string;
  shares: number;
  price_per_share: number;
  total_amount: number;
  currency: string;
  created_at: string;
  updated_at?: string;
}

interface TransactionFormData {
  shares: number;
  price_per_share: number;
  transaction_date: string;
  currency: string;
}

export const TransactionHistory: React.FC = () => {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterAssetType, setFilterAssetType] = useState('all');
  
  // Summary states
  const [showSummary, setShowSummary] = useState(false);
  const [summaryStartDate, setSummaryStartDate] = useState('');
  const [summaryEndDate, setSummaryEndDate] = useState('');
  const [summaryData, setSummaryData] = useState<{[key: string]: {shares: number, amount: number, currency: string}}>({});
  
  // Edit/Delete states
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  
  // Form data for editing
  const [formData, setFormData] = useState<TransactionFormData>({
    shares: 0,
    price_per_share: 0,
    transaction_date: '',
    currency: 'USD',
  });

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await assetAPI.getTransactions();
      setTransactions(response.transactions);
      setFilteredTransactions(response.transactions);
      setError(null);
    } catch (error: any) {
      console.error('Failed to fetch transactions:', error);
      setError(error.response?.data?.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchTransactions();
    } catch (error) {
      console.error('Failed to refresh transactions:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Filter transactions based on search and filters
  useEffect(() => {
    let filtered = transactions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(txn =>
        txn.ticker_symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.transaction_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Transaction type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(txn => txn.transaction_type === filterType);
    }

    // Asset type filter
    if (filterAssetType !== 'all') {
      filtered = filtered.filter(txn => txn.asset_type === filterAssetType);
    }

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, filterType, filterAssetType]);

  // Calculate summary when dates change
  useEffect(() => {
    if (summaryStartDate && summaryEndDate) {
      const summary: {[key: string]: {shares: number, amount: number, currency: string}} = {};
      
      transactions
        .filter(txn => {
          const txnDate = new Date(txn.transaction_date);
          const start = new Date(summaryStartDate);
          const end = new Date(summaryEndDate);
          return txnDate >= start && txnDate <= end;
        })
        .forEach(txn => {
          const key = txn.ticker_symbol;
          if (!summary[key]) {
            summary[key] = { shares: 0, amount: 0, currency: txn.currency };
          }
          summary[key].shares += txn.shares;
          summary[key].amount += txn.shares * txn.price_per_share;
        });
      
      setSummaryData(summary);
    }
  }, [transactions, summaryStartDate, summaryEndDate]);

  const handleEditTransaction = (transaction: Transaction) => {
    console.log('🔧 Edit transaction clicked:', transaction);
    setEditingTransaction(transaction);
    const formDataToSet = {
      shares: transaction.shares,
      price_per_share: transaction.price_per_share,
      transaction_date: transaction.transaction_date,
      currency: transaction.currency,
    };
    console.log('📝 Setting form data:', formDataToSet);
    setFormData(formDataToSet);
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    setDeletingTransaction(transaction);
  };

  const confirmDeleteTransaction = async () => {
    if (!deletingTransaction) return;

    setDeleteLoading(true);
    try {
      await assetAPI.deleteTransaction(deletingTransaction.transaction_id);
      await fetchTransactions();
      setDeletingTransaction(null);
      setError(null);
    } catch (error: any) {
      console.error('Failed to delete transaction:', error);
      setError(error.response?.data?.message || 'Failed to delete transaction');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction) return;

    console.log('💾 Save edit clicked for transaction:', editingTransaction.transaction_id);
    console.log('📝 Form data to save:', formData);

    // Validate form data
    if (formData.shares <= 0) {
      setError('Shares must be greater than 0');
      return;
    }
    
    if (formData.price_per_share <= 0) {
      setError('Price per share must be greater than 0');
      return;
    }
    
    if (!formData.currency) {
      setError('Currency is required');
      return;
    }
    
    if (!formData.transaction_date) {
      setError('Transaction date is required');
      return;
    }

    setEditLoading(true);
    try {
      const response = await assetAPI.updateTransaction(editingTransaction.transaction_id, formData);
      console.log('✅ Update response:', response);
      await fetchTransactions();
      setEditingTransaction(null);
      setError(null);
    } catch (error: any) {
      console.error('❌ Failed to update transaction:', error);
      console.error('❌ Error response:', error.response?.data);
      setError(error.response?.data?.message || 'Failed to update transaction');
    } finally {
      setEditLoading(false);
    }
  };

  const handleFormChange = (field: keyof TransactionFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    const processedValue = field === 'shares' || field === 'price_per_share' 
      ? parseFloat(value) || 0 
      : value;
    
    console.log(`📝 Form field ${field} changed:`, value, '→', processedValue);
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));
  };

  const formatCurrency = (amount: number, currency: string) => {
    return exchangeRateService.formatCurrency(amount, currency);
  };

  // Calculate total invested by currency
  const calculateTotalInvestedByCurrency = () => {
    const totals: { [currency: string]: number } = {};
    
    filteredTransactions.forEach(transaction => {
      const currency = transaction.currency;
      const amount = transaction.total_amount;
      
      if (totals[currency]) {
        totals[currency] += amount;
      } else {
        totals[currency] = amount;
      }
    });
    
    return totals;
  };

  const formatTotalInvested = () => {
    const totalsByCurrency = calculateTotalInvestedByCurrency();
    const currencies = Object.keys(totalsByCurrency);
    
    if (currencies.length === 0) return 'No investments';
    
    if (currencies.length === 1) {
      const currency = currencies[0];
      return formatCurrency(totalsByCurrency[currency], currency);
    }
    
    // Multiple currencies - show count of currencies
    return `${currencies.length} Currencies`;
  };

  const getTotalInvestedSubtext = () => {
    const totalsByCurrency = calculateTotalInvestedByCurrency();
    const currencies = Object.keys(totalsByCurrency);
    
    if (currencies.length <= 1) {
      return 'Total Invested';
    }
    
    // Show the actual amounts for multi-currency in subtext
    return currencies.map(currency => 
      formatCurrency(totalsByCurrency[currency], currency)
    ).join(', ');
  };

  const getTransactionTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'LumpSum': 'primary',
      'Recurring': 'secondary',
      'Initialization': 'info',
      'Dividend': 'success',
    };
    return colors[type] || 'default';
  };

  const getAssetTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'Stock': 'primary',
      'ETF': 'secondary',
      'Cash': 'success',
      'Bond': 'warning',
      'REIT': 'info',
    };
    return colors[type] || 'default';
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            Transaction History
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View and manage all your investment transactions
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={refreshing ? <CircularProgress size={16} /> : <Refresh />}
          onClick={handleRefresh}
          disabled={refreshing}
          sx={{ borderRadius: 2 }}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'grey.200' }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="Transaction Type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="LumpSum">Lump Sum</MenuItem>
                <MenuItem value="Recurring">Recurring</MenuItem>
                <MenuItem value="Initialization">Initialization</MenuItem>
                <MenuItem value="Dividend">Dividend</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="Asset Type"
                value={filterAssetType}
                onChange={(e) => setFilterAssetType(e.target.value)}
              >
                <MenuItem value="all">All Assets</MenuItem>
                <MenuItem value="Stock">Stock</MenuItem>
                <MenuItem value="ETF">ETF</MenuItem>
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="Bond">Bond</MenuItem>
                <MenuItem value="REIT">REIT</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Period Summary Section */}
      <Card elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'grey.200' }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Period Summary
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowSummary(!showSummary)}
            >
              {showSummary ? 'Hide' : 'Show'} Summary
            </Button>
          </Stack>

          {showSummary && (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Start Date"
                    value={summaryStartDate}
                    onChange={(e) => setSummaryStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="End Date"
                    value={summaryEndDate}
                    onChange={(e) => setSummaryEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>

              {summaryStartDate && summaryEndDate && Object.keys(summaryData).length > 0 && (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Asset</strong></TableCell>
                        <TableCell align="right"><strong>Total Shares</strong></TableCell>
                        <TableCell align="right"><strong>Total Amount</strong></TableCell>
                        <TableCell align="right"><strong>Avg Price</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(summaryData).map(([symbol, data]) => (
                        <TableRow key={symbol}>
                          <TableCell>{symbol}</TableCell>
                          <TableCell align="right">{data.shares.toFixed(2)}</TableCell>
                          <TableCell align="right">
                            {data.currency} {data.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </TableCell>
                          <TableCell align="right">
                            {data.currency} {(data.amount / data.shares).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {summaryStartDate && summaryEndDate && Object.keys(summaryData).length === 0 && (
                <Alert severity="info">
                  No transactions found in the selected period.
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 1, bgcolor: 'primary.main', borderRadius: 1, color: 'white' }}>
                  <TrendingUp />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {filteredTransactions.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Transactions
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 1, bgcolor: 'success.main', borderRadius: 1, color: 'white' }}>
                  <AttachMoney />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {formatTotalInvested()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {getTotalInvestedSubtext()}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 1, bgcolor: 'info.main', borderRadius: 1, color: 'white' }}>
                  <CalendarToday />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {new Set(filteredTransactions.map(txn => txn.ticker_symbol)).size}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Unique Assets
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Transactions Table */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200' }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'grey.200' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Transaction Records ({filteredTransactions.length})
            </Typography>
          </Box>
          
          {filteredTransactions.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <TrendingUp sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No transactions found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchTerm || filterType !== 'all' || filterAssetType !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Start by adding your first asset to create transactions'
                }
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Asset</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Shares</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Price</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Total</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Currency</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.transaction_id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                            {transaction.ticker_symbol}
                          </Typography>
                          <Chip
                            label={transaction.asset_type}
                            size="small"
                            color={getAssetTypeColor(transaction.asset_type) as any}
                            variant="outlined"
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.transaction_type}
                          size="small"
                          color={getTransactionTypeColor(transaction.transaction_type) as any}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(transaction.transaction_date).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {transaction.shares.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {formatCurrency(transaction.price_per_share, transaction.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {formatCurrency(transaction.total_amount, transaction.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.currency}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEditTransaction(transaction)}
                            title="Edit transaction"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteTransaction(transaction)}
                            title="Delete transaction"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
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

      {/* Edit Transaction Dialog */}
      <Dialog open={!!editingTransaction} onClose={() => setEditingTransaction(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Transaction</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Shares"
                value={formData.shares}
                onChange={handleFormChange('shares')}
                inputProps={{ min: 0, step: 0.000001 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Price per Share"
                value={formData.price_per_share}
                onChange={handleFormChange('price_per_share')}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Transaction Date"
                value={formData.transaction_date}
                onChange={handleFormChange('transaction_date')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Currency"
                value={formData.currency}
                onChange={handleFormChange('currency')}
              >
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="TWD">TWD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
                <MenuItem value="JPY">JPY</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingTransaction(null)} disabled={editLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            disabled={editLoading}
            startIcon={editLoading ? <CircularProgress size={16} /> : undefined}
          >
            {editLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingTransaction} onClose={() => setDeletingTransaction(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Transaction</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this transaction for{' '}
            <strong>{deletingTransaction?.ticker_symbol}</strong>?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingTransaction(null)} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteTransaction}
            color="error"
            variant="contained"
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={16} /> : undefined}
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
