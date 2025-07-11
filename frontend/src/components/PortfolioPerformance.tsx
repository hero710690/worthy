import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  Stack,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
  Assessment,
  Timeline,
} from '@mui/icons-material';
import { portfolioPerformanceAPI } from '../services/portfolioPerformanceApi';
import type { PortfolioPerformance, PerformanceDisplayData } from '../types/portfolioPerformance';

interface PortfolioPerformanceProps {
  refreshTrigger?: number; // Optional prop to trigger refresh
}

export const PortfolioPerformanceComponent: React.FC<PortfolioPerformanceProps> = ({ 
  refreshTrigger 
}) => {
  const [performance, setPerformance] = useState<PortfolioPerformance | null>(null);
  const [multiPeriodPerformance, setMultiPeriodPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both single period and multi-period performance
      const [singlePeriod, multiPeriod] = await Promise.all([
        portfolioPerformanceAPI.getPortfolioPerformance(12), // 1 year
        portfolioPerformanceAPI.getMultiPeriodPerformance()
      ]);

      setPerformance(singlePeriod);
      setMultiPeriodPerformance(multiPeriod);
    } catch (err) {
      console.error('Error fetching portfolio performance:', err);
      setError('Failed to load portfolio performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, [refreshTrigger]);

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getPerformanceColor = (value: number): 'success' | 'error' | 'warning' => {
    if (value > 0.05) return 'success';
    if (value < -0.05) return 'error';
    return 'warning';
  };

  const getPerformanceIcon = (value: number) => {
    if (value > 0) return <TrendingUp />;
    if (value < 0) return <TrendingDown />;
    return <ShowChart />;
  };

  const createPerformanceDisplayData = (): PerformanceDisplayData[] => {
    if (!multiPeriodPerformance) return [];

    return [
      {
        label: 'YTD',
        period: `${multiPeriodPerformance.ytd.period_months} months`,
        annualReturn: multiPeriodPerformance.ytd.real_annual_return,
        totalReturn: multiPeriodPerformance.ytd.total_return,
        totalInvested: multiPeriodPerformance.ytd.total_invested,
        currentValue: multiPeriodPerformance.ytd.current_value,
        gainLoss: multiPeriodPerformance.ytd.current_value - multiPeriodPerformance.ytd.total_invested,
        color: getPerformanceColor(multiPeriodPerformance.ytd.real_annual_return)
      },
      {
        label: '1 Year',
        period: '12 months',
        annualReturn: multiPeriodPerformance.oneYear.real_annual_return,
        totalReturn: multiPeriodPerformance.oneYear.total_return,
        totalInvested: multiPeriodPerformance.oneYear.total_invested,
        currentValue: multiPeriodPerformance.oneYear.current_value,
        gainLoss: multiPeriodPerformance.oneYear.current_value - multiPeriodPerformance.oneYear.total_invested,
        color: getPerformanceColor(multiPeriodPerformance.oneYear.real_annual_return)
      },
      {
        label: '3 Years',
        period: '36 months',
        annualReturn: multiPeriodPerformance.threeYear.real_annual_return,
        totalReturn: multiPeriodPerformance.threeYear.total_return,
        totalInvested: multiPeriodPerformance.threeYear.total_invested,
        currentValue: multiPeriodPerformance.threeYear.current_value,
        gainLoss: multiPeriodPerformance.threeYear.current_value - multiPeriodPerformance.threeYear.total_invested,
        color: getPerformanceColor(multiPeriodPerformance.threeYear.real_annual_return)
      },
      {
        label: '5 Years',
        period: '60 months',
        annualReturn: multiPeriodPerformance.fiveYear.real_annual_return,
        totalReturn: multiPeriodPerformance.fiveYear.total_return,
        totalInvested: multiPeriodPerformance.fiveYear.total_invested,
        currentValue: multiPeriodPerformance.fiveYear.current_value,
        gainLoss: multiPeriodPerformance.fiveYear.current_value - multiPeriodPerformance.fiveYear.total_invested,
        color: getPerformanceColor(multiPeriodPerformance.fiveYear.real_annual_return)
      }
    ];
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={24} />
            <Typography>Loading portfolio performance...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!performance) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No performance data available. Start investing to see your portfolio performance!
      </Alert>
    );
  }

  const performanceData = createPerformanceDisplayData();

  return (
    <Box>
      {/* Main Performance Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Assessment color="primary" />
            <Typography variant="h6" component="h2">
              Portfolio Performance
            </Typography>
            <Chip 
              label={performance.calculation_method.replace('_', ' ').toUpperCase()} 
              size="small" 
              variant="outlined" 
            />
          </Box>

          <Grid container spacing={3}>
            {/* Annual Return */}
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={1}>
                  {getPerformanceIcon(performance.real_annual_return)}
                  <Typography variant="h4" color={getPerformanceColor(performance.real_annual_return)}>
                    {formatPercentage(performance.real_annual_return)}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Annual Return (12 months)
                </Typography>
              </Box>
            </Grid>

            {/* Total Return */}
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color={getPerformanceColor(performance.total_return)}>
                  {formatPercentage(performance.total_return)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Return
                </Typography>
              </Box>
            </Grid>

            {/* Total Invested */}
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h4">
                  {formatCurrency(performance.total_invested)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Invested
                </Typography>
              </Box>
            </Grid>

            {/* Current Value */}
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">
                  {formatCurrency(performance.current_value)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Current Value
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Gain/Loss */}
          <Box mt={2} textAlign="center">
            <Divider sx={{ mb: 2 }} />
            <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Unrealized Gain/Loss:
              </Typography>
              <Chip
                label={formatCurrency(performance.current_value - performance.total_invested)}
                color={performance.current_value >= performance.total_invested ? 'success' : 'error'}
                icon={performance.current_value >= performance.total_invested ? <TrendingUp /> : <TrendingDown />}
              />
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* Multi-Period Performance */}
      {performanceData.length > 0 && (
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <Timeline color="primary" />
              <Typography variant="h6" component="h2">
                Performance by Period
              </Typography>
            </Box>

            <Grid container spacing={2}>
              {performanceData.map((data, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Box textAlign="center">
                        <Typography variant="h6" color="primary" gutterBottom>
                          {data.label}
                        </Typography>
                        
                        <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={1}>
                          {getPerformanceIcon(data.annualReturn)}
                          <Typography variant="h5" color={data.color}>
                            {formatPercentage(data.annualReturn)}
                          </Typography>
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Annualized Return
                        </Typography>

                        <Divider sx={{ my: 1 }} />

                        <Stack spacing={1}>
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">
                              Total Return:
                            </Typography>
                            <Typography variant="body2" color={data.color}>
                              {formatPercentage(data.totalReturn)}
                            </Typography>
                          </Box>
                          
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">
                              Gain/Loss:
                            </Typography>
                            <Typography 
                              variant="body2" 
                              color={data.gainLoss >= 0 ? 'success.main' : 'error.main'}
                            >
                              {formatCurrency(data.gainLoss)}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Calculation Method Info */}
      <Box mt={2}>
        <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
          <Typography variant="body2">
            <strong>Calculation Method:</strong> {performance.calculation_method.replace('_', ' ')}
            {performance.calculation_method === 'time_weighted_return' && (
              <span> - Accounts for the timing of cash flows and provides accurate performance measurement.</span>
            )}
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default PortfolioPerformanceComponent;
