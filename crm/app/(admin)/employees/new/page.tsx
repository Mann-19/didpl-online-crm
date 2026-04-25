'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Briefcase, Building2, CreditCard, Save, X } from 'lucide-react';
import Link from 'next/link';
import { addEmployee } from '../../people.actions';

const INITIAL = {
  designation: '', salary: '', joining_date: '',
  address: '', emergency_contact: '',
  bank_name: '', account_number: '', ifsc_code: '',
  pan_number: '',
};

const Field = ({ label, name, type = 'text', className = '', placeholder = '', ...props }: any) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      className={`px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${className}`}
      {...props}
    />
  </div>
);

export default function NewEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(INITIAL);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await addEmployee(formData);
    setLoading(false);
    if (!result.success) { setError(result.error || 'Failed to create employee'); return; }
    router.push('/employees/list');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12 animate-in fade-in duration-300">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/employees" className="inline-flex items-center text-sm text-gray-500 hover:text-teal-600 mb-3">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Team
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Add Team Member</h1>
          <p className="text-gray-500 text-sm mt-1">
            Create a new employee record. The system account must be created separately via Supabase Auth.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <X size={16} className="shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Employment Info */}
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-sm font-bold text-teal-600 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Briefcase size={16} /> Employment Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Designation" name="designation" value={formData.designation} onChange={handleChange} placeholder="e.g. Sales Manager" />
              <Field label="Salary / Contractual Amount" name="salary" type="number" value={formData.salary} onChange={handleChange} placeholder="Monthly amount" />
              <Field label="Joining Date" name="joining_date" type="date" value={formData.joining_date} onChange={handleChange} />
            </div>
          </div>

          {/* Address */}
          <div className="p-6 border-b border-gray-100 bg-gray-50/30">
            <h3 className="text-sm font-bold text-teal-600 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Users size={16} /> Personal & Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Residential Address</label>
                <textarea
                  name="address"
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                  rows={2}
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Full address"
                />
              </div>
              <Field label="Emergency Contact" name="emergency_contact" value={formData.emergency_contact} onChange={handleChange} placeholder="Name & Phone" />
            </div>
          </div>

          {/* Banking */}
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-sm font-bold text-teal-600 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Building2 size={16} /> Banking Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Bank Name" name="bank_name" value={formData.bank_name} onChange={handleChange} />
              <Field label="Account Number" name="account_number" value={formData.account_number} onChange={handleChange} className="font-mono" />
              <Field label="IFSC Code" name="ifsc_code" value={formData.ifsc_code} onChange={handleChange} className="font-mono uppercase" />
            </div>
          </div>

          {/* Identity */}
          <div className="p-6 border-b border-gray-100 bg-gray-50/30">
            <h3 className="text-sm font-bold text-teal-600 uppercase tracking-wide mb-4 flex items-center gap-2">
              <CreditCard size={16} /> Identity Documents
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="PAN Number" name="pan_number" value={formData.pan_number} onChange={handleChange} className="font-mono uppercase" placeholder="ABCDE1234F" />
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button type="button" onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50">
              <Save size={16} /> {loading ? 'Saving...' : 'Save Employee Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
