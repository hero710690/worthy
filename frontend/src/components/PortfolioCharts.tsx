import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  ArcElement,
  Filler,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { ChartData } from '../types/returns';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PortfolioChartsProps {
  allocationData: ChartData;
  returnsData: ChartData;
  performanceData: ChartData;
}

export const PortfolioCharts: React.FC<PortfolioChartsProps> = ({
  allocationData,
  returnsData,
  performanceData
}) => {
  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
        Portfolio Visualization
      </Typography>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* Asset Allocation Chart */}
        <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            Asset Allocation
          </Typography>
          <Box sx={{ height: 300, display: 'flex', justifyContent: 'center' }}>
            <Pie 
              data={allocationData} 
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: {
                      boxWidth: 15,
                      padding: 15
                    }
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.label || '';
                        const value = context.raw as number;
                        const total = context.chart.getDatasetMeta(0).total || 0;
                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                        return `${label}: ${percentage}%`;
                      }
                    }
                  }
                }
              }}
            />
          </Box>
        </Paper>
        
        {/* Returns Comparison Chart */}
        <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            Returns Comparison
          </Typography>
          <Box sx={{ height: 300 }}>
            <Bar 
              data={returnsData}
              options={{
                responsive: true,
                indexAxis: 'y',
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const value = context.raw as number;
                        return `${value.toFixed(2)}%`;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    grid: {
                      display: false
                    }
                  },
                  y: {
                    grid: {
                      display: false
                    }
                  }
                }
              }}
            />
          </Box>
        </Paper>
        
        {/* Performance Over Time Chart */}
        <Paper sx={{ p: 3, borderRadius: 2, gridColumn: { xs: '1', md: '1 / span 2' } }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            Portfolio Performance (12 Months)
          </Typography>
          <Box sx={{ height: 300 }}>
            <Line 
              data={performanceData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  x: {
                    grid: {
                      display: false
                    }
                  },
                  y: {
                    grid: {
                      color: 'rgba(0, 0, 0, 0.05)'
                    }
                  }
                }
              }}
            />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};
