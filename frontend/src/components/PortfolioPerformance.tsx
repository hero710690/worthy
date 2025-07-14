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
  Tab,
  Tabs,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
  Assessment,
  Timeline,
  CalendarToday,
} from '@mui/icons-material';
import { portfolioPerformanceAPI } from '../services/portfolioPerformanceApi';
import type { PortfolioPerformance } from '../types/portfolioPerformance';

interface PortfolioPerformanceProps {
  refreshTrigger?: number; // Optional prop to trigger refresh
}

interface PeriodPerformance {
  label: string;
  period: string;
  months: number;
  performance: PortfolioPerformance | null;
  available: boolean;
  loading: boolean;
  error: string | null;
}

export const PortfolioPerformanceComponent: React.FC<PortfolioPerformanceProps> = ({ 
  refreshTrigger 
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [periods, setPeriods] = useState<PeriodPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializePeriods = (): PeriodPerformance[] => {
    const currentDate = new Date();
    const ytdMonths = currentDate.getMonth() + 1; // Months since January
    
    return [
      {
        label: 'Since Inception',
        period: 'All Time',
        months: 999, // Large number to get all data
        performance: null,
        available: true, // Always available
        loading: false,
        error: null,
      },
      {
        label: 'YTD',
        period: `${ytdMonths} months`,
        months: ytdMonths,
        performance: null,
        available: ytdMonths >= 1, // Available if we're past January
        loading: false,
        error: null,
      },
      {
        label: '1 Year',
        period: '12 months',
        months: 12,
        performance: null,
        available: false, // Will be determined by actual transaction history
        loading: false,
        error: null,
      },
      {
        label: '3 Years',
        period: '36 months',
        months: 36,
        performance: null,
        available: false, // Will be determined by actual transaction history
        loading: false,
        error: null,
      },
      {
        label: '5 Years',
        period: '60 months',
        months: 60,
        performance: null,
        available: false, // Will be determined by actual transaction history
        loading: false,
        error: null,
      },
    ];
  };

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      const initialPeriods = initializePeriods();
      setPeriods(initialPeriods);

      // First, get since inception performance to determine available periods
      const sinceInceptionPerformance = await portfolioPerformanceAPI.getSinceInceptionPerformance();
      
      // Update since inception data
      const updatedPeriods = [...initialPeriods];
      updatedPeriods[0].performance = sinceInceptionPerformance;

      // Determine which periods are available based on actual transaction history
      const actualMonths = sinceInceptionPerformance.period_months || 0;
      
      // Update availability based on actual transaction history
      updatedPeriods.forEach((period, index) => {
        if (index === 0) return; // Skip since inception (always available)
        
        if (period.months <= actualMonths) {
          period.available = true;
        }
      });

      setPeriods(updatedPeriods);

      // Fetch data for available periods (except since inception which we already have)
      const availablePeriods = updatedPeriods.filter((p, index) => index > 0 && p.available);
      
      for (const period of availablePeriods) {
        try {
          const periodIndex = updatedPeriods.findIndex(p => p.months === period.months);
          updatedPeriods[periodIndex].loading = true;
          setPeriods([...updatedPeriods]);

          const periodPerformance = await portfolioPerformanceAPI.getPortfolioPerformance(period.months);
          updatedPeriods[periodIndex].performance = periodPerformance;
          updatedPeriods[periodIndex].loading = false;
          setPeriods([...updatedPeriods]);
        } catch (err) {
          const periodIndex = updatedPeriods.findIndex(p => p.months === period.months);
          updatedPeriods[periodIndex].error = 'Failed to load';
          updatedPeriods[periodIndex].loading = false;
          setPeriods([...updatedPeriods]);
        }
      }

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

  const formatCurrency = (value: number, currency?: string): string => {
    const performance = periods[selectedTab]?.performance;
    const currencyCode = currency || performance?.base_currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
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

  const getInceptionPeriodLabel = (performance: PortfolioPerformance): string => {
    if (!performance?.period_months) return 'Since Inception';
    
    const months = performance.period_months;
    if (months < 12) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      if (remainingMonths === 0) {
        return `${years} year${years !== 1 ? 's' : ''}`;
      } else {
        return `${years}y ${remainingMonths}m`;
      }
    }
  };

  const availablePeriods = periods.filter(p => p.available);

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

  if (availablePeriods.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No performance data available. Start investing to see your portfolio performance!
      </Alert>
    );
  }

  const currentPeriod = availablePeriods[selectedTab];
  const performance = currentPeriod?.performance;

  return (
    <Box>
      {/* Performance Tabs */}
      {availablePeriods.length > 1 && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ pb: 1 }}>
            <Tabs
              value={selectedTab}
              onChange={(_, newValue) => setSelectedTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ minHeight: 'auto' }}
            >
              {availablePeriods.map((period, index) => (
                <Tab
                  key={period.label}
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <CalendarToday fontSize="small" />
                      <span>{period.label}</span>
                      {period.loading && <CircularProgress size={12} />}
                    </Box>
                  }
                  disabled={period.loading || !!period.error}
                />
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Main Performance Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Assessment color="primary" />
            <Typography variant="h6" component="h2">
              Portfolio Performance - {currentPeriod?.label}
            </Typography>
            {performance && (
              <Chip 
                label={performance.calculation_method.replace('_', ' ').toUpperCase()} 
                size="small" 
                variant="outlined" 
              />
            )}
          </Box>

          {currentPeriod?.loading ? (
            <Box display="flex" alignItems="center" gap={2} py={4}>
              <CircularProgress size={24} />
              <Typography>Loading {currentPeriod.label} performance...</Typography>
            </Box>
          ) : currentPeriod?.error ? (
            <Alert severity="error">
              Failed to load {currentPeriod.label} performance data
            </Alert>
          ) : !performance ? (
            <Alert severity="info">
              No performance data available for {currentPeriod?.label}
            </Alert>
          ) : (
            <>
              <Grid container spacing={3}>
                {/* Annualized Return */}
                <Grid item xs={12} sm={6} md={3}>
                  <Box textAlign="center">
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={1}>
                      {getPerformanceIcon(performance.real_annual_return)}
                      <Typography variant="h4" color={getPerformanceColor(performance.real_annual_return)}>
                        {formatPercentage(performance.real_annual_return)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Annualized Return
                    </Typography>
                    {currentPeriod?.label === 'Since Inception' && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {getInceptionPeriodLabel(performance)}
                      </Typography>
                    )}
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
                    <Typography variant="caption" color="text.secondary" display="block">
                      {currentPeriod?.period}
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
                
                {/* Currency Information */}
                {performance.base_currency && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    💱 All values converted to {performance.base_currency} (your base currency)
                  </Typography>
                )}
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
        <Typography variant="body2">
          <strong>Smart Period Display:</strong> We only show performance periods where you have sufficient transaction history.
          {availablePeriods.length === 1 && (
            <span> As you continue investing over time, more period comparisons will become available.</span>
          )}
          <br />
          <strong>Calculation Method:</strong> {performance?.calculation_method.replace('_', ' ') || 'Time-weighted return'}
          {performance?.calculation_method === 'time_weighted_return' && (
            <span> - Accounts for the timing of cash flows and provides accurate performance measurement.</span>
          )}
        </Typography>
      </Alert>
    </Box>
  );
};

export default PortfolioPerformanceComponent;
