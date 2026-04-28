import React, { useEffect, useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  cacheHits: number;
  apiCalls: number;
}

export const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    cacheHits: 0,
    apiCalls: 0,
  });

  useEffect(() => {
    // Measure page load time
    const loadTime = performance.now();
    
    // Measure render time
    const renderStart = performance.now();
    
    // Use requestAnimationFrame to measure after render
    requestAnimationFrame(() => {
      const renderEnd = performance.now();
      
      setMetrics(prev => ({
        ...prev,
        loadTime: Math.round(loadTime),
        renderTime: Math.round(renderEnd - renderStart),
      }));
    });
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Box
      position="fixed"
      bottom={16}
      right={16}
      bgcolor="rgba(0,0,0,0.8)"
      color="white"
      p={1}
      borderRadius={1}
      fontSize="12px"
      zIndex={9999}
      minWidth={200}
    >
      <Typography variant="caption" display="block" fontWeight="bold">
        Performance Metrics
      </Typography>
      <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
        <Chip 
          label={`Load: ${metrics.loadTime}ms`} 
          size="small" 
          color={metrics.loadTime < 1000 ? 'success' : 'warning'}
        />
        <Chip 
          label={`Render: ${metrics.renderTime}ms`} 
          size="small" 
          color={metrics.renderTime < 100 ? 'success' : 'warning'}
        />
      </Box>
    </Box>
  );
};
