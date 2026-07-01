import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  TextField,
  FormControlLabel,
  Switch,
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
import { assetAPI } from '../services/assetApi';
import { extractContributions, computeProjection, type RawContribution } from '../services/portfolioProjection';
import { exchangeRateService } from '../services/exchangeRateService';

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

  const [rateInput, setRateInput] = useState<string>('7');
  const [lastValidRate, setLastValidRate] = useState<number>(7);
  const [showProjection, setShowProjection] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<RawContribution[]>([]);
  const [ratesReady, setRatesReady] = useState<boolean>(false);
  const projectionFetchAttempted = useRef(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    portfolioAPI
      .getPortfolioSnapshots(range)
      .then((res) => setSnapshots(res.snapshots))
      .catch((err) => setError(err.message || 'Failed to load trend data'))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    if (range !== 'ALL') return;
    if (projectionFetchAttempted.current) return;
    let cancelled = false;
    projectionFetchAttempted.current = true;
    Promise.all([
      assetAPI.getTransactions(),
      exchangeRateService.getRatesWithRefresh(baseCurrency),
    ])
      .then(([txRes]) => {
        if (cancelled) return;
        setTransactions((txRes.transactions ?? []) as RawContribution[]);
        setRatesReady(true);
      })
      .catch(() => {
        // Projection is best-effort; on failure it simply won't render.
        if (!cancelled) setRatesReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, baseCurrency]);

  useEffect(() => {
    projectionFetchAttempted.current = false;
    setRatesReady(false);
  }, [baseCurrency]);

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setRateInput(raw);
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      setLastValidRate(parsed);
    }
  };

  const valueKey: keyof PortfolioSnapshot = viewMode === 'total' ? 'total_value' : 'invest_value';
  const investedKey: keyof PortfolioSnapshot = viewMode === 'total' ? 'total_invested' : 'invest_invested';

  const labels = snapshots.map((s) => formatDateLabel(s.date));

  const projectionData = useMemo<number[] | null>(() => {
    if (range !== 'ALL' || !showProjection) return null;
    if (snapshots.length < 2 || !ratesReady) return null;
    const dates = snapshots.map((s) => s.date);
    const seed = snapshots[0].invest_value;
    const contributions = extractContributions(
      transactions,
      snapshots[0].date,
      baseCurrency,
      (amount, from, to) => exchangeRateService.convertCurrency(amount, from, to)
    );
    return computeProjection(dates, seed, lastValidRate, contributions);
  }, [range, showProjection, snapshots, ratesReady, transactions, baseCurrency, lastValidRate]);

  const datasets = [
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
  ];

  if (projectionData) {
    datasets.push({
      label: `Projected (investments @ ${lastValidRate}%)`,
      data: projectionData,
      borderColor: '#ffa726',
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 1.5,
      borderDash: [2, 3],
    } as typeof datasets[number]);
  }

  const chartData = { labels, datasets };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { usePointStyle: true, pointStyleWidth: 10, boxHeight: 8, padding: 12, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: 'white',
        titleColor: '#333',
        bodyColor: '#555',
        borderColor: '#e0e0e0',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          title: (items: { dataIndex: number }[]) => snapshots[items[0].dataIndex]?.date ?? '',
          label: (ctx: { datasetIndex: number; parsed: { y: number } }) => {
            const label = datasets[ctx.datasetIndex]?.label ?? '';
            return ` ${label} : ${formatTooltipValue(ctx.parsed.y, baseCurrency)}`;
          },
          labelTextColor: (ctx: { datasetIndex: number }) => {
            return (datasets[ctx.datasetIndex]?.borderColor as string) ?? '#333';
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
          callback: (value: number | string) => formatAxisValue(Number(value), baseCurrency),
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

            {range === 'ALL' && (
              <>
                <TextField
                  label="Return %"
                  value={rateInput}
                  onChange={handleRateChange}
                  size="small"
                  type="number"
                  inputProps={{ step: 0.1, min: 0, max: 100, style: { width: 64 } }}
                  sx={{ '& .MuiInputBase-root': { height: 32 } }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={showProjection}
                      onChange={(e) => setShowProjection(e.target.checked)}
                    />
                  }
                  label="Projection"
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
                />
              </>
            )}
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
            <Line key={`${viewMode}-${range}-${showProjection}`} data={chartData} options={chartOptions} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
