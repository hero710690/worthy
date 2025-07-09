import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
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
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  Add,
  TrendingUp,
  TrendingDown,
  AccountBalance,
  ShowChart,
  Assessment,
  Edit,
  Delete,
  Refresh,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { assetAPI } from '../../services/assetApi';
import { assetValuationService } from '../../services/assetValuationService';
import { stockPriceService } from '../../services/stockPriceService';
import { exchangeRateService } from '../../services/exchangeRateService';
import { AssetInitForm } from './AssetInitForm';
import type { Asset } from '../../types/assets';

export const AssetsList: React.FC = () => {
  const { user } = useAuthStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentPrices, setCurrentPrices] = useState<Map<string, number>>(new Map());
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [totalUnrealizedPL, setTotalUnrealizedPL] = useState(0);
  const [apiStatus, setApiStatus] = useState({ exchangeRates: false, stockPrices: false });

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await assetAPI.getAssets();
      setAssets(response.assets);
      
      // Fetch current prices and calculate portfolio value
      await updatePortfolioData(response.assets);
      
      setError(null);
    } catch (error: any) {
      console.error('Failed to fetch assets:', error);
      setError(error.response?.data?.message || 'Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  };

  const updatePortfolioData = async (assetList: Asset[]) => {
    try {
      const baseCurrency = user?.base_currency || 'USD';
      
      // Get portfolio valuation with real-time data
      const portfolioValuation = await assetValuationService.valuatePortfolio(assetList, baseCurrency);
      
      // Update state with real-time data
      setPortfolioValue(portfolioValuation.totalValueInBaseCurrency);
      setTotalUnrealizedPL(portfolioValuation.totalUnrealizedGainLoss);
      setApiStatus(portfolioValuation.apiStatus);
      
      // Extract current prices for display
      const pricesMap = new Map<string, number>();
      portfolioValuation.assets.forEach(valuation => {
        if (valuation.currentPrice) {
          pricesMap.set(valuation.asset.ticker_symbol, valuation.currentPrice);
        }
      });
      setCurrentPrices(pricesMap);
      
    } catch (error) {
      console.error('Failed to update portfolio data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Force refresh of external data
      await exchangeRateService.forceRefreshRates();
      stockPriceService.clearCache();
      
      // Refresh assets and portfolio data
      await fetchAssets();
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setShowAssetForm(true);
  };

  const handleDeleteAsset = (asset: Asset) => {
    setDeletingAsset(asset);
  };

  const confirmDeleteAsset = async () => {
    if (!deletingAsset) return;

    setDeleteLoading(true);
    try {
      await assetAPI.deleteAsset(deletingAsset.asset_id);
      
      // Refresh the assets list after successful deletion
      await fetchAssets();
      
      setDeletingAsset(null);
      setError(null);
    } catch (error: any) {
      console.error('Failed to delete asset:', error);
      setError(error.response?.data?.message || 'Failed to delete asset');
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDelete = () => {
    setDeletingAsset(null);
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleAssetSuccess = () => {
    setShowAssetForm(false);
    setEditingAsset(null);
    fetchAssets();
  };

  const handleCloseAssetForm = () => {
    setShowAssetForm(false);
    setEditingAsset(null);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return exchangeRateService.formatCurrency(amount, currency);
  };

  const getAssetTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'Stock': 'primary',
      'ETF': 'secondary',
      'Cash': 'success',
      'Bond': 'warning',
      'REIT': 'info',
      'Mutual Fund': 'error'
    };
    return colors[type] || 'default';
  };

  const getPriceChangeColor = (currentPrice: number, avgCost: number) => {
    if (currentPrice > avgCost) return 'success.main';
    if (currentPrice < avgCost) return 'error.main';
    return 'text.secondary';
  };

  const getPriceChangeIcon = (currentPrice: number, avgCost: number) => {
    if (currentPrice > avgCost) return <TrendingUp fontSize="small" />;
    if (currentPrice < avgCost) return <TrendingDown fontSize="small" />;
    return null;
  };

  const calculatePriceChange = (currentPrice: number, avgCost: number) => {
    const change = currentPrice - avgCost;
    const changePercent = avgCost > 0 ? (change / avgCost) * 100 : 0;
    return { change, changePercent };
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
            My Assets
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your investment portfolio and track performance
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={refreshing ? <CircularProgress size={16} /> : <Refresh />}
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{ borderRadius: 2 }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowAssetForm(true)}
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1.5,
              textTransform: 'none',
              fontWeight: 'bold'
            }}
          >
            Add Asset
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* API Status Indicators */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Chip
          label={`Exchange Rates: ${apiStatus.exchangeRates ? 'Live' : 'Mock'}`}
          color={apiStatus.exchangeRates ? 'success' : 'warning'}
          variant="outlined"
          size="small"
        />
        <Chip
          label={`Stock Prices: ${apiStatus.stockPrices ? 'Live' : 'Mock'}`}
          color={apiStatus.stockPrices ? 'success' : 'warning'}
          variant="outlined"
          size="small"
        />
      </Stack>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card 
            elevation={0} 
            sx={{ 
              borderRadius: 3, 
              height: '100%',
              border: '1px solid',
              borderColor: 'grey.200',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: 'primary.main',
                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.1)'
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '8px',
                    bgcolor: '#667eea15',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#667eea'
                  }}
                >
                  <AccountBalance />
                </Box>
              </Stack>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 'bold',
                  mb: 1,
                  fontSize: { xs: '1.75rem', md: '2rem' }
                }}
              >
                {formatCurrency(portfolioValue, user?.base_currency || 'USD')}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: totalUnrealizedPL >= 0 ? 'success.main' : 'error.main',
                    fontWeight: 'medium'
                  }}
                >
                  {totalUnrealizedPL >= 0 ? '+' : ''}{formatCurrency(totalUnrealizedPL, user?.base_currency || 'USD')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  unrealized P&L
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card 
            elevation={0} 
            sx={{ 
              borderRadius: 3, 
              height: '100%',
              border: '1px solid',
              borderColor: 'grey.200',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: 'success.main',
                boxShadow: '0 8px 32px rgba(76, 175, 80, 0.1)'
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '8px',
                    bgcolor: '#4caf5015',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4caf50'
                  }}
                >
                  <ShowChart />
                </Box>
              </Stack>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 'bold',
                  mb: 1,
                  fontSize: { xs: '1.75rem', md: '2rem' }
                }}
              >
                {assets.length}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Total Assets
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card 
            elevation={0} 
            sx={{ 
              borderRadius: 3, 
              height: '100%',
              border: '1px solid',
              borderColor: 'grey.200',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: 'info.main',
                boxShadow: '0 8px 32px rgba(33, 150, 243, 0.1)'
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '8px',
                    bgcolor: '#2196f315',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2196f3'
                  }}
                >
                  <Assessment />
                </Box>
              </Stack>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 'bold',
                  mb: 1,
                  fontSize: { xs: '1.75rem', md: '2rem' }
                }}
              >
                {new Set(assets.map(a => a.asset_type)).size}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Asset Types
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Assets Table */}
      <Card 
        elevation={0} 
        sx={{ 
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'grey.200'
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'grey.200' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Asset Holdings
            </Typography>
          </Box>
          
          {assets.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <AccountBalance sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No assets yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Start building your portfolio by adding your first asset
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowAssetForm(true)}
              >
                Add Your First Asset
              </Button>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <TableContainer>
                <Table sx={{ minWidth: { xs: 800, md: 900 } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: { xs: '0.875rem', md: '1rem' },
                        py: { xs: 2, md: 2.5 }
                      }}>
                        Asset
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: { xs: '0.875rem', md: '1rem' },
                        py: { xs: 2, md: 2.5 }
                      }}>
                        Type
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: { xs: '0.875rem', md: '1rem' },
                        py: { xs: 2, md: 2.5 }
                      }} align="right">
                        Shares
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: { xs: '0.875rem', md: '1rem' },
                        py: { xs: 2, md: 2.5 }
                      }} align="right">
                        Avg Cost
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: { xs: '0.875rem', md: '1rem' },
                        py: { xs: 2, md: 2.5 }
                      }} align="right">
                        Current Price
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: { xs: '0.875rem', md: '1rem' },
                        py: { xs: 2, md: 2.5 }
                      }} align="right">
                        Market Value
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: { xs: '0.875rem', md: '1rem' },
                        py: { xs: 2, md: 2.5 }
                      }}>
                        Currency
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: { xs: '0.875rem', md: '1rem' },
                        py: { xs: 2, md: 2.5 }
                      }} align="center">
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assets.map((asset) => {
                      const currentPrice = currentPrices.get(asset.ticker_symbol);
                      const marketValue = currentPrice ? asset.total_shares * currentPrice : asset.total_shares * asset.average_cost_basis;
                      const priceChange = currentPrice ? calculatePriceChange(currentPrice, asset.average_cost_basis) : null;
                      
                      return (
                        <TableRow key={asset.asset_id} hover sx={{ 
                          '&:hover': { bgcolor: 'grey.50' },
                          transition: 'background-color 0.2s ease'
                        }}>
                          <TableCell sx={{ py: { xs: 2, md: 2.5 } }}>
                            <Box>
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  fontSize: { xs: '0.875rem', md: '1rem' }
                                }}
                              >
                                {asset.ticker_symbol}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                              >
                                {asset.asset_type}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ py: { xs: 2, md: 2.5 } }}>
                            <Chip
                              label={asset.asset_type}
                              color={getAssetTypeColor(asset.asset_type) as any}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ py: { xs: 2, md: 2.5 } }}>
                            <Typography 
                              variant="body2"
                              sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                            >
                              {asset.total_shares.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 6
                              })}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ py: { xs: 2, md: 2.5 } }}>
                            <Typography 
                              variant="body2"
                              sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                            >
                              {formatCurrency(asset.average_cost_basis, asset.currency)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ py: { xs: 2, md: 2.5 } }}>
                            {currentPrice ? (
                              <Stack direction="column" alignItems="flex-end" spacing={0.5}>
                                <Typography 
                                  variant="body2"
                                  sx={{ 
                                    fontSize: { xs: '0.875rem', md: '1rem' },
                                    fontWeight: 'medium',
                                    color: getPriceChangeColor(currentPrice, asset.average_cost_basis)
                                  }}
                                >
                                  {formatCurrency(currentPrice, asset.currency)}
                                </Typography>
                                {priceChange && (
                                  <Stack direction="row" alignItems="center" spacing={0.5}>
                                    {getPriceChangeIcon(currentPrice, asset.average_cost_basis)}
                                    <Typography 
                                      variant="caption"
                                      sx={{ 
                                        color: getPriceChangeColor(currentPrice, asset.average_cost_basis),
                                        fontSize: '0.75rem'
                                      }}
                                    >
                                      {priceChange.changePercent >= 0 ? '+' : ''}{priceChange.changePercent.toFixed(2)}%
                                    </Typography>
                                  </Stack>
                                )}
                              </Stack>
                            ) : (
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                              >
                                {asset.asset_type === 'Cash' ? 'N/A' : 'Loading...'}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right" sx={{ py: { xs: 2, md: 2.5 } }}>
                            <Typography 
                              variant="body2"
                              sx={{ 
                                fontSize: { xs: '0.875rem', md: '1rem' },
                                fontWeight: 'medium'
                              }}
                            >
                              {formatCurrency(marketValue, asset.currency)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: { xs: 2, md: 2.5 } }}>
                            <Chip
                              label={asset.currency}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ py: { xs: 2, md: 2.5 } }}>
                            <Stack direction="row" spacing={1} justifyContent="center">
                              <IconButton 
                                size="small" 
                                color="primary"
                                onClick={() => handleEditAsset(asset)}
                                title="Edit asset"
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleDeleteAsset(asset)}
                                title="Delete asset"
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Asset Form Dialog */}
      <AssetInitForm
        open={showAssetForm}
        onClose={handleCloseAssetForm}
        onSuccess={handleAssetSuccess}
        editAsset={editingAsset}
        existingAssets={assets}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingAsset}
        onClose={cancelDelete}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Delete Asset
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deletingAsset?.ticker_symbol}</strong>?
            This action cannot be undone and will remove all associated transaction history.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button 
            onClick={confirmDeleteAsset} 
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
