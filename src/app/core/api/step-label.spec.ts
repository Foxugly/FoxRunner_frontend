import { describe, expect, it } from 'vitest';
import { stepLabel, stepId } from './step-label';

describe('stepLabel', () => {
  it('renders open_url in French with the url', () => {
    expect(stepLabel({ type: 'open_url', url: 'https://x' })).toBe('Ouvrir la page « https://x »');
  });
  it('renders click with locator', () => {
    expect(stepLabel({ type: 'click', locator: '#go' })).toBe('Cliquer sur « #go »');
  });
  it('falls back to the raw type when unknown', () => {
    expect(stepLabel({ type: 'weird_step' })).toBe('weird_step');
  });
});

describe('stepId', () => {
  it('builds collection[index]', () => {
    expect(stepId('steps', 2)).toBe('steps[2]');
  });
});
