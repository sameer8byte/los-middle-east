import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../common/ui/card";
import { getUsersByOnboardingStep } from "../../../shared/services/api/dashboard.api";
import { DashboardQuery, UsersByOnboardingStepResponse } from "../types/dashboard.types";

interface UsersByOnboardingStepCardProps {
  readonly query: DashboardQuery;
  readonly loading?: boolean;
}

export function UsersByOnboardingStepCard({ query, loading: parentLoading }: UsersByOnboardingStepCardProps) {
  const { brandId } = useParams();
  const [data, setData] = useState<UsersByOnboardingStepResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!brandId) return;

      try {
        setLoading(true);
        setError(null);
        const response = await getUsersByOnboardingStep(brandId, query);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch users by onboarding step");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [brandId, query]);

  const isLoading = loading || parentLoading;

  const getStepColor = (step: number) => {
    if (step <= 3) return "bg-red-500";
    if (step <= 7) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getProgressColor = (step: number) => {
    if (step <= 3) return "bg-red-100 text-red-800";
    if (step <= 7) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  const renderOnboardingSteps = () => {
    if (!data?.usersByStep.length) {
      return <div className="text-gray-500 text-sm">No onboarding data available</div>;
    }

    return (
      <div className="space-y-3">
        {/* Completion Rate Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-blue-900">Overall Completion Rate</span>
            <span className="text-lg font-bold text-blue-900">{data.completionRate}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${data.completionRate}%` }}
            />
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {data.usersByStep.map((stepData) => (
            <div key={stepData.step} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 ${getStepColor(stepData.step)} text-white rounded-full flex items-center justify-center text-xs font-bold`}>
                  {stepData.step}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900">{stepData.stepLabel}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-20 bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${stepData.percentage}%` }}
                      />
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getProgressColor(stepData.step)}`}>
                      {stepData.percentage}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-semibold text-gray-900">{stepData.userCount}</div>
                <div className="text-xs text-gray-500">users</div>
              </div>
            </div>
          ))}
        </div>

        {/* Drop-off Analysis */}
        {/* {data.usersByStep.length > 1 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Funnel Drop-off Analysis</h4>
            <div className="space-y-1 text-xs">
              {(() => {
                // Sort steps to ensure proper sequential order
                const sortedSteps = [...data.usersByStep].sort((a, b) => a.step - b.step);
                const dropoffs = [];
                
                for (let i = 0; i < sortedSteps.length - 1; i++) {
                  const currentStep = sortedSteps[i];
                  const nextStep = sortedSteps[i + 1];
                  
                  // Calculate drop-off between consecutive steps in the funnel
                  const usersWhoLeft = currentStep.userCount - nextStep.userCount;
                  
                  // Only show if there's actual user loss and both steps have users
                  if (usersWhoLeft > 0 && currentStep.userCount > 0) {
                    const dropoffRate = ((usersWhoLeft / currentStep.userCount) * 100).toFixed(1);
                    
                    dropoffs.push(
                      <div key={`${currentStep.step}-${nextStep.step}`} className="flex justify-between items-center text-gray-600">
                        <span className="flex-1">{currentStep.stepLabel} → {nextStep.stepLabel}</span>
                        <div className="text-right">
                          <span className="font-medium text-red-600">{dropoffRate}%</span>
                          <div className="text-gray-500">({usersWhoLeft} users)</div>
                        </div>
                      </div>
                    );
                  }
                }
                
                return dropoffs.length > 0 ? dropoffs : (
                  <div className="text-gray-500 italic">Perfect funnel! No user drop-offs detected.</div>
                );
              })()}
            </div>
          </div>
        )} */}
      </div>
    );
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">User Onboarding Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 text-sm">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">User Onboarding Progress</CardTitle>
          {data && (
            <div className="flex gap-3 text-sm text-gray-600">
              <span>Users: <strong>{data.totalUsers.toLocaleString()}</strong></span>
              <span>Steps: <strong>{data.totalSteps}</strong></span>
              <span>Completion: <strong>{data.completionRate}%</strong></span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-gray-200 rounded-lg" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {renderOnboardingSteps()}
            {/* Compact Disclosure */}
            <div className="text-xs text-gray-500 mt-3 p-2 bg-gray-50 rounded border-l-2 border-purple-200">
              <strong>Note:</strong> Shows user distribution across onboarding steps. Completion rate = users who reached final step. Step colors: Red (1-3), Yellow (4-7), Green (8+). Data for selected period only.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
