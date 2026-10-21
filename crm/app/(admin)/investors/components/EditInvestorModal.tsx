'use client';

import { useState, useEffect, useTransition } from 'react';
import { X, User, Phone, Mail, MapPin, CheckCircle, Hash, AlertCircle, Loader2 } from 'lucide-react';
import { updateInvestor } from '../../investors.actions';

interface EditInvestorModalProps {
  isOpen: boolean;
  onClose: () => void;
  investor: {
    id: string;
    investor_code?: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    referral_id?: string | null;
  } | null;
  referrers?: Array<{ id: string; name: string }>;
  onSuccess: (updatedInvestor: any) => void;
}

export default function EditInvestorModal({
  isOpen,
  onClose,
  investor,
  referrers = [],
  onSuccess,
}: EditInvestorModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    referral_id: '',
    investor_code: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (investor) {
      setFormData({
        name: investor.name || '',
        phone: investor.phone || '',
        email: investor.email || '',
        address: investor.address || '',
        referral_id: investor.referral_id || '',
        investor_code: investor.investor_code || '',
      });
      setErrors({});
      setSubmitError('');
    }
  }, [investor]);

  if (!isOpen || !investor) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }
    if (formData.phone && !/^\d{10}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Invalid email address';
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
      const result = await updateInvestor(investor.id, {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        referral_id: formData.referral_id || null,
        investor_code: formData.investor_code.trim() || null,
      });

      if (result.success) {
        onSuccess({
          ...investor,
          ...formData,
        });
        onClose();
      } else {
        setSubmitError(result.error || 'Failed to update investor');
      }
    });
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
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Edit Investor Profile</h3>
              <p className="text-xs text-gray-500">Update investor records and contact information</p>
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
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`pl-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${theme.inputFocus} ${
                    errors.name ? 'border-red-500 ring-red-500' : ''
                  }`}
                  placeholder="Investor Name"
                  required
                />
              </div>
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Investor Code
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="investor_code"
                  value={formData.investor_code}
                  onChange={handleChange}
                  className={`pl-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 ${theme.inputFocus}`}
                  placeholder="INV-XX-1234"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`pl-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${theme.inputFocus} ${
                    errors.phone ? 'border-red-500 ring-red-500' : ''
                  }`}
                  placeholder="10-digit number"
                />
              </div>
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`pl-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${theme.inputFocus} ${
                    errors.email ? 'border-red-500 ring-red-500' : ''
                  }`}
                  placeholder="investor@example.com"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Physical Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={2}
                className={`pl-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${theme.inputFocus}`}
                placeholder="123 Street, City, State"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Referred By (Consultant)
            </label>
            <div className="relative">
              <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                name="referral_id"
                value={formData.referral_id}
                onChange={handleChange}
                className={`pl-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 ${theme.inputFocus}`}
              >
                <option value="">No Referral / Direct</option>
                {referrers.map((referrer) => (
                  <option key={referrer.id} value={referrer.id}>
                    {referrer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors ${theme.button} ${
                isPending ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
