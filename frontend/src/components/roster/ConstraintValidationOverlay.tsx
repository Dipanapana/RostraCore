'use client'

interface ValidationResult {
  feasible: boolean
  reasons: string[]
  warnings: string[]
  estimated_cost: number
  employee_name: string
  shift_time: string
}

interface ConstraintValidationOverlayProps {
  result: ValidationResult | null
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function ConstraintValidationOverlay({
  result,
  onConfirm,
  onCancel,
  loading,
}: ConstraintValidationOverlayProps) {
  if (!result && !loading) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Validating assignment...</p>
          </div>
        ) : result ? (
          <>
            <div className="flex items-center gap-2 mb-4">
              {result.feasible ? (
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {result.feasible ? 'Assignment Valid' : 'Assignment Blocked'}
                </h3>
                <p className="text-xs text-gray-500">
                  {result.employee_name} - {result.shift_time}
                </p>
              </div>
            </div>

            {result.reasons.length > 0 && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs font-medium text-red-800 mb-1">Constraint Violations:</p>
                <ul className="space-y-1">
                  {result.reasons.map((r, i) => (
                    <li key={i} className="text-xs text-red-700 flex items-start gap-1">
                      <span className="mt-0.5">-</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div className="mb-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs font-medium text-yellow-800 mb-1">Warnings:</p>
                <ul className="space-y-1">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="text-xs text-yellow-700 flex items-start gap-1">
                      <span className="mt-0.5">-</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.feasible && (
              <p className="text-sm text-gray-700 mb-4">
                Estimated cost: <span className="font-semibold">R{result.estimated_cost.toFixed(2)}</span>
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              {result.feasible && (
                <button
                  onClick={onConfirm}
                  className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Assign
                </button>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
