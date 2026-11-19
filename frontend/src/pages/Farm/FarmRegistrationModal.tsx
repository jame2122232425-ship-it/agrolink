import React, { useEffect, useRef, useState } from 'react';
import { useFarmer } from '../../context/FarmerContext';
import { Input } from '../../design-system/components/Input';
import { Modal } from '../../design-system/components/Modal';
import { Select } from '../../design-system/components/Select';

interface FarmRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FarmRegistrationModal: React.FC<FarmRegistrationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { farmer, addFarm } = useFarmer();
  const [farmName, setFarmName] = useState('');
  const [farmLocation, setFarmLocation] = useState('');
  const [county, setCounty] = useState('');
  const [subCounty, setSubCounty] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [farmingType, setFarmingType] = useState<'mixed' | 'crops' | 'livestock'>('mixed');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFarmName('');
    setFarmLocation('');
    setCounty(farmer.county);
    setSubCounty('');
    setFarmSize('');
    setFarmingType('mixed');
    setIsSubmitting(false);
    setError(null);
  }, [isOpen]);

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const size = Number(farmSize);
    if (!Number.isFinite(size) || size <= 0) {
      setError('Enter a farm size greater than zero.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await addFarm({
        name: farmName.trim(),
        location: farmLocation.trim() || subCounty.trim() || county.trim(),
        county: county.trim(),
        subCounty: subCounty.trim(),
        totalAcres: size,
        primaryEnterprise: farmingType,
      });
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not register this farm. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Register a New Farm"
      description="Add your farm details to start managing its land and activities in AgroLink."
      size="lg"
      primaryAction={{
        label: 'Register Farm',
        variant: 'forest',
        isLoading: isSubmitting,
        onClick: () => formRef.current?.requestSubmit(),
      }}
      secondaryAction={{
        label: 'Cancel',
        onClick: handleClose,
      }}
    >
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="space-y-4"
        autoComplete="off"
        onFocusCapture={() => {
          if (error) setError(null);
        }}
      >
        <Input
          label="Farm name"
          placeholder="e.g. Green Valley Farm"
          value={farmName}
          onChange={(event) => setFarmName(event.target.value)}
          maxLength={150}
          required
          autoFocus
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="County"
            placeholder="e.g. Kakamega"
            value={county}
            onChange={(event) => setCounty(event.target.value)}
            required
            disabled={isSubmitting}
          />
          <Input
            label="Sub-county"
            placeholder="Optional"
            value={subCounty}
            onChange={(event) => setSubCounty(event.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <Input
          label="Farm location or village"
          placeholder="e.g. Shinyalu"
          value={farmLocation}
          onChange={(event) => setFarmLocation(event.target.value)}
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Farm size (acres)"
            type="number"
            min="0.01"
            step="0.01"
            value={farmSize}
            onChange={(event) => setFarmSize(event.target.value)}
            required
            disabled={isSubmitting}
          />
          <Select
            label="Main farming activity"
            value={farmingType}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'mixed' || value === 'crops' || value === 'livestock') {
                setFarmingType(value);
              }
            }}
            disabled={isSubmitting}
            options={[
              { value: 'mixed', label: 'Mixed farming' },
              { value: 'crops', label: 'Crop farming' },
              { value: 'livestock', label: 'Livestock farming' },
            ]}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
};
