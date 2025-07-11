import React from 'react';

interface ProfileInfo {
  id: string;
  name: string;
  identifier: string;
  type: string;
  installDate: string;
  organization?: string;
  description?: string;
  payloads: number;
}

interface ProfilesData {
  totalProfiles: number;
  systemProfiles: number;
  userProfiles: number;
  profiles: ProfileInfo[];
}

interface ProfilesCardProps {
  data: ProfilesData;
}

export const ProfilesCard: React.FC<ProfilesCardProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Profile Data</h3>
          <p className="text-gray-600 dark:text-gray-400">Configuration profile information is not available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configuration Profiles</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">MDM configuration profile summary</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{data.totalProfiles}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Total Profiles</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">{data.systemProfiles}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">System</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">{data.userProfiles}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">User</div>
        </div>
      </div>
    </div>
  );
};
