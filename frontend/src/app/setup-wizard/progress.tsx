'use client';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{id: number; title: string}>;
}

export function ProgressIndicator({ currentStep, totalSteps, steps }: ProgressIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
              ${currentStep > step.id ? 'bg-green-500 text-white' :
                currentStep === step.id ? 'bg-blue-600 text-white' :
                'bg-gray-200 text-gray-500'}
            `}>
              {currentStep > step.id ? '✓' : step.id}
            </div>
            {index < steps.length - 1 && (
              <div className={`w-full h-1 mx-2 ${
                currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
              }`} style={{minWidth: '60px'}} />
            )}
          </div>
        ))}
      </div>
      <div className="text-center">
        <span className="text-sm text-gray-500">Step {currentStep} of {totalSteps}</span>
        <h2 className="text-xl font-semibold">{steps[currentStep - 1]?.title}</h2>
      </div>
    </div>
  );
}
