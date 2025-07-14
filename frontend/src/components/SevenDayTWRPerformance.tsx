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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
  CalendarToday,
  ExpandMore,
  AccountBalance,
  Timeline,
  Info,
} from '@mui/icons-material';
import { portfolioPerformanceAPI, type SevenDayTWRPerformance } from '../services/portfolioPerformanceApi';

interface SevenDayTWRProps {
  refreshTrigger?: number;
}

export const SevenDayTWRPerformanceComponent: React.FC<SevenDayTWRProps> = ({ 
  refreshTrigger 
}) => {
  const [performance, setPerformance] = useState<SevenDayTWRPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTWRData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const twrData = await portfolioPerformanceAPI.get7DayTWRPerformance();
      setPerformance(twrData);
    } catch (err) {
      console.error('Error fetching 7-day TWR performance:', err);
      setError('Failed to load 7-day performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTWRData();
  }, [refreshTrigger]);

  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatCurrency = (value: number, currency?: string): string => {
    const currencyCode = currency || performance?.base_currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getPerformanceColor = (value: number): 'success' | 'error' | 'warning' => {
    if (value > 0.5) return 'success';
    if (value < -0.5) return 'error';
    return 'warning';
  };

  const getPerformanceIcon = (value: number) => {
    if (value > 0) return <TrendingUp />;
    if (value < 0) return <TrendingDown />;
    return <ShowChart />;
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={24} />
            <Typography>Loading 7-day performance...</Typography>
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
        No 7-day performance data available.
      </Alert>
    );
  }

  // Handle insufficient history cases
  if (performance.calculation_method === 'insufficient_history') {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Timeline color="primary" />
            <Typography variant="h6" component="h2">
              {performance.is_adjusted_period 
                ? `${performance.period_days}-Day Time-Weighted Return`
                : '7-Day Time-Weighted Return'
              }
            </Typography>
            <Tooltip title="Time-Weighted Return (TWR) measures portfolio performance independent of cash flows, providing accurate performance measurement regardless of when you add or remove money.">
              <Info color="action" fontSize="small" />
            </Tooltip>
          </Box>

          {/* Show adjustment notice if period was adjusted */}
          {performance.is_adjusted_period && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Adjusted Period:</strong> Showing {performance.period_days}-day performance since your first investment on {new Date(performance.start_date).toLocaleDateString()}.
                {performance.period_days < 7 && (
                  <span> Come back in {7 - performance.period_days} more days for full 7-day performance!</span>
                )}
              </Typography>
            </Alert>
          )}

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Insufficient History:</strong> {performance.error_message}
            </Typography>
            {performance.first_transaction_date && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Your first investment was on {new Date(performance.first_transaction_date).toLocaleDateString()}.
                You need at least 7 days of investment history to calculate 7-day performance.
              </Typography>
            )}
            {performance.days_since_first_investment !== undefined && performance.days_since_first_investment > 0 && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Come back in {7 - performance.days_since_first_investment} more days to see your 7-day performance!
              </Typography>
            )}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Handle no transactions case
  if (performance.calculation_method === 'no_transactions') {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Timeline color="primary" />
            <Typography variant="h6" component="h2">
              7-Day Time-Weighted Return
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              No investment history found. Start investing to see your 7-day performance!
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Handle no current assets case
  if (performance.calculation_method === 'no_current_assets') {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Timeline color="primary" />
            <Typography variant="h6" component="h2">
              7-Day Time-Weighted Return
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              No current assets in portfolio. Add some investments to see your 7-day performance!
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const returnColor = getPerformanceColor(performance.seven_day_return_percent);
  const returnIcon = getPerformanceIcon(performance.seven_day_return);

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Timeline color="primary" />
          <Typography variant="h6" component="h2">
            7-Day Time-Weighted Return
          </Typography>
          <Tooltip title="Time-Weighted Return (TWR) measures portfolio performance independent of cash flows, providing accurate performance measurement regardless of when you add or remove money.">
            <Info color="action" fontSize="small" />
          </Tooltip>
        </Box>

        {/* Main Performance Metrics */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                  {returnIcon}
                  <Typography variant="subtitle2" color="text.secondary">
                    {performance.is_adjusted_period 
                      ? `${performance.period_days}-Day Return`
                      : '7-Day Return'
                    }
                  </Typography>
                </Stack>
                <Typography variant="h4" color={returnColor === 'success' ? 'success.main' : returnColor === 'error' ? 'error.main' : 'warning.main'}>
                  {formatPercentage(performance.seven_day_return_percent)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {performance.start_date} to {performance.end_date}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                  <ShowChart />
                  <Typography variant="subtitle2" color="text.secondary">
                    Annualized Return
                  </Typography>
                </Stack>
                <Typography variant="h4" color={returnColor === 'success' ? 'success.main' : returnColor === 'error' ? 'error.main' : 'warning.main'}>
                  {formatPercentage(performance.annualized_return_percent)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  If sustained for 1 year
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Portfolio Value Change */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={4}>
            <Box textAlign="center">
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Starting Value
              </Typography>
              <Typography variant="h6">
                {formatCurrency(performance.start_value)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {performance.start_date}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box textAlign="center">
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Current Value
              </Typography>
              <Typography variant="h6">
                {formatCurrency(performance.end_value)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {performance.end_date}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box textAlign="center">
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Value Change
              </Typography>
              <Typography 
                variant="h6" 
                color={performance.end_value >= performance.start_value ? 'success.main' : 'error.main'}
              >
                {performance.end_value >= performance.start_value ? '+' : ''}
                {formatCurrency(performance.end_value - performance.start_value)}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Calculation Method and Cash Flows */}
        <Box mb={2}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <AccountBalance fontSize="small" />
            <Typography variant="subtitle2">
              Calculation Method
            </Typography>
            <Chip 
              label={performance.calculation_method === 'simple_no_cash_flows' ? 'Simple' : 'TWR with Cash Flows'}
              size="small"
              color={performance.calculation_method === 'simple_no_cash_flows' ? 'success' : 'warning'}
            />
          </Stack>
          
          {performance.calculation_method === 'simple_no_cash_flows' ? (
            <Typography variant="body2" color="text.secondary">
              No cash flows detected in the past 7 days. Using simple calculation: (End Value ÷ Start Value) - 1
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Cash flows detected. Using Time-Weighted Return to account for contributions/withdrawals.
              Total cash flows: {formatCurrency(performance.total_cash_flows)}
            </Typography>
          )}
        </Box>

        {/* Cash Flows Details (if any) */}
        {performance.cash_flows && performance.cash_flows.length > 0 && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">
                Cash Flows ({performance.cash_flows.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Ticker</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {performance.cash_flows.map((flow, index) => (
                      <TableRow key={index}>
                        <TableCell>{flow.date}</TableCell>
                        <TableCell>{flow.ticker}</TableCell>
                        <TableCell>
                          <Chip 
                            label={flow.type} 
                            size="small" 
                            color={flow.type === 'LumpSum' ? 'primary' : 'secondary'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(flow.amount, flow.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Portfolio Holdings Details */}
        {performance.start_value_details && performance.end_value_details && (
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">
                Portfolio Holdings Details
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Starting Values ({performance.start_date})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Ticker</TableCell>
                          <TableCell align="right">Shares</TableCell>
                          <TableCell align="right">Price</TableCell>
                          <TableCell align="right">Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {performance.start_value_details.map((detail, index) => (
                          <TableRow key={index}>
                            <TableCell>{detail.ticker}</TableCell>
                            <TableCell align="right">{detail.shares.toFixed(4)}</TableCell>
                            <TableCell align="right">{formatCurrency(detail.price, detail.currency)}</TableCell>
                            <TableCell align="right">{formatCurrency(detail.value)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Current Values ({performance.end_date})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Ticker</TableCell>
                          <TableCell align="right">Shares</TableCell>
                          <TableCell align="right">Price</TableCell>
                          <TableCell align="right">Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {performance.end_value_details.map((detail, index) => (
                          <TableRow key={index}>
                            <TableCell>{detail.ticker}</TableCell>
                            <TableCell align="right">{detail.shares.toFixed(4)}</TableCell>
                            <TableCell align="right">{formatCurrency(detail.price, detail.currency)}</TableCell>
                            <TableCell align="right">{formatCurrency(detail.value)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Methodology Note */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>About Time-Weighted Return (TWR):</strong> This calculation measures your portfolio's 
            performance independent of when you add or remove money. It's the industry standard for 
            comparing investment performance because it eliminates the impact of cash flow timing.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default SevenDayTWRPerformanceComponent;
