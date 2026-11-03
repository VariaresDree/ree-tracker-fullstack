// src/features/materials/MaterialViewer.jsx
//
// The viewer for a handout (PDF, image, audio, video, link), shared by the
// learner Library and the Admin handouts tab: a full-screen dialog OVER the
// list. The list stays mounted underneath, so closing returns to the same
// folder and scroll position with nothing to restore.
import { Modal } from '../../components/ui';
import MediaViewer from '../../components/MediaViewer';

export default function MaterialViewer({ material, onClose }) {
  return (
    <Modal open fullscreen closeOnBackdrop={false} onClose={onClose} title={material.name}>
      <MediaViewer item={{ type: material.type, url: material.url, title: material.name }} />
    </Modal>
  );
}
