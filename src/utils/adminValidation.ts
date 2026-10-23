export interface AdminLoginFormValues {
  identifier: string;
  password: string;
}

export interface AdminLoginValidationErrors {
  identifier?: string;
  password?: string;
}

export interface AdminLoginValidationResult {
  isValid: boolean;
  errors: AdminLoginValidationErrors;
}

/**
 * Validates the Administrator Login form inputs without hardcoding credentials
 * or performing fake authentication.
 */
export function validateAdminLoginForm(
  values: AdminLoginFormValues
): AdminLoginValidationResult {
  const errors: AdminLoginValidationErrors = {};
  const trimmedIdentifier = values.identifier.trim();

  if (!trimmedIdentifier) {
    errors.identifier = 'Please enter your administrator email address or Administrator ID.';
  } else if (trimmedIdentifier.includes('@')) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedIdentifier)) {
      errors.identifier = 'Please enter a valid administrator email address (e.g., admin@zestora.in).';
    }
  } else {
    const idPattern = /^[A-Za-z0-9._-]{3,32}$/;
    if (!idPattern.test(trimmedIdentifier)) {
      errors.identifier =
        'Administrator ID must be 3–32 characters using letters, numbers, dots, hyphens, or underscores.';
    }
  }

  if (!values.password || values.password.length === 0) {
    errors.password = 'Please enter your administrator password.';
  } else if (values.password.length < 6) {
    errors.password = 'Password must be at least 6 characters long.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
