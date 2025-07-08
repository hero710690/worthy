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
  Stack,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Receipt,
  TrendingUp,
  TrendingDown,
  Edit,
  Delete,
  FilterList,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { assetAPI } from '../services/assetApi';
import { exchangeRateService } from '../services/exchangeRateService';
import { TransactionForm } from './assets/TransactionForm';
import type { Asset, Transaction } from '../types/assets';

export const Transactions: React.FC = () => {
  const { user } = useAuthStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTransactionForm, setShowTransactionForm] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await assetAPI.getAssets();
      setAssets(response.assets);
      
      // Extract all transactions from assets
      const allTransactions: Transaction[] = [];
      response.assets.forEach(asset => {
        if (asset.transactions) {
          asset.transactions.forEach(transaction => {
            allTransactions.push({
              ...transaction,
              asset_ticker: asset.ticker_symbol,
              asset_type: asset.asset_type
            });
          });
        }
      });
      
      // Sort transactions by date (newest first)
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(allTransactions);
      
      setError(null);
    } catch (error: any) {
      console.error('Failed to fetch transactions:', error);
      setError(error.response?.data?.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTransactionSuccess = () => {
    setShowTransactionForm(false);
    fetchData();
  };

  const formatCurrency = (amount: number, currency: string) => {
    return exchangeRateService.formatCurrency(amount, currency);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'LumpSum':
        return 'success';
      case 'Recurring':
        return 'info';
      case 'Initialization':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'LumpSum':
        return <TrendingUp />;
      case 'Recurring':
        return <Receipt />;
      case 'Initialization':
        return <Add />;
      default:
        return <Receipt />;
    }
  };

  // Calculate total invested by currency
  const calculateTotalInvestedByCurrency = () => {
    const totals: { [currency: string]: number } = {};
    
    transactions.forEach(transaction => {
      const total = transaction.shares * transaction.price_per_share;
      const currency = transaction.currency;
      
      if (totals[currency]) {
        totals[currency] += total;
      } else {
        totals[currency] = total;
      }
    });
    
    return totals;
  };

  const totalInvestedByCurrency = calculateTotalInvestedByCurrency();

  const formatTotalInvested = () => {
    const currencies = Object.keys(totalInvestedByCurrency);
    if (currencies.length === 0) return 'No investments';
    
    if (currencies.length === 1) {
      const currency = currencies[0];
      return formatCurrency(totalInvestedByCurrency[currency], currency);
    }
    
    // Multiple currencies - show count of currencies
    return `${currencies.length} Currencies`;
  };

  const getTotalInvestedSubtext = () => {
    const currencies = Object.keys(totalInvestedByCurrency);
    
    if (currencies.length <= 1) {
      return 'Total Invested';
    }
    
    // Show the actual amounts for multi-currency in subtext
    return currencies.map(currency => 
      formatCurrency(totalInvestedByCurrency[currency], currency)
    ).join(', ');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            Transaction History
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track all your investment transactions and portfolio changes
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowTransactionForm(true)}
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1.5,
            textTransform: 'none',
            fontWeight: 'bold'
          }}
        >
          Record Transaction
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 4 }}>
        <Card sx={{ flex: 1, borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}
              >
                <Receipt />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {transactions.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Transactions
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
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
                <TrendingUp />
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

        <Card sx={{ flex: 1, borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: 'info.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}
              >
                <Receipt />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {transactions.filter(t => t.transaction_type === 'LumpSum').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Lump Sum Purchases
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: 'warning.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}
              >
                <Receipt />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {new Set(transactions.map(t => t.asset_ticker)).size}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Unique Assets
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Transactions Table */}
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'grey.200' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Recent Transactions
              </Typography>
              <Tooltip title="Filter transactions">
                <IconButton>
                  <FilterList />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          {transactions.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Receipt sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No transactions yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Start by recording your first investment transaction
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowTransactionForm(true)}
              >
                Record Transaction
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Asset</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Shares</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Price</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Total</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((transaction, index) => (
                    <TableRow key={`${transaction.id || index}`} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(transaction.date)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="column" spacing={0.5}>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {transaction.asset_ticker}
                          </Typography>
                          <Chip
                            label={transaction.asset_type}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getTransactionTypeIcon(transaction.transaction_type)}
                          label={transaction.transaction_type}
                          color={getTransactionTypeColor(transaction.transaction_type) as any}
                          size="small"
                          variant="outlined"
                        />
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
                          {formatCurrency(transaction.shares * transaction.price_per_share, transaction.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="Edit transaction">
                            <IconButton size="small" color="primary">
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete transaction">
                            <IconButton size="small" color="error">
                              <Delete fontSize="small" />
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

      {/* Transaction Form Dialog */}
      <TransactionForm
        open={showTransactionForm}
        onClose={() => setShowTransactionForm(false)}
        onSuccess={handleTransactionSuccess}
        assets={assets}
      />
    </Box>
  );
};
