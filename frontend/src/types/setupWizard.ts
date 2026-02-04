export interface IndustryTemplate {
  template_id: string;
  display_name: string;
  description: string;
  icon: string;
  preview: Array<{id: string; display_name: string}>;
}

export interface HierarchyNode {
  name: string;
  type: 'organization' | 'division' | 'location' | 'department';
  code?: string;
  children?: HierarchyNode[];
}

export interface WizardData {
  // Step 1
  industry_template_id?: string;
  // Step 2
  company_name?: string;
  org_code?: string;
  billing_email?: string;
  // Step 3
  hierarchy_nodes?: HierarchyNode[];
  skip_hierarchy?: boolean;
  // Step 4
  admin_email?: string;
  admin_full_name?: string;
  admin_password?: string;
}

export interface WizardStepProps {
  data: WizardData;
  onNext: (stepData: Partial<WizardData>) => void;
  onBack?: () => void;
}
