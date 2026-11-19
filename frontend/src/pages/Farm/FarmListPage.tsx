import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MapPin, Plus, Sprout, Trees } from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { Button } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { FarmRegistrationModal } from './FarmRegistrationModal';
import { PageHeader } from '../../components/common/PageHeader';

export const FarmListPage: React.FC = () => {
  const { farms, farmsLoading } = useFarmer();
  const [isRegisterFarmModalOpen, setIsRegisterFarmModalOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        eyebrow="Farm operations"
        title="My Farms"
        description="View and manage all farms registered to your account."
        icon={<Trees />}
        action={
        <Button
          variant="forest"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsRegisterFarmModalOpen(true)}
          disabled={farmsLoading}
        >
          Register New Farm
        </Button>
        }
      />

      {farmsLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center">
          <Trees className="mx-auto h-9 w-9 animate-pulse text-emerald-700" />
          <p className="mt-3 text-sm text-slate-600">Loading your farms...</p>
        </div>
      ) : farms.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <Sprout className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-4 font-display text-xl font-bold text-slate-900">
            No farms registered yet
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            Register your first farm to start keeping track of its land, crops, and livestock.
          </p>
          <Button
            variant="forest"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsRegisterFarmModalOpen(true)}
            className="mt-5"
          >
            Register New Farm
          </Button>
        </section>
      ) : (
        <>
          <p className="text-sm text-slate-600">
            {farms.length} {farms.length === 1 ? 'farm' : 'farms'} registered
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {farms.map((farm) => (
              <Link
                key={farm.id}
                to={`/farmdetail/${farm.id}`}
                className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-2"
                aria-label={`Open ${farm.name} farm details`}
              >
                <Card
                  isInteractive
                  className="h-full border-slate-200/90 hover:border-emerald-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold text-slate-900">{farm.name}</h2>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                        <MapPin className="h-4 w-4 shrink-0 text-emerald-700" />
                        <span className="truncate">{farm.location || farm.county}</span>
                      </p>
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
                    <div>
                      <span className="block text-xs text-slate-500">Land size</span>
                      <span className="font-semibold text-slate-800">{farm.totalAcres} acres</span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-500">County</span>
                      <span className="font-semibold text-slate-800">{farm.county || 'Not set'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-xs text-slate-500">Main activity</span>
                      <span className="font-semibold capitalize text-slate-800">
                        {farm.primaryEnterprise || 'Not set'}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      <FarmRegistrationModal
        isOpen={isRegisterFarmModalOpen}
        onClose={() => setIsRegisterFarmModalOpen(false)}
      />
    </div>
  );
};
