import React from 'react';
import type { GroundingSource } from '../../types';

interface SourceListProps {
  sources: GroundingSource[];
}

export const SourceList: React.FC<SourceListProps> = ({ sources }) => {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200 dark:bg-gray-800 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-brand-green mb-3 dark:text-brand-light-green">Sources</h3>
      <ul className="list-disc list-inside space-y-2">
        {sources.map((source, index) => (
          <li key={index} className="text-sm dark:text-gray-300">
            <a
              href={source.web.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-light-green hover:text-brand-green hover:underline dark:hover:text-green-300"
            >
              {source.web.title || source.web.uri}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};