import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, BadgeCheck, Check, ChevronLeft, ChevronRight, CircleHelp,
  Flag, Heart, ImagePlus, Leaf, Loader2, MessageCircle, MessagesSquare,
  Search, Send, ShieldAlert, Sprout, Tractor, X,
} from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { useFarmer } from '../../context/FarmerContext';
import {
  apiService, CommunityPost, CommunityReply,
} from '../../services/apiService';

const TOPICS = [
  { id: '', label: 'All topics' },
  { id: 'crops', label: 'Crops' },
  { id: 'livestock', label: 'Livestock' },
  { id: 'soil', label: 'Soil & compost' },
  { id: 'weather', label: 'Weather' },
  { id: 'markets', label: 'Markets' },
  { id: 'general', label: 'General' },
];

const REPORT_REASONS = [
  ['misinformation', 'Potentially harmful agricultural advice'],
  ['abuse', 'Harassment or abusive content'],
  ['spam', 'Spam or advertising'],
  ['privacy', 'Personal or private information'],
  ['other', 'Other concern'],
];

const ago = (date: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

const topicLabel = (topic: string) => TOPICS.find((item) => item.id === topic)?.label ?? 'General';

const CommunityImage: React.FC<{ url: string; alt: string; className?: string }> = ({ url, alt, className = '' }) => {
  const [objectUrl, setObjectUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let createdUrl = '';
    apiService.fetchPrivateImage(url).then((result) => {
      createdUrl = result;
      if (active) setObjectUrl(result);
      else URL.revokeObjectURL(result);
    }).catch(() => { if (active) setFailed(true); });
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [url]);
  return objectUrl && !failed ? <img src={objectUrl} alt={alt} className={className} onError={() => setFailed(true)} /> : (
    <div className={`grid min-h-32 place-items-center gap-1 bg-emerald-50 px-3 py-5 text-emerald-700 ${className}`} role="status">
      <ImagePlus className="h-6 w-6" />
      <span className="text-xs font-medium">{failed ? 'Photo could not be loaded' : 'Loading photo…'}</span>
    </div>
  );
};

export const CommunityPage: React.FC = () => {
  const { farmer } = useFarmer();
  const navigate = useNavigate();
  const { postId } = useParams<{ postId?: string }>();
  const selectedPostId = postId ? Number(postId) : null;
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [topic, setTopic] = useState('');
  const [county, setCounty] = useState('');
  const [unanswered, setUnanswered] = useState(false);
  const [ordering, setOrdering] = useState<'recent' | 'popular'>('recent');
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [replying, setReplying] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postTopic, setPostTopic] = useState('crops');
  const [postImage, setPostImage] = useState<File | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reportTarget, setReportTarget] = useState<{ post?: number; reply?: number } | null>(null);
  const [reportReason, setReportReason] = useState('misinformation');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const loadPosts = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const result = await apiService.getCommunityPosts({
        search, topic, county, unanswered, ordering, page,
      }, signal);
      setPosts(result.results);
      setPageCount(Math.max(1, Math.ceil(result.count / 20)));
    } catch (loadError) {
      if (!signal?.aborted) setError(loadError instanceof Error ? loadError.message : 'Could not load community questions.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [search, topic, county, unanswered, ordering, page]);

  useEffect(() => {
    const controller = new AbortController();
    loadPosts(controller.signal);
    return () => controller.abort();
  }, [loadPosts]);

  useEffect(() => {
    if (!selectedPostId) {
      setSelectedPost(null);
      setReplies([]);
      return;
    }
    let active = true;
    setDetailLoading(true);
    Promise.all([
      apiService.getCommunityPost(selectedPostId),
      apiService.getCommunityReplies(selectedPostId),
    ]).then(([result, loadedReplies]) => {
      if (!active) return;
      setSelectedPost(result);
      setReplies(loadedReplies);
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Could not open this question.');
    }).finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selectedPostId]);

  const refreshPosts = async () => {
    await loadPosts();
    if (selectedPostId) {
      const [result, loadedReplies] = await Promise.all([
        apiService.getCommunityPost(selectedPostId),
        apiService.getCommunityReplies(selectedPostId),
      ]);
      setSelectedPost(result);
      setReplies(loadedReplies);
    }
  };

  const submitPost = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setPosting(true);
    const data = new FormData();
    data.append('title', postTitle.trim());
    data.append('body', postBody.trim());
    data.append('topic', postTopic);
    if (postImage) data.append('image', postImage);
    try {
      const created = await apiService.createCommunityPost(data);
      setPostTitle(''); setPostBody(''); setPostImage(null); setShowComposer(false);
      setNotice('Your question is now in the farmer community.');
      await loadPosts();
      navigate(`/community/${created.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not publish your question.');
    } finally { setPosting(false); }
  };

  const submitReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPost) return;
    setReplying(true); setError('');
    try {
      const created = await apiService.createCommunityReply(selectedPost.id, replyBody.trim());
      setReplies((current) => [...current, created]);
      setReplyBody('');
      await refreshPosts();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not send your reply.');
    } finally { setReplying(false); }
  };

  const reactToPost = async (post: CommunityPost) => {
    try {
      const result = await apiService.toggleCommunityReaction(post.id);
      setPosts((current) => current.map((item) => item.id === post.id
        ? { ...item, reacted_by_me: result.reacted, reaction_count: result.reaction_count } : item));
      if (selectedPost?.id === post.id) setSelectedPost((current) => current
        ? { ...current, reacted_by_me: result.reacted, reaction_count: result.reaction_count } : current);
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Could not update helpful vote.'); }
  };

  const acceptReply = async (reply: CommunityReply) => {
    if (!selectedPost) return;
    try {
      const updated = await apiService.acceptCommunityReply(selectedPost.id, reply.id);
      setSelectedPost(updated);
      await loadPosts();
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Could not mark the answer helpful.'); }
  };

  const submitContentReport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reportTarget) return;
    setSubmittingReport(true);
    try {
      await apiService.reportCommunityContent({ ...reportTarget, reason: reportReason, details: reportDetails.trim() });
      setReportTarget(null); setReportDetails(''); setNotice('Thanks. A moderator will review your report.');
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Could not submit this report.'); }
    finally { setSubmittingReport(false); }
  };

  const searchQuestions = (event: React.FormEvent) => {
    event.preventDefault(); setPage(1); setSearch(searchInput.trim());
  };

  const goBack = () => navigate('/community');
  const displayName = farmer.preferredName || farmer.fullName.split(/\s+/)[0] || 'there';

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-8 animate-in fade-in duration-200">
      {selectedPostId ? (
        <>
          <button type="button" onClick={goBack} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-slate-600 hover:bg-white hover:text-[#14532D]">
            <ArrowLeft className="h-4 w-4" /> Back to community
          </button>
          {detailLoading && !selectedPost ? <CommunityLoading /> : selectedPost ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-5">
                <Card className="overflow-hidden" padding="none">
                  <div className="p-5 sm:p-7">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{topicLabel(selectedPost.topic)}</span>
                      {selectedPost.status === 'resolved' && <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800"><BadgeCheck className="h-3.5 w-3.5" /> Answered</span>}
                      {selectedPost.county && <span className="text-xs text-slate-500">{selectedPost.county} County</span>}
                      <button type="button" onClick={() => setReportTarget({ post: selectedPost.id })} className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-slate-400 hover:bg-amber-50 hover:text-amber-800"><Flag className="h-3.5 w-3.5" /> Report</button>
                    </div>
                    <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{selectedPost.title}</h1>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500"><span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-900">{selectedPost.author_name.slice(0, 1)}</span><span><strong className="text-slate-700">{selectedPost.author_name}</strong><span className="mx-1.5">·</span>{ago(selectedPost.created_at)}</span></div>
                    <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">{selectedPost.body}</p>
                    {selectedPost.image && <CommunityImage url={selectedPost.image} alt="Photo shared with this community question" className="mt-5 max-h-[430px] w-full rounded-2xl object-cover" />}
                    <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
                      <button type="button" onClick={() => reactToPost(selectedPost)} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${selectedPost.reacted_by_me ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-700'}`}><Heart className={`h-4 w-4 ${selectedPost.reacted_by_me ? 'fill-current' : ''}`} /> Helpful <span>{selectedPost.reaction_count}</span></button>
                      <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-500"><MessageCircle className="h-4 w-4" />{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
                    </div>
                  </div>
                </Card>

                <section className="space-y-3" aria-labelledby="replies-heading">
                  <div className="flex items-center justify-between"><h2 id="replies-heading" className="font-display text-lg font-extrabold text-slate-900">Farmer replies <span className="text-slate-400">({replies.length})</span></h2></div>
                  {replies.map((reply) => {
                    const accepted = selectedPost.accepted_reply === reply.id;
                    return <Card key={reply.id} className={accepted ? 'border-teal-200 bg-teal-50/40' : ''} padding="md">
                      <div className="flex items-start gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e9f3e9] text-xs font-bold text-[#14532D]">{reply.author_name.slice(0, 1)}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-slate-800">{reply.author_name}</strong><span className="text-xs text-slate-400">{ago(reply.created_at)}</span>{accepted && <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800"><Check className="h-3 w-3" /> Helpful answer</span>}<button type="button" onClick={() => setReportTarget({ reply: reply.id })} aria-label="Report reply" className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-800"><Flag className="h-3.5 w-3.5" /></button></div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{reply.body}</p>
                          {selectedPost.is_mine && !accepted && selectedPost.status === 'open' && <button type="button" onClick={() => acceptReply(reply)} className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-teal-50 px-3 text-xs font-bold text-teal-800 hover:bg-teal-100"><BadgeCheck className="h-4 w-4" /> Mark as helpful answer</button>}
                        </div>
                      </div>
                    </Card>;
                  })}
                  {!replies.length && <Card className="py-9 text-center" padding="md"><MessageCircle className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-700">No replies yet</p><p className="mt-1 text-xs text-slate-500">Share what has worked for you or ask for more details.</p></Card>}
                </section>

                {selectedPost.status === 'open' && <Card padding="md">
                  <form onSubmit={submitReply}>
                    <label htmlFor="community-reply" className="mb-2 block text-sm font-bold text-slate-800">Share a helpful reply</label>
                    <textarea id="community-reply" required maxLength={5000} rows={4} value={replyBody} onChange={(event) => setReplyBody(event.target.value)} placeholder="Share your experience. For safety, explain what worked for you without presenting uncertain advice as a guaranteed treatment." className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10" />
                    <div className="mt-3 flex items-center justify-between gap-3"><span className="text-[11px] text-slate-400">Be kind. Keep private farm and contact details out of public replies.</span><Button type="submit" variant="forest" size="sm" isLoading={replying} disabled={!replyBody.trim()} leftIcon={<Send className="h-3.5 w-3.5" />}>Reply</Button></div>
                  </form>
                </Card>}
              </div>

              <aside className="space-y-4">
                <Card variant="cream" padding="md"><div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><h2 className="text-sm font-extrabold text-slate-900">Advice from fellow farmers</h2><p className="mt-1.5 text-xs leading-5 text-slate-600">Experiences vary by farm and conditions. Confirm treatment or safety decisions with a qualified agricultural professional.</p></div></div></Card>
                <Card padding="md"><h2 className="text-sm font-bold text-slate-800">Community guidelines</h2><ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600"><li>Share practical experience and stay respectful.</li><li>Do not post phone numbers, exact farm addresses, or other private information.</li><li>Flag unsafe, abusive, or misleading content for review.</li></ul></Card>
              </aside>
            </div>
          ) : <CommunityEmpty title="Question not found" body="It may have been removed or is no longer available." onAction={goBack} action="Back to community" />}
        </>
      ) : (
        <>
          <header className="relative overflow-hidden rounded-[1.75rem] border border-emerald-900/10 bg-gradient-to-br from-[#e8f3e9] via-white to-[#f8f6eb] px-5 py-6 sm:px-8 sm:py-8">
            <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[.14em] text-emerald-800"><MessagesSquare className="h-3.5 w-3.5" /> Farmer to farmer</span><h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-[#153a2a] sm:text-4xl">Learn from farmers like you.</h1><p className="mt-2 text-sm leading-6 text-slate-600">Ask a question, share what worked, and find local experience across Kenya.</p><div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600"><span className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-2.5 py-1.5"><Sprout className="h-3.5 w-3.5 text-emerald-700" /> Crops, livestock, soil & more</span>{farmer.county && <span className="rounded-lg bg-white/80 px-2.5 py-1.5">Your county: {farmer.county}</span>}</div></div>
              <Button variant="forest" size="md" leftIcon={<CircleHelp className="h-4 w-4" />} onClick={() => setShowComposer(true)}>Ask the community</Button>
            </div>
          </header>

          {(error || notice) && <div role={error ? 'alert' : 'status'} className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}><span>{error || notice}</span><button type="button" onClick={() => { setError(''); setNotice(''); }} aria-label="Dismiss" className="rounded p-0.5 opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button></div>}

          {showComposer && <Card padding="none" className="overflow-hidden border-emerald-200 shadow-md">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-display text-lg font-extrabold text-slate-900">Ask fellow farmers</h2><p className="mt-1 text-xs text-slate-500">Hi {displayName}, include enough detail for others to give useful answers.</p></div><button type="button" onClick={() => setShowComposer(false)} aria-label="Close question form" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
            <form onSubmit={submitPost} className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_210px]"><div><label htmlFor="community-title" className="mb-1.5 block text-xs font-bold text-slate-700">Question title</label><input id="community-title" required maxLength={180} value={postTitle} onChange={(event) => setPostTitle(event.target.value)} placeholder="e.g. What helped control fall armyworm in maize?" className="min-h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10" /></div><div><label htmlFor="community-topic" className="mb-1.5 block text-xs font-bold text-slate-700">Topic</label><select id="community-topic" value={postTopic} onChange={(event) => setPostTopic(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none">{TOPICS.filter((item) => item.id).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div></div>
              <div><label htmlFor="community-body" className="mb-1.5 block text-xs font-bold text-slate-700">Details</label><textarea id="community-body" required maxLength={8000} rows={5} value={postBody} onChange={(event) => setPostBody(event.target.value)} placeholder="What are you seeing? What have you tried? Add relevant timing or conditions, but avoid sharing private details." className="w-full resize-y rounded-xl border border-slate-200 p-3.5 text-sm leading-6 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10" /></div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="inline-flex min-h-10 w-fit cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"><ImagePlus className="h-4 w-4 text-emerald-700" />{postImage ? postImage.name : 'Add a photo'}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setPostImage(event.target.files?.[0] ?? null)} /></label><p className="text-[11px] text-slate-400">JPEG, PNG or WebP · up to 5 MB · Your county is shared; your farm name is not.</p></div>
              {postImage && <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600"><ImagePlus className="h-4 w-4" />{postImage.name}<button type="button" onClick={() => setPostImage(null)} className="ml-auto text-slate-400 hover:text-red-600"><X className="h-4 w-4" /></button></div>}
              <div className="flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" onClick={() => setShowComposer(false)}>Cancel</Button><Button type="submit" variant="forest" size="sm" isLoading={posting} disabled={!postTitle.trim() || !postBody.trim()} leftIcon={<Send className="h-3.5 w-3.5" />}>Post question</Button></div>
            </form>
          </Card>}

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
            <main className="min-w-0 space-y-4">
              <Card padding="sm" className="space-y-3">
                <form onSubmit={searchQuestions} className="flex gap-2"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search questions or advice" aria-label="Search community" className="min-h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none" /></div><Button type="submit" variant="secondary" size="sm">Search</Button></form>
                <div className="flex flex-wrap items-center gap-2"><select aria-label="Filter by topic" value={topic} onChange={(event) => { setTopic(event.target.value); setPage(1); }} className="min-h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 sm:flex-none">{TOPICS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><input aria-label="Filter by county" value={county} onChange={(event) => { setCounty(event.target.value); setPage(1); }} placeholder="Any county" className="min-h-10 w-32 rounded-lg border border-slate-200 px-3 text-xs sm:w-36" /><button type="button" onClick={() => { setUnanswered(!unanswered); setPage(1); }} aria-pressed={unanswered} className={`min-h-10 rounded-lg border px-3 text-xs font-bold ${unanswered ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Unanswered</button><select aria-label="Sort questions" value={ordering} onChange={(event) => setOrdering(event.target.value as 'recent' | 'popular')} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600"><option value="recent">Most recent</option><option value="popular">Most helpful</option></select></div>
              </Card>

              {loading ? <CommunityLoading /> : posts.length ? <div className="space-y-3">{posts.map((post) => <CommunityPostCard key={post.id} post={post} onOpen={() => navigate(`/community/${post.id}`)} onReact={() => reactToPost(post)} onReport={() => setReportTarget({ post: post.id })} />)}</div> : <CommunityEmpty title="No questions match yet" body="Try a different filter, or start the conversation with your own question." onAction={() => setShowComposer(true)} action="Ask a question" />}
              {pageCount > 1 && <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"><span className="text-xs text-slate-500">Page {page} of {pageCount}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>}
            </main>

            <aside className="space-y-4 lg:sticky lg:top-24">
              <Card variant="forest" padding="md"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10"><Tractor className="h-5 w-5 text-emerald-100" /></span><div><h2 className="text-sm font-extrabold">Good advice grows together</h2><p className="mt-2 text-xs leading-5 text-emerald-50/80">Ask clearly, share what you have tried, and help other farmers with what you have learned.</p></div></div><button type="button" onClick={() => setShowComposer(true)} className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-white px-3 text-xs font-extrabold text-[#14532D] hover:bg-emerald-50"><CircleHelp className="h-4 w-4" /> Ask a question</button></Card>
              <Card padding="md"><h2 className="text-sm font-extrabold text-slate-900">Explore topics</h2><div className="mt-3 flex flex-wrap gap-2">{TOPICS.filter((item) => item.id).map((item) => <button key={item.id} type="button" onClick={() => { setTopic(item.id); setPage(1); }} className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${topic === item.id ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-800'}`}>{item.label}</button>)}</div></Card>
              <Card className="border-amber-100 bg-[#fffdf7]" padding="md"><div className="flex gap-2.5"><ShieldAlert className="h-4 w-4 shrink-0 text-amber-700" /><p className="text-[11px] leading-5 text-slate-600">Community posts are farmer experiences, not verified professional advice. For urgent crop or animal health risks, contact a qualified expert.</p></div></Card>
            </aside>
          </div>
        </>
      )}

      {error && selectedPostId && <div role="alert" className="fixed bottom-20 left-3 right-3 z-50 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-lg sm:bottom-5 sm:left-auto sm:right-5 sm:max-w-sm">{error}<button type="button" onClick={() => setError('')} className="ml-3 font-bold">×</button></div>}
      {notice && selectedPostId && <div role="status" className="fixed bottom-20 left-3 right-3 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-lg sm:bottom-5 sm:left-auto sm:right-5 sm:max-w-sm">{notice}<button type="button" onClick={() => setNotice('')} className="ml-3 font-bold">×</button></div>}

      {reportTarget && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReportTarget(null); }}><Card className="w-full max-w-md shadow-2xl" padding="md"><div className="flex items-start justify-between"><div><h2 className="font-display text-lg font-extrabold text-slate-900">Report this content</h2><p className="mt-1 text-xs text-slate-500">A moderator will review it against the community guidelines.</p></div><button type="button" aria-label="Close" onClick={() => setReportTarget(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><form onSubmit={submitContentReport} className="mt-4 space-y-3"><label className="block text-xs font-bold text-slate-700">Reason<select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">{REPORT_REASONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className="block text-xs font-bold text-slate-700">Details (optional)<textarea maxLength={1000} rows={3} value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Add context for the moderator" /></label><div className="flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" onClick={() => setReportTarget(null)}>Cancel</Button><Button type="submit" variant="forest" size="sm" isLoading={submittingReport} leftIcon={<Flag className="h-3.5 w-3.5" />}>Send report</Button></div></form></Card></div>}
    </div>
  );
};

