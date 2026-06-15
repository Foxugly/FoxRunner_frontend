export interface DataTableColumn {
  /** Row property key AND the matching `appCell` template id. */
  field: string;
  header: string;
  /** Adds pSortableColumn + sort icon. Default false. */
  sortable?: boolean;
  /** CSS width applied to the <th>, e.g. '8rem'. */
  width?: string;
  /** Participates in the global filter. Default true. */
  searchable?: boolean;
}
