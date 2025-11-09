"use client";

/**
 * 5-Step Onboarding Flow
 *
 * Guided setup process to help new users activate their account
 * Based on psychological principle: Commitment & Consistency
 *
 * Steps:
 * 1. Add 3 employees
 * 2. Create 1 site
 * 3. Generate first roster
 * 4. Invite team members
 * 5. Connect accounting (optional)
 */

import React, { useState } from 'react';
import { Button, Card, Input } from '@/design-system/components';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
  skippable: boolean;
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showConfetti, setShowConfetti] = useState(false);

  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 1,
      title: 'Add Your First 3 Employees',
      description: 'Add at least 3 guards or supervisors to get started with rostering',
      icon: '👥',
      completed: false,
      skippable: false,
    },
    {
      id: 2,
      title: 'Create Your First Site',
      description: 'Add a client site where your guards will be deployed',
      icon: '📍',
      completed: false,
      skippable: false,
    },
    {
      id: 3,
      title: 'Generate Your First Roster',
      description: 'See the magic happen - create your first automated roster in 60 seconds',
      icon: '📅',
      completed: false,
      skippable: false,
    },
    {
      id: 4,
      title: 'Invite Your Team',
      description: 'Invite supervisors and admins to collaborate',
      icon: '✉️',
      completed: false,
      skippable: true,
    },
    {
      id: 5,
      title: 'Connect Accounting Software',
      description: 'Optional: Connect Sage, Xero, or Pastel for seamless payroll',
      icon: '💰',
      completed: false,
      skippable: true,
    },
  ]);

  // Form state for each step
  const [step1Data, setStep1Data] = useState({
    employees: [
      { firstName: '', lastName: '', idNumber: '', phone: '' },
      { firstName: '', lastName: '', idNumber: '', phone: '' },
      { firstName: '', lastName: '', idNumber: '', phone: '' },
    ],
  });

  const [step2Data, setStep2Data] = useState({
    siteName: '',
    clientName: '',
    address: '',
    guardsRequired: 1,
  });

  const [step4Data, setStep4Data] = useState({
    emails: ['', ''],
  });

  const markStepComplete = (stepId: number) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, completed: true } : step
      )
    );

    if (stepId === 5) {
      // All steps done - celebrate!
      setShowConfetti(true);
      setTimeout(() => {
        window.location.href = '/admin/dashboard';
      }, 3000);
    } else {
      setCurrentStep(stepId + 1);
    }
  };

  const skipStep = (stepId: number) => {
    if (steps.find((s) => s.id === stepId)?.skippable) {
      setCurrentStep(stepId + 1);
    }
  };

  const progress = (steps.filter((s) => s.completed).length / steps.length) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">{steps[0].icon}</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {steps[0].title}
              </h2>
              <p className="text-gray-600">{steps[0].description}</p>
            </div>

            <div className="space-y-6">
              {step1Data.employees.map((emp, index) => (
                <Card key={index} variant="outlined" padding="md">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Employee {index + 1}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      placeholder="e.g., Sipho"
                      value={emp.firstName}
                      onChange={(e) => {
                        const newEmployees = [...step1Data.employees];
                        newEmployees[index].firstName = e.target.value;
                        setStep1Data({ employees: newEmployees });
                      }}
                      required
                    />
                    <Input
                      label="Last Name"
                      placeholder="e.g., Dlamini"
                      value={emp.lastName}
                      onChange={(e) => {
                        const newEmployees = [...step1Data.employees];
                        newEmployees[index].lastName = e.target.value;
                        setStep1Data({ employees: newEmployees });
                      }}
                      required
                    />
                    <Input
                      label="ID Number"
                      placeholder="13-digit SA ID"
                      type="tel"
                      value={emp.idNumber}
                      onChange={(e) => {
                        const newEmployees = [...step1Data.employees];
                        newEmployees[index].idNumber = e.target.value;
                        setStep1Data({ employees: newEmployees });
                      }}
                      required
                    />
                    <Input
                      label="Phone Number"
                      placeholder="e.g., 0821234567"
                      type="tel"
                      value={emp.phone}
                      onChange={(e) => {
                        const newEmployees = [...step1Data.employees];
                        newEmployees[index].phone = e.target.value;
                        setStep1Data({ employees: newEmployees });
                      }}
                      required
                    />
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex justify-between items-center pt-6">
              <div className="text-sm text-gray-500">
                Don't worry, you can add more employees later
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={() => markStepComplete(1)}
                disabled={!step1Data.employees.every(
                  (e) => e.firstName && e.lastName && e.idNumber
                )}
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">{steps[1].icon}</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {steps[1].title}
              </h2>
              <p className="text-gray-600">{steps[1].description}</p>
            </div>

            <Card variant="outlined" padding="lg">
              <div className="space-y-6">
                <Input
                  label="Site Name"
                  placeholder="e.g., Main Entrance Gate"
                  value={step2Data.siteName}
                  onChange={(e) =>
                    setStep2Data({ ...step2Data, siteName: e.target.value })
                  }
                  helpText="Give this site a memorable name"
                  required
                />

                <Input
                  label="Client Name"
                  placeholder="e.g., Sandton Shopping Centre"
                  value={step2Data.clientName}
                  onChange={(e) =>
                    setStep2Data({ ...step2Data, clientName: e.target.value })
                  }
                  required
                />

                <Input
                  label="Address"
                  placeholder="e.g., 123 Main Street, Johannesburg"
                  value={step2Data.address}
                  onChange={(e) =>
                    setStep2Data({ ...step2Data, address: e.target.value })
                  }
                  required
                />

                <Input
                  label="Guards Required"
                  type="number"
                  min={1}
                  value={step2Data.guardsRequired}
                  onChange={(e) =>
                    setStep2Data({
                      ...step2Data,
                      guardsRequired: Number(e.target.value),
                    })
                  }
                  helpText="How many guards are needed at this site?"
                  required
                />
              </div>
            </Card>

            <div className="flex justify-between items-center pt-6">
              <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => markStepComplete(2)}
                disabled={
                  !step2Data.siteName ||
                  !step2Data.clientName ||
                  !step2Data.address
                }
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">{steps[2].icon}</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {steps[2].title}
              </h2>
              <p className="text-gray-600">{steps[2].description}</p>
            </div>

            <Card variant="elevated" padding="lg" className="bg-gradient-to-br from-primary-50 to-accent-50">
              <div className="text-center space-y-6">
                <div className="text-5xl">🎉</div>
                <h3 className="text-2xl font-bold text-gray-900">
                  You're ready to create your first roster!
                </h3>
                <p className="text-gray-700">
                  Click below and watch as RostraCore automatically generates an
                  optimized roster based on:
                </p>

                <ul className="text-left max-w-md mx-auto space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-success-500 flex-shrink-0">✓</span>
                    <span className="text-gray-700">
                      Your employees' availability and skills
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-success-500 flex-shrink-0">✓</span>
                    <span className="text-gray-700">
                      PSIRA compliance and overtime limits
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-success-500 flex-shrink-0">✓</span>
                    <span className="text-gray-700">
                      Site requirements and shift patterns
                    </span>
                  </li>
                </ul>

                <div className="bg-white rounded-xl p-6 border-2 border-accent-200">
                  <p className="text-4xl font-extrabold text-accent-600 mb-2">
                    60 seconds
                  </p>
                  <p className="text-gray-600">
                    That's all it takes vs. 4 hours manually
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex justify-between items-center pt-6">
              <Button variant="ghost" onClick={() => setCurrentStep(2)}>
                Back
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => markStepComplete(3)}
                rightIcon={
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                }
              >
                Generate Roster
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">{steps[3].icon}</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {steps[3].title}
              </h2>
              <p className="text-gray-600">{steps[3].description}</p>
            </div>

            <Card variant="outlined" padding="lg">
              <div className="space-y-6">
                {step4Data.emails.map((email, index) => (
                  <Input
                    key={index}
                    label={`Team Member ${index + 1} Email`}
                    type="email"
                    placeholder="colleague@example.com"
                    value={email}
                    onChange={(e) => {
                      const newEmails = [...step4Data.emails];
                      newEmails[index] = e.target.value;
                      setStep4Data({ emails: newEmails });
                    }}
                    helpText={
                      index === 0
                        ? 'They'll receive an invitation to join your workspace'
                        : undefined
                    }
                  />
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setStep4Data({ emails: [...step4Data.emails, ''] })
                  }
                >
                  + Add Another Team Member
                </Button>
              </div>
            </Card>

            <div className="flex justify-between items-center pt-6">
              <Button
                variant="ghost"
                onClick={() => skipStep(4)}
              >
                Skip for Now
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => markStepComplete(4)}
                disabled={!step4Data.emails.some((e) => e)}
              >
                Send Invitations
              </Button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">{steps[4].icon}</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {steps[4].title}
              </h2>
              <p className="text-gray-600">{steps[4].description}</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {['Sage', 'Xero', 'Pastel'].map((software) => (
                <Card
                  key={software}
                  variant="outlined"
                  padding="md"
                  hoverable
                  onClick={() => {
                    alert(`Connecting to ${software}...`);
                  }}
                  className="cursor-pointer text-center"
                >
                  <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-500">
                      {software.charAt(0)}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{software}</h3>
                  <p className="text-sm text-gray-600">
                    Connect in 2 minutes
                  </p>
                </Card>
              ))}
            </div>

            <Card variant="default" padding="lg" className="bg-primary-50">
              <div className="flex items-start gap-4">
                <div className="text-3xl">💡</div>
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">
                    Connect later from Settings
                  </h4>
                  <p className="text-sm text-gray-700">
                    You can always connect your accounting software later. It's
                    optional but saves time on payroll.
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex justify-between items-center pt-6">
              <Button
                variant="ghost"
                onClick={() => skipStep(5)}
              >
                Skip for Now
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => markStepComplete(5)}
              >
                Finish Setup
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (showConfetti) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-success-500 to-primary-500 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="text-8xl mb-8 animate-bounce">🎉</div>
          <h1 className="text-5xl font-extrabold mb-4">
            Congratulations!
          </h1>
          <p className="text-2xl mb-8">
            Your RostraCore account is all set up
          </p>
          <div className="text-lg">
            Redirecting to your dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome to RostraCore
            </h1>
            <div className="text-sm font-medium text-gray-600">
              Step {currentStep} of 5
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="relative">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Step Dots */}
            <div className="flex justify-between mt-4">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className="flex flex-col items-center gap-2"
                >
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      transition-all duration-300
                      ${
                        step.completed
                          ? 'bg-success-500 text-white'
                          : step.id === currentStep
                          ? 'bg-primary-500 text-white ring-4 ring-primary-100'
                          : 'bg-gray-200 text-gray-500'
                      }
                    `}
                  >
                    {step.completed ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <span className="text-sm font-bold">{step.id}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 hidden md:block max-w-[80px] text-center">
                    {step.title.split(' ').slice(0, 2).join(' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step Content */}
        <Card variant="elevated" padding="lg">
          {renderStepContent()}
        </Card>
      </div>
    </div>
  );
}
