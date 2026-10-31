import { useState, useEffect, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, X } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Notice } from '../../components/ui/Notice';
import { ModalFocus } from '../../components/ui/ModalFocus';
import { time } from '../../lib/date';

export function AttendanceAction({
  kind,
  onClose,
}: {
  kind: 'check-in' | 'check-out';
  onClose: (message?: string) => void;
}) {
  const query = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string>();
  const [progress, setProgress] = useState(0);
  const [checking, setChecking] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const close = () => {
    if (!mutation.isPending && !checking) onClose();
  };
  useEffect(() => {
    if (!file) {
      setPreview(undefined);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Please choose a photo');
      const form = new FormData();
      form.append('photo', file);
      if (note) form.append('note', note);
      return (
        await api.post(`/attendance/${kind}`, form, {
          onUploadProgress: (event) =>
            setProgress(event.total ? Math.round((event.loaded / event.total) * 100) : 0),
        })
      ).data;
    },
    onSuccess: (record) => {
      query.invalidateQueries({ queryKey: ['attendance'] });
      onClose(
        `${kind === 'check-in' ? 'Check-in' : 'Check-out'} recorded at ${time(kind === 'check-in' ? record.checkInAt : record.checkOutAt)}.`,
      );
    },
  });
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!file) {
      setError('Please choose a photo');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be 5 MB or smaller');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Use a JPG, PNG, or WebP photo');
      return;
    }
    try {
      await mutation.mutateAsync();
    } catch (e) {
      setError(errorMessage(e));
      setChecking(true);
      setUncertain(true);
      try {
        const { data } = await api.get('/attendance/today');
        const complete =
          kind === 'check-in' ? data.status !== 'NOT_CHECKED_IN' : data.status === 'COMPLETE';
        if (complete) {
          query.invalidateQueries({ queryKey: ['attendance'] });
          onClose(
            `Attendance confirmed at ${time(kind === 'check-in' ? data.checkInAt : data.checkOutAt)}.`,
          );
        } else setUncertain(false);
      } catch {
        setError(
          'Unable to confirm attendance. Close this form and refresh your status before submitting again.',
        );
      } finally {
        setChecking(false);
      }
      query.invalidateQueries({ queryKey: ['attendance', 'today'] });
    }
  }
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <ModalFocus onClose={close}>
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-label={kind === 'check-in' ? 'Check in' : 'Check out'}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="modal-head">
            <div>
              <div className="eyebrow">WFH ATTENDANCE</div>
              <h2>{kind === 'check-in' ? 'Check in' : 'Check out'}</h2>
            </div>
            <button onClick={close} aria-label="Close">
              <X size={21} />
            </button>
          </div>
          <p className="muted">Your attendance time is recorded automatically when you submit.</p>
          <form onSubmit={submit}>
            {error && <Notice>{error}</Notice>}
            <label className="upload-box">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  e.target.value = '';
                }}
              />
              {preview ? (
                <img src={preview} alt="Proof photo preview" />
              ) : (
                <>
                  <Camera size={30} />
                  <strong>Choose a proof photo</strong>
                  <span>Choose from your gallery or camera · Max. 5 MB</span>
                </>
              )}
            </label>
            {file && (
              <div className="upload-meta">
                <span>
                  {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <Button type="button" variant="secondary" onClick={() => setFile(null)}>
                  Remove
                </Button>
                <span>Click the photo to replace it.</span>
              </div>
            )}
            {mutation.isPending && (
              <p role="status">
                Uploading: {progress}% {progress === 100 ? '· Confirming attendance…' : ''}
              </p>
            )}
            <label>
              Note <span className="muted">(optional)</span>
              <textarea
                maxLength={500}
                rows={3}
                placeholder="Add a note if needed"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <div className="form-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={close}
                disabled={mutation.isPending || checking}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending || checking || uncertain}>
                {mutation.isPending
                  ? 'Submitting…'
                  : `Submit ${kind === 'check-in' ? 'check in' : 'check out'}`}
              </Button>
            </div>
          </form>
        </div>
      </ModalFocus>
    </div>
  );
}
