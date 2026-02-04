'use client';

import { useState } from 'react';
import { WizardStepProps } from '../../../types/setupWizard';
import { setupWizardApi } from '../../../services/setupWizardApi';

export function CompanyDetails({ data, onNext, onBack }: WizardStepProps) {
  const [companyName, setCompanyName] = useState(data.company_name || '');
  const [orgCode, setOrgCode] = useState(data.org_code || '');
  const [billingEmail, setBillingEmail] = useState(data.billing_email || '');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateOrgCode = async (code: string) => {
    if (!code || code.length < 2) return;
    setIsValidating(true);
    try {
      const result = await setupWizardApi.validateOrgCode(code);
      setCodeError(result.available ? null : 'This code is already taken');
      setOrgCode(result.org_code); // Use normalized code
    } catch {
      setCodeError('Failed to validate');
    } finally {
      setIsValidating(false);
    }
  };

  const handleContinue = () => {
    if (companyName && orgCode && !codeError) {
      onNext({
        company_name: companyName,
        org_code: orgCode,
        billing_email: billingEmail || undefined,
      });
    }
  };

  const isValid = companyName.length >= 2 && orgCode.length >= 2 && !codeError;

  return (
    <div>
      <p className="text-gray-600 mb-6">
        Enter your company details. The organization code will be used for unique identification.
      </p>

      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company Name *
          </label>
          <input
            type="text"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            placeholder="Enter your company name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Organization Code *
          </label>
          <input
            type="text"
            value={orgCode}
            onChange={e => {
              const code = e.target.value.toUpperCase();
              setOrgCode(code);
              setCodeError(null);
            }}
            onBlur={() => validateOrgCode(orgCode)}
            placeholder="e.g., ACME-CORP"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              codeError ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {codeError && <p className="text-red-500 text-sm mt-1">{codeError}</p>}
          {isValidating && <p className="text-gray-500 text-sm mt-1">Checking availability...</p>}
          <p className="text-gray-400 text-xs mt-1">Unique identifier (letters, numbers, hyphens)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Billing Email (optional)
          </label>
          <input
            type="email"
            value={billingEmail}
            onChange={e => setBillingEmail(e.target.value)}
            placeholder="billing@company.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex justify-between">
        {onBack && (
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-lg font-medium text-gray-600 hover:bg-gray-100"
          >
            Back
          </button>
        )}
        <button
          onClick={handleContinue}
          disabled={!isValid}
          className={`
            px-6 py-3 rounded-lg font-medium ml-auto
            ${isValid
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
          `}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
