import { COMMON_FIELDS, STEP_SCHEMAS, STEP_TYPE_OPTIONS, findStepSchema } from './step-schemas';

describe('step-schemas', () => {
  it('covers all 24 DSL step types', () => {
    const types = STEP_SCHEMAS.map((s) => s.type).sort();
    expect(types).toContain('open_url');
    expect(types).toContain('click');
    expect(types).toContain('input_text');
    expect(types).toContain('select_option');
    expect(types).toContain('wait_for_element');
    expect(types).toContain('wait_until_url_contains');
    expect(types).toContain('wait_until_title_contains');
    expect(types).toContain('assert_text');
    expect(types).toContain('assert_attribute');
    expect(types).toContain('extract_text_to_context');
    expect(types).toContain('extract_attribute_to_context');
    expect(types).toContain('screenshot');
    expect(types).toContain('close_browser');
    expect(types).toContain('sleep');
    expect(types).toContain('sleep_random');
    expect(types).toContain('notify');
    expect(types).toContain('http_request');
    expect(types).toContain('require_enterprise_network');
    expect(types).toContain('set_context');
    expect(types).toContain('format_context');
    expect(types).toContain('group');
    expect(types).toContain('parallel');
    expect(types).toContain('repeat');
    expect(types).toContain('try');
    expect(types.length).toBe(24);
  });

  it('findStepSchema returns the schema for a known type', () => {
    const schema = findStepSchema('click');
    expect(schema).not.toBeNull();
    expect(schema?.label).toBe('Cliquer sur un élément');
    expect(schema?.fields.map((f) => f.name)).toContain('locator');
  });

  it('findStepSchema returns null for unknown types', () => {
    expect(findStepSchema('does_not_exist')).toBeNull();
    expect(findStepSchema('')).toBeNull();
  });

  it('flags composite steps consistently', () => {
    expect(findStepSchema('group')?.composite).toBe(true);
    expect(findStepSchema('try')?.composite).toBe(true);
    expect(findStepSchema('repeat')?.composite).toBe(true);
    expect(findStepSchema('parallel')?.composite).toBe(true);
    expect(findStepSchema('click')?.composite).toBeFalsy();
  });

  it('common fields expose the transverse DSL modifiers', () => {
    const names = COMMON_FIELDS.map((f) => f.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'when',
        'retry',
        'retry_delay_seconds',
        'retry_backoff_seconds',
        'timeout_seconds',
        'continue_on_error',
      ]),
    );
  });

  it('STEP_TYPE_OPTIONS sorts composites at the end of the French-sorted list', () => {
    const compositeIndex = STEP_TYPE_OPTIONS.findIndex((o) => o.composite);
    const firstCompositeAt = compositeIndex;
    expect(firstCompositeAt).toBeGreaterThan(-1);
    for (let i = firstCompositeAt; i < STEP_TYPE_OPTIONS.length; i++) {
      expect(STEP_TYPE_OPTIONS[i].composite).toBe(true);
    }
    for (let i = 0; i < firstCompositeAt; i++) {
      expect(STEP_TYPE_OPTIONS[i].composite).toBe(false);
    }
  });
});
