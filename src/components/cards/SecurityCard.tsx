import React from 'react';

interface SecurityData {
  overallScore: number;
  issues: number;
  compliant: number;
  warnings: number;
  lastScan: string;
}

interface SecurityCardProps {
  data: SecurityData;
}

export const SecurityCard: React.FC<SecurityCardProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Security Data</h3>
          <p className="text-gray-600 dark:text-gray-400">Security information is not available.</p>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Security Score</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Security compliance overview</p>
        </div>
      </div>

      <div className="text-center mb-6">
        <div className={`text-3xl font-bold mb-1 ${getScoreColor(data.overallScore)}`}>
          {data.overallScore}%
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Overall Security Score</div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-lg font-bold text-green-600 dark:text-green-400 mb-1">{data.compliant}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Compliant</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400 mb-1">{data.warnings}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Warnings</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-600 dark:text-red-400 mb-1">{data.issues}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Issues</div>
        </div>
      </div>
    </div>
  );
};
