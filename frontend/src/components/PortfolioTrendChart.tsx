import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { portfolioAPI, type PortfolioSnapshot, type SnapshotRange } from '../services/portfolioApi';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend, Filler);

type ViewMode = 'total' | 'invested';

interface Props {
  baseCurrency: string;
}

const RANGES: { value: SnapshotRange; label: string }[] = [
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '1Y', label: '1Y' },
  { value: 'ALL', label: 'ALL' },
];

function formatAxisValue(value: number, currency: string): string {
  const prefix = currency === 'TWD' ? 'NT$' : currency === 'USD' ? '$' : `${currency} `;
  if (value >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${prefix}${(value / 1_000).toFixed(0)}K`;
  return `${prefix}${value.toFixed(0)}`;
}

function formatTooltipValue(value: number, currency: string): string {
  const prefix = currency === 'TWD' ? 'NT$' : currency === 'USD' ? '$' : `${currency} `;
  return `${prefix}${Math.round(value).toLocaleString()}`;
}

function formatDateLabel(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export const PortfolioTrendChart: React.FC<Props> = ({ baseCurrency }) => {
  const [range, setRange] = useState<SnapshotRange>('1Y');
  const [viewMode, setViewMode] = useState<ViewMode>('total');
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    portfolioAPI
      .getPortfolioSnapshots(range)
      .then((res) => setSnapshots(res.snapshots))
      .catch((err) => setError(err.message || 'Failed to load trend data'))
      .finally(() => setLoading(false));
  }, [range]);

  const valueKey: keyof PortfolioSnapshot = viewMode === 'total' ? 'total_value' : 'invest_value';
  const investedKey: keyof PortfolioSnapshot = viewMode === 'total' ? 'total_invested' : 'invest_invested';

  const labels = snapshots.map((s) => formatDateLabel(s.date));

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Portfolio Value',
        data: snapshots.map((s) => s[valueKey] as number),
        borderColor: '#5c6bc0',
        backgroundColor: 'rgba(92, 107, 192, 0.15)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2,
      },
      {
        label: 'Total Invested',
        data: snapshots.map((s) => s[investedKey] as number),
        borderColor: '#ec407a',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 1.5,
        borderDash: [5, 5],
      },
      {
        label: 'Cumulative Dividends',
        data: snapshots.map((s) => s.cumulative_dividends),
        borderColor: '#66bb6a',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 1.5,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { usePointStyle: true, pointStyleWidth: 20, padding: 20 },
      },
      tooltip: {
        backgroundColor: 'white',
        titleColor: '#333',
        bodyColor: '#555',
        borderColor: '#e0e0e0',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          title: (items: any[]) => snapshots[items[0].dataIndex]?.date ?? '',
          label: (ctx: any) => {
            const datasetLabels = ['Portfolio Value', 'Total Invested', 'Cumulative Dividends'];
            return ` ${datasetLabels[ctx.datasetIndex]} : ${formatTooltipValue(ctx.parsed.y, baseCurrency)}`;
          },
          labelTextColor: (ctx: any) => {
            return ['#5c6bc0', '#ec407a', '#66bb6a'][ctx.datasetIndex] ?? '#333';
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: {
          maxTicksLimit: 12,
          maxRotation: 0,
        },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: {
          callback: (value: any) => formatAxisValue(value, baseCurrency),
        },
      },
    },
  };

  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', mb: 4 }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Portfolio Trend
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            <ToggleButtonGroup
              value={range}
              exclusive
              onChange={(_, v) => v && setRange(v)}
              size="small"
              sx={{ '& .MuiToggleButton-root': { px: 1.5, py: 0.5, fontSize: '0.75rem', borderRadius: '4px !important' } }}
            >
              {RANGES.map((r) => (
                <ToggleButton key={r.value} value={r.value}>{r.label}</ToggleButton>
              ))}
            </ToggleButtonGroup>

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, v) => v && setViewMode(v)}
              size="small"
              sx={{ '& .MuiToggleButton-root': { px: 1.5, py: 0.5, fontSize: '0.75rem', borderRadius: '4px !important' } }}
            >
              <ToggleButton value="total">ALL ASSETS</ToggleButton>
              <ToggleButton value="invested">INVESTMENTS ONLY</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && snapshots.length === 0 && (
          <Alert severity="info">No snapshot data available for this period.</Alert>
        )}

        {!loading && !error && snapshots.length > 0 && (
          <Box sx={{ height: 340 }}>
            <Line data={chartData} options={chartOptions} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