const CommunityPostCard: React.FC<{
  post: CommunityPost;
  onOpen: () => void;
  onReact: () => void;
  onReport: () => void;
}> = ({ post, onOpen, onReact, onReport }) => (
  <Card padding="none" className="overflow-hidden transition-all hover:border-emerald-200 hover:shadow-md">
    <button type="button" onClick={onOpen} className="block w-full p-4 text-left sm:p-5">
      <div className="mb-2.5 flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">{topicLabel(post.topic)}</span>{post.status === 'resolved' && <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-800"><BadgeCheck className="h-3 w-3" /> Answered</span>}{post.county && <span className="text-[11px] text-slate-400">{post.county} County</span>}</div>
      <h2 className="font-display text-base font-extrabold leading-snug text-slate-900 sm:text-lg">{post.title}</h2><p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{post.body}</p>
      {post.accepted_reply_preview && <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-2.5"><span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-teal-800"><BadgeCheck className="h-3 w-3" /> Helpful answer · {post.accepted_reply_preview.author_name}</span><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{post.accepted_reply_preview.body}</p></div>}
      {post.image && <CommunityImage url={post.image} alt="Photo attached to a farmer question" className="mt-3 max-h-60 w-full rounded-xl object-cover" />}
      <div className="mt-3 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-[10px] font-extrabold text-emerald-900">{post.author_name.slice(0, 1)}</span><strong className="font-semibold text-slate-700">{post.author_name}</strong><span>·</span><span>{ago(post.created_at)}</span></div>
    </button>
    <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 px-2 py-2 sm:px-3"><button type="button" onClick={onReact} aria-pressed={post.reacted_by_me} className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold sm:px-2.5 ${post.reacted_by_me ? 'bg-rose-50 text-rose-700' : 'text-slate-500 hover:bg-rose-50 hover:text-rose-700'}`}><Heart className={`h-3.5 w-3.5 ${post.reacted_by_me ? 'fill-current' : ''}`} /> Helpful <span>{post.reaction_count}</span></button><button type="button" onClick={onOpen} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 sm:px-2.5"><MessageCircle className="h-3.5 w-3.5" />{post.reply_count} <span className="hidden sm:inline">replies</span></button><button type="button" onClick={onReport} aria-label="Report question" className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-800"><Flag className="h-3.5 w-3.5" /></button><button type="button" onClick={onOpen} aria-label="Join discussion" className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-[#14532D] hover:bg-emerald-50"><span className="hidden sm:inline">Join discussion</span><ChevronRight className="h-3.5 w-3.5" /></button></div>
  </Card>
);

const CommunityLoading: React.FC = () => <Card padding="lg" className="grid min-h-52 place-items-center"><div className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-700" /><p className="mt-2 text-xs font-medium text-slate-500">Loading farmer conversations…</p></div></Card>;

const CommunityEmpty: React.FC<{ title: string; body: string; action: string; onAction: () => void }> = ({ title, body, action, onAction }) => <Card padding="lg" className="text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><Leaf className="h-6 w-6" /></span><h2 className="mt-3 font-display text-lg font-extrabold text-slate-900">{title}</h2><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">{body}</p><Button variant="forest" size="sm" className="mt-4" onClick={onAction}> {action}</Button></Card>;

