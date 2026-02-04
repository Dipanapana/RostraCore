'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProgressIndicator } from './progress';
import { IndustrySelection } from './steps/IndustrySelection';
import { CompanyDetails } from './steps/CompanyDetails';
import { HierarchySetup } from './steps/HierarchySetup';
import { UserSetup } from './steps/UserSetup';
import { Confirmation } from './steps/Confirmation';
import { WizardData } from '../../types/setupWizard';
import { setupWizardApi } from '../../services/setupWizardApi';

const STEPS = [
  { id: 1, title: 'Choose Your Industry', component: IndustrySelection },
  { id: 2, title: 'Company Details', component: CompanyDetails },
  { id: 3, title: 'Organization Structure', component: HierarchySetup },
  { id: 4, title: 'Admin Account', component: UserSetup },
  { id: 5, title: 'Review & Confirm', component: Confirmation },
];

export default function SetupWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>({});
  const [draftOrgId, setDraftOrgId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for resume parameter
  useEffect(() => {
    const resumeId = searchParams.get('resume');
    if (resumeId) {
      setupWizardApi.resumeWizard(parseInt(resumeId))
        .then(response => {
          setDraftOrgId(response.org_id);
          setCurrentStep(response.last_step);
          // Reconstruct data from saved steps
          const savedData: WizardData = {};
          Object.entries(response.data).forEach(([key, value]) => {
            if (key.startsWith('step_')) {
              Object.assign(savedData, value as object);
            }
          });
          setData(savedData);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [searchParams]);

  const handleNext = async (stepData: Partial<WizardData>) => {
    const newData = { ...data, ...stepData };
    setData(newData);

    // Save draft (except on final step - that uses complete endpoint)
    if (currentStep < STEPS.length) {
      try {
        const result = await setupWizardApi.saveDraft(currentStep, stepData, draftOrgId || undefined);
        if (!draftOrgId) {
          setDraftOrgId(result.org_id);
        }
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - complete wizard
      try {
        const result = await setupWizardApi.completeSetup(newData as WizardData, draftOrgId || undefined);
        // Store token and redirect to dashboard
        localStorage.setItem('access_token', result.access_token);
        router.push('/dashboard?welcome=true');
      } catch (error: any) {
        alert(error.response?.data?.detail || 'Setup failed');
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const CurrentStepComponent = STEPS[currentStep - 1].component;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to RostraCore</h1>
          <p className="text-gray-600 mt-2">Let's set up your workforce management system</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <ProgressIndicator
            currentStep={currentStep}
            totalSteps={STEPS.length}
            steps={STEPS}
          />

          <CurrentStepComponent
            data={data}
            onNext={handleNext}
            onBack={currentStep > 1 ? handleBack : undefined}
          />
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Your progress is automatically saved. You can close this and resume anytime.
        </p>
      </div>
    </div>
  );
}
