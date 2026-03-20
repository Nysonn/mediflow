export const validators = {
  required: (value: string): string | null =>
    !value?.trim() ? 'This field is required' : null,

  email: (value: string): string | null => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !re.test(value) ? 'Enter a valid email address' : null;
  },

  minLength: (min: number) => (value: string): string | null =>
    value.length < min ? `Must be at least ${min} characters` : null,

  age: (value: number): string | null => {
    if (value < 10 || value > 60) return 'Age must be between 10 and 60';
    return null;
  },

  positiveNumber: (value: number): string | null =>
    value <= 0 ? 'Must be greater than 0' : null,

  notFutureDate: (value: string): string | null => {
    const date = new Date(value);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date > today ? 'Date cannot be in the future' : null;
  },
};
