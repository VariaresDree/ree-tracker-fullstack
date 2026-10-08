// Library › Handouts folder tiles used to open only on a mouse click: the tile
// was a div with an onClick, so a keyboard or switch user could not get into a
// folder at all. The name is now a focusable button-role control inside the
// tile (a span, not a <button>: Firefox won't start a drag on a button, and
// admins drag folders by their names).
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const navigateToFolder = vi.fn();
vi.mock('./useFileManager', () => ({
  useFileManager: () => ({
    folders: [{ id: 'f1', name: 'Power Systems notes', parentId: 'root' }],
    materials: [],
    currentFolderId: 'root',
    breadcrumbs: [{ id: 'root', name: 'Handouts' }],
    isUploading: false,
    dragOverFolderId: null,
    navigateToFolder,
    navigateToBreadcrumb: vi.fn(),
    createFolder: vi.fn(),
    uploadAndCommitMaterial: vi.fn(),
    addMaterialRecord: vi.fn(),
    deleteItem: vi.fn(),
    renameItem: vi.fn(),
    moveItem: vi.fn(),
    handleDragStart: vi.fn(),
    handleDragOver: vi.fn(),
    handleDragLeave: vi.fn(),
    handleDrop: vi.fn(),
  }),
}));

const { default: CloudVaultTab } = await import('./CloudVaultTab');

describe('Handouts folders', () => {
  it('a folder opens from the keyboard with Enter or Space, once per press', () => {
    render(<CloudVaultTab currentUser={{ uid: 'u1' }} isAdmin={false} onViewMaterial={vi.fn()} />);
    const open = screen.getByRole('button', { name: 'Open folder Power Systems notes' });
    open.focus();
    expect(open).toHaveFocus();
    fireEvent.keyDown(open, { key: 'Enter' });
    expect(navigateToFolder).toHaveBeenCalledTimes(1);
    expect(navigateToFolder).toHaveBeenCalledWith('f1', 'Power Systems notes');
    fireEvent.keyDown(open, { key: ' ' });
    expect(navigateToFolder).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(open, { key: 'a' });
    expect(navigateToFolder).toHaveBeenCalledTimes(2);
  });
});
