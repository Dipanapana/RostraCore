'use client';

/**
 * Mobile-First Roster Generation Wizard
 *
 * Multi-step form optimized for mobile devices
 * Breaks complex roster generation into digestible steps
 *
 * Steps:
 * 1. Date Selection (When?)
 * 2. Site Selection (Where?)
 * 3. Algorithm Settings (How?)
 * 4. Review & Generate
 *
 * Features:
 * - Progress indicator
 * - 48px touch targets
 * - Swipe between steps (optional)
 * - Mobile-optimized date pickers
 * - Step validation
 * - Back/Next navigation
 */

import { useState } from 'react';

export interface RosterWizardProps {
  onGenerate: (params: RosterGenerationParams) => void;
  onCancel: () => void;
}

export interface RosterGenerationParams {
  startDate: string;
  endDate: string;
  siteIds: number[] | null;
  algorithm: 'production' | 'balanced' | 'cost_optimized';
  budgetLimit: number | null;
}

const ALGORITHMS = [
  {
    id: 'production',
    name: 'Production Ready',
    description: 'Balanced approach for real-world usage',
    icon: '⚡',
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Equal weight to all factors',
    icon: '⚖️',
  },
  {
    id: 'cost_optimized',
    name: 'Cost Optimized',
    description: 'Minimize labor costs',
    icon: '💰',
  },
];

export function RosterWizard({ onGenerate, onCancel }: RosterWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [params, setParams] = useState<RosterGenerationParams>({
    startDate: '',
    endDate: '',
    siteIds: null,
    algorithm: 'production',
    budgetLimit: null,
  });

  const totalSteps = 4;

  // Validation per step
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return params.startDate && params.endDate;
      case 2:
        return true; // Sites optional
      case 3:
        return params.algorithm;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed() && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerate = () => {
    if (canProceed()) {
      onGenerate(params);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with Progress */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Generate Roster</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="flex justify-between mb-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`text-xs font-medium ${
                    step <= currentStep ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  Step {step}
                </div>
              ))}
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {/* Step 1: Date Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">📅</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  When do you need shifts?
                </h3>
                <p className="text-gray-600">
                  Select the date range for roster generation
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={params.startDate}
                      onChange={(e) => setParams({ ...params, startDate: e.target.value })}
                      className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={params.endDate}
                      onChange={(e) => setParams({ ...params, endDate: e.target.value })}
                      className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min={params.startDate}
                    />
                  </div>

                  {params.startDate && params.endDate && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center text-blue-700">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">
                          {Math.ceil((new Date(params.endDate).getTime() - new Date(params.startDate).getTime()) / (1000 * 60 * 60 * 24))} days selected
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Site Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">📍</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Which sites?
                </h3>
                <p className="text-gray-600">
                  Select specific sites or leave empty for all sites
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="all-sites"
                        checked={params.siteIds === null}
                        onChange={(e) => setParams({ ...params, siteIds: e.target.checked ? null : [] })}
                        className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="all-sites" className="ml-3 text-sm font-medium text-gray-900">
                        All Sites
                      </label>
                    </div>
                    <span className="text-sm text-gray-600">Recommended</span>
                  </div>

                  {params.siteIds === null ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">
                        Roster will be generated for all active sites
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm mb-4">
                        Site-specific selection coming soon
                      </p>
                      <button
                        onClick={() => setParams({ ...params, siteIds: null })}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Use all sites instead
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Algorithm Selection */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">🤖</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  How should we optimize?
                </h3>
                <p className="text-gray-600">
                  Choose an optimization strategy
                </p>
              </div>

              <div className="space-y-3">
                {ALGORITHMS.map((algo) => (
                  <button
                    key={algo.id}
                    onClick={() => setParams({ ...params, algorithm: algo.id as any })}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      params.algorithm === algo.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="text-3xl mr-4">{algo.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-gray-900">{algo.name}</h4>
                          {params.algorithm === algo.id && (
                            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{algo.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Optional Budget Limit */}
              <div className="bg-white rounded-xl p-6 shadow mt-6">
                <label className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-700">
                    Set budget limit (optional)
                  </span>
                  <input
                    type="checkbox"
                    checked={params.budgetLimit !== null}
                    onChange={(e) => setParams({ ...params, budgetLimit: e.target.checked ? 0 : null })}
                    className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
                {params.budgetLimit !== null && (
                  <input
                    type="number"
                    value={params.budgetLimit || ''}
                    onChange={(e) => setParams({ ...params, budgetLimit: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter budget in ZAR"
                    className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>
          )}

          {/* Step 4: Review & Generate */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">✅</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Review & Generate
                </h3>
                <p className="text-gray-600">
                  Confirm your settings before generating
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-600">Date Range</span>
                  <span className="text-sm font-bold text-gray-900">
                    {new Date(params.startDate).toLocaleDateString()} - {new Date(params.endDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-600">Sites</span>
                  <span className="text-sm font-bold text-gray-900">
                    {params.siteIds === null ? 'All Sites' : `${params.siteIds.length} selected`}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-600">Algorithm</span>
                  <span className="text-sm font-bold text-gray-900">
                    {ALGORITHMS.find((a) => a.id === params.algorithm)?.name}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium text-gray-600">Budget Limit</span>
                  <span className="text-sm font-bold text-gray-900">
                    {params.budgetLimit ? `R${params.budgetLimit.toLocaleString()}` : 'No limit'}
                  </span>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <div className="text-yellow-600 mr-3">⚠️</div>
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Note:</p>
                    <p>Generation may take 1-2 minutes depending on the number of shifts and employees.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 safe-area-inset-bottom">
        <div className="max-w-2xl mx-auto flex gap-3">
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              className="flex-1 h-12 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Back
            </button>
          )}
          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`flex-1 h-12 rounded-lg font-medium transition ${
                canProceed()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
            >
              Generate Roster
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
