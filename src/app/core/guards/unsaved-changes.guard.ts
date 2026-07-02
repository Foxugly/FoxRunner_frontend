import { CanDeactivateFn } from '@angular/router';

/** A component opts into the guard by reporting whether it has pending edits. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/**
 * Blocks navigation when the leaving component reports unsaved edits, using a
 * native confirm. Components opt in by implementing {@link HasUnsavedChanges}.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) =>
  !component?.hasUnsavedChanges?.() ||
  window.confirm('Des modifications non enregistrées seront perdues. Quitter la page ?');
