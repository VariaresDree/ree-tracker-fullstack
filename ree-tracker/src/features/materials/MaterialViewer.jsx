// src/features/materials/MaterialViewer.jsx
//
// The viewer for a handout (PDF, image, audio, video, link), shared by the
// learner Library and the Admin handouts tab: a full-screen dialog OVER the
// list. The list stays mounted underneath, so closing returns to the same
// folder and scroll position with nothing to restore. One saved for offline opens
// from the device, online or not.
import { Modal } from '../../components/ui';
import MediaViewer from '../../components/MediaViewer';
import { useAuth } from '../../contexts/AuthContext';
import LocalFileViewer from '../my-files/LocalFileViewer';
import { useMyFiles } from '../my-files/filesStore';

export default function MaterialViewer({ material, onClose }) {
  const uid = useAuth()?.currentUser?.uid;
  const { files, loaded } = useMyFiles(uid);
  const saved = files.find((f) => f.source?.materialId === material.id);
  let body = null;
  if (saved) body = <LocalFileViewer uid={uid} file={saved} />;
  // Not before the list has answered, or a saved one would start loading from Drive.
  else if (loaded) body = <MediaViewer item={{ type: material.type, url: material.url, title: material.name }} />;
  return (
    <Modal open fullscreen closeOnBackdrop={false} onClose={onClose} title={material.name}>
      {body}
    </Modal>
  );
}
