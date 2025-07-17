import React from 'react';
import { Button, Box, Tooltip } from '@mui/material';
import { FileDownload } from '@mui/icons-material';
import { PortfolioReturns } from '../types/returns';
import { returnsCalculationService } from '../services/returnsCalculationService';

interface ExportDataProps {
  portfolioReturns: PortfolioReturns;
  baseCurrency: string;
}

export const ExportData: React.FC<ExportDataProps> = ({ portfolioReturns, baseCurrency }) => {
  const handleExportCSV = () => {
    // Generate export data
    const exportData = returnsCalculationService.generateExportData(portfolioReturns, baseCurrency);
    
    // Convert to CSV
    const headers = ['Type', 'Name', 'Value', 'Return %', 'Annualized Return %', 'Holding Period (Years)', 'Dividends', 'Currency'];
    
    const csvRows = [
      headers.join(','),
      ...exportData.map(row => [
        row.type,
        row.name,
        row.value.toFixed(2),
        row.returnPercent.toFixed(2),
        row.annualizedReturn.toFixed(2),
        row.holdingPeriod.toFixed(2),
        row.dividends.toFixed(2),
        row.currency
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Set link properties
    link.setAttribute('href', url);
    link.setAttribute('download', `portfolio-analytics-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    // Add to document, trigger download, and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleExportJSON = () => {
    // Generate export data
    const exportData = returnsCalculationService.generateExportData(portfolioReturns, baseCurrency);
    
    // Convert to JSON
    const jsonContent = JSON.stringify(exportData, null, 2);
    
    // Create download link
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Set link properties
    link.setAttribute('href', url);
    link.setAttribute('download', `portfolio-analytics-${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    
    // Add to document, trigger download, and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
      <Tooltip title="Export as CSV file">
        <Button
          variant="outlined"
          startIcon={<FileDownload />}
          onClick={handleExportCSV}
          sx={{ borderRadius: 2 }}
        >
          Export CSV
        </Button>
      </Tooltip>
      
      <Tooltip title="Export as JSON file">
        <Button
          variant="outlined"
          startIcon={<FileDownload />}
          onClick={handleExportJSON}
          sx={{ borderRadius: 2 }}
        >
          Export JSON
        </Button>
      </Tooltip>
    </Box>
  );
};
