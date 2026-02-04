'use client';

import { useState } from 'react';
import { WizardStepProps } from '../../../types/setupWizard';

export function UserSetup({ data, onNext, onBack }: WizardStepProps) {
  const [email, setEmail] = useState(data.admin_email || '');
  const [fullName, setFullName] = useState(data.admin_full_name || '');
  const [password, setPassword] = useState(data.admin_password || '');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const passwordsMatch = password === confirmPassword;
  const passwordValid = password.length >= 8;
  const emailValid = email.includes('@') && email.includes('.');
  const isValid = emailValid && fullName.length >= 2 && passwordValid && passwordsMatch;

  const handleContinue = () => {
    if (isValid) {
      onNext({
        admin_email: email,
        admin_full_name: fullName,
        admin_password: password,
      });
    }
  };

  return (
    <div>
      <p className="text-gray-600 mb-6">
        Create your administrator account. This will be the first user with full access.
      </p>

      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Your full name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@yourcompany.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password *
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2 text-gray-500"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {password && !passwordValid && (
            <p className="text-red-500 text-sm mt-1">Password must be at least 8 characters</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password *
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              confirmPassword && !passwordsMatch ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {confirmPassword && !passwordsMatch && (
            <p className="text-red-500 text-sm mt-1">Passwords do not match</p>
          )}
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
