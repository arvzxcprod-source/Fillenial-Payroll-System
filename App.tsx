
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Download, 
  Printer, 
  Info, 
  User, 
  Briefcase, 
  Calendar, 
  Wallet,
  Loader2,
  CheckCircle2,
  Building2,
  ReceiptText,
  ShieldCheck,
  BadgeDollarSign,
  Landmark,
  CalendarCheck,
  Fingerprint,
  Clock,
  Hash,
  ChevronDown,
  CreditCard,
  Banknote,
  SmartphoneNfc,
  TrendingUp,
  TrendingDown,
  UserX,
  Signature,
  FileText,
  X,
  Maximize2,
  BookOpen,
  ChevronRight,
  Zap,
  Globe,
  Calculator,
  Plus,
  Trash2,
  Share2,
  AlertCircle,
  CreditCard as CardIcon
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  PayrollState, 
  EmployeeData, 
  EarningsData, 
  DeductionsData 
} from './types';
import { 
  calculateSSSContribution, 
  calculatePhilHealthContribution, 
  calculatePagIbigContribution, 
  calculateMonthlyWithholdingTax, 
  formatCurrency,
  calculateWorkingDays,
  calculateDailyRate
} from './utils/salaryUtils';

const POWER_RED = '#E31E24';
const DEEP_BLACK = '#000000';
const PURE_WHITE = '#FFFFFF';

interface OTEntry {
  id: string;
  hours: number;
  type: 'regular' | 'rest_special' | 'rest_special_excess' | 'regular_holiday' | 'regular_holiday_excess';
}

const OT_MULTIPLIERS = {
  regular: 1.25,
  rest_special: 1.30,
  rest_special_excess: 1.69,
  regular_holiday: 2.0,
  regular_holiday_excess: 2.6,
};

const OT_LABELS = {
  regular: 'Regular Day (125%)',
  rest_special: 'Rest Day / Special Holiday (130%)',
  rest_special_excess: 'Rest Day Excess (169%)',
  regular_holiday: 'Regular Holiday (200%)',
  regular_holiday_excess: 'Regular Holiday Excess (260%)',
};

