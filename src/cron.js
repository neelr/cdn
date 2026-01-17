// Cron handler to delete expired files and cleanup orphaned uploads
export async function handleScheduled(event, env, ctx) {
  const now = new Date().toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get all expired files
  const { results: expiredFiles } = await env.DB.prepare(
    'SELECT key FROM files WHERE expires IS NOT NULL AND expires < ?'
  ).bind(now).all();

  // Delete expired files from R2 and DB
  for (const file of expiredFiles) {
    await env.CDN_BUCKET.delete(file.key);
    await env.DB.prepare('DELETE FROM files WHERE key = ?').bind(file.key).run();
  }

  if (expiredFiles.length > 0) {
    console.log(`Deleted ${expiredFiles.length} expired files`);
  }

  // Cleanup orphaned multipart uploads (older than 24 hours)
  let abortedUploads = 0;
  const incompleteUploads = await env.CDN_BUCKET.listMultipartUploads();

  for (const upload of incompleteUploads.uploads || []) {
    // Abort uploads older than 24 hours
    if (new Date(upload.uploaded) < oneDayAgo) {
      try {
        const multipartUpload = env.CDN_BUCKET.resumeMultipartUpload(upload.key, upload.uploadId);
        await multipartUpload.abort();
        abortedUploads++;
      } catch (e) {
        // Ignore errors (upload may have been completed/aborted already)
      }
    }
  }

  if (abortedUploads > 0) {
    console.log(`Aborted ${abortedUploads} orphaned multipart uploads`);
  }
}
