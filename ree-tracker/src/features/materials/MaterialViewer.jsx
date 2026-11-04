// src/features/materials/MaterialViewer.jsx
//
// The viewer for a handout (PDF, image, audio, video, link), shared by the
// learner Library and the Admin handouts tab: a full-screen dialog OVER the
// list. The list stays mounted underneath, so closing returns to the same
// folder and scroll position with nothing to restore. One saved for offline opens
// from the device, online or not.
import { Button, Modal, StatusPill } from '../../components/ui';
import { ExternalLink } from '../../components/ui/icons';
import MediaViewer from '../../components/MediaViewer';
import { useAuth } from '../../contexts/AuthContext';
import { externalPdfUrl } from '../../utils/pdfUrl';
import LocalFileViewer from '../my-files/LocalFileViewer';
import { useMyFiles } from '../my-files/filesStore';

export default function MaterialViewer({ material, onClose }) {
  const uid = useAuth()?.currentUser?.uid;
  const { files, loaded } = useMyFiles(uid);
  const saved = files.find((f) => f.source?.materialId === material.id);
  let body = null;
  if (saved) {
    // A way out if this device's viewer can't draw something Drive's can.
    body = (
      <div className="flex flex-col flex-1 min-h-0 gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
          <StatusPill tone="success">Saved on this device</StatusPill>
          <Button as="a" size="sm" variant="secondary" href={externalPdfUrl(material.url)} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" /> Open in Drive
          </Button>
        </div>
        <LocalFileViewer uid={uid} file={saved} />
      </div>
    );
  }
  // Not before the list has answered, or a saved one would start loading from Drive.
  else if (loaded) body = <MediaViewer item={{ type: material.type, url: material.url, title: material.name }} />;
  return (
    <Modal open fullscreen closeOnBackdrop={false} onClose={onClose} title={material.name}>
      {body}
    </Modal>
  );
}
