// Benign worker lifecycle fixture. No media or crash payload is involved.
process.on('message', () => {
  setTimeout(() => {}, 60000);
});
