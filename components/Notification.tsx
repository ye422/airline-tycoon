
import React from 'react';
import { Info, ExternalLink } from 'lucide-react';

interface NotificationProps {
  message: string;
  onClick?: () => void;
  actionLabel?: string;
}

const Notification: React.FC<NotificationProps> = ({ message, onClick, actionLabel }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        fixed bottom-5 right-5 bg-slate-900 text-white py-3 px-5 rounded-lg shadow-2xl flex items-center space-x-3 z-50
        transition-all duration-300
        ${onClick ? 'cursor-pointer hover:bg-slate-800 hover:scale-105 hover:ring-2 hover:ring-brand-blue-500 ring-offset-2 ring-offset-slate-900' : ''}
        animate-fade-in-out
      `}
    >
      <div className="p-1 bg-brand-blue-900/50 rounded-md">
        <Info className="h-5 w-5 text-brand-blue-400" />
      </div>
      <div className="flex flex-col">
          <span className="text-sm font-medium">{message}</span>
          {actionLabel && (
              <span className="text-[10px] text-brand-blue-400 flex items-center mt-0.5 font-bold uppercase tracking-wider">
                  <ExternalLink size={10} className="mr-1" /> {actionLabel}
              </span>
          )}
      </div>
      
      <style>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(20px); }
          5% { opacity: 1; transform: translateY(0); }
          95% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(20px); }
        }
        .animate-fade-in-out {
          animation: fade-in-out 4s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Notification;
