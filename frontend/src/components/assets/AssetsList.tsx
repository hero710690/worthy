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
  AppBar,
  Toolbar,
  Container,
} from '@mui/material';
import {
  Add,
  TrendingUp,
  AccountBalance,
  Visibility,
  ShowChart,
  ArrowBack,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { assetAPI } from '../../services/assetApi';
import { AssetInitForm } from './AssetInitForm';
import { TransactionForm } from './TransactionForm';
import type { Asset } from '../../types/assets';

export const AssetsList: React.FC = () => {
  const navigate = useNavigate();
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
      <Box sx={{ flexGrow: 1, bgcolor: 'grey.50', minHeight: '100vh' }}>
        <AppBar 
          position="static" 
          elevation={0}
          sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          <Toolbar>
            <Button
              color="inherit"
              startIcon={<ArrowBack />}
              onClick={() => navigate('/dashboard')}
              sx={{ mr: 2 }}
            >
              Dashboard
            </Button>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
              Asset Management
            </Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress size={60} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'grey.50', minHeight: '100vh' }}>
      {/* Navigation Header */}
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Toolbar>
          <Button
            color="inherit"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2 }}
          >
            Dashboard
          </Button>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Asset Management
          </Typography>
          <Button
            color="inherit"
            startIcon={<Add />}
            onClick={() => setInitFormOpen(true)}
            variant="outlined"
            sx={{ 
              borderColor: 'rgba(255,255,255,0.3)',
              '&:hover': { 
                borderColor: 'rgba(255,255,255,0.5)',
                bgcolor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            Add Asset
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Portfolio Summary */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
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

          <Grid item xs={12} sm={4}>
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

          <Grid item xs={12} sm={4}>
            <Card elevation={2} sx={{ borderRadius: 3 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <ShowChart color="info" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Unique Assets
                </Typography>
                <Typography variant="h4" color="info.main" sx={{ fontWeight: 'bold' }}>
                  {new Set(assets.map(asset => asset.ticker_symbol)).size}
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
                No Assets Found
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Start building your portfolio by initializing your first asset.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setInitFormOpen(true)}
                size="large"
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                  },
                }}
              >
                Initialize First Asset
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card elevation={2} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Your Assets
                </Typography>
              </Box>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Asset</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Shares</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Avg Cost</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Total Value</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Currency</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assets.map((asset) => (
                      <TableRow key={asset.asset_id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                              {asset.ticker_symbol}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {asset.asset_id}
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
                          <Typography variant="body2">
                            {asset.total_shares.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 6
                            })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {formatCurrency(asset.average_cost_basis, asset.currency)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {formatCurrency(asset.total_shares * asset.average_cost_basis, asset.currency)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={asset.currency} 
                            size="small" 
                            color="secondary" 
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleAddTransaction(asset)}
                              title="Add Transaction"
                            >
                              <Add />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="info"
                              title="View Details"
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
            </CardContent>
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
      </Container>
    </Box>
  );
};
