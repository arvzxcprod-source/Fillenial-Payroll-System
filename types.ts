
export interface EmployeeData {
  name: string;
  employeeId: string;
  designation: string;
  department: string;
  dateOfJoining: string;
  payDate: string;
  disbursementMethod: string;
  bankName: string;
  accountNumber: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  basicMonthlyPay: number;
  totalDutyDays: number;
  actualPayDays: number;
  absences: number;
  signatoryName: string;
  signatoryPosition: string;
}

export interface EarningsData {
  basicPay: number;
  overtime: number;
  holidays: number;
  thirteenthMonth: number;
}

export interface DeductionsData {
  withholdingTax: number;
  sss: number;
  pagIbig: number;
  philHealth: number;
  cashAdvances: number;
  awol: number;
}

export interface Reimbursement {
  description: string;
  amount: number;
}

export interface PayrollState {
  employee: EmployeeData;
  earnings: EarningsData;
  deductions: DeductionsData;
  reimbursement: Reimbursement;
}
