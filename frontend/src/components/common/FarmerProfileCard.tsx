import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { Card } from '../../design-system/components/Card';
import { Badge } from '../../design-system/components/Badge';
import { FarmerAvatar } from './FarmerAvatar';

export interface FarmerProfileCardProps {
  compact?: boolean;
  className?: string;
}

export const FarmerProfileCard: React.FC<FarmerProfileCardProps> = ({
  compact = false,
  className = '',
}) => {
  const { farmer, activeFarm } = useFarmer();

  if (compact) {
    return (
      <Link
        to="/farm"
        className={`flex items-center gap-3 w-full p-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/70 transition-all text-left group select-none ${className}`}
        title="View Farm Profile"
      >
        <FarmerAvatar
          imageUrl={farmer.profilePictureUrl}
          initials={farmer.avatarInitials}
          className="w-9 h-9 rounded-xl bg-[#14532D] text-[#86EFAC] font-bold text-sm flex items-center justify-center shrink-0 shadow-xs group-hover:bg-[#16A34A] transition-colors"
        />

        <div className="flex-1 min-w-0 pr-1">
          <span className="text-xs font-bold text-slate-900 block truncate group-hover:text-[#14532D]">
            {farmer.fullName}
          </span>
          <span className="text-[11px] text-slate-500 block truncate flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#16A34A] shrink-0" />
            {activeFarm.name}
          </span>
        </div>
      </Link>
    );
  }

  // Full Expanded Card view (for Settings or Profile modal)
  return (
    <Card padding="md" className={`border-slate-200 bg-white shadow-xs ${className}`}>
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <FarmerAvatar
            imageUrl={farmer.profilePictureUrl}
            initials={farmer.avatarInitials}
            className="w-14 h-14 rounded-2xl bg-[#14532D] text-[#86EFAC] font-extrabold text-lg flex items-center justify-center shrink-0 shadow-sm border border-emerald-800"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {farmer.fullName}
              </h3>
              <Badge variant="forest" size="sm">
                Verified Farmer
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#16A34A]" />
              {activeFarm.location} ({farmer.county})
            </p>
          </div>
        </div>

        <div className="text-right text-xs text-slate-500 sm:self-center">
          <span className="font-mono tabular-nums font-semibold text-slate-700 block">
            ID: {farmer.nationalIdNumber}
          </span>
          <span>Member since {farmer.memberSince}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-slate-100 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Active Farm</span>
          <span className="font-bold text-slate-900 block truncate">{activeFarm.name}</span>
          <span className="text-slate-500 text-[11px]">{activeFarm.totalAcres} Total Acres</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Primary Enterprises</span>
          <span className="font-semibold text-slate-800 block truncate">{activeFarm.primaryEnterprise}</span>
          <span className="text-emerald-700 font-medium text-[11px]">Commercial Grade</span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Soil Composition</span>
          <span className="font-semibold text-slate-800 block truncate">{activeFarm.soilType}</span>
          <span className="text-slate-500 text-[11px]">Tested by KALRO</span>
        </div>
      </div>
    </Card>
  );
};
