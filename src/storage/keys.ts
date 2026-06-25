export function snapshotPrefix(projectId: string, snapshotId: string): string {
  return `projects/${projectId}/snapshots/${snapshotId}/`;
}

export function assetKey(projectId: string, assetId: string, ext: string): string {
  return `projects/${projectId}/assets/${assetId}.${ext}`;
}
