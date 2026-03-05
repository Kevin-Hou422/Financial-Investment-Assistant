import React from 'react';

const GoalProgressBar = ({ current, target, deadline }) => {
  const progress = Math.min((current / target) * 100, 100).toFixed(1);
  
  return (
    <div className="glass-card p-5 bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-semibold text-slate-700">Goal: Financial Independence</span>
        <span className="text-sm font-bold text-indigo-600">{progress}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-3">
        <div 
          className="bg-indigo-600 h-3 rounded-full transition-all duration-1000" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="flex justify-between mt-3 text-xs text-slate-400">
        <span>Target: ${target.toLocaleString()}</span>
        <span>Deadline: {deadline}</span>
      </div>
    </div>
  );
};

export default GoalProgressBar;