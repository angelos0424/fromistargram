#!/usr/bin/env node
import { indexFileSystem } from './indexer.js';

indexFileSystem()
  .then(() => {
    console.log('Indexing completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Indexing failed', error);
    process.exit(1);
  });
