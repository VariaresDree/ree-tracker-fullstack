// src/features/materials/SaveOffline.jsx
//
// A handout tile's Save offline: a button, its progress, then a "Saved" mark. If
// Drive refuses, there's still a way to the file.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Modal, StatusPill } from '../../components/ui';
import { Download, ExternalLink } from '../../components/ui/icons';
import { externalPdfUrl } from '../../utils/pdfUrl';
import { addFile } from '../my-files/filesStore';
import { canSaveOffline, downloadHandout } from './saveHandout';

export default function SaveOffline({ material, uid, saved }) {
  const [progress, setProgress] = useState(null);
  const [problem, setProblem] = useState(null);

  if (saved) return <StatusPill tone="success">Saved</StatusPill>;
  if (!canSaveOffline(material)) return null;

  const save = async (e) => {
    e.stopPropagation();
    setProgress(0);
    try {
      const blob = await downloadHandout(material, { onProgress: setProgress });
      await addFile(uid, blob, {
        name: material.name,
        kind: 'pdf',
        source: { kind: 'handout', materialId: material.id, url: material.url },
      });
    } catch (err) {
      setProblem(err.message);
    } finally {
      setProgress(null);
    }
  };

  return (
    // The tile opens the file on a click, and nothing in here should.
    <span className="contents" onClick={(e) => e.stopPropagation()}>
      <Button size="sm" variant="secondary" disabled={progress !== null} onClick={save} aria-label={progress !== null ? `Saving ${material.name}` : `Save ${material.name} for offline`}>
        <Download size={14} strokeWidth={1.75} aria-hidden="true" />
        {progress !== null ? `${Math.round(progress * 100)}%` : 'Save offline'}
      </Button>
      <Modal
        open={!!problem}
        onClose={() => setProblem(null)}
        title="Couldn’t save this handout"
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setProblem(null)}>Close</Button>
            <Button as="a" href={externalPdfUrl(material.url)} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" /> Open in Drive
            </Button>
          </>
        )}
      >
        <div className="flex flex-col gap-2 text-sm text-muted2">
          <p>{problem}</p>
          <p>You can still download it from Drive, then add it to <Link to="/library?tab=files" className="inline-flex items-center pointer-coarse:min-h-11 underline">My files</Link>.</p>
        </div>
      </Modal>
    </span>
  );
}
