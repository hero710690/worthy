/**
 * Calculate precise age from birth date
 * Returns age as decimal (e.g., 32.5 for 32 years 6 months)
 */
export const calculatePreciseAge = (birthDate: string): number => {
  const birth = new Date(birthDate);
  const today = new Date();
  
  const years = today.getFullYear() - birth.getFullYear();
  const months = today.getMonth() - birth.getMonth();
  const days = today.getDate() - birth.getDate();
  
  // Adjust for negative months/days
  let totalMonths = years * 12 + months;
  if (days < 0) {
    totalMonths -= 1;
  }
  
  return Math.max(0, totalMonths / 12);
};

/**
 * Format age as "X years Y months"
 */
export const formatAge = (ageDecimal: number): string => {
  const years = Math.floor(ageDecimal);
  const months = Math.round((ageDecimal % 1) * 12);
  
  if (months === 0) {
    return `${years} years`;
  }
  
  return `${years} years ${months} months`;
};
