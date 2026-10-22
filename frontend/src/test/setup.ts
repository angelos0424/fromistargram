import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Bind to this workspace's Vitest instance; the backend uses a different major.
expect.extend(matchers);
