// Study Practice settings. EC edits this file once, during docs/SETUP-SUPABASE.md (step 8).
//
// Leave both values empty and the app works exactly as version 1: progress stays on each device
// (local mode). Fill them in and the app becomes "linked": she and you sign in, every session
// is saved online automatically, and you see her reports on your own device.
//
// Both values are PUBLIC BY DESIGN. The project URL and the anon (or "publishable") key are
// meant to be in a web page; Row Level Security in the database decides who sees what.
// NEVER put the service-role key, a "secret" key, a database password or an Anthropic key here.

export const SUPABASE = {
  // e.g. 'https://abcdefghijklmnop.supabase.co'
  url: '',
  // the "anon public" key (starts eyJ...) or the "publishable" key (starts sb_publishable_...)
  anonKey: '',
  // the internal address used for her username; must match the STUDENT_EMAIL_DOMAIN secret of
  // the manage-student function (leave as it is unless the setup guide says otherwise)
  studentEmailDomain: 'students.study-practice.invalid',
};

// Step B switches (all off until the Anthropic key is in Supabase and the functions are deployed).
export const AI_FEATURES = {
  askProgress: false,
  readHandwriting: false,
  generateQuestions: false,
};
