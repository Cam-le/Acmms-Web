import { useCallback, useState } from "react";

/**
 * useCrudModals — manage View / Create / Edit / Delete modal state for
 * a CRUD page.
 *
 * Replaces 6 useState lines × 8 pages of:
 *   const [viewModalOpen, setViewModalOpen] = useState(false);
 *   const [createModalOpen, setCreateModalOpen] = useState(false);
 *   const [editModalOpen, setEditModalOpen] = useState(false);
 *   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
 *   const [selectedItem, setSelectedItem] = useState<T | null>(null);
 *   const [itemToDelete, setItemToDelete] = useState<T | null>(null);
 *
 * Pattern: viewItem/editItem/deleteItem truthy ⇔ modal open. Pass to
 * <Modal open={!!viewItem}>, etc. closeView() sets to null.
 *
 * Spec: FRONTEND_REFACTOR_PLAN.md §6.2
 *
 * Usage:
 *   const modals = useCrudModals<Farm>();
 *   <Button onClick={modals.openCreate}>Thêm trang trại</Button>
 *   <Modal open={modals.createOpen} onOpenChange={(o) => !o && modals.closeCreate()}>...</Modal>
 *   <Modal open={!!modals.viewItem} onOpenChange={(o) => !o && modals.closeView()}>
 *     {modals.viewItem && <ViewContent item={modals.viewItem} />}
 *   </Modal>
 */

export interface UseCrudModalsResult<T> {
  // View
  viewItem: T | null;
  openView: (item: T) => void;
  closeView: () => void;

  // Create
  createOpen: boolean;
  openCreate: () => void;
  closeCreate: () => void;

  // Edit
  editItem: T | null;
  openEdit: (item: T) => void;
  closeEdit: () => void;

  // Delete
  deleteItem: T | null;
  openDelete: (item: T) => void;
  closeDelete: () => void;

  /** Close everything — useful after a multi-step action */
  closeAll: () => void;
}

export function useCrudModals<T>(): UseCrudModalsResult<T> {
  const [viewItem, setViewItem] = useState<T | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<T | null>(null);
  const [deleteItem, setDeleteItem] = useState<T | null>(null);

  const openView = useCallback((item: T) => setViewItem(item), []);
  const closeView = useCallback(() => setViewItem(null), []);

  const openCreate = useCallback(() => setCreateOpen(true), []);
  const closeCreate = useCallback(() => setCreateOpen(false), []);

  const openEdit = useCallback((item: T) => setEditItem(item), []);
  const closeEdit = useCallback(() => setEditItem(null), []);

  const openDelete = useCallback((item: T) => setDeleteItem(item), []);
  const closeDelete = useCallback(() => setDeleteItem(null), []);

  const closeAll = useCallback(() => {
    setViewItem(null);
    setCreateOpen(false);
    setEditItem(null);
    setDeleteItem(null);
  }, []);

  return {
    viewItem,
    openView,
    closeView,
    createOpen,
    openCreate,
    closeCreate,
    editItem,
    openEdit,
    closeEdit,
    deleteItem,
    openDelete,
    closeDelete,
    closeAll,
  };
}
