import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Box,
  Chip,
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
} from '@mui/material';
import {
  Add,
  TrendingUp,
  AccountBalance,
  Visibility,
  ShowChart,
} from '@mui/icons-material';
import { assetAPI } from '../../services/assetApi';
import { AssetInitForm } from './AssetInitForm';
import { TransactionForm } from './TransactionForm';
import type { Asset } from '../../types/assets';

export const AssetsList: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initFormOpen, setInitFormOpen] = useState(false);
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await assetAPI.getAssets();
      setAssets(response.assets);
      setError(null);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleInitSuccess = () => {
    fetchAssets();
  };

  const handleTransactionSuccess = () => {
    fetchAssets();
    setTransactionFormOpen(false);
    setSelectedAsset(null);
  };

  const handleAddTransaction = (asset: Asset) => {
    setSelectedAsset(asset);
    setTransactionFormOpen(true);
  };

  const calculateTotalValue = () => {
    return assets.reduce((total, asset) => {
      return total + (asset.total_shares * asset.average_cost_basis);
    }, 0);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Portfolio Assets
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setInitFormOpen(true)}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
            },
          }}
        >
          Initialize Asset
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Portfolio Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AccountBalance color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Total Assets
              </Typography>
              <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
                {assets.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUp color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Total Value
              </Typography>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                ${calculateTotalValue().toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4}>
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ShowChart color="info" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Transactions
              </Typography>
              <Typography variant="h4" color="info.main" sx={{ fontWeight: 'bold' }}>
                {assets.reduce((total, asset) => total + (asset.transaction_count || 0), 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Assets Table */}
      {assets.length === 0 ? (
        <Card elevation={2} sx={{ borderRadius: 3, textAlign: 'center', py: 6 }}>
          <CardContent>
            <AccountBalance sx={{ fontSize: 80, color: 'grey.300', mb: 2 }} />
            <Typography variant="h5" gutterBottom color="text.secondary">
              No Assets Yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Start building your portfolio by initializing your first asset
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setInitFormOpen(true)}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                },
              }}
            >
              Initialize Your First Asset
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card elevation={2} sx={{ borderRadius: 3 }}>
          <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>Asset</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Shares</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Avg Cost</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Total Value</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Currency</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Transactions</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.asset_id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ShowChart color="primary" />
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {asset.ticker_symbol}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={asset.asset_type} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {asset.total_shares.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6
                      })}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(asset.average_cost_basis, asset.currency)}
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 'medium' }}>
                        {formatCurrency(asset.total_shares * asset.average_cost_basis, asset.currency)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={asset.currency} size="small" />
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={asset.transaction_count || 0} 
                        size="small" 
                        color="info"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <IconButton
                          size="small"
                          onClick={() => handleAddTransaction(asset)}
                          color="primary"
                        >
                          <Add />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="info"
                        >
                          <Visibility />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Asset Initialization Form */}
      <AssetInitForm
        open={initFormOpen}
        onClose={() => setInitFormOpen(false)}
        onSuccess={handleInitSuccess}
      />

      {/* Transaction Form */}
      {selectedAsset && (
        <TransactionForm
          open={transactionFormOpen}
          onClose={() => {
            setTransactionFormOpen(false);
            setSelectedAsset(null);
          }}
          onSuccess={handleTransactionSuccess}
          asset={selectedAsset}
        />
      )}
    </Box>
  );
};
