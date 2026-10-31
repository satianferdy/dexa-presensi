import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { X, Maximize2 } from 'lucide-react';
import { ModalFocus } from '../../components/ui/ModalFocus';

export function Evidence({ url, label }: { url: string | null; label: string }) {
  const [src, setSrc] = useState<string>();
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<'loading' | 'error' | 'empty' | 'ready'>('empty');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setSrc(undefined);
    setExpanded(false);
    setStatus(url ? 'loading' : 'empty');
    if (!url) return;
    const controller = new AbortController();
    let active = true;
    let objectUrl: string | undefined;
    api
      .get(url.replace(/^\/api/, ''), { responseType: 'blob', signal: controller.signal })
      .then(({ data }) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(data);
        setSrc(objectUrl);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, attempt]);
  return (
    <div className="evidence">
      <div className="field-label">{label}</div>
      {src ? (
        <button
          className="evidence-open"
          type="button"
          onClick={() => setExpanded(true)}
          aria-label={`Enlarge ${label}`}
        >
          <img src={src} alt={label} />
          <span>
            <Maximize2 size={14} /> Enlarge photo
          </span>
        </button>
      ) : (
        <div className="photo-placeholder" role="status">
          {status === 'loading' ? (
            'Loading photo…'
          ) : status === 'error' ? (
            <span>
              Unable to load photo.{' '}
              <button type="button" onClick={() => setAttempt((value) => value + 1)}>
                Try again
              </button>
            </span>
          ) : (
            'No photo yet'
          )}
        </div>
      )}
      {expanded && src && (
        <div
          className="modal-backdrop photo-viewer-backdrop"
          onMouseDown={() => setExpanded(false)}
        >
          <ModalFocus onClose={() => setExpanded(false)}>
            <div
              className="modal photo-viewer"
              role="dialog"
              aria-modal="true"
              aria-label={label}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="modal-head">
                <h2>{label}</h2>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  aria-label="Close photo viewer"
                >
                  <X size={21} />
                </button>
              </div>
              <img src={src} alt={label} />
            </div>
          </ModalFocus>
        </div>
      )}
    </div>
  );
}
