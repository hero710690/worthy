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
  TableSortLabel,
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
  
  // Sorting state
  const [sortBy, setSortBy] = useState<'asset' | 'type' | 'currency' | 'shares' | 'value'>('asset');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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
      'Mutual Fund': 'error',
      'CD': 'success'
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

  // Sorting functionality
  const handleSort = (column: 'asset' | 'type' | 'currency' | 'shares' | 'value') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const sortedAssets = [...assets].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortBy) {
      case 'asset':
        aValue = a.ticker_symbol.toLowerCase();
        bValue = b.ticker_symbol.toLowerCase();
        break;
      case 'type':
        aValue = a.asset_type.toLowerCase();
        bValue = b.asset_type.toLowerCase();
        break;
      case 'currency':
        aValue = a.currency.toLowerCase();
        bValue = b.currency.toLowerCase();
        break;
      case 'shares':
        aValue = a.total_shares;
        bValue = b.total_shares;
        break;
      case 'value':
        // Calculate market value for sorting
        let aMarketValue: number;
        let bMarketValue: number;
        
        if (a.asset_type === 'CD' && a.cd_details) {
          aMarketValue = a.cd_details.current_value;
        } else {
          const aCurrentPrice = currentPrices.get(a.ticker_symbol);
          aMarketValue = aCurrentPrice ? a.total_shares * aCurrentPrice : a.total_shares * a.average_cost_basis;
        }
        
        if (b.asset_type === 'CD' && b.cd_details) {
          bMarketValue = b.cd_details.current_value;
        } else {
          const bCurrentPrice = currentPrices.get(b.ticker_symbol);
          bMarketValue = bCurrentPrice ? b.total_shares * bCurrentPrice : b.total_shares * b.average_cost_basis;
        }
        
        aValue = aMarketValue;
        bValue = bMarketValue;
        break;
      default:
        return 0;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else {
      return sortOrder === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    }
  });

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          width: '100%',
          flexDirection: 'column',
          gap: 2
        }}>
          <CircularProgress size={60} />
          <Typography variant="h6" color="text.secondary">
            Loading your assets...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
            Asset Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your investment portfolio and track real-time performance
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={refreshing ? <CircularProgress size={16} /> : <Refresh />}
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{ borderRadius: 2, px: 3 }}
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
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
              }
            }}
          >
            Add Asset
          </Button>
        </Stack>
      </Box>

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
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  <AccountBalance />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Portfolio Value
                </Typography>
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
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Total market value
              </Typography>
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
                        <TableSortLabel
                          active={sortBy === 'asset'}
                          direction={sortBy === 'asset' ? sortOrder : 'asc'}
                          onClick={() => handleSort('asset')}
                          sx={{ 
                            fontWeight: 'bold',
                            fontSize: { xs: '0.875rem', md: '1rem' }
                          }}
                        >
                          Asset
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: { xs: '0.875rem', md: '1rem' },
                        py: { xs: 2, md: 2.5 }
                      }}>
                        <TableSortLabel
                          active={sortBy === 'type'}
                          direction={sortBy === 'type' ? sortOrder : 'asc'}
                          onClick={() => handleSort('type')}
                          sx={{ 
                            fontWeight: 'bold',
                            fontSize: { xs: '0.875rem', md: '1rem' }
                          }}
                        >
                          Type
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: { xs: '0.875rem', md: '1rem' },
                        py: { xs: 2, md: 2.5 }
                      }} align="right">
                        <TableSortLabel
                          active={sortBy === 'shares'}
                          direction={sortBy === 'shares' ? sortOrder : 'asc'}
                          onClick={() => handleSort('shares')}
                          sx={{ 
                            fontWeight: 'bold',
                            fontSize: { xs: '0.875rem', md: '1rem' }
                          }}
                        >
                          Shares
                        </TableSortLabel>
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
                        <TableSortLabel
                          active={sortBy === 'value'}
                          direction={sortBy === 'value' ? sortOrder : 'asc'}
                          onClick={() => handleSort('value')}
                          sx={{ 
                            fontWeight: 'bold',
                            fontSize: { xs: '0.875rem', md: '1rem' }
                          }}
                        >
                          Market Value
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 'bold',
                        fontSize: { xs: '0.875rem', md: '1rem' },
                        py: { xs: 2, md: 2.5 }
                      }}>
                        <TableSortLabel
                          active={sortBy === 'currency'}
                          direction={sortBy === 'currency' ? sortOrder : 'asc'}
                          onClick={() => handleSort('currency')}
                          sx={{ 
                            fontWeight: 'bold',
                            fontSize: { xs: '0.875rem', md: '1rem' }
                          }}
                        >
                          Currency
                        </TableSortLabel>
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
                    {sortedAssets.map((asset) => {
                      // Handle CD assets differently - use compound interest calculation
                      let marketValue: number;
                      let currentPrice: number | undefined;
                      
                      if (asset.asset_type === 'CD' && asset.cd_details) {
                        // For CD assets, use the compound interest calculation
                        marketValue = asset.cd_details.current_value;
                        currentPrice = asset.cd_details.current_value / asset.total_shares; // Effective price per share
                      } else {
                        // For other assets, use market price
                        currentPrice = currentPrices.get(asset.ticker_symbol);
                        marketValue = currentPrice ? asset.total_shares * currentPrice : asset.total_shares * asset.average_cost_basis;
                      }
                      
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
                            {asset.asset_type === 'CD' && asset.cd_details ? (
                              // CD-specific display
                              <Stack direction="column" alignItems="flex-end" spacing={0.5}>
                                <Typography 
                                  variant="body2"
                                  sx={{ 
                                    fontSize: { xs: '0.875rem', md: '1rem' },
                                    fontWeight: 'medium',
                                    color: 'success.main'
                                  }}
                                >
                                  {asset.interest_rate}% APY
                                </Typography>
                                <Typography 
                                  variant="caption"
                                  sx={{ 
                                    color: 'text.secondary',
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  {asset.cd_details.is_matured ? 'Matured' : `${asset.cd_details.elapsed_days}/${asset.cd_details.total_days} days`}
                                </Typography>
                                {asset.cd_details.accrued_interest > 0 && (
                                  <Typography 
                                    variant="caption"
                                    sx={{ 
                                      color: 'success.main',
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    +{formatCurrency(asset.cd_details.accrued_interest, asset.currency)} interest
                                  </Typography>
                                )}
                              </Stack>
                            ) : currentPrice ? (
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
