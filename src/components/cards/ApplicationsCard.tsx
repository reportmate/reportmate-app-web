import React from 'react';

interface ApplicationsData {
  totalApps: number;
  installedApps: number;
  recentlyUpdated: number;
}

interface ApplicationsCardProps {
  data: ApplicationsData;
}

export const ApplicationsCard: React.FC<ApplicationsCardProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Application Data</h3>
          <p className="text-gray-600 dark:text-gray-400">Application information is not available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Applications</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Installed application summary</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{data.totalApps}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Total Apps</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">{data.installedApps}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Installed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">{data.recentlyUpdated}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Recent</div>
        </div>
      </div>
    </div>
  );
};
