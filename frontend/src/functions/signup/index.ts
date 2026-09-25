/** Функция «Запись» (спринт v3.2): окно с условиями, возраст 18+ или согласие родителя, запись на заявку и выезд. */
export {
  EMPTY_CONSENT,
  ageStatus,
  moscowTime,
  normalizePhone,
  signUp,
  signupBody,
  signupRule,
  signupTerms,
  validateConsent,
  type AgeStatus,
  type ConsentValues,
  type SignupResult,
  type SignupRule,
  type SignupTarget,
  type SignupTerms,
} from './signup.ts'
export { useSignUp, useSignups } from './useSignup.ts'
