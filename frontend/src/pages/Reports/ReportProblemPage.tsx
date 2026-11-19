import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertOctagon,
  Camera,
  Upload,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Clock,
  AlertTriangle,
  Layers,
  Eye,
  Info,
  X,
  ShieldAlert,
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { DataStateBanner } from '../../components/common/DataStateBanner';
import { Card } from '../../design-system/components/Card';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { Select } from '../../design-system/components/Select';
import { Badge } from '../../design-system/components/Badge';
import { Modal } from '../../design-system/components/Modal';
import { EmptyState } from '../../design-system/components/EmptyState';
import { ProblemReport } from '../../data/farmerData';
import { apiService, ApiReportEvidence, ApiReportUpdate } from '../../services/apiService';
import { formatDisplayDate } from '../../services/farmDataMappers';

export const ReportProblemPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    farmer,
    activeFarm,
    reports,
    submitReport,
    plots,
    crops,
    livestock,
    animals,
  } = useFarmer();

  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');
  const [viewingReport, setViewingReport] = useState<ProblemReport | null>(null);
  const [reportUpdates, setReportUpdates] = useState<ApiReportUpdate[]>([]);
  const [reportEvidence, setReportEvidence] = useState<ApiReportEvidence[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [updatesError, setUpdatesError] = useState<string | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  // Form State
  const [reportArea, setReportArea] = useState<'crops' | 'livestock'>('crops');
  const [category, setCategory] = useState<ProblemReport['category']>('crop');
  const [selectedCropId, setSelectedCropId] = useState('');
  const [selectedLivestockTarget, setSelectedLivestockTarget] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [affectedItem, setAffectedItem] = useState('');
  const [plotOrLocation, setPlotOrLocation] = useState(plots[0]?.name || '');
  const [severity, setSeverity] = useState<ProblemReport['severity']>('medium');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successSubmitted, setSuccessSubmitted] = useState<ProblemReport | null>(null);

  useEffect(() => {
    if (searchParams.get('tab') === 'history') {
      setActiveTab('history');
    }
  }, [searchParams]);

  useEffect(() => {
    const reportId = searchParams.get('report');
    if (!reportId) return;
    const report = reports.find((item) => String(item.backendId ?? item.id) === reportId);
    if (report) {
      setActiveTab('history');
      setViewingReport(report);
    }
  }, [reports, searchParams]);

  const openTab = (tab: 'submit' | 'history') => {
    setActiveTab(tab);
    if (tab === 'history') {
      setSearchParams({ tab: 'history' }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  useEffect(() => {
    if (!plotOrLocation && plots.length > 0) {
      setPlotOrLocation(plots[0].name);
    }
  }, [plots, plotOrLocation]);

  const handleReportAreaChange = (area: 'crops' | 'livestock') => {
    setReportArea(area);
    setCategory(area === 'crops' ? 'crop' : 'livestock');
    setSelectedCropId('');
    setSelectedLivestockTarget('');
    setAffectedItem('');
  };

  const handleCropSelection = (cropId: string) => {
    setSelectedCropId(cropId);
    const selectedCrop = crops.find((crop) => crop.id === cropId);
    if (!selectedCrop) {
      setAffectedItem('');
      return;
    }

    setAffectedItem(
      `${selectedCrop.name}${selectedCrop.variety ? ` (${selectedCrop.variety})` : ''}`,
    );
    const cropPlot = plots.find(
      (plot) =>
        plot.name === selectedCrop.plotName || plot.plotNumber === selectedCrop.plotName,
    );
    if (cropPlot) {
      setPlotOrLocation(cropPlot.name);
    }
  };

  const handleLivestockTargetSelection = (value: string) => {
    setSelectedLivestockTarget(value);
    if (!value) {
      setAffectedItem('');
      return;
    }

    const [targetType, targetId] = value.split(':');
    if (targetType === 'group') {
      const group = livestock.find((item) => item.id === targetId);
      setAffectedItem(
        group ? `${group.category} group${group.subType ? ` (${group.subType})` : ''}` : '',
      );
      return;
    }

    const animal = animals.find((item) => item.id === targetId);
    setAffectedItem(
      animal
        ? `${animal.name || animal.tagNumber} (${animal.species || animal.category})`
        : '',
    );
  };

  useEffect(() => {
    const reportId = viewingReport?.backendId;
    if (reportId === undefined) {
      setReportUpdates([]);
      setReportEvidence([]);
      setUpdatesLoading(false);
      setUpdatesError(null);
      setEvidenceLoading(false);
      setEvidenceError(null);
      return;
    }

    let isCurrent = true;
    setReportUpdates([]);
    setReportEvidence([]);
    setUpdatesLoading(true);
    setEvidenceLoading(true);
    setUpdatesError(null);
    Promise.allSettled([
      apiService.getReportUpdates(reportId),
      apiService.getReportEvidence(reportId),
    ]).then(([updatesResult, evidenceResult]) => {
      if (!isCurrent) return;
      if (updatesResult.status === 'fulfilled') {
        setReportUpdates(updatesResult.value);
      } else {
        setUpdatesError(updatesResult.reason instanceof Error ? updatesResult.reason.message : 'Could not load staff replies.');
      }
      if (evidenceResult.status === 'fulfilled') {
        setReportEvidence(evidenceResult.value);
      } else {
        setEvidenceError(evidenceResult.reason instanceof Error ? evidenceResult.reason.message : 'Could not load report images.');
      }
      setUpdatesLoading(false);
      setEvidenceLoading(false);
    });

    return () => {
      isCurrent = false;
    };
  }, [viewingReport?.backendId]);

  // Handle Image Upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleClearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      const newReport = await submitReport(
        {
          category,
          cropId: reportArea === 'crops' ? selectedCropId || undefined : undefined,
          livestockGroupId:
            reportArea === 'livestock' && selectedLivestockTarget.startsWith('group:')
              ? selectedLivestockTarget.slice('group:'.length)
              : undefined,
          animalId:
            reportArea === 'livestock' && selectedLivestockTarget.startsWith('animal:')
              ? selectedLivestockTarget.slice('animal:'.length)
              : undefined,
          title: title || `${category.toUpperCase()} Issue on ${affectedItem}`,
          description,
          affectedItem,
          plotOrLocation,
          severity,
          imageUrl: imagePreview || undefined,
        },
        imageFile,
      );

      setSuccessSubmitted(newReport);
      // Reset form fields
      setTitle('');
      setDescription('');
      setImageFile(null);
      setImagePreview(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityBadge = (sev: ProblemReport['severity']) => {
    switch (sev) {
      case 'critical':
        return <Badge variant="error">Critical Outbreak</Badge>;
      case 'high':
        return <Badge variant="error">High Priority</Badge>;
      case 'medium':
        return <Badge variant="harvest">Medium Priority</Badge>;
      case 'low':
        return <Badge variant="neutral">Low / Routine</Badge>;
    }
  };

  const getStatusBadge = (status: ProblemReport['status']) => {
    switch (status) {
      case 'Resolved':
        return <Badge variant="success">Resolved</Badge>;
      case 'Referred':
        return <Badge variant="info">Referred to Officer</Badge>;
      case 'Under Review':
        return <Badge variant="harvest">Under Review</Badge>;
      case 'Submitted':
        return <Badge variant="neutral">Submitted</Badge>;
    }
  };

  if (!activeFarm.id) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <FileText className="mx-auto h-10 w-10 text-slate-400" />
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">No farm registered</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
          Reports can be submitted after a farm is registered to this account.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150">
      <DataStateBanner collection="reports" />
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#14532D]">
              Sub-County Agricultural Triage{activeFarm.county ? ` · ${activeFarm.county}` : ''}
            </span>
            <span className="text-slate-300">·</span>
            <Badge variant="forest" size="sm">
              Farm report tracking
            </Badge>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertOctagon className="w-7 h-7 text-red-600" />
            <span>Report a Problem</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Report crop, livestock, pest, or soil issues.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => openTab('submit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'submit' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Submit New Ticket
          </button>
          <button
            onClick={() => openTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ticket History ({reports.length})
          </button>
        </div>
      </div>

      {/* Scope Disclaimer */}
      <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="block">Report submission and visibility:</strong>
          <span className="text-amber-900 leading-relaxed">
            Reports are saved to your AgroLink account and appear in report oversight for authorized staff.
            New submissions are available to case coordinators in the unassigned queue. This is not an emergency service
            and does not replace professional advice.
          </span>
        </div>
      </div>

      {/* VIEW 1: Submit Form */}
      {activeTab === 'submit' && (
        <div className="max-w-3xl mx-auto space-y-6">
          {successSubmitted ? (
            <Card padding="lg" className="border-emerald-200 bg-emerald-50/30 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-[#14532D] flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8 text-[#16A34A]" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-[#14532D] uppercase tracking-wider block">
                  Ticket #{successSubmitted.ticketNumber} Generated
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  Problem Report Logged Successfully
                </h3>
              </div>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Your report for <strong>{successSubmitted.affectedItem}</strong> has been logged into your Farm Activity Ledger.
                Status is marked as <strong>{successSubmitted.status}</strong>.
              </p>
              <div className="pt-2 flex items-center justify-center gap-3">
                <Button variant="primary" size="md" onClick={() => setSuccessSubmitted(null)}>
                  Submit Another Report
                </Button>
                <Button variant="outline" size="md" onClick={() => openTab('history')}>
                  View Ticket History
                </Button>
              </div>
            </Card>
          ) : (
            <form onSubmit={handleSubmit}>
              <Card padding="md" className="bg-white border-slate-200 shadow-xs space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <FileText className="w-4 h-4 text-[#14532D]" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Field Problem Details & Symptom Observations
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Select
                    label="What is the problem about?"
                    value={reportArea}
                    onChange={(e) =>
                      handleReportAreaChange(e.target.value as 'crops' | 'livestock')
                    }
                    options={[
                      { value: 'crops', label: 'Crops and fields' },
                      { value: 'livestock', label: 'Livestock and animals' },
                    ]}
                  />

                  {reportArea === 'crops' ? (
                    <Select
                      label="Problem Category"
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as ProblemReport['category'])
                      }
                      options={[
                        { value: 'crop', label: 'Crop health' },
                        { value: 'pest', label: 'Pest infestation' },
                        { value: 'disease', label: 'Suspected crop disease' },
                        { value: 'soil', label: 'Soil health' },
                        { value: 'water', label: 'Water and irrigation' },
                        { value: 'other', label: 'Other farm issue' },
                      ]}
                    />
                  ) : (
                    <div className="space-y-1">
                      <span className="block text-xs font-semibold text-slate-700">
                        Problem Category
                      </span>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700">
                        Livestock health
                      </div>
                    </div>
                  )}

                  <Select
                    label="Severity Assessment"
                    value={severity}
                    onChange={(e) =>
                      setSeverity(e.target.value as ProblemReport['severity'])
                    }
                    options={[
                      {
                        value: 'low',
                        label:
                          reportArea === 'livestock'
                            ? 'Low — One animal with mild signs'
                            : 'Low — Few plants or early stage',
                      },
                      {
                        value: 'medium',
                        label:
                          reportArea === 'livestock'
                            ? 'Medium — Several animals affected'
                            : 'Medium — Noticeable spread across a section',
                      },
                      {
                        value: 'high',
                        label:
                          reportArea === 'livestock'
                            ? 'High — Serious illness or rapid spread'
                            : 'High — Significant damage or yield risk',
                      },
                      {
                        value: 'critical',
                        label:
                          reportArea === 'livestock'
                            ? 'Critical — Life-threatening or rapidly spreading'
                            : 'Critical — Rapid outbreak or urgent quarantine risk',
                      },
                    ]}
                  />
                </div>

                {reportArea === 'crops' ? (
                  <div className="space-y-3">
                    <Select
                      label="Select a Registered Crop (optional)"
                      value={selectedCropId}
                      onChange={(e) => handleCropSelection(e.target.value)}
                      options={[
                        {
                          value: '',
                          label:
                            crops.length > 0
                              ? 'Choose a crop or enter one below'
                              : 'No crops registered yet',
                        },
                        ...crops.map((crop) => ({
                          value: crop.id,
                          label: `${crop.name}${crop.variety ? ` · ${crop.variety}` : ''}`,
                        })),
                      ]}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Affected Crop, Field, or Asset"
                        placeholder="e.g. Plot 3 Anna F1 tomatoes"
                        value={affectedItem}
                        onChange={(e) => setAffectedItem(e.target.value)}
                        required
                      />
                      <Select
                        label="Farm Plot / Farm Unit"
                        value={plotOrLocation}
                        onChange={(e) => {
                          const nextPlot = e.target.value;
                          setPlotOrLocation(nextPlot);
                          const selectedCrop = crops.find(
                            (crop) => crop.id === selectedCropId,
                          );
                          if (
                            selectedCrop &&
                            selectedCrop.plotName !== nextPlot &&
                            !nextPlot.startsWith(`${selectedCrop.plotName}:`)
                          ) {
                            setSelectedCropId('');
                          }
                        }}
                        options={plots.map((p) => ({
                          value: p.name,
                          label: `${p.plotNumber}: ${p.name} (${p.acres} Ac)`,
                        }))}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Select
                      label="Select a Registered Herd, Flock, or Animal (optional)"
                      value={selectedLivestockTarget}
                      onChange={(e) => handleLivestockTargetSelection(e.target.value)}
                      options={[
                        {
                          value: '',
                          label:
                            livestock.length > 0 || animals.length > 0
                              ? 'Choose livestock or describe it below'
                              : 'No livestock registered yet',
                        },
                        ...livestock.map((group) => ({
                          value: `group:${group.id}`,
                          label: `${group.category} group${group.subType ? ` · ${group.subType}` : ''} (${group.count})`,
                        })),
                        ...animals.map((animal) => ({
                          value: `animal:${animal.id}`,
                          label: `${animal.name || animal.tagNumber} · ${animal.species || animal.category}`,
                        })),
                      ]}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Affected Livestock or Herd"
                        placeholder="e.g. Dairy cow 4 or young goats"
                        value={affectedItem}
                        onChange={(e) => setAffectedItem(e.target.value)}
                        required
                      />
                      <Select
                        label="Farm Plot / Farm Unit"
                        value={plotOrLocation}
                        onChange={(e) => setPlotOrLocation(e.target.value)}
                        options={plots.map((p) => ({
                          value: p.name,
                          label: `${p.plotNumber}: ${p.name} (${p.acres} Ac)`,
                        }))}
                      />
                    </div>
                  </div>
                )}

                <Input
                  label="Ticket Title / Summary"
                  placeholder={
                    reportArea === 'livestock'
                      ? 'e.g. Dairy cow off feed and producing less milk'
                      : 'e.g. Circular brown spots with yellow halos on tomato leaves'
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Describe Observations in Detail
                  </label>
                  <textarea
                    rows={4}
                    placeholder={
                      reportArea === 'livestock'
                        ? 'When did the signs begin? Which animals are affected? Note changes in appetite, movement, breathing, milk or egg production, or behavior.'
                        : 'When did symptoms first appear? Which parts of the crop or field are affected? Note any pests, recent treatment, or changes in soil or water.'
                    }
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
                  />
                </div>

                {/* Photo Upload Dropzone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {reportArea === 'livestock'
                      ? 'Attach Livestock Photo'
                      : 'Attach Crop or Field Photo'}
                  </label>

                  {imagePreview ? (
                    <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-900/5 max-h-64 flex items-center justify-center p-2">
                      <img
                        src={imagePreview}
                        alt="Local symptom attachment preview"
                        className="max-h-56 rounded-xl object-contain"
                      />
                      <button
                        type="button"
                        onClick={handleClearImage}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-300 hover:border-[#16A34A] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 flex flex-col items-center justify-center">
                      <Camera className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-xs font-bold text-slate-800">
                        Click to select photo from device
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5">
                        JPEG, PNG up to 10MB · Clear daylight photo of symptoms
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Logged under {farmer.fullName || 'your account'}
                    {activeFarm.name ? ` (${activeFarm.name})` : ''}
                  </span>
                  <Button
                    type="submit"
                    variant="forest"
                    size="md"
                    isLoading={isSubmitting}
                  >
                    Submit Problem Report
                  </Button>
                </div>
              </Card>
            </form>
          )}
        </div>
      )}

      {/* VIEW 2: Ticket History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Submitted Diagnostic Reports ({reports.length})
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Status shown from your saved report records
            </span>
          </div>

          {reports.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-8 h-8 text-[#16A34A]" />}
              title="No Problem Reports on Record"
              description="You have not submitted any field problem reports yet."
              actionText="Submit New Report"
              onAction={() => openTab('submit')}
            />
          ) : (
            <div className="space-y-3.5">
              {reports.map((rep) => (
                <Card
                  key={rep.id}
                  padding="md"
                  className="bg-white border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#14532D] bg-emerald-50 px-2 py-0.5 rounded">
                          #{rep.ticketNumber}
                        </span>
                        {getStatusBadge(rep.status)}
                        {getSeverityBadge(rep.severity)}
                        <span className="text-xs text-slate-400 font-mono">· {rep.timeAgo}</span>
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-slate-900">{rep.title}</h4>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Affected: <strong className="text-slate-800">{rep.affectedItem}</strong></span>
                        <span>·</span>
                        <span>Location: <strong>{rep.plotOrLocation}</strong></span>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed pt-1">
                        {rep.description}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => setViewingReport(rep)}
                      >
                        View Ticket
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ticket Detail Modal */}
      {viewingReport && (
        <Modal
          isOpen={!!viewingReport}
          onClose={() => setViewingReport(null)}
          title={`Ticket #${viewingReport.ticketNumber}`}
          description={`Filed on ${viewingReport.dateReported} · Severity: ${viewingReport.severity.toUpperCase()}`}
          primaryAction={{
            label: 'Close Ticket',
            onClick: () => setViewingReport(null),
          }}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-800">{viewingReport.title}</span>
              {getStatusBadge(viewingReport.status)}
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Target Item</span>
                <span className="font-bold text-slate-900">{viewingReport.affectedItem}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Plot Location</span>
                <span className="font-bold text-slate-900">{viewingReport.plotOrLocation}</span>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-900 block mb-1">Farmer Observation:</span>
              <p className="text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                {viewingReport.description}
              </p>
            </div>

            {(evidenceLoading || evidenceError || reportEvidence.length > 0) && (
              <section className="space-y-2">
                <h4 className="font-bold text-slate-900">Attached images</h4>
                {evidenceLoading && <p className="text-slate-500">Loading report images…</p>}
                {evidenceError && <p role="status" className="text-rose-700">{evidenceError}</p>}
                <div className="grid gap-3 sm:grid-cols-2">
                  {reportEvidence.map((evidence) => (
                    <figure key={evidence.id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <img src={evidence.image} alt={evidence.caption || `Image attached to ticket ${viewingReport.ticketNumber}`} className="max-h-72 w-full object-contain" loading="lazy" />
                      {evidence.caption && <figcaption className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-600">{evidence.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {viewingReport.officialNotes && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                <span className="font-bold text-emerald-950 block">Agronomic Review Note:</span>
                <p className="text-emerald-900 leading-relaxed">{viewingReport.officialNotes}</p>
                {viewingReport.expertAssigned && (
                  <span className="text-[10px] text-emerald-700 font-semibold block pt-1">
                    Assigned Extension Specialist: {viewingReport.expertAssigned}
                  </span>
                )}
              </div>
            )}

            <section className="border-t border-slate-100 pt-4 space-y-3">
              <h4 className="font-bold text-slate-900">Replies from AgroLink staff</h4>
              {updatesLoading && (
                <p className="text-slate-500">Loading staff replies…</p>
              )}
              {updatesError && (
                <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">
                  {updatesError}
                </p>
              )}
              {!updatesLoading && !updatesError && reportUpdates.length === 0 && (
                <p className="text-slate-500">No staff replies have been added yet.</p>
              )}
              {reportUpdates.map((update) => (
                <article
                  key={update.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">
                      {update.update_type
                        .split('_')
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {formatDisplayDate(update.created_at)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                    {update.message}
                  </p>
                  <span className="block text-[10px] text-slate-500">
                    {update.author_name || 'AgroLink staff'}
                  </span>
                </article>
              ))}
            </section>
          </div>
        </Modal>
      )}
    </div>
  );
};
