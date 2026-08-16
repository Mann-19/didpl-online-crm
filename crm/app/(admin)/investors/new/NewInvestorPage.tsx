'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { addInvestor } from '../../investors.actions';
import { User, Phone, Mail, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import BackLink from '@/components/ui/BackLink';

const investorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
  email: z.string().email('Invalid email address').or(z.literal('')),
  address: z.string().optional(),
  referral_id: z.string().optional(),
});

type FormData = z.infer<typeof investorSchema>;

export default function NewInvestorPage({ referrers }: { referrers: any[] }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    referral_id: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitError, setSubmitError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);

    try {
      // Validate
      const validatedData = investorSchema.parse(formData);

      // Submit
      const result = await addInvestor(validatedData);
      
      if (result.success) {
        // We could add a toast here. For now, redirect.
        router.push('/investors/list');
      } else {
        setSubmitError(result.error || 'Failed to create investor');
        setIsSubmitting(false);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof FormData, string>> = {};
        (error as any).errors.forEach((err: any) => {
          if (err.path[0]) newErrors[err.path[0] as keyof FormData] = err.message;
        });
        setErrors(newErrors);
      } else {
        setSubmitError('An unexpected error occurred');
      }
      setIsSubmitting(false);
    }
  };

  const theme = {
    inputFocus: 'focus:ring-indigo-500 focus:border-indigo-500',
    button: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500',
  };

  return (
    <div className="min-h-screen bg-gray-50 space-y-6 font-sans animate-in fade-in duration-300 pb-12">
      <BackLink href="/investors/list" dirname="Investors Directory" accent="indigo" />
      
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Register New Investor</h1>
        <p className="text-sm text-gray-500 mt-1">
          Add a new investor to the database. All required fields are marked with an asterisk (*).
        </p>
      </div>

      {submitError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
          <p className="text-sm text-red-700">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Investor Information */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            Investor Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`pl-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 ${theme.inputFocus} ${errors.name ? 'border-red-500 ring-red-500' : ''}`}
                  placeholder="John Doe"
                />
              </div>
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`pl-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 ${theme.inputFocus} ${errors.phone ? 'border-red-500 ring-red-500' : ''}`}
                  placeholder="9876543210"
                />
              </div>
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`pl-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 ${theme.inputFocus} ${errors.email ? 'border-red-500 ring-red-500' : ''}`}
                  placeholder="john@example.com"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>
          </div>
        </div>

        {/* Mailing Address */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" />
            Mailing Address
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Physical Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 ${theme.inputFocus}`}
              placeholder="123 Main St, City, State, ZIP"
            />
          </div>
        </div>

        {/* Referral Details */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-indigo-600" />
            Referral Details
          </h2>
          <div className="md:w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Referred By (Consultant)</label>
            <select
              name="referral_id"
              value={formData.referral_id}
              onChange={handleChange}
              className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 ${theme.inputFocus}`}
            >
              <option value="">No Referral / Direct</option>
              {referrers.map((referrer: any) => (
                <option key={referrer.id} value={referrer.id}>
                  {referrer.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Form Actions */}
        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/investors/list')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme.button} ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? 'Registering...' : 'Register Investor'}
          </button>
        </div>
      </form>
    </div>
  );
}
