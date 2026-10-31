import { useState, useEffect, useCallback, useRef } from "react";

export interface DirtyState {
  [key: string]: boolean;
}

export function useUnsavedChanges() {
  const [dirtyTabs, setDirtyTabs] = useState<DirtyState>({});
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const pendingNavigationRef = useRef<(() => void) | null>(null);
  const pendingTabRef = useRef<string | null>(null);

  // Mark a specific tab as dirty
  const markDirty = useCallback((tabKey: string) => {
    setDirtyTabs((prev) => ({ ...prev, [tabKey]: true }));
  }, []);

  // Mark a specific tab as clean (after save)
  const markClean = useCallback((tabKey: string) => {
    setDirtyTabs((prev) => ({ ...prev, [tabKey]: false }));
  }, []);

  // Reset all tabs to clean
  const markAllClean = useCallback(() => {
    setDirtyTabs({});
  }, []);

  // Check if there are any unsaved changes globally
  const hasUnsavedChanges = Object.values(dirtyTabs).some(Boolean);

  // Check if a specific tab has unsaved changes
  const isTabDirty = useCallback(
    (tabKey: string) => !!dirtyTabs[tabKey],
    [dirtyTabs]
  );

  // Return list of dirty tabs
  const getDirtyTabs = useCallback(() => {
    return Object.entries(dirtyTabs)
      .filter(([, dirty]) => dirty)
      .map(([key]) => key);
  }, [dirtyTabs]);

  // Confirm warning when switching tabs
  const confirmTabChange = useCallback(
    (currentTab: string, newTab: string, onConfirm: () => void) => {
      if (dirtyTabs[currentTab]) {
        pendingTabRef.current = newTab;
        pendingNavigationRef.current = onConfirm;
        setShowLeaveDialog(true);
        return false; // block navigation
      }
      return true; // allow navigation
    },
    [dirtyTabs]
  );

  // Confirm warning when leaving page
  const confirmNavigation = useCallback(
    (onConfirm: () => void) => {
      if (hasUnsavedChanges) {
        pendingNavigationRef.current = onConfirm;
        setShowLeaveDialog(true);
        return false;
      }
      onConfirm();
      return true;
    },
    [hasUnsavedChanges]
  );

  // When "Navigate" is selected in dialog
  const handleConfirmLeave = useCallback(() => {
    setShowLeaveDialog(false);
    if (pendingNavigationRef.current) {
      pendingNavigationRef.current();
      pendingNavigationRef.current = null;
    }
    pendingTabRef.current = null;
  }, []);

  // When "Cancel" is selected in dialog
  const handleCancelLeave = useCallback(() => {
    setShowLeaveDialog(false);
    pendingNavigationRef.current = null;
    pendingTabRef.current = null;
  }, []);

  // Browser beforeunload event
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return {
    dirtyTabs,
    hasUnsavedChanges,
    showLeaveDialog,
    pendingTab: pendingTabRef.current,
    markDirty,
    markClean,
    markAllClean,
    isTabDirty,
    getDirtyTabs,
    confirmTabChange,
    confirmNavigation,
    handleConfirmLeave,
    handleCancelLeave,
  };
}
