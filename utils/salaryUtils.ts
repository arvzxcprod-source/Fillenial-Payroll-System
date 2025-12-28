
/**
 * Fillenial Digital Marketing Services Payroll Engine - 2025 Philippine Statutory Standards
 * Strictly follows the "15-30 Split" deduction rule.
 */

export const HOLIDAYS_2025 = [
  "2025-01-01", "2025-01-29", "2025-02-25", "2025-04-09",
  "2025-04-17", "2025-04-18", "2025-04-19", "2025-05-01",
  "2025-06-12", "2025-08-21", "2025-08-25", "2025-11-01",
  "2025-11-02", "2025-11-30", "2025-12-08", "2025-12-24",
  "2025-12-25", "2025-12-30", "2025-12-31"
];

export const calculateWorkingDays = (start: string, end: string): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
  
  let count = 0;
  const cur = new Date(startDate);
  
  while (cur <= endDate) {
    const dayOfWeek = cur.getDay(); // 0 = Sunday
    const dateStr = cur.toISOString().split('T')[0];
    
    if (dayOfWeek !== 0 && !HOLIDAYS_2025.includes(dateStr)) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

export const calculateDailyRate = (monthlyBasic: number): number => {
  if (!monthlyBasic || monthlyBasic <= 0) return 0;
  return (monthlyBasic * 12) / 313;
};

export const calculateSSSContribution = (monthlyBasic: number): number => {
  const msc = Math.min(Math.max(monthlyBasic, 5000), 35000);
  return Number((msc * 0.05).toFixed(2));
};

export const calculatePhilHealthContribution = (monthlyBasic: number): number => {
  const base = Math.min(Math.max(monthlyBasic, 10000), 100000);
  const totalPremium = base * 0.05;
  return Number((totalPremium / 2).toFixed(2));
};

export const calculatePagIbigContribution = (monthlyBasic: number): number => {
  const base = Math.min(monthlyBasic, 10000);
  return Number((base * 0.02).toFixed(2));
};

export const calculateMonthlyWithholdingTax = (taxableIncome: number): number => {
  if (taxableIncome <= 20833.33) return 0;
  if (taxableIncome <= 33333.33) return (taxableIncome - 20833.33) * 0.15;
  if (taxableIncome <= 66666.67) return 1875 + (taxableIncome - 33333.33) * 0.20;
  if (taxableIncome <= 166666.67) return 8541.67 + (taxableIncome - 66666.67) * 0.25;
  if (taxableIncome <= 666666.67) return 33541.67 + (taxableIncome - 166666.67) * 0.30;
  return 183541.67 + (taxableIncome - 666666.67) * 0.35;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(value);
};