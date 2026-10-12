if (process.versions.node !== '22.21.1') {
  console.error('Use the pinned Node 22.21.1 toolchain (see .nvmrc).');
  process.exitCode = 1;
}
