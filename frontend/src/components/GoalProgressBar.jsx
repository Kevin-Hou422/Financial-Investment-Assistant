import React from 'react';

const GoalProgressBar = ({ current, target, deadline }) => {
  const progress = Math.min((current / target) * 100, 100);
  const pct = progress.toFixed(1);
  const color = progress >= 100 ? 'bg-emerald-500' : progress >= 60 ? 'bg-amber-500' : 'bg-indigo-500';
  const textColor = progress >= 100 ? 'text-emerald-400' : progress >= 60 ? 'text-amber-400' : 'text-indigo-400';

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-gray-400">Progress</span>
        <span className={`text-sm font-black ${textColor}`}>{pct}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
        <div
          className={`${color} h-2.5 rounded-full transition-all duration-1000`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>${(current || 0).toLocaleString()}</span>
        <span>Deadline: {deadline}</span>
      </div>
    </div>
  );
};

export default GoalProgressBar;
