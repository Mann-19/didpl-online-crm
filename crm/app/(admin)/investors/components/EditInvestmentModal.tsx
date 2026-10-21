'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  X, TrendingUp, Calendar, AlertCircle, Loader2, Calculator, Trash2, CheckCircle2, Clock
} from 'lucide-react';
import { updateInvestment, deleteInvestment } from '../../investors.actions';

interface EditInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  investment: {
    id: string;
    investor_id: string;
    investment_code?: string;
    invested_amount: number | string;
    interest_rate: number | string;
    mature_amount: number | string;
    investment_date?: string;
    mature_date: string;
    status: 'pending' | 'settled';
    exit_date?: string | null;
    payment_mode?: string | null;
    transaction_id?: string | null;
    investor?: {
      name?: string;
      investor_code?: string;
    };
  } | null;
  onSuccess: (updatedInvestment: any) => void;
  onDelete?: (investmentId: string) => void;
}

export default function EditInvestmentModal({
  isOpen,
  onClose,
  investment,
  onSuccess,
  onDelete,
}: EditInvestmentModalProps) {
  const [formData, setFormData] = useState({
    invested_amount: '',
    interest_rate: '',
    mature_amount: '',
    investment_date: '',
    mature_date: '',
    status: 'pending' as 'pending' | 'settled',
    exit_date: '',
    payment_mode: 'bank_transfer',
    transaction_id: '',
    investment_code: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (investment) {
      const invDate = investment.investment_date
        ? new Date(investment.investment_date).toISOString().split('T')[0]
        : '';
      const matDate = investment.mature_date
        ? new Date(investment.mature_date).toISOString().split('T')[0]
        : '';
      const exDate = investment.exit_date
        ? new Date(investment.exit_date).toISOString().split('T')[0]
        : '';

      setFormData({
        invested_amount: String(investment.invested_amount ?? ''),
        interest_rate: String(investment.interest_rate ?? ''),
        mature_amount: String(investment.mature_amount ?? ''),
        investment_date: invDate,
        mature_date: matDate,
        status: investment.status || 'pending',
        exit_date: exDate,
        payment_mode: investment.payment_mode || 'bank_transfer',
        transaction_id: investment.transaction_id || '',
        investment_code: investment.investment_code || '',
      });
      setErrors({});
      setSubmitError('');
      setIsDeleting(false);
    }
  }, [investment]);

  if (!isOpen || !investment) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };

      // If status changed to settled and exit_date empty, suggest today
      if (name === 'status' && value === 'settled' && !prev.exit_date) {
        updated.exit_date = new Date().toISOString().split('T')[0];
      }

      return updated;
    });

    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleAutoCalculate = () => {
    const amt = parseFloat(formData.invested_amount) || 0;
    const rate = parseFloat(formData.interest_rate) || 0;
    const mature = Math.round((amt + (amt * rate) / 100) * 100) / 100;
    setFormData(prev => ({ ...prev, mature_amount: String(mature) }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const amt = parseFloat(formData.invested_amount);
    const rate = parseFloat(formData.interest_rate);
    const mature = parseFloat(formData.mature_amount);

    if (isNaN(amt) || amt <= 0) {
      newErrors.invested_amount = 'Please enter a valid invested amount';
    }
    if (isNaN(rate) || rate < 0) {
      newErrors.interest_rate = 'Please enter a valid interest rate';
    }
    if (isNaN(mature) || mature <= 0) {
      newErrors.mature_amount = 'Please enter a valid mature amount';
    }
    if (!formData.mature_date) {
      newErrors.mature_date = 'Maturity date is required';
    }
    if (formData.status === 'settled' && !formData.exit_date) {
      newErrors.exit_date = 'Exit / settlement date is required for settled status';
    }

    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    startTransition(async () => {
      const payload: any = {
        invested_amount: parseFloat(formData.invested_amount),
        interest_rate: parseFloat(formData.interest_rate),
        mature_amount: parseFloat(formData.mature_amount),
        investment_date: formData.investment_date || null,
        mature_date: formData.mature_date,
        status: formData.status,
        exit_date: formData.status === 'settled' ? formData.exit_date || null : null,
        payment_mode: formData.payment_mode || null,
        transaction_id: formData.transaction_id || null,
      };

      if (formData.investment_code) {
        payload.investment_code = formData.investment_code.trim();
      }

      const result = await updateInvestment(investment.id, investment.investor_id, payload);

      if (result.success) {
        onSuccess(result.data || { ...investment, ...payload });
        onClose();
      } else {
        setSubmitError(result.error || 'Failed to update investment');
      }
    });
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this investment record? This cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteInvestment(investment.id, investment.investor_id);
    setIsDeleting(false);

    if (result.success) {
      if (onDelete) onDelete(investment.id);
      onClose();
    } else {
      setSubmitError(result.error || 'Failed to delete investment');
    }
  };

  const theme = {
    inputFocus: 'focus:ring-indigo-500 focus:border-indigo-500',
    button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Edit Investment Record</h3>
              <p className="text-xs text-gray-500">
                Code: <span className="font-mono font-semibold">{investment.investment_code || '---'}</span>
                {investment.investor?.name && ` • Investor: ${investment.investor.name}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border-l-4 border-red-500 rounded text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Invested Amount (₹) *
              </label>
              <input
                type="number"
                step="any"
                name="invested_amount"
                value={formData.invested_amount}
                onChange={handleChange}
                className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${theme.inputFocus} ${
                  errors.invested_amount ? 'border-red-500 ring-red-500' : ''
                }`}
                placeholder="100000"
                required
              />
              {errors.invested_amount && <p className="mt-1 text-xs text-red-600">{errors.invested_amount}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Interest Rate / Return (%) *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  name="interest_rate"
                  value={formData.interest_rate}
                  onChange={handleChange}
                  className={`flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${theme.inputFocus} ${
                    errors.interest_rate ? 'border-red-500 ring-red-500' : ''
                  }`}
                  placeholder="12.00"
                  required
                />
                <button
                  type="button"
                  onClick={handleAutoCalculate}
                  className="px-3 py-2 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg flex items-center gap-1 border border-indigo-200 transition-colors shrink-0"
                  title="Auto-calculate Mature Amount"
                >
                  <Calculator className="w-3.5 h-3.5" /> Calc
                </button>
              </div>
              {errors.interest_rate && <p className="mt-1 text-xs text-red-600">{errors.interest_rate}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Mature Amount (₹) *
              </label>
              <input
                type="number"
                step="any"
                name="mature_amount"
                value={formData.mature_amount}
                onChange={handleChange}
                className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-emerald-600 focus:outline-none focus:ring-2 ${theme.inputFocus} ${
                  errors.mature_amount ? 'border-red-500 ring-red-500' : ''
                }`}
                placeholder="112000"
                required
              />
              {errors.mature_amount && <p className="mt-1 text-xs text-red-600">{errors.mature_amount}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Investment Code
              </label>
              <input
                type="text"
                name="investment_code"
                value={formData.investment_code}
                onChange={handleChange}
                className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 ${theme.inputFocus}`}
                placeholder="INVST-INV-1234"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Investment Date
              </label>
              <input
                type="date"
                name="investment_date"
                value={formData.investment_date}
                onChange={handleChange}
                className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${theme.inputFocus}`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Maturity Date *
              </label>
              <input
                type="date"
                name="mature_date"
                value={formData.mature_date}
                onChange={handleChange}
                className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${theme.inputFocus} ${
                  errors.mature_date ? 'border-red-500 ring-red-500' : ''
                }`}
                required
              />
              {errors.mature_date && <p className="mt-1 text-xs text-red-600">{errors.mature_date}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 ${theme.inputFocus}`}
              >
                <option value="pending">Pending (Active)</option>
                <option value="settled">Settled (Paid Out)</option>
              </select>
            </div>

            {formData.status === 'settled' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Settlement / Exit Date *
                </label>
                <input
                  type="date"
                  name="exit_date"
                  value={formData.exit_date}
                  onChange={handleChange}
                  className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${theme.inputFocus} ${
                    errors.exit_date ? 'border-red-500 ring-red-500' : ''
                  }`}
                  required
                />
                {errors.exit_date && <p className="mt-1 text-xs text-red-600">{errors.exit_date}</p>}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Payment Mode
              </label>
              <select
                name="payment_mode"
                value={formData.payment_mode}
                onChange={handleChange}
                className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 ${theme.inputFocus}`}
              >
                <option value="bank_transfer">Bank Transfer / NEFT / RTGS</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Transaction ID / Cheque No.
              </label>
              <input
                type="text"
                name="transaction_id"
                value={formData.transaction_id}
                onChange={handleChange}
                className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${theme.inputFocus}`}
                placeholder="UTR / Cheque number"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending || isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || isDeleting}
                className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors ${theme.button} ${
                  isPending ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {isPending ? 'Saving...' : 'Save Investment'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
