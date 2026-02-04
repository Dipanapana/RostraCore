'use client';

import { useState, useEffect } from 'react';
import { WizardStepProps, IndustryTemplate } from '../../../types/setupWizard';
import { setupWizardApi } from '../../../services/setupWizardApi';

// Icon mapping (using emoji for now, can switch to lucide-react icons later)
const ICONS: Record<string, string> = {
  'shield': '🛡️',
  'utensils': '🍽️',
  'shopping-cart': '🛒',
  'building-columns': '🏛️',
  'heart-handshake': '💝',
  'stethoscope': '🏥',
  'industry': '🏭',
  'graduation-cap': '🎓',
  'truck': '🚚',
  'briefcase': '💼',
};

export function IndustrySelection({ data, onNext }: WizardStepProps) {
  const [templates, setTemplates] = useState<IndustryTemplate[]>([]);
  const [selected, setSelected] = useState<string | null>(data.industry_template_id || null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setupWizardApi.getTemplates()
      .then(setTemplates)
      .finally(() => setIsLoading(false));
  }, []);

  const handleContinue = () => {
    if (selected) {
      onNext({ industry_template_id: selected });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading industries...</div>;
  }

  return (
    <div>
      <p className="text-gray-600 mb-6">
        Select the industry that best matches your business. This determines your default roles, shifts, and compliance requirements.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {templates.map(template => (
          <button
            key={template.template_id}
            onClick={() => setSelected(template.template_id)}
            className={`
              p-4 rounded-lg border-2 text-left transition-all
              ${selected === template.template_id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'}
            `}
          >
            <div className="text-3xl mb-2">{ICONS[template.icon] || '📋'}</div>
            <h3 className="font-semibold text-gray-900">{template.display_name}</h3>
            <p className="text-sm text-gray-500 mt-1">{template.description}</p>
            {template.preview && template.preview.length > 0 && (
              <div className="mt-2 text-xs text-gray-400">
                Roles: {template.preview.map(r => r.display_name).join(', ')}
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!selected}
          className={`
            px-6 py-3 rounded-lg font-medium
            ${selected
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
