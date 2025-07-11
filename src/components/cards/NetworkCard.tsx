import React from 'react';

interface NetworkData {
  connectionType: string;
  ipAddress: string;
  macAddress: string;
  signalStrength?: string;
  ssid?: string;
}

interface NetworkCardProps {
  data: NetworkData;
}

export const NetworkCard: React.FC<NetworkCardProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Network Data</h3>
          <p className="text-gray-600 dark:text-gray-400">Network information is not available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Network Status</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Network connectivity overview</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Connection</span>
          <span className="text-sm text-gray-900 dark:text-white">{data.connectionType}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">IP Address</span>
          <span className="text-sm text-gray-900 dark:text-white font-mono">{data.ipAddress}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">MAC Address</span>
          <span className="text-sm text-gray-900 dark:text-white font-mono">{data.macAddress}</span>
        </div>
        {data.ssid && (
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">SSID</span>
            <span className="text-sm text-gray-900 dark:text-white">{data.ssid}</span>
          </div>
        )}
        {data.signalStrength && (
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Signal</span>
            <span className="text-sm text-gray-900 dark:text-white">{data.signalStrength}</span>
          </div>
        )}
      </div>
    </div>
  );
};
