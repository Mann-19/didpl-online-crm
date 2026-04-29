'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, MapPin, Briefcase, CreditCard,
  Phone, Mail, Save, X, Clock
} from 'lucide-react';
import BackLink from '@/components/ui/BackLink';
import { addClient } from '../../people.actions';
import { submitChangeRequest } from '@/app/(admin)/change-requests.actions';

const INITIAL_FORM_STATE = {
  name: '', gender: '', phone: '', email: '', birthdate: '',
  occupation: '', pan_number: '', aadhar_number: '',
  residential_address: '', residential_state: '', residential_city: '', residential_pincode: '',
  office_address: '', office_state: '', office_city: '', office_pincode: ''
};

const ClientInput = ({ label, name, errors, type = 'text', className, ...props }: any) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <input
      type={type}
      name={name}
      className={`px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-blue-500 focus:border-blue-500 ${className || ''}`}
      {...props}
    />
    {errors && errors[name] && <span className="text-xs text-red-500">{errors[name]}</span>}
  </div>
);

export default function NewClientPage({ role }: { role: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<any>({});
  const [submitted, setSubmitted] = useState(false);

  const isEmployee = role === 'employee';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev: any) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setErrors({ name: 'Full name is required' });
      return;
    }

    startTransition(async () => {
      if (isEmployee) {
        // Stage for review
        const result = await submitChangeRequest({
          entity_type: 'client',
          operation: 'create',
          payload: formData,
          description: `Create new client "${formData.name}"${formData.phone ? ` (${formData.phone})` : ''}`,
        });

        if (result.success) {
          setSubmitted(true);
        } else {
          setErrors({ submit: result.error || 'Submission failed' });
        }
      } else {
        // Admin: write directly
        try {
          await addClient(formData);
          router.push('/clients/list');
        } catch (error: any) {
          setErrors({ submit: error.message || 'Failed to save client' });
        }
      }
    });
  };

  // Employee success state — show confirmation instead of redirecting
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Submitted for Review</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Your request to add <span className="font-semibold text-gray-800">{formData.name}</span> as
            a new client has been sent to the Master Admin for approval.
            The client will appear in the system once approved.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => router.push('/clients/list')}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back to Clients
            </button>
            <button
              onClick={() => { setSubmitted(false); setFormData(INITIAL_FORM_STATE); }}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Add Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12 animate-in fade-in duration-300">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <BackLink href="/clients" dirname="Clients" accent="blue" />
            <h1 className="text-2xl font-bold text-gray-900 mt-2">New Client Registration</h1>
            <p className="text-gray-500 text-sm">
              {isEmployee
                ? 'Fill in the details below. Your submission will be reviewed by the admin before being saved.'
                : 'Fill in the details below to add a new client.'}
            </p>
          </div>
        </div>

        {/* Employee notice banner */}
        {isEmployee && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              As an employee, new clients you add will be sent to the Master Admin for approval before they appear in the system.
            </p>
          </div>
        )}

        {errors.submit && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <div className="bg-red-100 p-1.5 rounded-full"><X size={16} /></div>
            <span className="text-sm font-medium">{errors.submit}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-4 flex items-center gap-2">
              <User size={16} /> Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <ClientInput errors={errors} label="Full Name *" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Rahul Sharma" />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-blue-500 focus:border-blue-500">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <ClientInput errors={errors} type="date" label="Date of Birth" name="birthdate" value={formData.birthdate} onChange={handleChange} />
              </div>
              <ClientInput errors={errors} label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} placeholder="10-digit mobile number" />
              <ClientInput errors={errors} label="Email Address" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" />
            </div>
          </div>

          <div className="p-6 border-b border-gray-100 bg-gray-50/30">
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Briefcase size={16} /> Identity & Profession
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <ClientInput errors={errors} label="Occupation" name="occupation" value={formData.occupation} onChange={handleChange} />
              <ClientInput errors={errors} label="PAN Number" name="pan_number" value={formData.pan_number} onChange={handleChange} placeholder="ABCDE1234F" className="uppercase w-full" />
              <ClientInput errors={errors} label="Aadhar Number" name="aadhar_number" value={formData.aadhar_number} onChange={handleChange} />
            </div>
          </div>

          <div className="p-6 border-b border-gray-100">
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-4 flex items-center gap-2">
              <MapPin size={16} /> Residential Address
            </h3>
            <div className="space-y-4">
              <ClientInput errors={errors} label="Street Address" name="residential_address" value={formData.residential_address} onChange={handleChange} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <ClientInput errors={errors} label="Pincode" name="residential_pincode" value={formData.residential_pincode} onChange={handleChange} maxLength={6} />
                <ClientInput errors={errors} label="City" name="residential_city" value={formData.residential_city} onChange={handleChange} />
                <ClientInput errors={errors} label="State" name="residential_state" value={formData.residential_state} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0">
            <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isEmployee
                ? <><Clock size={16} /> {isPending ? 'Submitting...' : 'Submit for Review'}</>
                : <><Save size={16} /> {isPending ? 'Saving...' : 'Save Client Profile'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}