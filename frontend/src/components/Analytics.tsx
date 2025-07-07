import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Stack,
  Alert,
  Chip,
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  TrendingUp,
  Assessment,
  ShowChart,
  PieChart,
  BarChart,
} from '@mui/icons-material';

export const Analytics: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          Portfolio Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Advanced analytics and insights for your investment portfolio
        </Typography>
      </Box>

      {/* Coming Soon Alert */}
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2">
          <strong>Coming in Milestone 6:</strong> Advanced portfolio analytics including performance metrics, 
          risk assessment, and detailed charts will be available soon.
        </Typography>
      </Alert>

      {/* Analytics Features Preview */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
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
                  <TrendingUp />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Performance Metrics
                  </Typography>
                  <Chip label="Coming Soon" size="small" color="primary" variant="outlined" />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Track your portfolio's performance over time with detailed metrics including:
              </Typography>
              <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                <Typography component="li" variant="body2" color="text.secondary">
                  Total return and annualized returns
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Volatility and risk metrics
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Sharpe ratio and risk-adjusted returns
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
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
                  <PieChart />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Asset Allocation Analysis
                  </Typography>
                  <Chip label="Coming Soon" size="small" color="success" variant="outlined" />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Deep dive into your portfolio allocation with advanced visualizations:
              </Typography>
              <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                <Typography component="li" variant="body2" color="text.secondary">
                  Interactive pie charts and treemaps
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Sector and geographic diversification
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Rebalancing recommendations
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
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
                  <ShowChart />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Historical Performance
                  </Typography>
                  <Chip label="Coming Soon" size="small" color="info" variant="outlined" />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Visualize your portfolio's growth and performance over time:
              </Typography>
              <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                <Typography component="li" variant="body2" color="text.secondary">
                  Portfolio value charts over time
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Individual asset performance tracking
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Benchmark comparisons
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
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
                  <Assessment />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Risk Assessment
                  </Typography>
                  <Chip label="Coming Soon" size="small" color="warning" variant="outlined" />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Understand and manage your portfolio risk with advanced analytics:
              </Typography>
              <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                <Typography component="li" variant="body2" color="text.secondary">
                  Portfolio beta and correlation analysis
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Value at Risk (VaR) calculations
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Stress testing scenarios
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: 'secondary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  <BarChart />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Advanced Visualizations
                  </Typography>
                  <Chip label="Coming Soon" size="small" color="secondary" variant="outlined" />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Interactive charts and graphs to help you understand your portfolio better:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    • Interactive line charts for performance tracking
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    • Heatmaps for correlation analysis
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    • Candlestick charts for price movements
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    • Custom date range selections
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