const App: React.FC = () => {
  const pdfExportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showRefHub, setShowRefHub] = useState(false);
  const [showOTCalculator, setShowOTCalculator] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'earnings' | 'deductions'>('details');

  // Webhook State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // OT Calculator State
  const [otEntries, setOtEntries] = useState<OTEntry[]>([
    { id: '1', hours: 0, type: 'regular' }
  ]);

  const defaultStart = new Date();
  defaultStart.setDate(1);
  const defaultEnd = new Date();
  defaultEnd.setDate(15);

  const [state, setState] = useState<PayrollState>({
    employee: {
      name: 'Maria Santos',
      employeeId: 'FLN-2025-991',
      designation: 'Creative Strategy Director',
      department: 'Growth & Performance Marketing',
      dateOfJoining: '2022-03-10',
      payDate: new Date().toISOString().split('T')[0],
      disbursementMethod: 'Bank Transfer',
      bankName: 'BPI Ayala',
      accountNumber: '1234 5678 9012',
      payPeriodStart: defaultStart.toISOString().split('T')[0],
      payPeriodEnd: defaultEnd.toISOString().split('T')[0],
      basicMonthlyPay: 75000,
      totalDutyDays: 0,
      actualPayDays: 0,
      absences: 0,
      signatoryName: 'John Michael Reyes',
      signatoryPosition: 'Managing Director'
    },
    earnings: {
      basicPay: 0, 
      overtime: 0,
      holidays: 0,
      thirteenthMonth: 0,
    },
    deductions: {
      withholdingTax: 0,
      sss: 0,
      pagIbig: 0,
      philHealth: 0,
      cashAdvances: 0,
      awol: 0,
    },
    reimbursement: {
      description: 'Business Connectivity Allowance',
      amount: 3000
    }
  });

  const dailyRate = useMemo(() => calculateDailyRate(state.employee.basicMonthlyPay), [state.employee.basicMonthlyPay]);
  const hourlyRate = useMemo(() => dailyRate / 8, [dailyRate]);

  const calculatedOTTotal = useMemo(() => {
    return otEntries.reduce((acc, curr) => {
      const multiplier = OT_MULTIPLIERS[curr.type];
      return acc + (curr.hours * hourlyRate * multiplier);
    }, 0);
  }, [otEntries, hourlyRate]);

  const maskAccountNumber = (acc: string) => {
    if (!acc || state.employee.disbursementMethod === 'Cash') return 'N/A';
    const cleanAcc = acc.replace(/\s/g, '');
    return cleanAcc.length > 4 ? `**** **** ${cleanAcc.slice(-4)}` : cleanAcc;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  useEffect(() => {
    const { payPeriodStart, payPeriodEnd, basicMonthlyPay, absences } = state.employee;
    const dutyDays = calculateWorkingDays(payPeriodStart, payPeriodEnd);
    const dailyRateVal = calculateDailyRate(basicMonthlyPay);
    const periodBasic = Number((dailyRateVal * dutyDays).toFixed(2));
    const absenceDeduction = Number((dailyRateVal * absences).toFixed(2));

    const fullSSS = calculateSSSContribution(basicMonthlyPay);
    const fullPhilHealth = calculatePhilHealthContribution(basicMonthlyPay);
    const fullPagIbig = calculatePagIbigContribution(basicMonthlyPay);

    setState(prev => ({
      ...prev,
      employee: {
        ...prev.employee,
        totalDutyDays: dutyDays,
        actualPayDays: Math.max(0, dutyDays - absences),
      },
      earnings: { ...prev.earnings, basicPay: periodBasic },
      deductions: {
        ...prev.deductions,
        sss: Number((fullSSS / 2).toFixed(2)),
        philHealth: Number((fullPhilHealth / 2).toFixed(2)),
        pagIbig: Number((fullPagIbig / 2).toFixed(2)),
        awol: absenceDeduction
      }
    }));
  }, [state.employee.payPeriodStart, state.employee.payPeriodEnd, state.employee.basicMonthlyPay, state.employee.absences]);

  const totals = useMemo(() => {
    const { basicMonthlyPay } = state.employee;
    const { basicPay, overtime, holidays, thirteenthMonth } = state.earnings;
    const grossEarningsPeriod = basicPay + overtime + holidays + thirteenthMonth;

    const fullSSS = calculateSSSContribution(basicMonthlyPay);
    const fullPhilHealth = calculatePhilHealthContribution(basicMonthlyPay);
    const fullPagIbig = calculatePagIbigContribution(basicMonthlyPay); 

    const monthlyTaxable = basicMonthlyPay - (fullSSS + fullPhilHealth + fullPagIbig);
    const monthlyTax = calculateMonthlyWithholdingTax(monthlyTaxable);
    const splitTax = Number((monthlyTax / 2).toFixed(2));

    const totalDeductionsPeriod = 
      splitTax + 
      state.deductions.sss + 
      state.deductions.philHealth + 
      state.deductions.pagIbig + 
      state.deductions.cashAdvances + 
      state.deductions.awol;

    const netPay = (grossEarningsPeriod + state.reimbursement.amount) - totalDeductionsPeriod;

    return {
      totalEarnings: grossEarningsPeriod,
      totalDeductions: totalDeductionsPeriod,
      tax: splitTax,
      netPay: Math.max(0, netPay)
    };
  }, [state]);

  const handleEmployeeChange = (field: keyof EmployeeData, value: string | number) => {
    setState(prev => ({ ...prev, employee: { ...prev.employee, [field]: value } }));
  };

  const handleEarningsChange = (field: keyof EarningsData, value: number) => {
    setState(prev => ({ ...prev, earnings: { ...prev.earnings, [field]: value } }));
  };

  const handleDeductionsChange = (field: keyof DeductionsData, value: number) => {
    setState(prev => ({ ...prev, deductions: { ...prev.deductions, [field]: value } }));
  };

  const handleApplyOT = () => {
    handleEarningsChange('overtime', Number(calculatedOTTotal.toFixed(2)));
    setShowOTCalculator(false);
  };

  const handleTriggerWebhook = async () => {
    if (!webhookUrl) return;
    setIsSyncing(true);
    setSyncStatus('idle');

    const payload = {
      timestamp: new Date().toISOString(),
      metadata: {
        company: "Fillenial Digital Marketing Services",
        version: "25.1"
      },
      payrollData: state,
      calculations: totals
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        setSyncStatus('success');
      } else {
        setSyncStatus('error');
      }
    } catch (error) {
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const addOTEntry = () => {
    setOtEntries([...otEntries, { id: Math.random().toString(36).substr(2, 9), hours: 0, type: 'regular' }]);
  };

  const removeOTEntry = (id: string) => {
    setOtEntries(otEntries.filter(e => e.id !== id));
  };

  const updateOTEntry = (id: string, field: keyof OTEntry, value: any) => {
    setOtEntries(otEntries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleDownloadPDF = async () => {
    if (!pdfExportRef.current) return;
    setIsExporting(true);
    try {
      if (document.fonts) await document.fonts.ready;
      await new Promise(r => setTimeout(r, 500));
      const element = pdfExportRef.current;
      const canvas = await html2canvas(element, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      pdf.save(`Fillenial_Payslip_${state.employee.name.replace(/\s+/g, '_')}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const PayslipTemplate = ({ innerRef }: { innerRef?: React.RefObject<HTMLDivElement | null> }) => (
    <div 
      ref={innerRef} 
      className="bg-white p-[15mm] text-black flex flex-col box-border border border-slate-100" 
      style={{ width: '210mm', height: '297mm', boxSizing: 'border-box' }}
    >
      <div className="flex justify-between items-start border-b-[6px] border-[#E31E24] pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-[900] tracking-tighter text-[#E31E24] leading-none mb-1">FILLENIAL</h1>
          <p className="text-xs font-black uppercase tracking-widest text-black">Digital Marketing Services</p>
          <div className="mt-4 text-[9px] text-slate-500 font-bold uppercase leading-tight max-w-xs">
            20 California Village Katipunan Avenue<br />
            Brgy San Bartolome, Quezon City, Philippines<br />
            SEC: FL202500432
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payroll Statement</p>
          <p className="text-[14px] font-[900] text-black">Advice #{state.employee.employeeId}</p>
          <div className="mt-4">
            <p className="text-[9px] font-black text-[#E31E24] uppercase tracking-widest mb-0.5">Pay Statement Period</p>
            <p className="text-[12px] font-black text-black uppercase">
              {formatDate(state.employee.payPeriodStart)} — {formatDate(state.employee.payPeriodEnd)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-10 bg-black text-white p-8 rounded-xl">
         <ProfileField label="Full Legal Name" value={state.employee.name} inverse />
         <ProfileField label="Employee ID" value={state.employee.employeeId} inverse />
         <ProfileField label="Department" value={state.employee.department} inverse />
         <ProfileField label="Job Designation" value={state.employee.designation} inverse />
         <ProfileField label="Monthly Base" value={formatCurrency(state.employee.basicMonthlyPay)} inverse />
         <ProfileField label="Statutory Pay Date" value={formatDate(state.employee.payDate)} inverse highlight />
      </div>

      <div className="grid grid-cols-2 gap-16 mb-10">
        <div className="space-y-6">
           <h3 className="text-[11px] font-black text-black uppercase tracking-widest border-b border-black pb-2">Periodic Earnings</h3>
           <div className="space-y-4">
              <LedgerLine label="Period Basic Salary" value={formatCurrency(state.earnings.basicPay)} />
              <LedgerLine label="Overtime Premium" value={formatCurrency(state.earnings.overtime)} />
              <LedgerLine label="Holiday Pay" value={formatCurrency(state.earnings.holidays)} />
              <LedgerLine label="13th Month / Bonus" value={formatCurrency(state.earnings.thirteenthMonth)} />
              <LedgerLine label="Reimbursements" value={formatCurrency(state.reimbursement.amount)} />
              <div className="pt-4 border-t-2 border-[#E31E24]">
                <LedgerLine label="Gross Revenue" value={formatCurrency(totals.totalEarnings + state.reimbursement.amount)} highlight />
              </div>
           </div>
        </div>
        <div className="space-y-6">
           <h3 className="text-[11px] font-black text-black uppercase tracking-widest border-b border-black pb-2">Statutory Deductions</h3>
           <div className="space-y-4">
              <LedgerLine label="Income Tax (WHT)" value={formatCurrency(totals.tax)} />
              <LedgerLine label="SSS Contribution" value={formatCurrency(state.deductions.sss)} />
              <LedgerLine label="PhilHealth Premium" value={formatCurrency(state.deductions.philHealth)} />
              <LedgerLine label="Pag-IBIG Contribution" value={formatCurrency(state.deductions.pagIbig)} />
              <LedgerLine label={`Absences (${state.employee.absences}d)`} value={formatCurrency(state.deductions.awol)} />
              <div className="pt-4 border-t-2 border-black">
                <LedgerLine label="Total Deductions" value={`(${formatCurrency(totals.totalDeductions)})`} highlight />
              </div>
           </div>
        </div>
      </div>

      <div className="bg-[#E31E24] text-white rounded-xl px-12 py-10 flex justify-between items-center mb-10 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-[14px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">Net Payout Amount</p>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
            {state.employee.disbursementMethod} via {state.employee.bankName || 'Cashier'} ({maskAccountNumber(state.employee.accountNumber)})
          </p>
        </div>
        <div className="relative z-10 text-right">
          <p className="text-5xl font-[900] tracking-tighter tabular-nums">{formatCurrency(totals.netPay)}</p>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-black/10 -skew-x-12 translate-x-12"></div>
      </div>

      <div className="mb-12 border-l-4 border-black pl-8 py-2">
         <p className="text-[11px] font-medium text-slate-800 leading-relaxed italic pr-12">
           "This document serves as an official confirmation of compensation for the specified period. Fillenial Digital Marketing Services certifies that all statutory contributions and tax withholdings have been processed in full compliance with the 2025 Philippine Labor Laws."
         </p>
      </div>

      <div className="mt-auto pt-10 border-t border-slate-100 flex justify-between items-end">
          <div className="text-center w-64">
            <div className="h-[1px] bg-black w-full mb-3"></div>
            <p className="text-[14px] font-black text-black uppercase leading-none mb-1">{state.employee.name}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Employee Acknowledgment</p>
          </div>
          <div className="text-center w-64">
            <div className="h-[1px] bg-black w-full mb-3"></div>
            <p className="text-[14px] font-black text-black uppercase leading-none mb-1">{state.employee.signatoryName}</p>
            <p className="text-[9px] font-bold text-[#E31E24] uppercase tracking-widest">{state.employee.signatoryPosition}</p>
          </div>
      </div>
      <div className="mt-10 text-center">
        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em]">Confidential Business Document • System Generated • Valid Without Signature</p>
      </div>
    </div>
  );

  return (
    <div className="bg-white min-h-screen text-black">
      <div className="max-w-7xl mx-auto px-6 py-10 lg:py-16">
        
        <header className="mb-12 no-print">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-[#E31E24] rounded-2xl shadow-xl shadow-red-100">
                <Zap className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-[900] text-black tracking-tighter">FILLENIAL</h1>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-0.5">Digital Marketing Services</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowPreview(true)} 
                className="px-8 py-4 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-3 active:scale-95"
              >
                <Printer size={18} /> Print Preview
              </button>
              <button 
                onClick={handleDownloadPDF} 
                disabled={isExporting}
                className="px-8 py-4 bg-[#E31E24] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center gap-3 shadow-lg shadow-red-200 active:scale-95 disabled:opacity-50"
              >
                {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} 
                {isExporting ? 'Exporting...' : 'Save PDF'}
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 no-print">
          <div className="lg:col-span-8 space-y-10">
            <div className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-10 pt-10 pb-6 border-b border-slate-50">
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                  <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')} icon={<User size={14}/>}>Profile</TabButton>
                  <TabButton active={activeTab === 'earnings'} onClick={() => setActiveTab('earnings')} icon={<TrendingUp size={14}/>}>Earnings</TabButton>
                  <TabButton active={activeTab === 'deductions'} onClick={() => setActiveTab('deductions')} icon={<TrendingDown size={14}/>}>Deductions</TabButton>
                </div>
              </div>

              <div className="p-10 min-h-[500px]">
                {activeTab === 'details' && (
                  <div className="space-y-12 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                      <InputGroup label="Employee Name" value={state.employee.name} onChange={(v) => handleEmployeeChange('name', v)} icon={<User size={14}/>} />
                      <InputGroup label="Employee ID" value={state.employee.employeeId} onChange={(v) => handleEmployeeChange('employeeId', v)} icon={<Fingerprint size={14}/>} />
                      <InputGroup label="Designation" value={state.employee.designation} onChange={(v) => handleEmployeeChange('designation', v)} icon={<Briefcase size={14}/>} />
                      <InputGroup label="Department" value={state.employee.department} onChange={(v) => handleEmployeeChange('department', v)} icon={<Building2 size={14}/>} />
                      <InputGroup label="Date of Joining" value={state.employee.dateOfJoining} onChange={(v) => handleEmployeeChange('dateOfJoining', v)} type="date" icon={<CalendarCheck size={14}/>} />
                      <InputGroup label="Monthly Basic Rate" value={state.employee.basicMonthlyPay} onChange={(v) => handleEmployeeChange('basicMonthlyPay', parseFloat(v) || 0)} type="number" prefix="₱" icon={<BadgeDollarSign size={14}/>} />
                      <InputGroup label="Pay Date" value={state.employee.payDate} onChange={(v) => handleEmployeeChange('payDate', v)} type="date" icon={<Wallet size={14}/>} />
                      <SelectGroup 
                        label="Disbursement" 
                        value={state.employee.disbursementMethod} 
                        onChange={(v) => handleEmployeeChange('disbursementMethod', v)} 
                        options={['Bank Transfer', 'Card Payment', 'Cash']}
                        icon={<CreditCard size={14}/>}
                      />
                      {state.employee.disbursementMethod !== 'Cash' && (
                        <div className="md:col-span-2 grid grid-cols-2 gap-8 pt-6 border-t border-slate-50">
                          <InputGroup label="Bank Name" value={state.employee.bankName} onChange={(v) => handleEmployeeChange('bankName', v)} icon={<Landmark size={14}/>} />
                          <InputGroup label="Account Number" value={state.employee.accountNumber} onChange={(v) => handleEmployeeChange('accountNumber', v)} icon={<Hash size={14}/>} />
                        </div>
                      )}
                      <div className="md:col-span-2 grid grid-cols-3 gap-8 pt-6 border-t border-slate-50 mt-4">
                        <InputGroup label="Period Start" value={state.employee.payPeriodStart} onChange={(v) => handleEmployeeChange('payPeriodStart', v)} type="date" />
                        <InputGroup label="Period End" value={state.employee.payPeriodEnd} onChange={(v) => handleEmployeeChange('payPeriodEnd', v)} type="date" />
                        <InputGroup label="Absences (Days)" value={state.employee.absences} onChange={(v) => handleEmployeeChange('absences', parseInt(v) || 0)} type="number" icon={<UserX size={14}/>} />
                      </div>
                    </div>

                    {/* --- WEBHOOK INTEGRATION SECTION --- */}
                    <div className="p-10 border-2 border-black rounded-3xl bg-slate-50 space-y-8">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-black uppercase tracking-widest flex items-center gap-3">
                          <Share2 size={16} className="text-[#E31E24]" /> Integration Hub
                        </h3>
                        {syncStatus !== 'idle' && (
                          <div className={`flex items-center gap-2 text-[10px] font-black uppercase px-4 py-1.5 rounded-full border ${
                            syncStatus === 'success' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                          }`}>
                            {syncStatus === 'success' ? <CheckCircle2 size={12}/> : <AlertCircle size={12}/>}
                            {syncStatus === 'success' ? 'Sync Complete' : 'Sync Failed'}
                          </div>
                        )}
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gather All Data via Webhook (POST)</label>
                          <div className="flex gap-4">
                            <input 
                              type="url" 
                              value={webhookUrl} 
                              onChange={(e) => setWebhookUrl(e.target.value)}
                              placeholder="https://your-api.com/webhook"
                              className="flex-1 px-5 py-4 bg-white border-2 border-slate-100 rounded-xl font-bold text-black focus:border-black outline-none transition-all text-sm"
                            />
                            <button 
                              onClick={handleTriggerWebhook}
                              disabled={isSyncing || !webhookUrl}
                              className="px-8 py-4 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#E31E24] transition-all flex items-center gap-3 shadow-lg disabled:opacity-30 disabled:hover:bg-black"
                            >
                              {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                              {isSyncing ? 'Syncing...' : 'Trigger Data Sync'}
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] font-medium text-slate-400 italic">
                          *Gather all payroll records, calculations, and employee data in a single JSON POST request.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'earnings' && (
                  <div className="space-y-12 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <InputField label="Prorated Basic" value={state.earnings.basicPay} readOnly info="Based on duty days" />
                      <div className="relative group">
                        <InputField label="Overtime Pay" value={state.earnings.overtime} onChange={(v) => handleEarningsChange('overtime', v)} />
                        <button 
                          onClick={() => setShowOTCalculator(true)}
                          className="absolute right-12 bottom-4 p-1.5 bg-black text-white rounded-lg hover:bg-[#E31E24] transition-colors"
                          title="Open OT Calculator"
                        >
                          <Calculator size={14} />
                        </button>
                      </div>
                      <InputField label="Holiday Pay" value={state.earnings.holidays} onChange={(v) => handleEarningsChange('holidays', v)} />
                      <InputField label="13th Month / Bonus" value={state.earnings.thirteenthMonth} onChange={(v) => handleEarningsChange('thirteenthMonth', v)} />
                    </div>
                    <div className="p-8 border-2 border-black rounded-3xl bg-slate-50 space-y-8">
                      <h3 className="text-xs font-black text-black uppercase tracking-widest flex items-center gap-3">
                        <ReceiptText size={16} className="text-[#E31E24]" /> Business Allowances
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <InputGroup label="Description" value={state.reimbursement.description} onChange={(v) => setState(prev => ({ ...prev, reimbursement: { ...prev.reimbursement, description: v } }))} />
                        <InputGroup label="Amount" value={state.reimbursement.amount} onChange={(v) => setState(prev => ({ ...prev, reimbursement: { ...prev.reimbursement, amount: parseFloat(v) || 0 } }))} type="number" prefix="₱" />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'deductions' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in duration-500">
                    <InputField label="Income Tax (WHT)" value={totals.tax} readOnly info="Calculated based on 2025 tiers" accent />
                    <InputField label="SSS Contribution" value={state.deductions.sss} readOnly accent />
                    <InputField label="PhilHealth" value={state.deductions.philHealth} readOnly accent />
                    <InputField label="Pag-IBIG" value={state.deductions.pagIbig} readOnly accent />
                    <InputField label="Cash Advances" value={state.deductions.cashAdvances} onChange={(v) => handleDeductionsChange('cashAdvances', v)} accent />
                    <InputField label="AWOL Deductions" value={state.deductions.awol} readOnly accent />
                  </div>
                )}
              </div>

              <div className="bg-slate-50 px-10 py-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <ShieldCheck className="text-[#E31E24]" size={16} /> Fillenial Compliance v25.1
                </div>
                <button onClick={() => setShowPreview(true)} className="text-[10px] font-black text-black uppercase hover:text-[#E31E24] transition-colors flex items-center gap-2">
                  <Maximize2 size={12} /> Live Preview
                </button>
              </div>
            </div>

            <div className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden no-print">
               <button 
                 onClick={() => setShowRefHub(!showRefHub)}
                 className="w-full px-10 py-8 flex items-center justify-between group"
               >
                 <div className="flex items-center gap-5">
                   <div className="p-3 bg-red-50 text-[#E31E24] rounded-2xl group-hover:bg-[#E31E24] group-hover:text-white transition-all">
                     <BookOpen size={24} />
                   </div>
                   <div className="text-left">
                     <h3 className="text-sm font-black text-black uppercase tracking-widest">Compliance Handbook</h3>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Statutory Reference & Tables</p>
                   </div>
                 </div>
                 <div className={`p-2 rounded-full border transition-all ${showRefHub ? 'rotate-90 bg-black text-white' : 'text-slate-300'}`}>
                   <ChevronRight size={20} />
                 </div>
               </button>
               {showRefHub && (
                 <div className="px-10 pb-12 space-y-10 animate-in slide-in-from-top-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <ReferenceTable title="BIR Income Tax" subtitle="TRAIN Law 2025" headers={['Income Bracket', 'Tax Due']} rows={[['≤ ₱20,833', 'Exempt'], ['₱20,834 - ₱33k', '15% of excess'], ['₱33k - ₱66k', '₱1,875 + 20%']]} />
                      <ReferenceTable title="SSS Program" subtitle="MSC Caps 2025" headers={['Salary Credit', 'EE Share']} rows={[['₱5,000', '₱250'], ['₱25,000', '₱1,250'], ['₱35,000+', '₱1,750']]} />
                    </div>
                 </div>
               )}
            </div>
          </div>

          <div className="lg:col-span-4 lg:sticky lg:top-10 space-y-8">
            <div className="bg-black text-white rounded-3xl p-10 shadow-2xl">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-10 flex items-center gap-3">
                <Clock size={16} className="text-[#E31E24]" /> Summary Snapshot
              </h3>
              
              <div className="space-y-8 mb-12">
                <SummaryItem label="Gross Earnings" value={formatCurrency(totals.totalEarnings)} />
                <SummaryItem label="Allowances" value={formatCurrency(state.reimbursement.amount)} />
                <SummaryItem label="Deductions" value={`-${formatCurrency(totals.totalDeductions)}`} red />
              </div>

              <div className="pt-10 border-t border-white/10">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Total Net Payout</p>
                <div className="flex items-baseline gap-3 mb-8">
                  <span className="text-2xl font-black text-[#E31E24]">₱</span>
                  <p className="text-6xl font-[900] tracking-tighter tabular-nums leading-none">
                    {formatCurrency(totals.netPay).replace('₱', '').replace('PHP', '').trim()}
                  </p>
                </div>
                
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 text-[10px] font-black text-[#E31E24] bg-red-500/10 w-fit px-5 py-2 rounded-full">
                    <CheckCircle2 size={12} /> VERIFIED BY COMPLIANCE
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 bg-white/5 w-fit px-5 py-2 rounded-full">
                    <Globe size={12} className="text-[#E31E24]" /> {maskAccountNumber(state.employee.accountNumber)}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-2 border-slate-100 rounded-3xl p-8">
              <h4 className="text-[10px] font-black text-black uppercase tracking-widest mb-4">Agency Settlement</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-black">{formatDate(state.employee.payDate)}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Disbursement Day</p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <Calendar size={20} className="text-[#E31E24]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="pdf-render-root" className="fixed no-print -left-[5000px] -top-[5000px]">
        <PayslipTemplate innerRef={pdfExportRef} />
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 no-print">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setShowPreview(false)} />
          <div className="relative w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl flex flex-col h-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-10 py-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-[#E31E24] rounded-lg"><FileText className="text-white" size={20} /></div>
                <h3 className="text-sm font-black text-black uppercase tracking-widest">Payslip Archive Preview</h3>
              </div>
              <button onClick={() => setShowPreview(false)} className="p-2 text-slate-400 hover:text-black"><X size={24}/></button>
            </div>
            <div className="flex-1 overflow-auto p-12 flex justify-center bg-slate-100/50">
              <div className="scale-[0.85] origin-top"><PayslipTemplate /></div>
            </div>
          </div>
        </div>
      )}

      {/* --- OVERTIME CALCULATOR MODAL --- */}
      {showOTCalculator && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-8 no-print">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowOTCalculator(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl flex flex-col h-full max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-[#E31E24] rounded-lg"><Calculator className="text-white" size={20} /></div>
                <div>
                  <h3 className="text-sm font-black text-black uppercase tracking-widest">Overtime Pay Calculator</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">PH Statutory Multipliers</p>
                </div>
              </div>
              <button onClick={() => setShowOTCalculator(false)} className="p-2 text-slate-400 hover:text-black"><X size={24}/></button>
            </div>
            
            <div className="flex-1 overflow-auto p-8 space-y-8">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Daily Rate</p>
                  <p className="text-lg font-black text-black">{formatCurrency(dailyRate)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Hourly Base Rate</p>
                  <p className="text-lg font-black text-black">{formatCurrency(hourlyRate)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-black text-black uppercase tracking-widest">OT Logs</h4>
                  <button 
                    onClick={addOTEntry}
                    className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-[#E31E24] transition-colors"
                  >
                    <Plus size={12} /> Add Entry
                  </button>
                </div>

                {otEntries.map((entry) => (
                  <div key={entry.id} className="grid grid-cols-12 gap-4 items-end p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-[#E31E24]/30 transition-all">
                    <div className="col-span-6 space-y-2">
                      <label className="text-[8px] font-black text-slate-400 uppercase">OT Type</label>
                      <select 
                        value={entry.type}
                        onChange={(e) => updateOTEntry(entry.id, 'type', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold outline-none focus:border-black"
                      >
                        {Object.entries(OT_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3 space-y-2">
                      <label className="text-[8px] font-black text-slate-400 uppercase">Hours</label>
                      <input 
                        type="number" 
                        value={entry.hours || ''}
                        onChange={(e) => updateOTEntry(entry.id, 'hours', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-black outline-none focus:border-black text-right"
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total</p>
                      <p className="text-[11px] font-black text-black">₱{((entry.hours * hourlyRate * OT_MULTIPLIERS[entry.type]) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button 
                        onClick={() => removeOTEntry(entry.id)}
                        className="p-2 text-slate-300 hover:text-[#E31E24] transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Calculated OT Total</p>
                <p className="text-2xl font-[900] text-[#E31E24] tracking-tighter">{formatCurrency(calculatedOTTotal)}</p>
              </div>
              <button 
                onClick={handleApplyOT}
                className="px-10 py-4 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#E31E24] transition-all shadow-xl shadow-slate-200 active:scale-95"
              >
                Apply to Payroll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- HELPERS ---

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; icon: React.ReactNode }> = ({ active, onClick, children, icon }) => (
  <button 
    onClick={onClick} 
    className={`flex items-center gap-3 px-8 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-white shadow-xl shadow-slate-200 text-[#E31E24]' : 'text-slate-400 hover:text-black'}`}
  >
    {icon} {children}
  </button>
);

const InputGroup: React.FC<{ label: string; value: string | number; onChange: (val: string) => void; type?: string; prefix?: string; icon?: React.ReactNode; }> = ({ label, value, onChange, type = "text", prefix, icon }) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
      {icon} {label}
    </label>
    <div className="relative">
      {prefix && <span className="absolute left-5 top-1/2 -translate-y-1/2 text-black font-black text-sm">{prefix}</span>}
      <input 
        type={type} value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className={`w-full ${prefix ? 'pl-10' : 'px-5'} py-4 bg-white border-2 border-slate-100 rounded-xl font-bold text-black focus:border-black outline-none transition-all text-sm`} 
      />
    </div>
  </div>
);

const SelectGroup: React.FC<{ label: string; value: string; onChange: (val: string) => void; options: string[]; icon?: React.ReactNode; }> = ({ label, value, onChange, options, icon }) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">{icon} {label}</label>
    <div className="relative">
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-xl font-bold text-black focus:border-black outline-none appearance-none transition-all text-sm cursor-pointer"
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" />
    </div>
  </div>
);

const InputField: React.FC<{ label: string; value: number; onChange?: (val: number) => void; readOnly?: boolean; info?: string; accent?: boolean; }> = ({ label, value, onChange, readOnly = false, info, accent }) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
      {label} {info && <Info size={12} className="text-slate-300 cursor-help" />}
    </label>
    <div className="relative">
      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-black font-black text-sm">₱</span>
      <input 
        type="number" value={value || ''} 
        onChange={(e) => onChange && onChange(parseFloat(e.target.value) || 0)} 
        readOnly={readOnly}
        className={`w-full pl-10 pr-5 py-4 text-lg font-[900] rounded-xl border-2 outline-none text-right tabular-nums transition-all ${readOnly ? 'bg-slate-50 border-slate-50 text-slate-400' : accent ? 'border-[#E31E24]/20 focus:border-[#E31E24] text-[#E31E24]' : 'border-slate-100 focus:border-black text-black'}`} 
      />
    </div>
  </div>
);

const SummaryItem: React.FC<{ label: string; value: string; red?: boolean }> = ({ label, value, red }) => (
  <div className="flex justify-between items-center">
    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    <span className={`text-sm font-[900] tabular-nums ${red ? 'text-[#E31E24]' : 'text-white'}`}>{value}</span>
  </div>
);

const ProfileField: React.FC<{ label: string; value: string; inverse?: boolean; highlight?: boolean }> = ({ label, value, inverse, highlight }) => (
  <div>
    <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${inverse ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
    <p className={`text-[11px] font-[800] uppercase ${inverse ? 'text-white' : 'text-black'} ${highlight ? 'text-[#E31E24]' : ''}`}>{value}</p>
  </div>
);

const LedgerLine: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="flex justify-between items-end border-b border-slate-100 pb-1.5">
    <span className={`text-[9px] uppercase tracking-widest ${highlight ? 'font-[900] text-black' : 'font-bold text-slate-400'}`}>{label}</span>
    <span className={`text-[12px] font-black tabular-nums ${highlight ? 'text-[#E31E24]' : 'text-black'}`}>{value}</span>
  </div>
);

const ReferenceTable: React.FC<{ title: string; subtitle: string; headers: string[]; rows: string[][] }> = ({ title, subtitle, headers, rows }) => (
  <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
      <h4 className="text-[10px] font-black text-black uppercase tracking-widest">{title}</h4>
      <p className="text-[8px] font-bold text-[#E31E24] uppercase mt-0.5">{subtitle}</p>
    </div>
    <table className="w-full text-left">
      <thead>
        <tr className="bg-slate-50">
          {headers.map((h, i) => <th key={i} className="px-6 py-2 text-[8px] font-black text-slate-400 uppercase">{h}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="px-6 py-3 text-[10px] font-bold text-black">{c}</td>)}</tr>)}
      </tbody>
    </table>
  </div>
);

export default App;
