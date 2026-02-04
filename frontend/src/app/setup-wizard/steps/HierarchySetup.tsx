'use client';

import { useState } from 'react';
import { WizardStepProps } from '../../../types/setupWizard';

export function HierarchySetup({ data, onNext, onBack }: WizardStepProps) {
  const [skipHierarchy, setSkipHierarchy] = useState(data.skip_hierarchy ?? true);
  const [nodes, setNodes] = useState(data.hierarchy_nodes || []);

  const handleContinue = () => {
    onNext({
      hierarchy_nodes: skipHierarchy ? undefined : nodes,
      skip_hierarchy: skipHierarchy,
    });
  };

  return (
    <div>
      <p className="text-gray-600 mb-6">
        Define your organization structure (optional). You can set this up later in Settings.
      </p>

      <div className="mb-6">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={skipHierarchy}
            onChange={e => setSkipHierarchy(e.target.checked)}
            className="w-5 h-5 text-blue-600 rounded"
          />
          <span className="ml-3 text-gray-700">Skip for now - I'll set this up later</span>
        </label>
      </div>

      {!skipHierarchy && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <p className="text-gray-500 text-center py-8">
            Hierarchy builder coming soon. For now, skip this step and configure hierarchy in Settings after setup.
          </p>
          {/* TODO: Full hierarchy builder UI in future iteration */}
        </div>
      )}

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
          className="px-6 py-3 rounded-lg font-medium ml-auto bg-blue-600 text-white hover:bg-blue-700"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
