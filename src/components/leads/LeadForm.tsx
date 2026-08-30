import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { apiClient } from '@/src/lib/apiClient';
import { getErrorMessage } from '@/src/lib/utils';
import { Tag, Building, Briefcase, Mail, User } from 'lucide-react';

const leadSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  title: z.string().optional(),
  companyName: z.string().optional(),
  category: z.string().default('Outbound'),
  status: z.string().default('NEW'),
  phone: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadSchema>;

interface LeadFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function LeadForm({ onSuccess, onCancel }: LeadFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      category: 'Outbound',
      status: 'NEW',
    }
  });

  const onSubmit = async (data: LeadFormValues) => {
    try {
      await apiClient.post('/leads', data);
      toast.success('Lead created successfully');
      reset();
      onSuccess?.();
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to create lead'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-1">
      {/* Name Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
            <User size={12} /> First Name *
          </label>
          <input 
            {...register('firstName')}
            className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors"
            placeholder="Jane"
          />
          {errors.firstName && <p className="text-[10px] text-red-500">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
            <User size={12} /> Last Name *
          </label>
          <input 
            {...register('lastName')}
            className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors"
            placeholder="Doe"
          />
          {errors.lastName && <p className="text-[10px] text-red-500">{errors.lastName.message}</p>}
        </div>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
          <Mail size={12} /> Email Address *
        </label>
        <input 
          {...register('email')}
          type="email"
          className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors"
          placeholder="jane.doe@company.com"
        />
        {errors.email && <p className="text-[10px] text-red-500">{errors.email.message}</p>}
      </div>

      {/* Company & Title */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
            <Building size={12} /> Company Name
          </label>
          <input 
            {...register('companyName')}
            className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors"
            placeholder="Acme Global Corp"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
            <Briefcase size={12} /> Job Title
          </label>
          <input 
            {...register('title')}
            className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors"
            placeholder="Head of Growth"
          />
        </div>
      </div>

      {/* Category & Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
            <Tag size={12} /> Lead Category
          </label>
          <select
            {...register('category')}
            className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors text-neutral-200"
          >
            <option value="Outbound">Outbound</option>
            <option value="Inbound">Inbound</option>
            <option value="Cold Outreach">Cold Outreach</option>
            <option value="Enterprise">Enterprise</option>
            <option value="SMB">SMB</option>
            <option value="VIP">VIP</option>
            <option value="Partner">Partner</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider">Initial Status</label>
          <select
            {...register('status')}
            className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors text-neutral-200"
          >
            <option value="NEW">New</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="CONTACTED">Contacted</option>
            <option value="INTERESTED">Interested</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-[#27272a]">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="white" disabled={isSubmitting}>
          {isSubmitting ? 'Creating Lead...' : 'Create Lead'}
        </Button>
      </div>
    </form>
  );
}
