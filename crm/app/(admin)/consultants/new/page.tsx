'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, MapPin, Briefcase, CreditCard, Building2,
  Phone, Mail, Save, X
} from 'lucide-react';
import BackLink from '@/components/ui/BackLink';
import { addConsultant } from '../../people.actions';

const INITIAL_FORM_STATE = {
  name: '', gender: '', phone: '', email: '', birthdate: '',
  pan_number: '', aadhar_number: '',
  residential_address: '', residential_state: '', residential_city: '', residential_pincode: '',
  bank_name: '', account_number: '', ifsc_code: ''
};

const ConsultantInput = ({ label, name, errors, type = 'text', className, ...props }: any) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <input 
      type={type} 
      name={name} 
      className={`px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-amber-500 focus:border-amber-500 ${className || ''}`} 
      {...props} 
    />
    {errors && errors[name] && <span className="text-xs text-red-500">{errors[name]}</span>}
  </div>
);

export default function NewConsultantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<any>({});

  const updateField = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev: any) => ({ ...prev, [name]: '' }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => updateField(e.target.name, e.target.value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setErrors({ name: 'Full name is required' });
      return;
    }

    try {
      setLoading(true);
      await addConsultant(formData);
      router.push('/consultants/list');
    } catch (error: any) {
      console.error('Error saving consultant:', error);
      setErrors({ submit: error.message || 'Failed to save consultant' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12 animate-in fade-in duration-300">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <BackLink href="/consultants" dirname="Consultants" accent="amber" />
            <h1 className="text-2xl font-bold text-gray-900 mt-2">New Consultant Registration</h1>
            <p className="text-gray-500 text-sm">Register a new consulting partner.</p>
          </div>
        </div>

        {errors.submit && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <div className="bg-red-100 p-1.5 rounded-full"><X size={16} /></div>
            <span className="text-sm font-medium">{errors.submit}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wide mb-4 flex items-center gap-2">
              <User size={16} /> Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <ConsultantInput errors={errors} label="Full Name *" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Rahul Sharma" />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-amber-500 focus:border-amber-500">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <ConsultantInput errors={errors} type="date" label="Date of Birth" name="birthdate" value={formData.birthdate} onChange={handleChange} />
              </div>
              <ConsultantInput errors={errors} label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} placeholder="10-digit mobile number" />
              <ConsultantInput errors={errors} label="Email Address" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" />
            </div>
          </div>

          <div className="p-6 border-b border-gray-100 bg-gray-50/30">
            <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Briefcase size={16} /> Professional & Identity
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <ConsultantInput errors={errors} label="PAN Number" name="pan_number" value={formData.pan_number} onChange={handleChange} placeholder="ABCDE1234F" className="uppercase w-full" />
              <ConsultantInput errors={errors} label="Aadhar Number" name="aadhar_number" value={formData.aadhar_number} onChange={handleChange} />
            </div>
          </div>

          <div className="p-6 border-b border-gray-100">
            <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Building2 size={16} /> Bank Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <ConsultantInput errors={errors} label="Bank Name" name="bank_name" value={formData.bank_name} onChange={handleChange} />
              <ConsultantInput errors={errors} label="Account Number" name="account_number" value={formData.account_number} onChange={handleChange} />
              <ConsultantInput errors={errors} label="IFSC Code" name="ifsc_code" value={formData.ifsc_code} onChange={handleChange} className="uppercase w-full" />
            </div>
          </div>

          <div className="p-6 border-b border-gray-100 bg-gray-50/30">
            <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wide mb-4 flex items-center gap-2">
              <MapPin size={16} /> Address
            </h3>
            <div className="space-y-4">
              <ConsultantInput errors={errors} label="Street Address" name="residential_address" value={formData.residential_address} onChange={handleChange} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <ConsultantInput errors={errors} label="Pincode" name="residential_pincode" value={formData.residential_pincode} onChange={handleChange} maxLength={6} />
                <ConsultantInput errors={errors} label="City" name="residential_city" value={formData.residential_city} onChange={handleChange} />
                <ConsultantInput errors={errors} label="State" name="residential_state" value={formData.residential_state} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0">
            <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50">
              <Save size={16} /> Register Partner
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
