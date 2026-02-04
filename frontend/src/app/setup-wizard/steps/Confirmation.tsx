'use client';

import { useState, useEffect } from 'react';
import { WizardStepProps, IndustryTemplate } from '../../../types/setupWizard';
import { setupWizardApi } from '../../../services/setupWizardApi';

export function Confirmation({ data, onNext, onBack }: WizardStepProps) {
  const [template, setTemplate] = useState<IndustryTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (data.industry_template_id) {
      setupWizardApi.getTemplates().then(templates => {
        const found = templates.find(t => t.template_id === data.industry_template_id);
        setTemplate(found || null);
      });
    }
  }, [data.industry_template_id]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onNext({}); // All data already collected, onNext triggers complete
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <p className="text-gray-600 mb-6">
        Review your setup details and confirm to create your organization.
      </p>

      <div className="space-y-4 mb-8">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Industry</h3>
          <p className="text-gray-600">{template?.display_name || data.industry_template_id}</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Company</h3>
          <p className="text-gray-600">{data.company_name}</p>
          <p className="text-sm text-gray-400">Code: {data.org_code}</p>
          {data.billing_email && <p className="text-sm text-gray-400">Billing: {data.billing_email}</p>}
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Administrator</h3>
          <p className="text-gray-600">{data.admin_full_name}</p>
          <p className="text-sm text-gray-400">{data.admin_email}</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="font-medium text-blue-900 mb-2">14-Day Free Trial</h3>
          <p className="text-blue-700 text-sm">
            Your trial includes full access to all features. No credit card required.
          </p>
        </div>
      </div>

      <div className="flex justify-between">
        {onBack && (
          <button
            onClick={onBack}
            disabled={isSubmitting}
            className="px-6 py-3 rounded-lg font-medium text-gray-600 hover:bg-gray-100"
          >
            Back
          </button>
        )}
        <button
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="px-8 py-3 rounded-lg font-medium ml-auto bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400"
        >
          {isSubmitting ? 'Creating...' : 'Create Organization'}
        </button>
      </div>
    </div>
  );
}
