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
        <Box sx={{ p: { xs: 3, md: 4 } }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 'bold',
              fontSize: { xs: '1.75rem', md: '2.125rem' },
              mb: 2
            }}
          >
            Asset Management
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <CircularProgress size={60} />
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'grey.50', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ p: { xs: 3, md: 4 }, pb: 0 }}>
        <Stack 
          direction="row" 
          justifyContent="space-between" 
          alignItems="center"
          sx={{ mb: 1 }}
        >
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 'bold',
                fontSize: { xs: '1.75rem', md: '2.125rem' },
                mb: 0.5
              }}
            >
              Asset Management
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ fontSize: { xs: '0.95rem', md: '1rem' } }}
            >
              Manage your investment portfolio and track performance
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate('/dashboard')}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.5,
                textTransform: 'none',
                fontWeight: 'medium',
              }}
            >
              Back to Dashboard
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setInitFormOpen(true)}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 2,
                px: 3,
                py: 1.5,
                textTransform: 'none',
                fontWeight: 'bold',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                }
              }}
            >
              Add Asset
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: { xs: 2, md: 3 } }}>
            {error}
          </Alert>
        )}

        {/* Portfolio Summary */}
        <Grid container spacing={{ xs: 2, md: 4 }} sx={{ mb: { xs: 3, md: 5 } }}>
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
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontWeight: 'medium' }}
                  >
                    Total Assets
                  </Typography>
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
                  {assets.length}
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'success.main',
                      fontWeight: 'medium'
                    }}
                  >
                    +0.0%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    vs last month
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
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontWeight: 'medium' }}
                  >
                    Total Value
                  </Typography>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      bgcolor: '#764ba215',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#764ba2'
                    }}
                  >
                    <TrendingUp />
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
                  ${calculateTotalValue().toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'success.main',
                      fontWeight: 'medium'
                    }}
                  >
                    +0.0%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    vs last month
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
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontWeight: 'medium' }}
                  >
                    Unique Assets
                  </Typography>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      bgcolor: '#f093fb15',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#f093fb'
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
                  {new Set(assets.map(asset => asset.ticker_symbol)).size}
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'success.main',
                      fontWeight: 'medium'
                    }}
                  >
                    +0.0%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    vs last month
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Assets Table */}
        {assets.length === 0 ? (
          <Card elevation={2} sx={{ borderRadius: 3, textAlign: 'center', py: { xs: 4, md: 8 } }}>
            <CardContent sx={{ p: { xs: 3, md: 5 } }}>
              <AccountBalance sx={{ 
                fontSize: { xs: 60, md: 100 }, 
                color: 'grey.300', 
                mb: { xs: 2, md: 3 } 
              }} />
              <Typography 
                variant="h5" 
                gutterBottom 
                color="text.secondary"
                sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}
              >
                No Assets Found
              </Typography>
              <Typography 
                variant="body1" 
                color="text.secondary" 
                sx={{ 
                  mb: { xs: 3, md: 4 },
                  fontSize: { xs: '1rem', md: '1.1rem' },
                  maxWidth: 500,
                  mx: 'auto'
                }}
              >
                Start building your portfolio by initializing your first asset.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setInitFormOpen(true)}
                size="large"
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  py: { xs: 1.5, md: 2 },
                  px: { xs: 3, md: 4 },
                  fontSize: { xs: '1rem', md: '1.1rem' },
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
          <Card 
            elevation={0} 
            sx={{ 
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'grey.200'
            }}
          >
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ 
                p: { xs: 3, md: 4 }, 
                borderBottom: '1px solid', 
                borderColor: 'divider' 
              }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '1.25rem', md: '1.5rem' }
                  }}
                >
                  Your Assets
                </Typography>
              </Box>
              
              <TableContainer>
                <Table sx={{ minWidth: { xs: 650, md: 750 } }}>
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
                        Total Value
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
                    {assets.map((asset) => (
                      <TableRow key={asset.asset_id} hover sx={{ 
                        '&:hover': { bgcolor: 'grey.50' },
                        transition: 'background-color 0.2s ease'
                      }}>
                        <TableCell sx={{ py: { xs: 2, md: 2.5 } }}>
                          <Box>
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                fontWeight: 'medium',
                                fontSize: { xs: '0.95rem', md: '1rem' }
                              }}
                            >
                              {asset.ticker_symbol}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{ fontSize: { xs: '0.75rem', md: '0.8rem' } }}
                            >
                              ID: {asset.asset_id}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: { xs: 2, md: 2.5 } }}>
                          <Chip 
                            label={asset.asset_type} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                            sx={{ fontSize: { xs: '0.75rem', md: '0.8rem' } }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ py: { xs: 2, md: 2.5 } }}>
                          <Typography 
                            variant="body2"
                            sx={{ fontSize: { xs: '0.875rem', md: '0.95rem' } }}
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
                            sx={{ fontSize: { xs: '0.875rem', md: '0.95rem' } }}
                          >
                            {formatCurrency(asset.average_cost_basis, asset.currency)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: { xs: 2, md: 2.5 } }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 'medium',
                              fontSize: { xs: '0.875rem', md: '0.95rem' }
                            }}
                          >
                            {formatCurrency(asset.total_shares * asset.average_cost_basis, asset.currency)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: { xs: 2, md: 2.5 } }}>
                          <Chip 
                            label={asset.currency} 
                            size="small" 
                            color="secondary" 
                            variant="filled"
                            sx={{ fontSize: { xs: '0.75rem', md: '0.8rem' } }}
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ py: { xs: 2, md: 2.5 } }}>
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleAddTransaction(asset)}
                              title="Add Transaction"
                              sx={{ 
                                '&:hover': { bgcolor: 'primary.50' },
                                transition: 'background-color 0.2s ease'
                              }}
                            >
                              <Add />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="info"
                              title="View Details"
                              sx={{ 
                                '&:hover': { bgcolor: 'info.50' },
                                transition: 'background-color 0.2s ease'
                              }}
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
