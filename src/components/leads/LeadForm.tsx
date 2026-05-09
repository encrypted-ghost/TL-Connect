import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { apiClient } from '@/src/lib/apiClient';

const leadSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  title: z.string().optional(),
  companyName: z.string().optional(),
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
  });

  const onSubmit = async (data: LeadFormValues) => {
    try {
      await apiClient.post('/leads', data);
      toast.success('Lead created successfully');
      reset();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create lead');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider">First Name</label>
          <input 
            {...register('firstName')}
            className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors"
            placeholder="Jane"
          />
          {errors.firstName && <p className="text-[10px] text-red-500">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider">Last Name</label>
          <input 
            {...register('lastName')}
            className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors"
            placeholder="Doe"
          />
          {errors.lastName && <p className="text-[10px] text-red-500">{errors.lastName.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider">Email Address</label>
        <input 
          {...register('email')}
          className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors"
          placeholder="jane@example.com"
        />
        {errors.email && <p className="text-[10px] text-red-500">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider">Company (Optional)</label>
        <input 
          {...register('companyName')}
          className="w-full bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors"
          placeholder="Acme Corp"
        />
      </div>

      <div className="flex justify-end gap-3 pt-6">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="white" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Lead'}
        </Button>
      </div>
    </form>
  );
}
