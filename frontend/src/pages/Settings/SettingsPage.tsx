import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Globe,
  Bell,
  Shield,
  Smartphone,
  User,
  LogOut,
  CheckCircle2,
  Lock,
  Compass,
  AlertTriangle,
  Info,
  Check,
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { Card } from '../../design-system/components/Card';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { Select } from '../../design-system/components/Select';
import { Badge } from '../../design-system/components/Badge';
import { Modal } from '../../design-system/components/Modal';
import { apiService } from '../../services/apiService';
import { FarmerAvatar } from '../../components/common/FarmerAvatar';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    farmer,
    activeFarm,
    updateProfile,
    uploadProfilePicture,
    language,
    toggleLanguage,
    showToast,
  } = useFarmer();

  // Personal Profile Form
  const [fullName, setFullName] = useState(farmer.fullName);
  const [preferredName, setPreferredName] = useState(farmer.preferredName);
  const [phoneNumber, setPhoneNumber] = useState(farmer.phoneNumber);
  const [nationalId, setNationalId] = useState(farmer.nationalIdNumber);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [pictureUploadError, setPictureUploadError] = useState('');
  const pictureInputRef = useRef<HTMLInputElement>(null);

  // Notifications State
  const [smsWeatherEnabled, setSmsWeatherEnabled] = useState(true);
  const [smsOutbreakEnabled, setSmsOutbreakEnabled] = useState(true);
  const [whatsappSummaryEnabled, setWhatsappSummaryEnabled] = useState(false);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      fullName,
      preferredName,
      phoneNumber,
      nationalIdNumber: nationalId,
    });
  };

  const handleProfilePictureChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setPictureUploadError('');
    setIsUploadingPicture(true);
    try {
      await uploadProfilePicture(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not upload profile picture.';
      setPictureUploadError(message);
      showToast(message, 'error');
    } finally {
      setIsUploadingPicture(false);
    }
  };

  const handlePasswordDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast('Please enter both current and new password.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    showToast('Password validation demonstrated. Real password reset will be authenticated via Django backend.', 'info');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#14532D]">
              Platform Configuration · {farmer.county}
            </span>
            <span className="text-slate-300">·</span>
            <Badge variant="forest" size="sm">
              Demonstration Mode
            </Badge>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-7 h-7 text-slate-700" />
            <span>Settings</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Update your profile, language, alerts, and security.
          </p>
        </div>

        <Button
          variant="outline"
          size="md"
          leftIcon={<LogOut className="w-4 h-4 text-red-600" />}
          onClick={() => setIsLogoutModalOpen(true)}
        >
          Sign Out
        </Button>
      </div>

      {/* Backend Integration Note */}
      <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-800 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="block text-slate-900">Account settings:</strong>
          <span className="text-slate-600 leading-relaxed">
            Profile pictures are stored privately and can only be viewed by the signed-in farmer.
            Notification preferences and password changes shown here are demonstrations.
          </span>
        </div>
      </div>

      {/* 1. Farmer Personal Profile */}
      <Card padding="md" className="bg-white border-slate-200 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <User className="w-4 h-4 text-[#14532D]" />
          <h3 className="text-base font-bold text-slate-900">Farmer Personal Profile</h3>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <FarmerAvatar
            imageUrl={farmer.profilePictureUrl}
            initials={farmer.avatarInitials}
            className="h-16 w-16 rounded-2xl bg-[#14532D] text-[#86EFAC] text-lg font-bold flex items-center justify-center"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">Profile picture</p>
            <p className="text-xs text-slate-500">JPEG, PNG, or WebP, up to 5 MB.</p>
            {pictureUploadError && (
              <p className="mt-1 text-xs text-red-700" role="alert">{pictureUploadError}</p>
            )}
          </div>
          <input
            ref={pictureInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void handleProfilePictureChange(event)}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isUploadingPicture}
            onClick={() => pictureInputRef.current?.click()}
          >
            {isUploadingPicture ? 'Uploading…' : farmer.profilePictureUrl ? 'Change picture' : 'Upload picture'}
          </Button>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Official Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="Preferred Greeting Name"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Registered Phone Number (M-Pesa Connected)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
            <Input
              label="Kenyan National ID Number"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Active Farm Parcel: <strong className="text-slate-700">{activeFarm.name}</strong> ({activeFarm.totalAcres} Ac)
            </span>
            <Button type="submit" variant="forest" size="sm">
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* 2. Platform Language & Preferences */}
      <Card padding="md" className="bg-white border-slate-200 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Globe className="w-4 h-4 text-[#16A34A]" />
          <h3 className="text-base font-bold text-slate-900">Platform Language & Localization</h3>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <div>
            <span className="text-xs font-bold text-slate-900 block">System Interface Language</span>
            <span className="text-[11px] text-slate-500">
              Current active language: <strong>{language}</strong>. Switch to adapt agronomic terms to your preferred language.
            </span>
          </div>

          <Button variant="secondary" size="sm" onClick={toggleLanguage}>
            Switch to {language === 'English' ? 'Kiswahili' : 'English'}
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Measurement Units</span>
            <span className="font-bold text-slate-800">Acres (Land) / kg & bags</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Currency</span>
            <span className="font-bold text-slate-800 font-mono">Kenyan Shillings (KES)</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Timezone</span>
            <span className="font-bold text-slate-800">East Africa Time (EAT / UTC+3)</span>
          </div>
        </div>
      </Card>

      {/* 3. Notification & SMS Telemetry Subscriptions */}
      <Card padding="md" className="bg-white border-slate-200 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Bell className="w-4 h-4 text-[#F59E0B]" />
          <h3 className="text-base font-bold text-slate-900">SMS & Notification Subscriptions</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 block">
                Daily Weather & Rainfall Forecast SMS (06:30 AM)
              </span>
              <span className="text-[11px] text-slate-500">
                Delivered daily to {farmer.phoneNumber}. Free for registered smallholder farmers.
              </span>
            </div>
            <button
              onClick={() => {
                setSmsWeatherEnabled(!smsWeatherEnabled);
                showToast(`Daily Weather SMS ${!smsWeatherEnabled ? 'Enabled' : 'Disabled'}.`);
              }}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                smsWeatherEnabled ? 'bg-[#16A34A]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  smsWeatherEnabled ? 'left-6.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 block">
                High-Priority Pest & Disease Outbreak SMS Broadcasts
              </span>
              <span className="text-[11px] text-slate-500">
                Immediate regional warnings from KALRO and Ministry of Agriculture.
              </span>
            </div>
            <button
              onClick={() => {
                setSmsOutbreakEnabled(!smsOutbreakEnabled);
                showToast(`Pest Outbreak SMS ${!smsOutbreakEnabled ? 'Enabled' : 'Disabled'}.`);
              }}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                smsOutbreakEnabled ? 'bg-[#16A34A]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  smsOutbreakEnabled ? 'left-6.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 block">
                Weekly Farm Activity & Lactation Report on WhatsApp
              </span>
              <span className="text-[11px] text-slate-500">
                Weekly PDF summary of milk sales, egg collection, and crop progress.
              </span>
            </div>
            <button
              onClick={() => {
                setWhatsappSummaryEnabled(!whatsappSummaryEnabled);
                showToast(`WhatsApp summaries ${!whatsappSummaryEnabled ? 'Enabled' : 'Disabled'}.`);
              }}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                whatsappSummaryEnabled ? 'bg-[#16A34A]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  whatsappSummaryEnabled ? 'left-6.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* 4. Account Security Demonstration */}
      <Card padding="md" className="bg-white border-slate-200 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Shield className="w-4 h-4 text-slate-700" />
          <h3 className="text-base font-bold text-slate-900">Account Security (Demonstration)</h3>
        </div>

        <form onSubmit={handlePasswordDemoSubmit} className="space-y-4 text-xs">
          <Input
            label="Current Password"
            type="password"
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">
              Note: Password encryption and session tokens will be managed by the Django backend.
            </span>
            <Button type="submit" variant="outline" size="sm">
              Demonstrate Password Update
            </Button>
          </div>
        </form>
      </Card>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <Modal
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          title="Sign Out of AgroLink?"
          description="Are you sure you want to sign out of your AgroLink account?"
          primaryAction={{
            label: 'Sign Out',
            variant: 'danger',
            onClick: async () => {
              setIsLogoutModalOpen(false);
              try {
                await apiService.logout();
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : 'Server sign-out failed.';
                showToast(message, 'warning');
              } finally {
                navigate('/');
              }
            },
          }}
          secondaryAction={{
            label: 'Stay Signed In',
            onClick: () => setIsLogoutModalOpen(false),
          }}
        >
          <div className="text-xs text-slate-600 p-2">
            Signing out clears this browser's authentication tokens.
          </div>
        </Modal>
      )}
    </div>
  );
};
