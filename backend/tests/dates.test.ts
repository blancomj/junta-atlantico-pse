import { nowColombiaISO, COLOMBIA_OFFSET_HOURS } from '../utils/dates';

describe('Dates Utility', () => {
  test('should return ISO 8601 string with -05:00 offset', () => {
    const result = nowColombiaISO();
    expect(result).toMatch(/-05:00$/);
  });

  test('should have correct format YYYY-MM-DDTHH:MM:SS.mmm-05:00', () => {
    const result = nowColombiaISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}-05:00$/);
  });

  test('COLOMBIA_OFFSET_HOURS should be -5', () => {
    expect(COLOMBIA_OFFSET_HOURS).toBe(-5);
  });
});
